import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Folder penyimpanan permanen di cloud server (Cloud Persistence)
const DATA_DIR = path.resolve(__dirname, 'data');
const CONFIGS_FILE = path.join(DATA_DIR, 'cloud_area_configs.json');
const ITEMS_FILE = path.join(DATA_DIR, 'cloud_spp_items.json');

// Inisialisasi direktori data
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Konfigurasi awal default Google Sheet (termasuk link resmi SJA Sukodono dari spesifikasi)
const DEFAULT_AREA_CONFIGS = {
  SEPANJANG: {
    webAppUrl: 'https://script.google.com/macros/s/AKfycbwfy4zNVl1Lj4dj_1s4mo0R8UQFPS4PB3VvcDABYNiYCuc3zBsPJj9yx_KLP4QJEOg/exec',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1JvQux9Qf1Od5mn14AFocvdnwA1J4u-YMMxRQvU09baY/edit?usp=sharing',
    sheetName: 'SPP_Sepanjang',
    autoSync: true,
    syncStatus: 'connected',
    lastSyncTime: new Date().toISOString(),
  },
  KARAWANG: {
    webAppUrl: 'https://script.google.com/macros/s/AKfycbzw9Op3_EW4Gdmgw9rvejLKTC1pRsRIIb43AgMeCE3qTZduqckClLWZ0_W3v5h2PRW4/exec',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1pWkSeC13WL3b_39jencQqik23KC8wOL766CgZZ6QdB4/edit?usp=sharing',
    sheetName: 'SPP_Karawang',
    autoSync: true,
    syncStatus: 'connected',
    lastSyncTime: new Date().toISOString(),
  },
  SUKODONO: {
    webAppUrl: 'https://script.google.com/macros/s/AKfycbx2ZMN-kHDzoa5ZP3lODQTDF-sPt2vIMuXWb5NuodG7IrUmUQqHr6YDby0azMYHc5GE/exec',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1a2xdnsX1QlKIyifygmMZnX0VkKnf-dXyX-iCb6XnHtM/edit?usp=sharing',
    sheetName: 'SPP_Sukodono',
    autoSync: true,
    syncStatus: 'connected',
    lastSyncTime: new Date().toISOString(),
  },
  SEMARANG: {
    webAppUrl: 'https://script.google.com/macros/s/AKfycbzi8X67Wm629RVYGTjiliCO3LNAdCs6MliRuGZmC0tYIHdlWWVvvxHEr881GkDjdBgW/exec',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1biBuVUj9OVa9cvuDc-PuUpLUfd3ESQ90EIn8c0TfkwU/edit?usp=sharing',
    sheetName: 'SPP_Semarang',
    autoSync: true,
    syncStatus: 'connected',
    lastSyncTime: new Date().toISOString(),
  },
};

// Helper menggabungkan konfigurasi dengan default resmi agar tidak pernah berubah kosong
function mergeWithDefaults(parsed: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, def] of Object.entries(DEFAULT_AREA_CONFIGS)) {
    const p = parsed?.[key] || {};
    result[key] = {
      ...def,
      ...p,
      // Jika URL kosong atau blank, selalu gunakan default resmi terlampir agar tidak pernah kosong
      webAppUrl: (typeof p.webAppUrl === 'string' && p.webAppUrl.trim() !== '') ? p.webAppUrl.trim() : def.webAppUrl,
      spreadsheetUrl: (typeof p.spreadsheetUrl === 'string' && p.spreadsheetUrl.trim() !== '') ? p.spreadsheetUrl.trim() : def.spreadsheetUrl,
      sheetName: (typeof p.sheetName === 'string' && p.sheetName.trim() !== '') ? p.sheetName.trim() : def.sheetName,
      syncStatus: (p.syncStatus && p.syncStatus !== 'idle') ? p.syncStatus : 'connected',
      autoSync: true,
      lastSyncTime: p.lastSyncTime || new Date().toISOString(),
    };
  }
  return result;
}

