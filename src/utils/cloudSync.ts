import { AreaSheetConfigMap, GoogleSheetConfig, SJAArea, SPPItem } from '../types';
import { DEFAULT_AREA_SHEET_CONFIGS } from './initialData';

const STORAGE_KEY = 'sja_area_sheet_configs';
const ITEMS_STORAGE_KEY = 'spp_monitoring_data';

// Default initial configurations for all 4 SJA branches (Multi-PC & Static GitHub Hosting Ready)
export const OFFICIAL_4_PLANTS_CONFIGS: AreaSheetConfigMap = {
  SEPANJANG: {
    webAppUrl: 'https://script.google.com/macros/s/AKfycbwfy4zNVl1Lj4dj_1s4mo0R8UQFPS4PB3VvcDABYNiYCuc3zBsPJj9yx_KLP4QJEOg/exec',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1JvQux9Qf1Od5mn14AFocvdnwA1J4u-YMMxRQvU09baY/edit?usp=sharing',
    sheetName: 'SPP_Sepanjang',
    autoSync: true,
    syncStatus: 'connected',
  },
  KARAWANG: {
    webAppUrl: 'https://script.google.com/macros/s/AKfycbzw9Op3_EW4Gdmgw9rvejLKTC1pRsRIIb43AgMeCE3qTZduqckClLWZ0_W3v5h2PRW4/exec',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1pWkSeC13WL3b_39jencQqik23KC8wOL766CgZZ6QdB4/edit?usp=sharing',
    sheetName: 'SPP_Karawang',
    autoSync: true,
    syncStatus: 'connected',
  },
  SUKODONO: {
    webAppUrl: 'https://script.google.com/macros/s/AKfycbx2ZMN-kHDzoa5ZP3lODQTDF-sPt2vIMuXWb5NuodG7IrUmUQqHr6YDby0azMYHc5GE/exec',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1a2xdnsX1QlKIyifygmMZnX0VkKnf-dXyX-iCb6XnHtM/edit?usp=sharing',
    sheetName: 'SPP_Sukodono',
    autoSync: true,
    syncStatus: 'connected',
  },
  SEMARANG: {
    webAppUrl: 'https://script.google.com/macros/s/AKfycbzi8X67Wm629RVYGTjiliCO3LNAdCs6MliRuGZmC0tYIHdlWWVvvxHEr881GkDjdBgW/exec',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1biBuVUj9OVa9cvuDc-PuUpLUfd3ESQ90EIn8c0TfkwU/edit?usp=sharing',
    sheetName: 'SPP_Semarang',
    autoSync: true,
    syncStatus: 'connected',
  },
};

export const PHOTO_SUKODONO_CONFIG: GoogleSheetConfig = OFFICIAL_4_PLANTS_CONFIGS.SUKODONO;

/**
 * Mendapatkan konfigurasi default dengan fallback lokal
 * Menjamin ke-4 cabang langsung terisi lengkap saat dibuka di PC lain & hosting GitHub
 */
export function getFallbackAreaConfigs(): AreaSheetConfigMap {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        const merged: AreaSheetConfigMap = {
          SEPANJANG: {
            ...OFFICIAL_4_PLANTS_CONFIGS.SEPANJANG,
            ...parsed.SEPANJANG,
            webAppUrl: parsed.SEPANJANG?.webAppUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.SEPANJANG.webAppUrl,
            spreadsheetUrl: parsed.SEPANJANG?.spreadsheetUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.SEPANJANG.spreadsheetUrl,
          },
          KARAWANG: {
            ...OFFICIAL_4_PLANTS_CONFIGS.KARAWANG,
            ...parsed.KARAWANG,
            webAppUrl: parsed.KARAWANG?.webAppUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.KARAWANG.webAppUrl,
            spreadsheetUrl: parsed.KARAWANG?.spreadsheetUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.KARAWANG.spreadsheetUrl,
          },
          SUKODONO: {
            ...OFFICIAL_4_PLANTS_CONFIGS.SUKODONO,
            ...parsed.SUKODONO,
            webAppUrl: parsed.SUKODONO?.webAppUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.SUKODONO.webAppUrl,
            spreadsheetUrl: parsed.SUKODONO?.spreadsheetUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.SUKODONO.spreadsheetUrl,
          },
          SEMARANG: {
            ...OFFICIAL_4_PLANTS_CONFIGS.SEMARANG,
            ...parsed.SEMARANG,
            webAppUrl: parsed.SEMARANG?.webAppUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.SEMARANG.webAppUrl,
            spreadsheetUrl: parsed.SEMARANG?.spreadsheetUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.SEMARANG.spreadsheetUrl,
          },
        };
        return merged;
      }
    }
  } catch (e) {
    console.warn('Gagal membaca area config dari localStorage:', e);
  }

  return OFFICIAL_4_PLANTS_CONFIGS;
}

