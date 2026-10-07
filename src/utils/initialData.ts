import { SPPItem, UserProfile, AreaSheetConfigMap, SJAArea } from '../types';
import { calculateWorkingDays } from './holidayCalendar';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user-superadmin',
    name: 'Superadmin SJA',
    username: 'superadmin',
    password: '123',
    email: 'superadmin@sja.co.id',
    role: 'SUPERADMIN',
    area: 'ALL',
    department: 'Kantor Pusat Procurement (All Areas)',
    twoFactorEnabled: true,
    twoFactorSecret: 'SUPER-ADMIN-2FA-2026',
  },
  {
    id: 'user-sepanjang',
    name: 'SJA Sepanjang',
    username: 'sepanjang',
    password: '123',
    email: 'sepanjang@sja.co.id',
    role: 'AREA_USER',
    area: 'SEPANJANG',
    department: 'Procurement Area Sepanjang',
    twoFactorEnabled: false,
  },
  {
    id: 'user-karawang',
    name: 'SJA Karawang',
    username: 'karawang',
    password: '123',
    email: 'karawang@sja.co.id',
    role: 'AREA_USER',
    area: 'KARAWANG',
    department: 'Procurement Area Karawang',
    twoFactorEnabled: false,
  },
  {
    id: 'user-sukodono',
    name: 'SJA Sukodono',
    username: 'sukodono',
    password: '123',
    email: 'sukodono@sja.co.id',
    role: 'AREA_USER',
    area: 'SUKODONO',
    department: 'Procurement Area Sukodono',
    twoFactorEnabled: false,
  },
  {
    id: 'user-semarang',
    name: 'SJA Semarang',
    username: 'semarang',
    password: '123',
    email: 'semarang@sja.co.id',
    role: 'AREA_USER',
    area: 'SEMARANG',
    department: 'Procurement Area Semarang',
    twoFactorEnabled: false,
  },
];

export const AREA_METADATA: Record<SJAArea, { name: string; code: string; color: string }> = {
  SEPANJANG: { name: 'SJA Sepanjang', code: 'SPJ', color: 'blue' },
  KARAWANG: { name: 'SJA Karawang', code: 'KRW', color: 'emerald' },
  SUKODONO: { name: 'SJA Sukodono', code: 'SKD', color: 'purple' },
  SEMARANG: { name: 'SJA Semarang', code: 'SMG', color: 'amber' },
};

// Daftar resmi PIC Pengadaan per Cabang SJA
export const AREA_PIC_LIST: Record<SJAArea, string[]> = {
  SEPANJANG: ['Felita', 'Yuli', 'Tika', 'Ayu'],
  KARAWANG: ['Ozi', 'Yusa', 'Frans', 'Siti Kardiah'],
  SUKODONO: ['Aji', 'Ida', 'George'],
  SEMARANG: ['Dika', 'Safira', 'Ratnawati'],
};

export const getPicListForArea = (area: SJAArea): string[] => {
  return AREA_PIC_LIST[area] || AREA_PIC_LIST.SEPANJANG;
};

