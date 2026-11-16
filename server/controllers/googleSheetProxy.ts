import { readAreaConfigsFromDisk, DEFAULT_AREA_CONFIGS } from './configController.js';
import { readSPPItemsFromDisk, saveSPPItemsToDisk } from './sppController.js';

export async function proxyGoogleSheetPush(req: any, res: any) {
  try {
    const { webAppUrl, items, mode, area } = req.body;
    const configs = readAreaConfigsFromDisk();

    let targetUrl = typeof webAppUrl === 'string' && webAppUrl.trim().startsWith('http')
      ? webAppUrl.trim()
      : '';

    if (!targetUrl && area && configs[area]?.webAppUrl) {
      targetUrl = configs[area].webAppUrl;
    }
    if (!targetUrl && area && DEFAULT_AREA_CONFIGS[area]?.webAppUrl) {
      targetUrl = DEFAULT_AREA_CONFIGS[area].webAppUrl;
    }

    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: `URL Google Apps Script tidak ditemukan untuk area ${area || 'umum'}.`,
      });
    }

    const action = mode || 'UPSERT_BATCH';
    const itemsList = Array.isArray(items) ? items : items ? [items] : [];

    console.log(`[GoogleSheetProxy] Mengirim ${itemsList.length} item ke Google Sheet (${area || 'Umum'}) via aksi ${action}...`);

    const payload = JSON.stringify({
      action,
      items: itemsList,
      item: itemsList.length === 1 ? itemsList[0] : undefined,
    });

    const googleRes = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload,
      redirect: 'follow',
    });

    const responseText = await googleRes.text();
    let googleData: any = null;
    let isValidJson = false;
    try {
      googleData = JSON.parse(responseText);
      isValidJson = true;
    } catch {
      googleData = { raw: responseText };
    }

    if (!googleRes.ok || !isValidJson || googleData?.status === 'error') {
      const errDetail =
        googleData?.message ||
        (!isValidJson
          ? `Respons Apps Script bukan JSON valid (HTTP ${googleRes.status}).`
          : `HTTP Error ${googleRes.status} dari Google Apps Script.`);
      return res.status(502).json({
        success: false,
        error: errDetail,
        googleResponse: googleData,
      });
    }

    // Sinkronkan juga salinan ke lokal disk setelah push Google Sheet terkonfirmasi sukses
    if (itemsList.length > 0) {
      try {
        const currentItems = readSPPItemsFromDisk();
        if (action === 'UPSERT_BATCH' || action === 'UPSERT_SINGLE') {
          const getCanonKey = (item: any) => {
            const spp = String(item?.sppNumber || '').trim().toLowerCase();
            const itemArea = String(item?.area || area || '').trim().toUpperCase();
            if (spp && itemArea) return `${itemArea}::${spp}`;
            return String(item?.id || spp);
          };

          const mergedList = [...currentItems];
          itemsList.forEach((newItem: any) => {
            const syncedItem = { ...newItem, pendingSheetSync: false };
            const newCanon = getCanonKey(syncedItem);
            const idx = mergedList.findIndex(
              (cur: any) =>
                (syncedItem.id && cur.id === syncedItem.id) ||
                getCanonKey(cur) === newCanon
            );
            if (idx !== -1) {
              mergedList[idx] = { ...mergedList[idx], ...syncedItem };
            } else {
              mergedList.push(syncedItem);
            }
          });
          saveSPPItemsToDisk(mergedList);
        } else if (action === 'SYNC_FULL' && area) {
          const filteredOtherAreas = currentItems.filter((i: any) => i.area !== area);
          const cleaned = itemsList.map((item: any) => ({ ...item, pendingSheetSync: false }));
          saveSPPItemsToDisk([...cleaned, ...filteredOtherAreas]);
        }
      } catch (storageErr) {
        console.warn('[GoogleSheetProxy] Gagal sinkronkan salinan lokal disk:', storageErr);
      }
    }

    return res.json({
      success: true,
      count: itemsList.length,
      area: area || googleData?.area,
      message: googleData?.message || `Berhasil menyimpan ${itemsList.length} data ke Google Sheet`,
      googleResponse: googleData,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[GoogleSheetProxy Error]:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Terjadi kesalahan pada proxy Google Sheet',
    });
  }
}

export async function proxyGoogleSheetPull(req: any, res: any) {
  try {
    const { webAppUrl, area } = req.query;
    const configs = readAreaConfigsFromDisk();

    let targetUrl = typeof webAppUrl === 'string' && webAppUrl.trim().startsWith('http')
      ? webAppUrl.trim()
      : '';

    if (!targetUrl && area && typeof area === 'string' && configs[area]?.webAppUrl) {
      targetUrl = configs[area].webAppUrl;
    }
    if (!targetUrl && area && typeof area === 'string' && DEFAULT_AREA_CONFIGS[area]?.webAppUrl) {
      targetUrl = DEFAULT_AREA_CONFIGS[area].webAppUrl;
    }

    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'URL Google Apps Script tidak valid.',
      });
    }

    const googleRes = await fetch(targetUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'follow',
    });

    if (!googleRes.ok) {
      return res.status(googleRes.status).json({
        success: false,
        error: `HTTP Error: ${googleRes.status} ${googleRes.statusText}`,
      });
    }

    const googleData = await googleRes.json();
    return res.json(googleData);
  } catch (err: any) {
    console.error('[GoogleSheetPull Error]:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal menarik data dari Google Apps Script',
    });
  }
}

export async function proxyGoogleSheetTest(req: any, res: any) {
  try {
    const { webAppUrl, area } = req.query;
    const configs = readAreaConfigsFromDisk();

    let targetUrl = typeof webAppUrl === 'string' && webAppUrl.trim().startsWith('http')
      ? webAppUrl.trim()
      : '';

    if (!targetUrl && area && typeof area === 'string' && configs[area]?.webAppUrl) {
      targetUrl = configs[area].webAppUrl;
    }

    if (!targetUrl) {
      return res.status(400).json({ status: 'error', message: 'URL Google Apps Script tidak valid.' });
    }

    const pingUrl = targetUrl.includes('?') ? `${targetUrl}&action=PING` : `${targetUrl}?action=PING`;
    const googleRes = await fetch(pingUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'follow',
    });

    const data = await googleRes.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err?.message || 'Gagal koneksi' });
  }
}

export async function proxyGoogleSheetClear(req: any, res: any) {
  try {
    const { webAppUrl, area } = req.body;
    const configs = readAreaConfigsFromDisk();
    let targetUrl = typeof webAppUrl === 'string' && webAppUrl.trim().startsWith('http')
      ? webAppUrl.trim()
      : '';
    if (!targetUrl && area && configs[area]?.webAppUrl) {
      targetUrl = configs[area].webAppUrl;
    }
    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'URL Google Apps Script tidak valid.' });
    }
    const googleRes = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'CLEAR_ALL' }),
      redirect: 'follow',
    });
    const text = await googleRes.text();
    let googleData = {};
    try { googleData = JSON.parse(text); } catch { googleData = { raw: text }; }
    return res.json({ success: true, googleResponse: googleData });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
}