/**
 * Mengambil konfigurasi Google Sheet per area dari Cloud Server Backend
 * Memastikan data tersimpan permanen di cloud dan identik di semua PC/Browser
 */
export async function fetchCloudAreaConfigs(): Promise<AreaSheetConfigMap> {
  try {
    const res = await fetch('/api/area-configs', {
      headers: { 'Accept': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.configs) {
        const merged: AreaSheetConfigMap = {
          SEPANJANG: {
            ...OFFICIAL_4_PLANTS_CONFIGS.SEPANJANG,
            ...data.configs.SEPANJANG,
            webAppUrl: data.configs.SEPANJANG?.webAppUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.SEPANJANG.webAppUrl,
            spreadsheetUrl: data.configs.SEPANJANG?.spreadsheetUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.SEPANJANG.spreadsheetUrl,
          },
          KARAWANG: {
            ...OFFICIAL_4_PLANTS_CONFIGS.KARAWANG,
            ...data.configs.KARAWANG,
            webAppUrl: data.configs.KARAWANG?.webAppUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.KARAWANG.webAppUrl,
            spreadsheetUrl: data.configs.KARAWANG?.spreadsheetUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.KARAWANG.spreadsheetUrl,
          },
          SUKODONO: {
            ...OFFICIAL_4_PLANTS_CONFIGS.SUKODONO,
            ...data.configs.SUKODONO,
            webAppUrl: data.configs.SUKODONO?.webAppUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.SUKODONO.webAppUrl,
            spreadsheetUrl: data.configs.SUKODONO?.spreadsheetUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.SUKODONO.spreadsheetUrl,
          },
          SEMARANG: {
            ...OFFICIAL_4_PLANTS_CONFIGS.SEMARANG,
            ...data.configs.SEMARANG,
            webAppUrl: data.configs.SEMARANG?.webAppUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.SEMARANG.webAppUrl,
            spreadsheetUrl: data.configs.SEMARANG?.spreadsheetUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS.SEMARANG.spreadsheetUrl,
          },
        };
        // Simpan juga salinan lokal sebagai cache offline cepat
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    }
  } catch (err) {
    console.warn('Koneksi ke backend cloud /api/area-configs belum aktif, menggunakan data tersimpan:', err);
  }

  return getFallbackAreaConfigs();
}

/**
 * Menyimpan konfigurasi Google Sheet area secara permanen ke Cloud Server Backend
 * Akan tersimpan di cloud file system / database sehingga tidak hilang saat dicoba di PC lain
 */
export async function saveCloudAreaConfigToServer(
  area: SJAArea, 
  newConfig: Partial<GoogleSheetConfig>
): Promise<AreaSheetConfigMap> {
  // Update local storage langsung untuk respon UI instan
  const current = getFallbackAreaConfigs();
  const updated: AreaSheetConfigMap = {
    ...current,
    [area]: {
      ...current[area],
      ...newConfig,
    },
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // Kirim ke Cloud Backend Server untuk penyimpanan permanen multi-PC
  try {
    const res = await fetch('/api/area-configs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        area,
        config: newConfig,
      }),
    });

    if (res.ok) {
      const result = await res.json();
      if (result.configs) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.configs));
        } catch {}
        return result.configs as AreaSheetConfigMap;
      }
    }
  } catch (err) {
    console.error('Gagal menyimpan config ke server backend cloud:', err);
  }

  return updated;
}

/**
 * Mengambil data SPP dari Cloud Server Backend
 */
export async function fetchCloudSPPItems(): Promise<SPPItem[] | null> {
  try {
    const res = await fetch('/api/spp-items', {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        return data.items;
      }
    }
  } catch (err) {
    console.warn('Gagal memuat SPP items dari cloud server:', err);
  }
  return null;
}

/**
 * Menyimpan data SPP ke Cloud Server Backend agar sinkron di semua PC
 */
export async function saveCloudSPPItemsToServer(items: SPPItem[]): Promise<boolean> {
  try {
    const res = await fetch('/api/spp-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Gagal sinkronisasi SPP items ke cloud server:', err);
    return false;
  }
}