// Helper membaca konfigurasi dari storage disk server
function readAreaConfigs(): Record<string, any> {
  try {
    if (fs.existsSync(CONFIGS_FILE)) {
      const content = fs.readFileSync(CONFIGS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      const merged = mergeWithDefaults(parsed);
      return merged;
    }
  } catch (err) {
    console.error('[Cloud Storage] Gagal membaca cloud_area_configs.json:', err);
  }
  // Tulis file default jika belum ada
  saveAreaConfigs(DEFAULT_AREA_CONFIGS);
  return DEFAULT_AREA_CONFIGS;
}

// Helper menyimpan konfigurasi ke storage disk server secara atomik
function saveAreaConfigs(configs: Record<string, any>): boolean {
  try {
    fs.writeFileSync(CONFIGS_FILE, JSON.stringify(configs, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Cloud Storage] Gagal menulis cloud_area_configs.json:', err);
    return false;
  }
}

// Helper membaca SPP items dari disk
function readSPPItems(): any[] {
  try {
    if (fs.existsSync(ITEMS_FILE)) {
      const content = fs.readFileSync(ITEMS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('[Cloud Storage] Gagal membaca cloud_spp_items.json:', err);
  }
  return [];
}

// Helper menyimpan SPP items ke disk
function saveSPPItems(items: any[]): boolean {
  try {
    fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Cloud Storage] Gagal menulis cloud_spp_items.json:', err);
    return false;
  }
}

// Pastikan file config awal terbentuk di server
readAreaConfigs();

async function bootstrapServer() {
  const app = express();

  // Parsing body JSON
  app.use(express.json({ limit: '20mb' }));

  // CORS headers
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
  });

  // ==========================================
  // API ROUTES (Backend Cloud Persistence)
  // ==========================================

  // 1. Health check & status
  app.get('/api/status', (_req, res) => {
    res.json({
      status: 'online',
      storage: 'persistent_cloud_disk',
      timestamp: new Date().toISOString(),
      message: 'Sistem Cloud Storage SJA Monitoring Aktif',
    });
  });

  // 2. GET /api/area-configs: Mengambil link Spreadsheet & Web App URL per-cabang
  app.get('/api/area-configs', (_req, res) => {
    const configs = readAreaConfigs();
    res.json({
      success: true,
      configs,
      persistedInCloud: true,
      timestamp: new Date().toISOString(),
    });
  });

  // 3. POST /api/area-configs: Menyimpan link secara permanen di cloud (Multi-PC, Multi-User)
  app.post('/api/area-configs', (req, res) => {
    const { area, config, configs } = req.body;
    const current = readAreaConfigs();

    let updated = { ...current };

    if (configs && typeof configs === 'object') {
      updated = mergeWithDefaults({ ...updated, ...configs });
    } else if (area && config && typeof config === 'object') {
      const mergedArea = {
        ...(updated[area] || {}),
        ...config,
      };
      // Jika spreadsheetUrl atau webAppUrl kosong/terhapus, kembalikan ke default resmi
      if (!mergedArea.spreadsheetUrl || mergedArea.spreadsheetUrl.trim() === '') {
        mergedArea.spreadsheetUrl = DEFAULT_AREA_CONFIGS[area as keyof typeof DEFAULT_AREA_CONFIGS]?.spreadsheetUrl || '';
      }
      if (!mergedArea.webAppUrl || mergedArea.webAppUrl.trim() === '') {
        mergedArea.webAppUrl = DEFAULT_AREA_CONFIGS[area as keyof typeof DEFAULT_AREA_CONFIGS]?.webAppUrl || '';
      }
      updated[area] = mergedArea;
      updated = mergeWithDefaults(updated);
    } else {
      res.status(400).json({ error: 'Payload tidak valid. Butuh { area, config } atau { configs }' });
      return;
    }

    const saved = saveAreaConfigs(updated);
    if (!saved) {
      res.status(500).json({ error: 'Gagal menulis data ke cloud storage server' });
      return;
    }

    console.log(`[Cloud Storage] Konfigurasi cabang ${area || 'SEMUA'} berhasil disimpan permanen ke server.`);
    res.json({
      success: true,
      message: `Konfigurasi berhasil disimpan permanen ke cloud server`,
      configs: updated,
      persistedInCloud: true,
      timestamp: new Date().toISOString(),
    });
  });

  // 4. GET /api/spp-items: Mengambil data SPP terpusat
  app.get('/api/spp-items', (_req, res) => {
    const items = readSPPItems();
    res.json({
      success: true,
      items,
      count: items.length,
      timestamp: new Date().toISOString(),
    });
  });

  // 5. POST /api/spp-items: Menyimpan data SPP terpusat ke cloud
  app.post('/api/spp-items', (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'Data items harus berupa Array' });
      return;
    }
    const saved = saveSPPItems(items);
    if (!saved) {
      res.status(500).json({ error: 'Gagal menyimpan items ke disk' });
      return;
    }
    res.json({
      success: true,
      count: items.length,
      message: `${items.length} item SPP berhasil disinkronkan ke cloud server`,
    });
  });

  // ==========================================
  // GOOGLE SHEET PROXY ROUTES (Server-to-Google Apps Script)
  // Menjamin komunikasi POST/GET langsung tanpa terhalang CORS browser, iframe sandbox, atau masalah redirect 302
  // ==========================================

  // 6. POST /api/google-sheet/push: Push/Create/Upsert data SPP langsung ke Google Sheet
  app.post('/api/google-sheet/push', async (req, res) => {
    try {
      const { webAppUrl, items, mode, area } = req.body;
      const configs = readAreaConfigs();

      // Dapatkan URL tujuan resmi (dari payload atau fallback otomatis dari konfigurasi server)
      let targetUrl = typeof webAppUrl === 'string' && webAppUrl.trim().startsWith('http')
        ? webAppUrl.trim()
        : '';

      if (!targetUrl && area && configs[area]?.webAppUrl) {
        targetUrl = configs[area].webAppUrl;
      }
      if (!targetUrl && area && DEFAULT_AREA_CONFIGS[area as keyof typeof DEFAULT_AREA_CONFIGS]?.webAppUrl) {
        targetUrl = DEFAULT_AREA_CONFIGS[area as keyof typeof DEFAULT_AREA_CONFIGS].webAppUrl;
      }

      if (!targetUrl) {
        res.status(400).json({
          success: false,
          error: `URL Google Apps Script tidak ditemukan untuk area ${area || 'umum'}. Pastikan URL telah dikonfigurasi.`,
        });
        return;
      }

      const action = mode || 'UPSERT_BATCH';
      const itemsList = Array.isArray(items) ? items : items ? [items] : [];

      console.log(`[Google Sheet Proxy] Mengirim ${itemsList.length} item ke Google Sheet (${area || 'Umum'}) via aksi ${action}...`);

      const payload = JSON.stringify({
        action,
        items: itemsList,
        item: itemsList.length === 1 ? itemsList[0] : undefined,
      });

      // Node.js fetch menangani redirect 302 dari Google Apps Script ke script.googleusercontent.com secara transparan
      const googleRes = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
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

      console.log(`[Google Sheet Proxy] Respon dari Apps Script (${googleRes.status}):`, googleData);

      // Sinkronkan juga salinan ke cloud_spp_items.json lokal server
      if (itemsList.length > 0) {
        try {
          const currentItems = readSPPItems();
          if (action === 'UPSERT_BATCH' || action === 'UPSERT_SINGLE') {
            const currentMap = new Map(currentItems.map((i: any) => [i.id || i.sppNumber, i]));
            itemsList.forEach((newItem: any) => {
              currentMap.set(newItem.id || newItem.sppNumber, newItem);
            });
            saveSPPItems(Array.from(currentMap.values()));
          } else if (action === 'SYNC_FULL' && area) {
            const filteredOtherAreas = currentItems.filter((i: any) => i.area !== area);
            saveSPPItems([...itemsList, ...filteredOtherAreas]);
          }
        } catch (storageErr) {
          console.warn('[Google Sheet Proxy] Gagal sinkronkan salinan lokal disk:', storageErr);
        }
      }

      if (googleData?.status === 'error') {
        res.status(502).json({
          success: false,
          error: googleData.message || 'Apps Script melaporkan error saat memproses sheet',
          googleResponse: googleData,
        });
        return;
      }

      res.json({
        success: true,
        count: itemsList.length,
        area: area || googleData?.area,
        message: googleData?.message || `Berhasil menyimpan ${itemsList.length} data ke Google Sheet`,
        googleResponse: googleData,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[Google Sheet Proxy Error]:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Terjadi kesalahan pada proxy server Google Sheet',
      });
    }
  });

  // 7. GET /api/google-sheet/pull: Menarik data SPP dari Google Sheet
  app.get('/api/google-sheet/pull', async (req, res) => {
    try {
      const { webAppUrl, area } = req.query;
      const configs = readAreaConfigs();

      let targetUrl = typeof webAppUrl === 'string' && webAppUrl.trim().startsWith('http')
        ? webAppUrl.trim()
        : '';

      if (!targetUrl && area && typeof area === 'string' && configs[area]?.webAppUrl) {
        targetUrl = configs[area].webAppUrl;
      }
      if (!targetUrl && area && typeof area === 'string' && DEFAULT_AREA_CONFIGS[area as keyof typeof DEFAULT_AREA_CONFIGS]?.webAppUrl) {
        targetUrl = DEFAULT_AREA_CONFIGS[area as keyof typeof DEFAULT_AREA_CONFIGS].webAppUrl;
      }

      if (!targetUrl) {
        res.status(400).json({
          success: false,
          error: 'URL Google Apps Script tidak valid.',
        });
        return;
      }

      const googleRes = await fetch(targetUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        redirect: 'follow',
      });

      if (!googleRes.ok) {
        res.status(googleRes.status).json({
          success: false,
          error: `HTTP Error dari Google Apps Script: ${googleRes.status} ${googleRes.statusText}`,
        });
        return;
      }

      const googleData = await googleRes.json();
      res.json(googleData);
    } catch (err: any) {
      console.error('[Google Sheet Pull Error]:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Gagal menarik data dari Google Apps Script',
      });
    }
  });

  // 8. GET /api/google-sheet/test: Tes ping koneksi ke Google Sheet
  app.get('/api/google-sheet/test', async (req, res) => {
    try {
      const { webAppUrl, area } = req.query;
      const configs = readAreaConfigs();

      let targetUrl = typeof webAppUrl === 'string' && webAppUrl.trim().startsWith('http')
        ? webAppUrl.trim()
        : '';

      if (!targetUrl && area && typeof area === 'string' && configs[area]?.webAppUrl) {
        targetUrl = configs[area].webAppUrl;
      }

      if (!targetUrl) {
        res.status(400).json({
          status: 'error',
          message: 'URL Google Apps Script tidak valid.',
        });
        return;
      }

      const pingUrl = targetUrl.includes('?') ? `${targetUrl}&action=PING` : `${targetUrl}?action=PING`;
      const googleRes = await fetch(pingUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        redirect: 'follow',
      });

      const data = await googleRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        message: err?.message || 'Gagal terhubung ke Google Apps Script',
      });
    }
  });

  // 9. POST /api/google-sheet/clear: Kosongkan baris Google Sheet
  app.post('/api/google-sheet/clear', async (req, res) => {
    try {
      const { webAppUrl, area } = req.body;
      const configs = readAreaConfigs();
      let targetUrl = typeof webAppUrl === 'string' && webAppUrl.trim().startsWith('http')
        ? webAppUrl.trim()
        : '';
      if (!targetUrl && area && configs[area]?.webAppUrl) {
        targetUrl = configs[area].webAppUrl;
      }
      if (!targetUrl) {
        res.status(400).json({ success: false, error: 'URL Google Apps Script tidak valid.' });
        return;
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
      res.json({ success: true, googleResponse: googleData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // ==========================================
  // FRONTEND SERVING (Vite in Dev / Static in Prod)
  // ==========================================
  if (!isProduction) {
    console.log('[Server] Menjalankan Vite dalam Middleware Mode (Dev Server)...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback HTML handling
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        const html = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    console.log('[Server] Menjalankan mode Production (Serving dist)...');
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SJA Monitoring Server & Cloud Storage aktif di http://0.0.0.0:${PORT}`);
  });
}

bootstrapServer().catch((err) => {
  console.error('[Server Error] Gagal menjalankan server:', err);
  process.exit(1);
});
