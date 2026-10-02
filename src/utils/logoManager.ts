/**
 * Utility for managing custom company logo with automatic LocalStorage persistence
 */

import { DEFAULT_SYSTEM_LOGO } from './defaultLogo';

const LOGO_STORAGE_KEY = 'sja_custom_logo';

export { DEFAULT_SYSTEM_LOGO };

export const getStoredLogo = (): string => {
  try {
    const stored = localStorage.getItem(LOGO_STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      // Bersihkan cache lama jika masih menyimpan SVG logo generator terdahulu
      if (stored.startsWith('data:image/svg')) {
        localStorage.removeItem(LOGO_STORAGE_KEY);
        return DEFAULT_SYSTEM_LOGO;
      }
      return stored;
    }
  } catch {}
  return DEFAULT_SYSTEM_LOGO;
};

export const saveStoredLogo = (dataUrl: string): void => {
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
  } catch (err) {
    console.warn('Gagal menyimpan logo ke localStorage:', err);
  }
};

export const removeStoredLogo = (): void => {
  try {
    localStorage.removeItem(LOGO_STORAGE_KEY);
  } catch (err) {
    console.warn('Gagal menghapus logo dari localStorage:', err);
  }
};

/**
 * Optimizes and crops/resizes an uploaded image file to max 256x256 base64 PNG
 */
export const processImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File harus berupa gambar (PNG, JPG, SVG, WebP)'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const optimizedDataUrl = canvas.toDataURL('image/png', 0.92);
        resolve(optimizedDataUrl);
      };
      img.onerror = () => {
        reject(new Error('Gagal memproses gambar'));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar'));
    };
    reader.readAsDataURL(file);
  });
};
