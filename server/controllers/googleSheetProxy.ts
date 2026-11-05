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
    try {
      googleData = JSON.parse(responseText);
    } catch {
      googleData = { raw: responseText };
    }

    // Sinkronkan juga salinan ke lokal disk
    if (itemsList.length > 0) {
      try {
        const currentItems = readSPPItemsFromDisk();
        if (action === 'UPSERT_BATCH' || action === 'UPSERT_SINGLE') {
          const currentMap = new Map(currentItems.map((i: any) => [i.id || i.sppNumber, i]));
          itemsList.forEach((newItem: any) => {
            currentMap.set(newItem.id || newItem.sppNumber, newItem);
          });
          saveSPPItemsToDisk(Array.from(currentMap.values()));
        } else if (action === 'SYNC_FULL' && area) {
          const filteredOtherAreas = currentItems.filter((i: any) => i.area !== area);
          saveSPPItemsToDisk([...itemsList, ...filteredOtherAreas]);
        }
      } catch (storageErr) {
        console.warn('[GoogleSheetProxy] Gagal sinkronkan salinan lokal disk:', storageErr);
      }
    }

    if (googleData?.status === 'error') {
      return res.status(502).json({
        success: false,
        error: googleData.message || 'Apps Script melaporkan error',
        googleResponse: googleData,
      });
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
