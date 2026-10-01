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
    webAppUrl: '',
    sheetName: 'SPP_Sepanjang',
    autoSync: false,
    syncStatus: 'idle',
  },
  KARAWANG: {
    webAppUrl: '',
    sheetName: 'SPP_Karawang',
    autoSync: false,
    syncStatus: 'idle',
  },
  SUKODONO: {
    webAppUrl: '',
    sheetName: 'SPP_Sukodono',
    autoSync: false,
    syncStatus: 'idle',
  },
  SEMARANG: {
    webAppUrl: '',
    sheetName: 'SPP_Semarang',
    autoSync: false,
    syncStatus: 'idle',
  },
};

// Data dummy dibersihkan (kosong) sesuai permintaan "hapus data sesuai foto"
const RAW_ITEMS: Array<{
  id: string;
  budgetReceivedDate: string;
  sppNumber: string;
  pic: string;
  area: SJAArea;
  poDate: string;
  poNumber: string;
  slaLimit: number;
}> = [];

// Contoh data demo yang dapat dimuat opsional jika pengguna ingin menguji data
export const SAMPLE_DEMO_ITEMS: Array<{
  id: string;
  budgetReceivedDate: string;
  sppNumber: string;
  pic: string;
  area: SJAArea;
  poDate: string;
  poNumber: string;
  slaLimit: number;
}> = [
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
];

export function buildProcessedSPP(rawList = RAW_ITEMS): SPPItem[] {
  return rawList.map((item) => {
    const calc = calculateWorkingDays(item.budgetReceivedDate, item.poDate || undefined);
    const processDays = calc.workingDays;
    const statusPO = item.poNumber && item.poNumber.trim() !== '' ? 'CLOSE' : 'OPEN';
    const slaLimit = item.slaLimit || 10;
    const statusOntime = processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT';
    const isHPlus3Overdue = statusPO === 'OPEN' && processDays >= 3;
    const isSignificantDelay = processDays > slaLimit;

    return {
      ...item,
      area: item.area || 'SEPANJANG',
      processDays,
      statusPO,
      statusOntime,
      isHPlus3Overdue,
      isSignificantDelay,
      slaLimit,
      createdAt: item.budgetReceivedDate + 'T08:30:00Z',
      updatedAt: new Date().toISOString(),
    };
  });
}
