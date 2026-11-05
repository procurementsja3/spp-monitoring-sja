import { AreaSheetConfigMap, GoogleSheetConfig, SJAArea, SPPItem } from '../types';

/**
 * Base URL API Backend:
 * - Jika kosong (''), request akan diarahkan relatif (misal: /api/spp-items)
 * - Jika frontend dipisah ke server lain, set variabel env VITE_API_BASE_URL (contoh: http://localhost:5000)
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Service Client terpusat untuk komunikasi Frontend ke Backend
 */
export class ApiService {
  /**
   * Cek status koneksi backend dan engine database yang sedang aktif (MySQL vs JSON Disk)
   */
  static async checkStatus(): Promise<{
    status: string;
    databaseEngine: string;
    mysqlConfig?: any;
    message: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/api/status`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return res.json();
  }

  /**
   * Mengambil semua data SPP dari backend
   */
  static async getSPPItems(): Promise<SPPItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/spp-items`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Gagal memuat SPP items: ${res.statusText}`);
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  }

  /**
   * Menyimpan / sinkronisasi data SPP ke backend
   */
  static async saveSPPItems(items: SPPItem[]): Promise<{ success: boolean; count: number; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/spp-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) throw new Error(`Gagal menyimpan SPP items: ${res.statusText}`);
    return res.json();
  }

  /**
   * Menghapus 1 item SPP berdasarkan ID
   */
  static async deleteSPPItem(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/spp-items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Gagal menghapus item SPP: ${res.statusText}`);
    return res.json();
  }

  /**
   * Mengambil konfigurasi link cabang
   */
  static async getAreaConfigs(): Promise<AreaSheetConfigMap> {
    const res = await fetch(`${API_BASE_URL}/api/area-configs`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Gagal memuat area configs: ${res.statusText}`);
    const data = await res.json();
    return data.configs;
  }

  /**
   * Menyimpan konfigurasi cabang ke backend
   */
  static async saveAreaConfig(
    area: SJAArea,
    config: Partial<GoogleSheetConfig>
  ): Promise<AreaSheetConfigMap> {
    const res = await fetch(`${API_BASE_URL}/api/area-configs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area, config }),
    });
    if (!res.ok) throw new Error(`Gagal menyimpan konfigurasi cabang: ${res.statusText}`);
    const data = await res.json();
    return data.configs;
  }

  /**
   * Proxy push ke Google Apps Script
   */
  static async pushGoogleSheet(payload: {
    webAppUrl?: string;
    items?: SPPItem | SPPItem[];
    mode?: string;
    area?: SJAArea;
  }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/google-sheet/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }
}