export const DEFAULT_AREA_SHEET_CONFIGS: AreaSheetConfigMap = {
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

export interface RawSPPItem {
  id: string;
  budgetReceivedDate: string;
  sppNumber: string;
  pic: string;
  area: SJAArea;
  poDate: string;
  poNumber: string;
  slaLimit: number;
  isUrgentAdvance?: boolean;
  urgentReason?: string;
  urgentApprovedBy?: string;
  budgetStatus?: 'APPROVED' | 'PENDING_ACC' | 'REJECTED';
  notes?: string;
}

// Data dummy dibersihkan (kosong) sesuai permintaan "hapus data sesuai foto"
const RAW_ITEMS: RawSPPItem[] = [];

// Contoh data demo yang dapat dimuat opsional jika pengguna ingin menguji data
export const SAMPLE_DEMO_ITEMS: RawSPPItem[] = [
  // SEPANJANG
  {
    id: 'SPP-SPJ-001',
    budgetReceivedDate: '2026-03-02',
    sppNumber: 'SPP/SPJ/2026/03/0014',
    pic: 'Felita',
    area: 'SEPANJANG',
    poDate: '2026-03-05',
    poNumber: 'PO/SPJ/2026/03/0112',
    slaLimit: 10,
  },
  {
    id: 'SPP-SPJ-002',
    budgetReceivedDate: '2026-03-24',
    sppNumber: 'SPP/SPJ/2026/03/0088',
    pic: 'Yuli',
    area: 'SEPANJANG',
    poDate: '',
    poNumber: '',
    slaLimit: 10,
  },
  // KARAWANG
  {
    id: 'SPP-KRW-001',
    budgetReceivedDate: '2026-03-04',
    sppNumber: 'SPP/KRW/2026/03/0029',
    pic: 'Ozi',
    area: 'KARAWANG',
    poDate: '2026-03-06',
    poNumber: 'PO/KRW/2026/03/0118',
    slaLimit: 10,
  },
  {
    id: 'SPP-KRW-002',
    budgetReceivedDate: '2026-03-22',
    sppNumber: 'SPP/KRW/2026/03/0063',
    pic: 'Frans',
    area: 'KARAWANG',
    poDate: '',
    poNumber: '',
    slaLimit: 10,
  },
  // SUKODONO
  {
    id: 'SPP-SKD-001',
    budgetReceivedDate: '2026-03-02',
    sppNumber: 'SPP/SKD/2026/03/0045',
    pic: 'Aji',
    area: 'SUKODONO',
    poDate: '2026-03-20',
    poNumber: 'PO/SKD/2026/03/0145',
    slaLimit: 10,
  },
  {
    id: 'SPP-SKD-002',
    budgetReceivedDate: '2026-03-25',
    sppNumber: 'SPP/SKD/2026/03/0091',
    pic: 'Ida',
    area: 'SUKODONO',
    poDate: '',
    poNumber: '',
    slaLimit: 10,
  },
  // SEMARANG
  {
    id: 'SPP-SMG-001',
    budgetReceivedDate: '2026-03-16',
    sppNumber: 'SPP/SMG/2026/03/0051',
    pic: 'Dika',
    area: 'SEMARANG',
    poDate: '2026-03-24',
    poNumber: 'PO/SMG/2026/03/0150',
    slaLimit: 10,
  },
  {
    id: 'SPP-SMG-002',
    budgetReceivedDate: '2026-03-26',
    sppNumber: 'SPP/SMG/2026/03/0072',
    pic: 'Safira',
    area: 'SEMARANG',
    poDate: '',
    poNumber: '',
    slaLimit: 10,
  },
  // KASUS KHUSUS DISPENSASI DARURAT: PO Terbit Mendahului ACC Budget (Plant Breakdown)
  {
    id: 'SPP-SPJ-URGENT',
    budgetReceivedDate: '2026-03-25',
    sppNumber: 'SPP/SPJ/2026/03/URG-01',
    pic: 'Felita',
    area: 'SEPANJANG',
    poDate: '2026-03-23', // PO terbit mendahului budget!
    poNumber: 'PO/SPJ/2026/03/EMG-088',
    slaLimit: 10,
    isUrgentAdvance: true,
    urgentReason: 'Breakdown Mesin Pabrik Line 2 (Spare Part Kritis)',
    urgentApprovedBy: 'Kepala Cabang / Plant Manager',
    budgetStatus: 'PENDING_ACC',
    notes: 'Dispensasi Urgent: PO diterbitkan segera atas persetujuan Kepala Cabang/Plant Manager agar produksi tidak mogok. Menunggu verifikasi nomor SPP resmi dari Tim Budget.',
  },
];

export function buildProcessedSPP(rawList: RawSPPItem[] = RAW_ITEMS): SPPItem[] {
  return rawList.map((item) => {
    const isUrgent = !!item.isUrgentAdvance;
    const calc = calculateWorkingDays(item.budgetReceivedDate, item.poDate || undefined);
    const hasPo = item.poNumber && item.poNumber.trim() !== '';
    const statusPO = hasPo ? 'CLOSE' : 'OPEN';
    const slaLimit = item.slaLimit || 10;
    // Jika darurat dan PO sudah terbit: hari proses dihitung 0 / respon cepat ontime!
    const processDays = isUrgent && hasPo ? 0 : calc.workingDays;
    const statusOntime = isUrgent ? 'ONTIME' : (processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT');
    const isHPlus3Overdue = !isUrgent && statusPO === 'OPEN' && processDays >= 3;
    const isSignificantDelay = !isUrgent && processDays > slaLimit;

    return {
      ...item,
      area: item.area || 'SEPANJANG',
      processDays,
      statusPO,
      statusOntime,
      isHPlus3Overdue,
      isSignificantDelay,
      slaLimit,
      isUrgentAdvance: isUrgent,
      urgentReason: item.urgentReason,
      urgentApprovedBy: item.urgentApprovedBy,
      budgetStatus: item.budgetStatus || (isUrgent ? 'PENDING_ACC' : 'APPROVED'),
      createdAt: item.budgetReceivedDate + 'T08:30:00Z',
      updatedAt: new Date().toISOString(),
    };
  });
}
