import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfigurasi koneksi MySQL (Default Laragon)
export const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_sja_monitoring',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Fallback folder penyimpanan file JSON jika MySQL belum dinyalakan di Laragon
export const DATA_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let pool: mysql.Pool | null = null;
let isMySQLLive = false;

/**
 * Mencoba menginisialisasi koneksi ke MySQL Laragon
 */
export async function initDatabaseConnection(): Promise<{ connected: boolean; engine: 'mysql' | 'json_storage' }> {
  try {
    // Buat database jika belum ada di Laragon
    const tempConnection = await mysql.createConnection({
      host: DB_CONFIG.host,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      port: DB_CONFIG.port,
      connectTimeout: 2000,
    });

    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConnection.end();

    // Inisialisasi pool
    pool = mysql.createPool(DB_CONFIG);

    // Tes koneksi
    const testConn = await pool.getConnection();
    testConn.release();

    isMySQLLive = true;
    console.log(`[Database] ✅ Terhubung ke MySQL Laragon (${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database})`);

    // Otomatis verifikasi dan buat tabel jika belum ada
    await createTablesIfNotExist();

    return { connected: true, engine: 'mysql' };
  } catch (err: any) {
    isMySQLLive = false;
    pool = null;
    console.warn(`[Database] ℹ️ MySQL Laragon tidak terdeteksi (${err.code || err.message}). Menggunakan penyimpanan lokal JSON di folder /data`);
    return { connected: false, engine: 'json_storage' };
  }
}

/**
 * Auto-migration: Membuat tabel yang dibutuhkan jika belum dibuat
 */
async function createTablesIfNotExist() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS spp_items (
        id VARCHAR(100) PRIMARY KEY,
        budget_received_date DATE NOT NULL,
        spp_number VARCHAR(100) NOT NULL,
        pic VARCHAR(100) NOT NULL,
        area ENUM('SEPANJANG', 'KARAWANG', 'SUKODONO', 'SEMARANG') NOT NULL,
        po_date DATE NULL,
        po_number VARCHAR(100) NULL,
        process_days INT DEFAULT 0,
        status_po ENUM('OPEN', 'CLOSE') DEFAULT 'OPEN',
        status_ontime ENUM('ONTIME', 'TERLAMBAT') DEFAULT 'ONTIME',
        sla_limit INT DEFAULT 10,
        is_urgent_advance BOOLEAN DEFAULT FALSE,
        urgent_reason TEXT NULL,
        urgent_approved_by VARCHAR(100) NULL,
        budget_status ENUM('APPROVED', 'PENDING_ACC', 'REJECTED') DEFAULT 'APPROVED',
        special_condition VARCHAR(150) NULL,
        special_condition_reason TEXT NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_area_status (area, status_po),
        INDEX idx_spp_number (spp_number),
        INDEX idx_pic (pic)
      ) ENGINE=InnoDB;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS area_configs (
        area ENUM('SEPANJANG', 'KARAWANG', 'SUKODONO', 'SEMARANG') PRIMARY KEY,
        web_app_url TEXT NULL,
        spreadsheet_url TEXT NULL,
        sheet_name VARCHAR(100) NOT NULL,
        auto_sync BOOLEAN DEFAULT TRUE,
        last_sync_time DATETIME NULL
      ) ENGINE=InnoDB;
    `);

    console.log('[Database] ✅ Struktur tabel MySQL siap.');
  } catch (e) {
    console.error('[Database] Gagal verifikasi tabel MySQL:', e);
  }
}

export function getDbPool(): mysql.Pool | null {
  return pool;
}

export function isUsingMySQL(): boolean {
  return isMySQLLive && pool !== null;
}
