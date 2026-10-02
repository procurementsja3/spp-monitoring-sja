import { AreaSheetConfigMap, GoogleSheetConfig, SJAArea, SPPItem } from '../types';
import { DEFAULT_AREA_SHEET_CONFIGS } from './initialData';

const STORAGE_KEY = 'sja_area_sheet_configs';
const ITEMS_STORAGE_KEY = 'spp_monitoring_data';

// Default initial Sukodono URLs as specified in the system specification
export const PHOTO_SUKODONO_CONFIG: GoogleSheetConfig = {
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1a2xdnsX1QlKIyifygmMZnX0VkKnf-dXyX-iCb6XnHtM/edit?usp=sharing',
  webAppUrl: 'https://script.google.com/macros/s/AKfycbx2ZMN-kHDzoa5ZP3lODQTDF-sPt2vIMuXWb5NuodG7IrUmUQqHr6YDby0azMYHc5GE/exec',
  sheetName: 'SPP_Sukodono',
  autoSync: true,
  syncStatus: 'connected',
};

/**
 * Mendapatkan konfigurasi default dengan fallback lokal
 */
export function getFallbackAreaConfigs(): AreaSheetConfigMap {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        // Pastikan Sukodono terisi jika masih kosong
        if (!parsed.SUKODONO?.webAppUrl && !parsed.SUKODONO?.spreadsheetUrl) {
          parsed.SUKODONO = { ...parsed.SUKODONO, ...PHOTO_SUKODONO_CONFIG };
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Gagal membaca area config dari localStorage:', e);
  }

  return {
    ...DEFAULT_AREA_SHEET_CONFIGS,
    SUKODONO: {
      ...DEFAULT_AREA_SHEET_CONFIGS.SUKODONO,
      ...PHOTO_SUKODONO_CONFIG,
    },
  };
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
        // Simpan juga salinan lokal sebagai cache offline cepat
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.configs));
        } catch {}
        return data.configs as AreaSheetConfigMap;
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
