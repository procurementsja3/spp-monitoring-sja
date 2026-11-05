import fs from 'fs';
import path from 'path';
import { DATA_DIR, getDbPool, isUsingMySQL } from '../config/database.js';

const CONFIGS_FILE = path.join(DATA_DIR, 'cloud_area_configs.json');

export const DEFAULT_AREA_CONFIGS: Record<string, any> = {
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
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/u/0/?q=SPP_Sukodono',
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

export function mergeWithDefaults(parsed: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, def] of Object.entries(DEFAULT_AREA_CONFIGS)) {
    const p = parsed?.[key] || {};
    let sUrl = (typeof p.spreadsheetUrl === 'string' && p.spreadsheetUrl.trim() !== '') ? p.spreadsheetUrl.trim() : def.spreadsheetUrl;
    if (key === 'SUKODONO' && sUrl.includes('1a2xdnsX1QlKIyifygmMZnX0VkKnf-dXyX-iCb6XnHtM')) {
      sUrl = def.spreadsheetUrl;
    }
    result[key] = {
      ...def,
      ...p,
      webAppUrl: (typeof p.webAppUrl === 'string' && p.webAppUrl.trim() !== '') ? p.webAppUrl.trim() : def.webAppUrl,
      spreadsheetUrl: sUrl,
      sheetName: (typeof p.sheetName === 'string' && p.sheetName.trim() !== '') ? p.sheetName.trim() : def.sheetName,
      syncStatus: (p.syncStatus && p.syncStatus !== 'idle') ? p.syncStatus : 'connected',
      autoSync: true,
      lastSyncTime: p.lastSyncTime || new Date().toISOString(),
    };
  }
  return result;
}

export function readAreaConfigsFromDisk(): Record<string, any> {
  try {
    if (fs.existsSync(CONFIGS_FILE)) {
      const content = fs.readFileSync(CONFIGS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return mergeWithDefaults(parsed);
    }
  } catch (err) {
    console.error('[ConfigController] Gagal membaca cloud_area_configs.json:', err);
  }
  saveAreaConfigsToDisk(DEFAULT_AREA_CONFIGS);
  return DEFAULT_AREA_CONFIGS;
}

export function saveAreaConfigsToDisk(configs: Record<string, any>): boolean {
  try {
    fs.writeFileSync(CONFIGS_FILE, JSON.stringify(configs, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[ConfigController] Gagal menulis cloud_area_configs.json:', err);
    return false;
  }
}

/**
 * Controller: Mengambil konfigurasi cabang
 */
export async function getAreaConfigs(_req: any, res: any) {
  try {
    const pool = getDbPool();
    if (isUsingMySQL() && pool) {
      try {
        const [rows] = await pool.query('SELECT * FROM area_configs');
        const dbConfigs: Record<string, any> = {};
        for (const row of rows as any[]) {
          dbConfigs[row.area] = {
            webAppUrl: row.web_app_url,
            spreadsheetUrl: row.spreadsheet_url,
            sheetName: row.sheet_name,
            autoSync: Boolean(row.auto_sync),
            lastSyncTime: row.last_sync_time,
          };
        }
        const merged = mergeWithDefaults(dbConfigs);
        return res.json({
          success: true,
          configs: merged,
          engine: 'mysql',
          timestamp: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('[ConfigController] Fallback ke disk karena MySQL error:', dbErr);
      }
    }

    const configs = readAreaConfigsFromDisk();
    return res.json({
      success: true,
      configs,
      engine: 'json_disk',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Controller: Menyimpan konfigurasi cabang
 */
export async function saveAreaConfig(req: any, res: any) {
  try {
    const { area, config, configs } = req.body;
    const current = readAreaConfigsFromDisk();
    let updated = { ...current };

    if (configs && typeof configs === 'object') {
      updated = mergeWithDefaults({ ...updated, ...configs });
    } else if (area && config && typeof config === 'object') {
      const mergedArea = {
        ...(updated[area] || {}),
        ...config,
      };
      if (!mergedArea.spreadsheetUrl || mergedArea.spreadsheetUrl.trim() === '') {
        mergedArea.spreadsheetUrl = DEFAULT_AREA_CONFIGS[area]?.spreadsheetUrl || '';
      }
      if (!mergedArea.webAppUrl || mergedArea.webAppUrl.trim() === '') {
        mergedArea.webAppUrl = DEFAULT_AREA_CONFIGS[area]?.webAppUrl || '';
      }
      updated[area] = mergedArea;
      updated = mergeWithDefaults(updated);
    } else {
      return res.status(400).json({ error: 'Payload tidak valid. Butuh { area, config } atau { configs }' });
    }

    // Simpan ke disk
    saveAreaConfigsToDisk(updated);

    // Simpan juga ke MySQL jika aktif
    const pool = getDbPool();
    if (isUsingMySQL() && pool) {
      try {
        for (const [aKey, aVal] of Object.entries(updated)) {
          await pool.query(`
            INSERT INTO area_configs (area, web_app_url, spreadsheet_url, sheet_name, auto_sync, last_sync_time)
            VALUES (?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
              web_app_url = VALUES(web_app_url),
              spreadsheet_url = VALUES(spreadsheet_url),
              sheet_name = VALUES(sheet_name),
              auto_sync = VALUES(auto_sync),
              last_sync_time = NOW()
          `, [aKey, aVal.webAppUrl, aVal.spreadsheetUrl, aVal.sheetName, aVal.autoSync ? 1 : 0]);
        }
      } catch (sqlErr) {
        console.warn('[ConfigController] Peringatan: gagal simpan config ke MySQL:', sqlErr);
      }
    }

    return res.json({
      success: true,
      message: 'Konfigurasi berhasil disimpan',
      configs: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
