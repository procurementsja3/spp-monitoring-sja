export type SJAArea = 'SEPANJANG' | 'KARAWANG' | 'SUKODONO' | 'SEMARANG';

export type UserRole = 'SUPERADMIN' | 'AREA_USER' | 'ADMIN_PENGADAAN' | 'STAFF_PIC' | 'TEAM_BUDGET' | 'AUDITOR';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  password?: string;
  email: string;
  role: UserRole;
  area: SJAArea | 'ALL';
  department: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
}

export type POStatus = 'OPEN' | 'CLOSE';
export type SLAStatus = 'ONTIME' | 'TERLAMBAT';
export type BudgetStatus = 'APPROVED' | 'PENDING_ACC' | 'REJECTED';

export interface SPPItem {
  id: string;
  budgetReceivedDate: string; // Tanggal terima dari Team Budget (YYYY-MM-DD)
  sppNumber: string;          // Nomor SPP
  pic: string;                // PIC
  area: SJAArea;              // Area cabang SJA (SEPANJANG, KARAWANG, SUKODONO, SEMARANG)
  poDate?: string;            // Tanggal PO (YYYY-MM-DD)
  poNumber?: string;          // Nomor PO (jika terisi -> otomatis Close)
  processDays: number;        // Jumlah hari proses (rumus tgl terima s/d tgl PO minus sabtu-minggu & libur nasional)
  statusPO: POStatus;         // Otomatis CLOSE bila poNumber terisi, OPEN bila kosong
  statusOntime: SLAStatus;    // ONTIME jika processDays <= slaLimit, TERLAMBAT jika melampaui
  slaLimit: number;           // Batas waktu proses SLA (default: 10 hari kerja)
  isHPlus3Overdue: boolean;   // Notifikasi H+3: diterima tim budget >= 3 hari kerja belum ada nomor PO
  isSignificantDelay: boolean;// Keterlambatan signifikan (> 10 hari kerja)
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Fitur Dispensasi Urgent / Advance PO (PO Mendahului ACC Budget)
  isUrgentAdvance?: boolean;     // Apakah ini PO Darurat / Advance PO
  urgentReason?: string;         // Alasan darurat (Breakdown Mesin, Stok Habis, dll)
  urgentApprovedBy?: string;     // Otorisator / Pejabat yang menyetujui dispensasi
  budgetStatus?: BudgetStatus;   // Status persetujuan budget (APPROVED, PENDING_ACC, REJECTED)

  // Fitur Kasus Khusus Pengadaan (Perubahan Spek/Data, Hold PO, dll)
  specialCondition?: string;         // Kategori / Keterangan Kondisi Khusus
  specialConditionReason?: string;   // Penjelasan detail kasus / alasan PO belum bisa dibuat
}

export interface IndonesianHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'NASIONAL' | 'CUTI_BERSAMA';
}

export interface PicEfficiencyMetric {
  picName: string;
  totalSPP: number;
  completedPO: number;
  openPO: number;
  ontimePercentage: number;
  avgProcessDays: number;
  tier: 'Performa Sangat Baik' | 'Performa Baik' | 'Perlu Perhatian';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  action: string;
  targetId?: string;
  details: string;
  ipAddress: string;
  checksum: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  severity: 'urgent' | 'warning' | 'info';
  sppNumber?: string;
  timestamp: string;
  read: boolean;
  type: 'H_PLUS_3' | 'SIGNIFICANT_DELAY' | 'SLA_BREACH' | 'ERP_SYNC' | 'SECURITY' | 'SPECIAL_CASE';
  picTarget?: string;
  specialCondition?: string;
}

export interface GoogleSheetConfig {
  webAppUrl: string;
  spreadsheetUrl?: string; // URL tautan langsung ke dokumen Google Spreadsheet
  sheetName: string;
  autoSync: boolean;
  lastSyncTime?: string;
  syncStatus: 'idle' | 'syncing' | 'connected' | 'error';
  errorMessage?: string;
}

export type AreaSheetConfigMap = Record<SJAArea, GoogleSheetConfig>;
