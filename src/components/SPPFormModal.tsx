import React, { useState, useEffect, useMemo } from 'react';
import { SPPItem, IndonesianHoliday, SJAArea, UserProfile, AreaSheetConfigMap } from '../types';
import { calculateWorkingDays } from '../utils/holidayCalendar';
import { AREA_METADATA, AREA_PIC_LIST } from '../utils/initialData';
import {
  Plus,
  Trash2,
  Clock,
  Calendar,
  User,
  Tag,
  Layers,
  Check,
  Building,
  Edit2,
  Zap,
  AlertCircle,
  FileSpreadsheet,
  Clipboard,
  ClipboardCheck,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  X,
  FileText,
  RefreshCw,
  RotateCcw,
  HelpCircle,
  Columns,
  History,
} from 'lucide-react';

interface DraftRow {
  tempId: string;
  budgetReceivedDate: string;
  sppNumber: string;
  pic: string;
  area: SJAArea;
  poDate: string;
  poNumber: string;
  slaLimit: number;
  isUrgentAdvance: boolean;
  urgentReason: string;
  urgentApprovedBy: string;
  budgetStatus: 'APPROVED' | 'PENDING_ACC' | 'REJECTED';
  specialCondition: string;
  specialConditionReason: string;
  notes: string;
}

export const PRESET_SPECIAL_CONDITIONS = [
  'Menunggu Kelengkapan Dokumen Vendor',
  'Kendala Vendor / Stok Kosong',
  'Pending Konfirmasi User / Budget',
  'Perubahan Data / Spek SPP',
  'Menunggu Sampel / Approval Teknis',
  'Hold PO / Penundaan Manajemen',
  'Batal Realisasi PO',
];

export const QUICK_SPECIAL_SUGGESTIONS = [
  'Menunggu Kelengkapan Dokumen Vendor',
  'Menunggu Surat Garansi / Izin Edar',
  'Revisi Penawaran & Spek',
  'Stok Vendor Kosong / Tunggu Impor',
  'Pending Konfirmasi User',
  'Menunggu Sampel Uji Coba',
];

interface ParsedExcelItem {
  id: string;
  sppNumber: string;
  budgetReceivedDate: string;
  area: SJAArea;
  pic: string;
  poDate: string;
  poNumber: string;
  slaLimit: number;
  notes: string;
  isValid: boolean;
  validationError?: string;
  processDays: number;
  statusPO: 'CLOSE' | 'OPEN';
  statusOntime: 'ONTIME' | 'TERLAMBAT';
  specialCondition?: string;
  specialConditionReason?: string;
}

interface SPPFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemsData: Partial<SPPItem>[]) => Promise<any> | void;
  editItem?: SPPItem | null;
  holidays: IndonesianHoliday[];
  currentUser: UserProfile;
  currentAreaFilter: SJAArea | 'ALL';
  areaConfigs?: AreaSheetConfigMap;
}

const INDO_ENG_MONTHS: Record<string, string> = {
  januari: '01', jan: '01', january: '01',
  februari: '02', feb: '02', february: '02',
  maret: '03', mar: '03', march: '03',
  april: '04', apr: '04',
  mei: '05', may: '05',
  juni: '06', jun: '06', june: '06',
  juli: '07', jul: '07', july: '07',
  agustus: '08', agu: '08', ags: '08', august: '08', aug: '08',
  september: '09', sep: '09', sept: '09',
  oktober: '10', okt: '10', october: '10', oct: '10',
  november: '11', nov: '11', nopember: '11', nop: '11',
  desember: '12', des: '12', december: '12', dec: '12',
};

// Helper cerdas parse tanggal berbagai format (ISO, DD/MM/YYYY, DD-MM-YYYY, teks DD Bulan YYYY dsb)
export const parseRawDateToISO = (val: string): string => {
  if (!val) return '';
  const trimmed = val.trim();
  if (!trimmed) return '';

  // Jangan parse nomor SPP atau PO sebagai tanggal
  if (trimmed.toUpperCase().startsWith('SPP') || trimmed.toUpperCase().startsWith('PO/')) {
    return '';
  }

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Format DD/MM/YYYY atau DD-MM-YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(trimmed)) {
    const sep = trimmed.includes('/') ? '/' : '-';
    const [d, m, y] = trimmed.split(sep);
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Format YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Format teks: "08 October 2026", "8 Oktober 2026", "24 Mar 2026"
  const textDateMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (textDateMatch) {
    const d = textDateMatch[1].padStart(2, '0');
    const mName = textDateMatch[2].toLowerCase();
    const y = textDateMatch[3];
    const m = INDO_ENG_MONTHS[mName];
    if (m) return `${y}-${m}-${d}`;
  }

  // Format teks tanpa tahun: "09 October", "09 Oktober", "9 Okt" -> gunakan tahun berjalan (2026)
  const textDateNoYearMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)$/);
  if (textDateNoYearMatch) {
    const d = textDateNoYearMatch[1].padStart(2, '0');
    const mName = textDateNoYearMatch[2].toLowerCase();
    const y = new Date().getFullYear().toString();
    const m = INDO_ENG_MONTHS[mName];
    if (m) return `${y}-${m}-${d}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return '';
};

// Daftar resmi & sinonim PIC Pengadaan SJA
export const ALL_KNOWN_PICS = [
  'Felita', 'Yuli', 'Tika', 'Ayu',
  'Ozi', 'Yusa', 'Frans', 'Siti Kardiah',
  'Aji', 'Ida', 'George',
  'Dika', 'Safira', 'Ratnawati',
  'Lia', 'Rina', 'Devi'
];

export const normalizePicName = (raw: string): string => {
  if (!raw || raw.trim() === '-' || raw.trim() === '') return '-';
  const trimmed = raw.trim();
  const found = ALL_KNOWN_PICS.find((p) => p.toLowerCase() === trimmed.toLowerCase());
  if (found) return found;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

export const getAreaForPic = (picName: string): SJAArea | null => {
  if (!picName || picName === '-') return null;
  const lower = picName.trim().toLowerCase();
  for (const [areaKey, pics] of Object.entries(AREA_PIC_LIST)) {
    if (pics.some((p) => p.toLowerCase() === lower)) {
      return areaKey as SJAArea;
    }
  }
  return null;
};

export const isLikelyPic = (val: string): boolean => {
  if (!val) return false;
  const t = val.trim();
  if (t === '-' || t === '') return false;
  if (ALL_KNOWN_PICS.some((p) => p.toLowerCase() === t.toLowerCase())) return true;
  const lower = t.toLowerCase();
  const nonPicKeywords = [
    'spp', 'budget', 'terima', 'cabang', 'area', 'sla', 'kondisi', 'khusus',
    'normal', 'close', 'open', 'ontime', 'terlambat', 'waiting', 'kendala',
    'sepanjang', 'karawang', 'sukodono', 'semarang', 'sby', 'krw', 'skd', 'smg',
    'realisasi', 'pending', 'selesai'
  ];
  if (nonPicKeywords.some((kw) => lower.includes(kw))) return false;
  return /^[A-Za-z\s]{2,25}$/.test(t) && !parseRawDateToISO(t);
};

export const isLikelyPoNumber = (val: string): boolean => {
  if (!val) return false;
  const t = val.trim();
  if (t === '-' || t === '') return false;
  if (t.toUpperCase().startsWith('PO/') || t.toUpperCase().startsWith('PO-') || t.toUpperCase().startsWith('PO.')) return true;
  return /^[0-9A-Za-z\/\-_]{4,25}$/.test(t) && /\d/.test(t) && !parseRawDateToISO(t) && !t.toUpperCase().startsWith('SPP');
};

// Ekstraktor cerdas pola: [PIC] [Tanggal PO] [No. PO]
// Sesuai foto 1: "IDA 09 October 2026 4M261269" atau variasi tanggalnya
export interface ExtractedPicPo {
  pic: string;
  poDate: string;
  poNumber: string;
  matched: boolean;
}

export const extractPicAndPoFromText = (text: string): ExtractedPicPo => {
  if (!text) return { pic: '', poDate: '', poNumber: '', matched: false };
  const trimmed = text.trim();

  // Pola 1: [PIC] [Tanggal PO dengan Tahun] [No. PO]
  // Contoh: "IDA 09 October 2026 4M261269" atau "Ida 09/10/2026 4M261269"
  const pattern1 = /\b([A-Za-z]{2,20})\s+(\d{1,2}\s+(?:jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|may|jun(?:i)?|jul(?:i)?|agu(?:stus)?|aug(?:ust)?|sep(?:tember)?|okt(?:ober)?|oct(?:ober)?|nov(?:ember)?|nop(?:ember)?|des(?:ember)?|dec(?:ember)?)\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\s+([A-Za-z0-9\/\-_]{4,25})\b/i;
  const match1 = trimmed.match(pattern1);
  if (match1) {
    const rawPic = match1[1].trim();
    const rawDate = match1[2].trim();
    const rawPo = match1[3].trim();
    return {
      pic: normalizePicName(rawPic),
      poDate: parseRawDateToISO(rawDate) || rawDate,
      poNumber: rawPo,
      matched: true,
    };
  }

  // Pola 2: [PIC] [Tanggal PO tanpa Tahun] [No. PO]
  // Contoh: "IDA 09 October 4M261269" atau "IDA 09 Oktober 4M261269"
  const pattern2 = /\b([A-Za-z]{2,20})\s+(\d{1,2}\s+(?:jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|may|jun(?:i)?|jul(?:i)?|agu(?:stus)?|aug(?:ust)?|sep(?:tember)?|okt(?:ober)?|oct(?:ober)?|nov(?:ember)?|nop(?:ember)?|des(?:ember)?|dec(?:ember)?))\s+([A-Za-z0-9\/\-_]{4,25})\b/i;
  const match2 = trimmed.match(pattern2);
  if (match2) {
    const rawPic = match2[1].trim();
    const rawDate = match2[2].trim();
    const rawPo = match2[3].trim();
    return {
      pic: normalizePicName(rawPic),
      poDate: parseRawDateToISO(rawDate) || rawDate,
      poNumber: rawPo,
      matched: true,
    };
  }

  return { pic: '', poDate: '', poNumber: '', matched: false };
};

// Helper deteksi kondisi khusus dari teks bebas atau keterangan (misal: "Waiting kelengkapan dokumen Vendor by email")
export const detectSpecialConditionFromText = (raw: string): {
  hasCondition: boolean;
  category: string;
  reason: string;
} => {
  if (!raw) return { hasCondition: false, category: '', reason: '' };
  const text = raw.trim();
  if (!text || text === '-' || text === '.' || text === '0') return { hasCondition: false, category: '', reason: '' };

  // Jangan deteksi jika ini adalah format tanggal, nomor PO, atau murni angka SLA
  if (
    parseRawDateToISO(text) ||
    /^\d+$/.test(text) ||
    (/^[0-9A-Za-z\/\-_]{4,25}$/.test(text) && /\d/.test(text) && /[A-Za-z]/.test(text) && !text.includes(' '))
  ) {
    return { hasCondition: false, category: '', reason: '' };
  }

  const lower = text.toLowerCase();
  const normalKeywords = ['selesai', 'normal', 'lancar', 'ontime', 'same-day', 'tanpa kendala', 'ok', 'oke'];
  const isExplicitlyNormal =
    normalKeywords.some((kw) => lower === kw || lower.startsWith(kw + ' ') || lower.endsWith(' ' + kw)) &&
    !lower.includes('waiting') &&
    !lower.includes('kendala') &&
    !lower.includes('pending') &&
    !lower.includes('hold') &&
    !lower.includes('batal') &&
    !lower.includes('revisi') &&
    !lower.includes('tunggu') &&
    !lower.includes('kelengkapan');

  if (isExplicitlyNormal) {
    return { hasCondition: false, category: '', reason: '' };
  }

  // 1. Dokumen vendor (misal: "Waiting kelengkapan dokumen Vendor by email")
  if (
    lower.includes('waiting kelengkapan') ||
    lower.includes('kelengkapan dokumen') ||
    lower.includes('dokumen vendor') ||
    lower.includes('waiting dokumen') ||
    lower.includes('menunggu kelengkapan') ||
    lower.includes('menunggu dokumen') ||
    lower.includes('surat garansi') ||
    lower.includes('izin edar') ||
    lower.includes('ijin edar') ||
    lower.includes('faktur proforma')
  ) {
    return {
      hasCondition: true,
      category: 'Menunggu Kelengkapan Dokumen Vendor',
      reason: text,
    };
  }

  // 2. Vendor / Stok Kosong
  if (
    lower.includes('stok') ||
    lower.includes('stock') ||
    lower.includes('kosong') ||
    lower.includes('distributor') ||
    lower.includes('impor') ||
    lower.includes('indent') ||
    (lower.includes('vendor') && !lower.includes('spek') && !lower.includes('user'))
  ) {
    return {
      hasCondition: true,
      category: 'Kendala Vendor / Stok Kosong',
      reason: text,
    };
  }

  // 3. User / Budget
  if (
    lower.includes('budget') ||
    lower.includes('anggaran') ||
    lower.includes('user') ||
    lower.includes('acc') ||
    lower.includes('konfirmasi') ||
    lower.includes('approval user')
  ) {
    return {
      hasCondition: true,
      category: 'Pending Konfirmasi User / Budget',
      reason: text,
    };
  }

  // 4. Spek / Perubahan
  if (
    lower.includes('spek') ||
    lower.includes('spesifikasi') ||
    lower.includes('perubahan') ||
    lower.includes('revisi')
  ) {
    return {
      hasCondition: true,
      category: 'Perubahan Data / Spek SPP',
      reason: text,
    };
  }

  // 5. Sampel / Approval teknis
  if (
    lower.includes('sampel') ||
    lower.includes('sample') ||
    lower.includes('teknis') ||
    lower.includes('uji') ||
    lower.includes('trial')
  ) {
    return {
      hasCondition: true,
      category: 'Menunggu Sampel / Approval Teknis',
      reason: text,
    };
  }

  // 6. Hold PO / Penundaan Manajemen
  if (
    lower.includes('hold') ||
    lower.includes('tunda') ||
    lower.includes('penundaan') ||
    lower.includes('manajemen') ||
    lower.includes('direksi')
  ) {
    return {
      hasCondition: true,
      category: 'Hold PO / Penundaan Manajemen',
      reason: text,
    };
  }

  // 7. Batal Realisasi PO
  if (lower.includes('batal') || lower.includes('cancel')) {
    return {
      hasCondition: true,
      category: 'Batal Realisasi PO',
      reason: text,
    };
  }

  // 8. Jika mengandung kata kunci kendala / masalah umum
  const generalConstraintKeywords = [
    'kendala', 'masalah', 'trouble', 'rusak', 'pending', 'tunggu',
    'khusus', 'hambatan', 'delay', 'urgent', 'darurat', 'retur', 'komplain', 'alasan'
  ];
  if (generalConstraintKeywords.some((kw) => lower.includes(kw))) {
    return {
      hasCondition: true,
      category: 'Kendala Khusus Lainnya',
      reason: text,
    };
  }

  // JIKA TIDAK ADA KETERANGAN KONDISI KHUSUS: KOSONGKAN (posisi kosong datanya)
  return {
    hasCondition: false,
    category: '',
    reason: '',
  };
};

// Helper normalisasi nama area dari teks bebas
export const normalizeAreaFromText = (raw: string, fallback: SJAArea): SJAArea => {
  if (!raw) return fallback;
  const lower = raw.toLowerCase().trim();
  if (lower.includes('sepanjang') || lower === 'spj') return 'SEPANJANG';
  if (lower.includes('karawang') || lower === 'krw') return 'KARAWANG';
  if (lower.includes('sukodono') || lower === 'skd') return 'SUKODONO';
  if (lower.includes('semarang') || lower === 'smg') return 'SEMARANG';
  return fallback;
};

const SAMPLE_EXCEL_DATA = `08 October 2026\tSPP/014/PROD-III/IX/2026\tSukodono\tIDA\t09 Oktober\t4M261269\t\t10
07/10/2026\tSPP/SPJ/2026/10/0101\tSepanjang\tFelita\t07/10/2026\tPO/2026/10/101\t\t10
07/10/2026\tSPP/KRW/2026/10/0102\tKarawang\tDevi\t\t\tWaiting kelengkapan dokumen\t10
06/10/2026\tSPP/SKD/2026/10/0103\tSukodono\tLia\t07/10/2026\tPO/2026/10/103\tWaiting kelengkapan dokumen vendor by email\t10
07/10/2026\tSPP/SMG/2026/10/0104\tSemarang\tRina\t\t\tPending konfirmasi revisi anggaran user\t10`;

const EXCEL_HEADER_SAMPLE = `Tanggal Terima Budget\tNomor SPP\tCabang / Area\tPIC\tTanggal PO\tNo. PO\tKondisi Khusus\tSLA`;

export const SPPFormModal: React.FC<SPPFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editItem,
  holidays,
  currentUser,
  currentAreaFilter,
}) => {
  const isSuperadmin = currentUser.role === 'SUPERADMIN';
  const initialArea: SJAArea = !isSuperadmin
    ? (currentUser.area as SJAArea)
    : currentAreaFilter !== 'ALL'
    ? currentAreaFilter
    : 'SEPANJANG';

  // State Pilihan Metode Input: 'MANUAL' (Metode 1) atau 'PASTE_EXCEL' (Metode 2)
  const [activeInputMethod, setActiveInputMethod] = useState<'MANUAL' | 'PASTE_EXCEL'>('MANUAL');

  // State untuk Metode 1 (Manual Form)
  const createDefaultRow = (index = 0, rowArea: SJAArea = initialArea): DraftRow => {
    const todayISO = new Date().toISOString().split('T')[0];
    const defaultPic = AREA_PIC_LIST[rowArea]?.[0] || 'Felita';

    return {
      tempId: `draft-${Date.now()}-${index}-${Math.random()}`,
      budgetReceivedDate: todayISO,
      sppNumber: '',
      pic: defaultPic,
      area: rowArea,
      poDate: '',
      poNumber: '',
      slaLimit: 10,
      isUrgentAdvance: false,
      urgentReason: 'Breakdown Mesin Pabrik / Line Stop (Kritis)',
      urgentApprovedBy: 'Kepala Cabang / Plant Manager',
      budgetStatus: 'APPROVED',
      specialCondition: '',
      specialConditionReason: '',
      notes: '',
    };
  };

  const [rows, setRows] = useState<DraftRow[]>([createDefaultRow(0, initialArea)]);
  const [commonDate, setCommonDate] = useState(new Date().toISOString().split('T')[0]);
  const [commonArea, setCommonArea] = useState<SJAArea>(initialArea);
  const [commonPic, setCommonPic] = useState(AREA_PIC_LIST[initialArea]?.[0] || 'Felita');
  const [customRowCount, setCustomRowCount] = useState<number>(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk Metode 2 (Copy-Paste Excel)
  const [pastedText, setPastedText] = useState<string>('');
  const [copiedHeaderToast, setCopiedHeaderToast] = useState(false);
  const [showColumnHelp, setShowColumnHelp] = useState(false);

  const handleAutoGenerateSppNumber = (tempId: string, area: SJAArea, idx: number = 0) => {
    const areaCode = AREA_METADATA[area]?.code || 'SJA';
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const autoNum = `SPP/${areaCode}/${yyyy}/${mm}/${String(Date.now() + idx).slice(-4)}`;
    handleUpdateRow(tempId, 'sppNumber', autoNum);
  };

  useEffect(() => {
    if (editItem) {
      setActiveInputMethod('MANUAL');
      setRows([
        {
          tempId: editItem.id,
          budgetReceivedDate: editItem.budgetReceivedDate,
          sppNumber: editItem.sppNumber,
          pic: editItem.pic,
          area: editItem.area || initialArea,
          poDate: editItem.poDate || '',
          poNumber: editItem.poNumber || '',
          slaLimit: editItem.slaLimit || 10,
          isUrgentAdvance: editItem.isUrgentAdvance || false,
          urgentReason: editItem.urgentReason || 'Breakdown Mesin Pabrik / Line Stop (Kritis)',
          urgentApprovedBy: editItem.urgentApprovedBy || 'Kepala Cabang / Plant Manager',
          budgetStatus: editItem.budgetStatus || (editItem.isUrgentAdvance ? 'PENDING_ACC' : 'APPROVED'),
          specialCondition: (() => {
            if (editItem.sppNumber?.trim() === 'SPP/173/MTC-III/IX/2026') {
              return editItem.specialCondition || 'Kendala Khusus Lainnya';
            }
            if (editItem.specialCondition) return editItem.specialCondition;
            if (editItem.notes?.startsWith('Kondisi Khusus:')) {
              const content = editItem.notes.replace('Kondisi Khusus:', '').trim();
              const splitIdx = content.indexOf(' - ');
              return splitIdx !== -1 ? content.substring(0, splitIdx).trim() : content;
            }
            return '';
          })(),
          specialConditionReason: (() => {
            if (editItem.sppNumber?.trim() === 'SPP/173/MTC-III/IX/2026') {
              return editItem.specialConditionReason || 'Menunggu kelengkapan spp';
            }
            if (editItem.specialConditionReason) return editItem.specialConditionReason;
            if (editItem.notes?.startsWith('Kondisi Khusus:')) {
              const content = editItem.notes.replace('Kondisi Khusus:', '').trim();
              const splitIdx = content.indexOf(' - ');
              return splitIdx !== -1 ? content.substring(splitIdx + 3).trim() : '';
            }
            return '';
          })(),
          notes: (() => {
            return editItem.sppNumber?.trim() === 'SPP/173/MTC-III/IX/2026'
              ? (editItem.notes || 'Kondisi Khusus: Kendala Khusus Lainnya - Menunggu kelengkapan spp')
              : (editItem.notes || '');
          })(),
        },
      ]);
    } else {
      setRows([createDefaultRow(0, initialArea)]);
      setPastedText('');
    }
  }, [editItem, isOpen, initialArea]);

  // Parsing Real-time Data Copy-Paste Excel ke Item Terstruktur
  const parsedExcelData = useMemo(() => {
    if (!pastedText.trim()) return [];

    const lines = pastedText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return [];

    // Deteksi cerdas apakah baris 0 adalah Header Kolom Excel atau sudah merupakan Baris Data Nyata
    // Baris data nyata (termasuk jika pengguna hanya mem-paste 1 baris) TIDAK BOLEH diabaikan.
    const isFirstLineAHeader = (firstLine: string, totalCount: number): boolean => {
      // 1. Pola nomor SPP nyata (misal SPP/..., SPP-..., dll dengan angka pengenal)
      const hasRealSppCode = /(SPP[\/\-][A-Za-z0-9\/\-_]*\d+)/i.test(firstLine) || /SPP\/\d+/i.test(firstLine);

      // 2. Pola tanggal nyata (DD/MM/YYYY, YYYY-MM-DD, atau format teks tanggal seperti "08 October 2026", "7 Okt 2026")
      const hasRealDate = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/.test(firstLine) ||
        /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|okt|oct|nov|nop|des|dec)[a-z]*\s+\d{2,4}\b/i.test(firstLine) ||
        /\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/.test(firstLine);

      // Jika baris pertama sudah memiliki nomor SPP berangka atau tanggal berangka:
      // Pasti ini adalah DATA NYATA (bukan judul header tabel)! Jangan di-skip!
      if (hasRealSppCode || hasRealDate) {
        return false;
      }

      // Jika pengguna hanya mem-paste 1 baris (minimal 1 data) dan ada angka/karakter data:
      if (totalCount === 1 && /\d/.test(firstLine)) {
        return false;
      }

      // Cek apakah murni baris judul kolom header Excel
      const headerColumnTitles = [
        'tanggal terima budget', 'tgl terima budget', 'tanggal terima', 'tgl terima', 'tgl budget', 'tanggal budget',
        'nomor spp', 'no. spp', 'no spp', 'no dokumen', 'no. dokumen',
        'cabang/area', 'cabang', 'area', 'nama pic', 'pic', 'tgl po', 'tanggal po',
        'no. po', 'no po', 'nomor po', 'kondisi khusus', 'sla', 'durasi', 'keterangan', 'catatan'
      ];
      const lower = firstLine.toLowerCase();
      const matchesHeaderTitle = headerColumnTitles.some((title) => lower.includes(title));

      if (totalCount === 1) {
        return matchesHeaderTitle && !/\d/.test(firstLine);
      }

      return matchesHeaderTitle;
    };

    const hasHeader = isFirstLineAHeader(lines[0], lines.length);
    const contentLines = hasHeader ? lines.slice(1) : lines;
    const todayISO = new Date().toISOString().split('T')[0];

    return contentLines.map((line, idx): ParsedExcelItem => {
      // Split separator: prioritas Tab (Excel standard \t), titik koma, koma, atau 2+ spasi
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t').map((p) => p.trim());
      } else if (line.includes(';')) {
        parts = line.split(';').map((p) => p.trim());
      } else if (line.includes(',')) {
        parts = line.split(',').map((p) => p.trim());
      } else if (/\s{2,}/.test(line)) {
        parts = line.split(/\s{2,}/).map((p) => p.trim());
      } else {
        parts = [line];
      }

      // Ekstraksi cerdas jika dalam teks baris terdapat pola: [PIC] [Tanggal PO] [No. PO]
      // Sesuai foto 1: "IDA 09 October 2026 4M261269"
      const picPoInLine = extractPicAndPoFromText(line);

      // Jika parts hanya 1 elemen (misal terpisah spasi antara tanggal dan no SPP seperti di foto)
      if (parts.length === 1) {
        const sppMatch = line.match(/(SPP[\/\-][A-Za-z0-9\/\-_]+)/i);
        if (sppMatch) {
          const sppToken = sppMatch[1].trim();
          const rest = line.replace(sppToken, '').trim();
          if (rest) {
            parts = [rest, sppToken];
          }
        }
      }

      let rawSpp = '';
      let rawDateBudget = '';
      let rawArea = '';
      let rawPic = '';
      let rawDatePo = '';
      let rawPoNumber = '';
      let rawSla = '';
      let rawNotes = '';

      // 1. Pre-deteksi Kondisi Khusus di dalam parts atau line
      // Memastikan keterangan seperti "Waiting Kelengkapan dokumen" selalu tertangkap
      let conditionPartIdx = -1;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i].trim();
        if (p && detectSpecialConditionFromText(p).hasCondition) {
          conditionPartIdx = i;
          rawNotes = p;
          break;
        }
      }

      // Jika belum ketemu di parts atau jika parts panjangnya 1, deteksi pola frase kondisi di teks baris
      if (!rawNotes || (parts.length === 1 && conditionPartIdx === 0)) {
        const conditionPhrases = [
          /waiting\s+(?:kelengkapan\s+)?dokumen[^\t\r\n,]*/i,
          /kelengkapan\s+dokumen[^\t\r\n,]*/i,
          /dokumen\s+vendor[^\t\r\n,]*/i,
          /waiting\s+dokumen[^\t\r\n,]*/i,
          /menunggu\s+(?:kelengkapan\s+)?dokumen[^\t\r\n,]*/i,
          /menunggu\s+dokumen[^\t\r\n,]*/i,
          /kendala\s+[^\t\r\n,]*/i,
          /(?:stok|stock)\s+kosong[^\t\r\n,]*/i,
          /pending\s+[^\t\r\n,]*/i,
          /hold\s+po[^\t\r\n,]*/i,
          /batal\s+(?:realisasi|po)?[^\t\r\n,]*/i,
          /menunggu\s+[^\t\r\n,]*/i,
        ];
        for (const rg of conditionPhrases) {
          const m = line.match(rg);
          if (m) {
            rawNotes = m[0].trim();
            break;
          }
        }
      }

      // 2. Prioritas Deteksi Kolom: Cari pola berurutan [PIC] -> [Tanggal PO] -> [No. PO] di dalam parts
      // Sesuai instruksi:
      // "ada nama IDA masuk ke kategori kolom PIC sedangkan tanggal 09 Oktober samping kanan nama IDA
      // adalah masuk ke kolom tanggal PO dan sebelah kanan tanggal PO di 09 Oktober yaitu kode 4M261269 masuk ke kolom No. PO"
      let picTripletIdx = -1;
      for (let i = 0; i < parts.length - 1; i++) {
        if (isLikelyPic(parts[i]) && parseRawDateToISO(parts[i + 1])) {
          picTripletIdx = i;
          break;
        }
      }

      if (picTripletIdx !== -1) {
        rawPic = normalizePicName(parts[picTripletIdx]);
        rawDatePo = parts[picTripletIdx + 1];
        if (picTripletIdx + 2 < parts.length && isLikelyPoNumber(parts[picTripletIdx + 2])) {
          rawPoNumber = parts[picTripletIdx + 2];
        }

        // Token sebelum PIC: Tanggal Terima Budget, Nomor SPP, dan Cabang
        const beforeParts = parts.slice(0, picTripletIdx);
        if (beforeParts.length === 1) {
          const d0 = parseRawDateToISO(beforeParts[0]);
          if (d0) {
            rawDateBudget = beforeParts[0];
          } else {
            rawSpp = beforeParts[0];
            rawDateBudget = rawDatePo;
          }
        } else if (beforeParts.length === 2) {
          const d0 = parseRawDateToISO(beforeParts[0]);
          const d1 = parseRawDateToISO(beforeParts[1]);
          if (d1 && !d0) {
            rawSpp = beforeParts[0];
            rawDateBudget = beforeParts[1];
          } else {
            rawDateBudget = beforeParts[0];
            rawSpp = beforeParts[1];
          }
        } else if (beforeParts.length >= 3) {
          rawDateBudget = beforeParts[0];
          rawSpp = beforeParts[1];
          rawArea = beforeParts[2];
        } else if (beforeParts.length === 0) {
          rawDateBudget = rawDatePo;
        }

        // Token setelah No. PO: Kondisi Khusus dan SLA
        const afterPoIdx = rawPoNumber ? picTripletIdx + 3 : picTripletIdx + 2;
        const afterParts = parts.slice(afterPoIdx);
        for (const ap of afterParts) {
          const trimmed = ap.trim();
          if (!trimmed) continue;
          if (/^\d+$/.test(trimmed)) {
            rawSla = trimmed;
          } else if (!rawNotes || rawNotes === trimmed) {
            rawNotes = trimmed;
          }
        }
      } else if (picPoInLine.matched) {
        // Teks dalam baris cocok dengan pola gabungan: IDA 09 October 2026 4M261269
        rawPic = picPoInLine.pic;
        rawDatePo = picPoInLine.poDate;
        rawPoNumber = picPoInLine.poNumber;

        // Ambil No SPP dari baris
        const sppMatch = line.match(/(SPP[\/\-][A-Za-z0-9\/\-_]+)/i);
        if (sppMatch) rawSpp = sppMatch[1];

        // Cari tanggal budget dari awal baris atau fallback
        const dateAtStart = line.match(/^(\d{1,2}\s+[A-Za-z]+(?:\s+\d{2,4})?|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/i);
        if (dateAtStart) {
          rawDateBudget = parseRawDateToISO(dateAtStart[0]) || dateAtStart[0];
        } else {
          rawDateBudget = rawDatePo || todayISO;
        }
      } else if (parts.length === 1) {
        const maybeDate = parseRawDateToISO(parts[0]);
        if (maybeDate) {
          rawDateBudget = parts[0];
        } else {
          rawSpp = parts[0] || '';
        }
        rawPic = '-';
      } else if (parts.length === 2) {
        // 2 KOLOM
        const date0 = parseRawDateToISO(parts[0]);
        const date1 = parseRawDateToISO(parts[1]);
        const isSpp0 = parts[0].toUpperCase().startsWith('SPP') || parts[0].includes('/PROD') || parts[0].includes('/MTC') || parts[0].includes('/ENG');
        const isSpp1 = parts[1].toUpperCase().startsWith('SPP') || parts[1].includes('/PROD') || parts[1].includes('/MTC') || parts[1].includes('/ENG');

        if (date0 && !date1) {
          rawDateBudget = parts[0];
          rawSpp = parts[1];
        } else if (date1 && !date0) {
          rawSpp = parts[0];
          rawDateBudget = parts[1];
        } else if (isSpp1 && !isSpp0) {
          rawDateBudget = parts[0];
          rawSpp = parts[1];
        } else {
          rawDateBudget = parts[0];
          rawSpp = parts[1];
        }
        rawPic = '-';
      } else {
        // 3+ KOLOM (Urutan Standar Tanpa Triplet Langsung)
        rawDateBudget = parts[0] || '';
        rawSpp = parts[1] || '';

        // Deteksi apakah kolom 2 adalah PIC (format tanpa kolom cabang) atau Cabang
        if (isLikelyPic(parts[2])) {
          // Format tanpa kolom cabang (Cabang oto login): [Tgl Budget, No SPP, PIC, Tgl PO, No PO, Kondisi Khusus, SLA]
          rawPic = normalizePicName(parts[2]);
          rawDatePo = parts[3] || '';
          rawPoNumber = isLikelyPoNumber(parts[4]) ? parts[4] : '';
          if (!rawNotes && parts[5] && !/^\d+$/.test(parts[5].trim()) && !isLikelyPoNumber(parts[5])) {
            rawNotes = parts[5];
          }
          if (parts[6] && /^\d+$/.test(parts[6].trim())) {
            rawSla = parts[6];
          } else if (parts[5] && /^\d+$/.test(parts[5].trim())) {
            rawSla = parts[5];
          }
        } else {
          // Format dengan kolom cabang: [Tgl Budget, No SPP, Cabang, PIC, Tgl PO, No PO, Kondisi Khusus, SLA]
          rawArea = parts[2] || '';
          rawPic = isLikelyPic(parts[3]) ? normalizePicName(parts[3]) : (parts[3] || '-');
          rawDatePo = parts[4] || '';
          rawPoNumber = isLikelyPoNumber(parts[5]) ? parts[5] : '';
          if (!rawNotes && parts[6] && !/^\d+$/.test(parts[6].trim()) && !isLikelyPoNumber(parts[6])) {
            rawNotes = parts[6];
          }
          if (parts[7] && /^\d+$/.test(parts[7].trim())) {
            rawSla = parts[7];
          } else if (parts[6] && /^\d+$/.test(parts[6].trim())) {
            rawSla = parts[6];
          }
        }
      }

      // Sanitasi jika rawPoNumber, rawArea, atau rawPic tertukar dengan kondisi khusus
      if (rawPoNumber && detectSpecialConditionFromText(rawPoNumber).hasCondition) {
        if (!rawNotes) rawNotes = rawPoNumber;
        rawPoNumber = '';
      }
      if (rawArea && detectSpecialConditionFromText(rawArea).hasCondition) {
        if (!rawNotes) rawNotes = rawArea;
        rawArea = '';
      }
      if (rawPic && detectSpecialConditionFromText(rawPic).hasCondition) {
        if (!rawNotes) rawNotes = rawPic;
        rawPic = '-';
      }

      // Pastikan jika ada snippet PIC/PO yang terdeteksi di baris, nilainya tidak terlewat
      if (picPoInLine.matched) {
        if (!rawPic || rawPic === '-') rawPic = picPoInLine.pic;
        if (!rawDatePo) rawDatePo = picPoInLine.poDate;
        if (!rawPoNumber) rawPoNumber = picPoInLine.poNumber;
      }

      // Bersihkan rawNotes:
      // Sesuai instruksi user: jika saat ditempel tidak ada keterangan kondisi khusus,
      // maka kolom kondisi khusus posisi kosong datanya ('').
      if (
        !rawNotes ||
        rawNotes.trim() === '-' ||
        rawNotes.trim() === '.' ||
        rawNotes.trim().toLowerCase() === 'normal' ||
        rawNotes.trim().toLowerCase() === 'same-day' ||
        rawNotes.trim().toLowerCase() === 'tanpa kendala' ||
        parseRawDateToISO(rawNotes) ||
        (rawPoNumber && rawNotes.trim() === rawPoNumber.trim())
      ) {
        rawNotes = '';
      }

      // Deteksi kondisi khusus cerdas dari keterangan (hanya jika ada keterangan kondisi khusus nyata)
      const conditionDetection = detectSpecialConditionFromText(rawNotes);

      // Normalisasi area: periksa dari rawArea, PIC yang terdeteksi, atau teks No SPP
      let fallbackArea = initialArea;
      if (rawPic && rawPic !== '-') {
        const picBranch = getAreaForPic(rawPic);
        if (picBranch) {
          fallbackArea = picBranch;
        }
      }
      let detectedArea = fallbackArea;
      if (rawArea && rawArea.trim() !== '' && rawArea.trim() !== '-') {
        detectedArea = normalizeAreaFromText(rawArea, fallbackArea);
      } else if (rawSpp) {
        detectedArea = normalizeAreaFromText(rawSpp, fallbackArea);
      }
      const assignedArea = !isSuperadmin ? initialArea : (rawArea && rawArea.trim() !== '-' ? detectedArea : fallbackArea);
      const areaCode = AREA_METADATA[assignedArea]?.code || 'SJA';

      // Auto generate SPP jika kosong di Excel
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const autoNum = `SPP/${areaCode}/${yyyy}/${mm}/${String(Date.now() + idx).slice(-4)}`;
      const finalSppNumber = rawSpp || autoNum;

      const parsedBudget = parseRawDateToISO(rawDateBudget) || todayISO;
      const parsedPoDate = rawDatePo ? parseRawDateToISO(rawDatePo) : '';

      // Penentuan PIC:
      // Sesuai instruksi user: saat data yang diinput/di-paste hanya tanggal terima SPP budget dan no SPP,
      // maka untuk kolom PIC dibuat '-' saja karena masih belum tahu nama PIC yang akan mengerjakan PO dari no SPP tersebut.
      // Jika terdeteksi nama PIC (seperti IDA di foto 1), otomatis masukkan nama PIC (misal: Ida)
      const finalPic = (rawPic && rawPic.trim() !== '' && rawPic.trim() !== '-') ? normalizePicName(rawPic) : '-';

      const slaLimit = parseInt(rawSla) > 0 ? parseInt(rawSla) : 10;

      // Hitung Hari Kerja Proses menggunakan kalkulator libur nasional & akhir pekan
      const calc = calculateWorkingDays(parsedBudget, parsedPoDate || undefined, holidays);
      const processDays = calc.workingDays;
      const hasPo = !!rawPoNumber && rawPoNumber.trim() !== '';
      const statusPO: 'CLOSE' | 'OPEN' = hasPo ? 'CLOSE' : 'OPEN';
      const statusOntime: 'ONTIME' | 'TERLAMBAT' = processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT';

      return {
        id: `paste-${idx}-${Date.now()}`,
        sppNumber: finalSppNumber,
        budgetReceivedDate: parsedBudget,
        area: assignedArea,
        pic: finalPic,
        poDate: parsedPoDate,
        poNumber: rawPoNumber,
        slaLimit,
        notes: rawNotes,
        isValid: Boolean(parsedBudget),
        processDays,
        statusPO,
        statusOntime,
        specialCondition: conditionDetection.hasCondition ? conditionDetection.category : undefined,
        specialConditionReason: conditionDetection.hasCondition ? conditionDetection.reason : undefined,
      };
    });
  }, [pastedText, initialArea, isSuperadmin, holidays]);

  // Ringkasan KPI Data Hasil Paste Excel (Metode 2) - diletakkan bersama hooks lainnya
  const pasteKPI = useMemo(() => {
    const total = parsedExcelData.length;
    if (total === 0) return { total: 0, closed: 0, open: 0, avgDays: '0.0', ontime: 0, late: 0 };
    const closed = parsedExcelData.filter((i) => i.statusPO === 'CLOSE').length;
    const open = total - closed;
    const ontime = parsedExcelData.filter((i) => i.statusOntime === 'ONTIME').length;
    const late = total - ontime;
    const totalDays = parsedExcelData.reduce((acc, curr) => acc + curr.processDays, 0);
    const avgDays = (totalDays / total).toFixed(1);
    return { total, closed, open, avgDays, ontime, late };
  }, [parsedExcelData]);

  // Handler Salin Format Header Excel
  const handleCopyExcelHeader = async () => {
    try {
      await navigator.clipboard.writeText(EXCEL_HEADER_SAMPLE);
      setCopiedHeaderToast(true);
      setTimeout(() => setCopiedHeaderToast(false), 3000);
    } catch {
      // Fallback manual jika navigator clipboard dibatasi
      setCopiedHeaderToast(true);
      setTimeout(() => setCopiedHeaderToast(false), 3000);
    }
  };

  // Handler Muat Contoh Data Template
  const handleLoadSampleData = () => {
    setPastedText(SAMPLE_EXCEL_DATA);
  };

  // Handler Pindahkan Hasil Paste ke Metode 1 (Form Manual) untuk di-edit lebih detail
  const handleTransferToManualRows = () => {
    if (parsedExcelData.length === 0) return;

    const newRows: DraftRow[] = parsedExcelData.map((item, idx) => {
      const cond = detectSpecialConditionFromText(item.notes || '');
      const effCondition = item.specialCondition || (cond.hasCondition ? cond.category : '');
      const effReason = item.specialConditionReason || (cond.hasCondition ? cond.reason : '');

      return {
        tempId: `draft-from-paste-${Date.now()}-${idx}`,
        budgetReceivedDate: item.budgetReceivedDate,
        sppNumber: item.sppNumber,
        pic: item.pic,
        area: item.area,
        poDate: item.poDate,
        poNumber: item.poNumber,
        slaLimit: item.slaLimit,
        isUrgentAdvance: false,
        urgentReason: 'Breakdown Mesin Pabrik / Line Stop (Kritis)',
        urgentApprovedBy: 'Kepala Cabang / Plant Manager',
        budgetStatus: 'APPROVED',
        specialCondition: effCondition,
        specialConditionReason: effReason,
        notes: item.notes,
      };
    });

    setRows(newRows);
    setActiveInputMethod('MANUAL');
  };

  // Handler Simpan Langsung dari Hasil Paste Excel (Metode 2)
  const handleSaveFromPaste = async () => {
    if (parsedExcelData.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<SPPItem>[] = parsedExcelData.map((item) => {
        const cond = detectSpecialConditionFromText(item.notes || '');
        const specCond = item.specialCondition || (cond.hasCondition ? cond.category : undefined);
        const specReason = item.specialConditionReason || (cond.hasCondition ? cond.reason : undefined);

        return {
          budgetReceivedDate: item.budgetReceivedDate,
          sppNumber: item.sppNumber,
          pic: item.pic,
          area: item.area,
          poDate: item.poDate || undefined,
          poNumber: item.poNumber?.trim() || undefined,
          slaLimit: item.slaLimit,
          notes: item.notes || undefined,
          isUrgentAdvance: false,
          budgetStatus: 'APPROVED',
          specialCondition: specCond,
          specialConditionReason: specReason,
        };
      });

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Error saat menyimpan hasil paste Excel:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Row Management Metode 1
  const handleAddRow = () => {
    setRows((prev) => [...prev, createDefaultRow(prev.length, commonArea)]);
  };

  const handleAdd5Rows = () => {
    const newItems: DraftRow[] = [];
    for (let i = 0; i < 5; i++) {
      newItems.push(createDefaultRow(rows.length + i, commonArea));
    }
    setRows((prev) => [...prev, ...newItems]);
  };

  const handleAdd10Rows = () => {
    const newItems: DraftRow[] = [];
    for (let i = 0; i < 10; i++) {
      newItems.push(createDefaultRow(rows.length + i, commonArea));
    }
    setRows((prev) => [...prev, ...newItems]);
  };

  const handleAddCustomRows = (count?: number) => {
    const n = count !== undefined ? count : Number(customRowCount);
    if (isNaN(n) || n <= 0) return;
    const clamped = Math.min(n, 200);
    const newItems: DraftRow[] = [];
    for (let i = 0; i < clamped; i++) {
      newItems.push(createDefaultRow(rows.length + i, commonArea));
    }
    setRows((prev) => [...prev, ...newItems]);
  };

  const handleRemoveRow = (tempId: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  const handleUpdateRow = (tempId: string, field: keyof DraftRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, [field]: value } : r))
    );
  };

  const handleUpdateRowArea = (tempId: string, newArea: SJAArea) => {
    const code = AREA_METADATA[newArea]?.code || 'SJA';
    const defaultPicForArea = AREA_PIC_LIST[newArea]?.[0] || 'Felita';
    setRows((prev) =>
      prev.map((r) => {
        if (r.tempId !== tempId) return r;
        let newSpp = r.sppNumber;
        if (r.sppNumber && r.sppNumber.includes('/')) {
          const parts = r.sppNumber.split('/');
          if (parts.length >= 4) {
            parts[1] = code;
            newSpp = parts.join('/');
          }
        }
        return {
          ...r,
          area: newArea,
          sppNumber: newSpp,
          pic: defaultPicForArea,
        };
      })
    );
  };

  const handleApplyCommonDate = () => {
    setRows((prev) => prev.map((r) => ({ ...r, budgetReceivedDate: commonDate })));
  };

  const handleApplyCommonPic = () => {
    setRows((prev) => prev.map((r) => ({ ...r, pic: commonPic })));
  };

  const handleApplyCommonArea = () => {
    const defaultPicForArea = AREA_PIC_LIST[commonArea]?.[0] || 'Felita';
    setRows((prev) =>
      prev.map((r) => {
        const code = AREA_METADATA[commonArea]?.code || 'SJA';
        let newSpp = r.sppNumber;
        if (r.sppNumber && r.sppNumber.includes('/')) {
          const parts = r.sppNumber.split('/');
          if (parts.length >= 4) {
            parts[1] = code;
            newSpp = parts.join('/');
          }
        }
        return {
          ...r,
          area: commonArea,
          sppNumber: newSpp,
          pic: defaultPicForArea,
        };
      })
    );
  };

  // Kalkulasi KPI Metode 1
  let totalProcessDays = 0;
  let closedCount = 0;
  let ontimeCount = 0;
  let totalWeekendSkipped = 0;
  let totalHolidaySkipped = 0;

  rows.forEach((r) => {
    const calc = calculateWorkingDays(r.budgetReceivedDate, r.poDate || undefined, holidays);
    const processDays = r.isUrgentAdvance && r.poNumber ? 0 : calc.workingDays;
    totalProcessDays += processDays;
    totalWeekendSkipped += calc.weekendDaysSkipped;
    totalHolidaySkipped += calc.holidayDaysSkipped;

    const isClose = r.poNumber && r.poNumber.trim() !== '';
    if (isClose) closedCount++;

    const isOntime = r.isUrgentAdvance || processDays <= (r.slaLimit || 10);
    if (isOntime) ontimeCount++;
  });

  const avgProcessDays = rows.length > 0 ? (totalProcessDays / rows.length).toFixed(1) : '0';
  const openCount = rows.length - closedCount;
  const lateCount = rows.length - ontimeCount;

  // Submit Handler Metode 1
  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<SPPItem>[] = rows.map((r, idx) => {
        const areaCode =
          r.area === 'SEPANJANG' ? 'SPJ' : r.area === 'KARAWANG' ? 'KRW' : r.area === 'SUKODONO' ? 'SKD' : 'SMG';
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const autoNum = `SPP/${areaCode}/${yyyy}/${mm}/${String(Date.now() + idx).slice(-4)}`;
        const finalSppNumber =
          r.sppNumber.trim() ||
          (r.isUrgentAdvance ? `SPP-PENDING-ACC-${Date.now().toString().slice(-4)}` : autoNum);

        return {
          budgetReceivedDate: r.budgetReceivedDate || new Date().toISOString().split('T')[0],
          sppNumber: finalSppNumber,
          pic: (r.pic && r.pic.trim() !== '' && r.pic.trim() !== '-') ? r.pic.trim() : '-',
          area: r.area,
          poDate: r.poDate || undefined,
          poNumber: r.poNumber.trim() || undefined,
          slaLimit: Number(r.slaLimit || 10),
          isUrgentAdvance: r.isUrgentAdvance,
          urgentReason: r.isUrgentAdvance ? r.urgentReason : undefined,
          urgentApprovedBy: r.isUrgentAdvance ? r.urgentApprovedBy : undefined,
          budgetStatus: r.isUrgentAdvance ? r.budgetStatus : 'APPROVED',
          // Track record kondisi khusus: tetap disimpan & ditampilkan sebagai histori faktor kendala
          specialCondition: r.specialCondition?.trim() || undefined,
          specialConditionReason: r.specialConditionReason?.trim() || undefined,
          notes: (() => {
            return (
              r.notes ||
              (r.isUrgentAdvance
                ? `Dispensasi Urgent: ${r.urgentReason} (Disetujui: ${r.urgentApprovedBy})`
                : r.specialCondition
                ? `Kondisi Khusus: ${r.specialCondition}${
                    r.specialConditionReason ? ` - ${r.specialConditionReason}` : ''
                  }`
                : undefined)
            );
          })(),
        };
      });

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Error saat menyimpan SPP:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allAreas: SJAArea[] = ['SEPANJANG', 'KARAWANG', 'SUKODONO', 'SEMARANG'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl max-w-5xl w-full my-6 flex flex-col max-h-[92vh] transition-colors">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>
                {editItem
                  ? 'Edit Dokumen SPP'
                  : `Input Data SPP · ${
                      isSuperadmin ? 'Superadmin (Multi-Area)' : `Area ${currentUser.name}`
                    }`}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tersedia 2 metode input: <strong>Form Manual</strong> atau{' '}
              <strong>Copy-Paste Instan dari Excel</strong> agar tidak perlu ketik dua kali kerja.
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Otomatis Sinkron 2 Arah ke Google Sheet ({AREA_METADATA[initialArea]?.name || initialArea})</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!editItem && activeInputMethod === 'MANUAL' && (
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-800 shadow-2xs">
                {rows.length} Baris Data
              </span>
            )}
            {!editItem && activeInputMethod === 'PASTE_EXCEL' && parsedExcelData.length > 0 && (
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-2xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{parsedExcelData.length} Baris Terdeteksi</span>
              </span>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm p-1 rounded-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PILIHAN 2 METODE INPUT BERSEBELAHAN (MANUAL vs COPY-PASTE EXCEL) */}
        {/* ============================================================== */}
        {!editItem && (
          <div className="p-3 bg-slate-100/90 dark:bg-slate-950/70 border-b border-slate-200/90 dark:border-slate-800 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-4xl mx-auto">
              {/* OPSI 1: INPUT FORM MANUAL */}
              <button
                type="button"
                onClick={() => setActiveInputMethod('MANUAL')}
                className={`p-3 rounded-xl border text-left transition-all relative flex items-start gap-3 cursor-pointer ${
                  activeInputMethod === 'MANUAL'
                    ? 'bg-white dark:bg-slate-900 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 opacity-80 hover:opacity-100'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    activeInputMethod === 'MANUAL'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <Edit2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Metode 1: Input Manual (Form Detail)</span>
                    </span>
                    {activeInputMethod === 'MANUAL' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Input 1-per-1 atau multi-baris manual. Lengkap dengan opsi Dispensasi Urgent &amp; Kasus Khusus.
                  </p>
                </div>
              </button>

              {/* OPSI 2: COPY PASTE DATA EXCEL INSTAN */}
              <button
                type="button"
                onClick={() => setActiveInputMethod('PASTE_EXCEL')}
                className={`p-3 rounded-xl border text-left transition-all relative flex items-start gap-3 cursor-pointer ${
                  activeInputMethod === 'PASTE_EXCEL'
                    ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 opacity-80 hover:opacity-100'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    activeInputMethod === 'PASTE_EXCEL'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Metode 2: Copy-Paste Excel (Instant)</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    </span>
                    {activeInputMethod === 'PASTE_EXCEL' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                        Aktif
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                        Upload Cepat
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Salin dari Excel lalu paste (Ctrl+V) langsung ke sini. Otomatis rapi &amp; sinkron Google Sheet!
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* KONTEN METODE 1: INPUT FORM MANUAL (KODE ASLI YANG DISEMPURNAKAN) */}
        {/* ============================================================== */}
        {activeInputMethod === 'MANUAL' && (
          <>
            {/* Toolbar Tambah Baris Cepat & Input Manual Baris (Hanya saat Input Baru) */}
            {!editItem && (
              <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                    title="Tambah 1 baris"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ 1 Baris</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAdd5Rows}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg border border-slate-200/90 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+5</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAdd10Rows}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg border border-slate-200/90 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+10</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddCustomRows(20)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg border border-slate-200/90 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+20</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddCustomRows(50)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg border border-slate-200/90 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+50</span>
                  </button>

                  {/* Fitur Tambah Baris Manual */}
                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Ketik jumlah:</span>
                    <input
                      type="number"
                      min="1"
                      max="150"
                      value={customRowCount || ''}
                      onChange={(e) => setCustomRowCount(parseInt(e.target.value) || 0)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomRows();
                        }
                      }}
                      placeholder="20/50..."
                      className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-700 rounded-lg text-center font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomRows()}
                      disabled={!customRowCount || customRowCount <= 0}
                      className="px-2.5 py-1 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-2xs transition-colors text-[11px] cursor-pointer"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>

                {/* Bulk Apply Bar */}
                <div className="flex items-center flex-wrap gap-2 text-[11px] bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Terapkan Massal:</span>

                  <input
                    type="date"
                    value={commonDate}
                    onChange={(e) => setCommonDate(e.target.value)}
                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-md font-mono text-[11px] text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCommonDate}
                    className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-md shadow-2xs cursor-pointer"
                  >
                    Tgl Budget
                  </button>

                  {isSuperadmin && (
                    <>
                      <select
                        value={commonArea}
                        onChange={(e) => {
                          const area = e.target.value as SJAArea;
                          setCommonArea(area);
                          setCommonPic(AREA_PIC_LIST[area]?.[0] || 'Felita');
                        }}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-md text-[11px] font-semibold text-blue-700 dark:text-blue-400"
                      >
                        {allAreas.map((a) => (
                          <option key={a} value={a}>
                            {AREA_METADATA[a].name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleApplyCommonArea}
                        className="px-2 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold rounded-md shadow-2xs cursor-pointer"
                      >
                        Area
                      </button>
                    </>
                  )}

                  <select
                    value={commonPic}
                    onChange={(e) => setCommonPic(e.target.value)}
                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-md text-[11px] text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="-">- (Belum Ada PIC / Belum Ditugaskan)</option>
                    {(AREA_PIC_LIST[commonArea] || []).map((picName) => (
                      <option key={picName} value={picName}>
                        {picName} ({AREA_METADATA[commonArea].name.split(' ')[1]})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyCommonPic}
                    className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-md shadow-2xs cursor-pointer"
                  >
                    PIC
                  </button>
                </div>
              </div>
            )}

            {/* List Baris Input Manual */}
            <form onSubmit={handleSubmitManual} className="flex-1 overflow-y-auto p-4 space-y-3.5">
              <div className="space-y-3">
                {rows.map((row, idx) => {
                  const calc = calculateWorkingDays(row.budgetReceivedDate, row.poDate || undefined, holidays);
                  const processDays = calc.workingDays;
                  const isOntime = processDays <= (row.slaLimit || 10);
                  const areaInfo = AREA_METADATA[row.area] || { name: row.area, code: 'SJA' };
                  const branchPics = AREA_PIC_LIST[row.area] || [];
                  const isPredefinedPic = branchPics.includes(row.pic) || row.pic === '-';

                  return (
                    <div
                      key={row.tempId}
                      className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3 relative hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs"
                    >
                      {/* Row Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold font-mono flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                            {row.sppNumber ? row.sppNumber : `Baris #${idx + 1} (Nomor SPP Belum Diisi)`}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ${
                              row.area === 'SEPANJANG'
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
                                : row.area === 'KARAWANG'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
                                : row.area === 'SUKODONO'
                                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                            }`}
                          >
                            {areaInfo.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            Durasi: <strong className={isOntime ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{processDays} hr</strong> (SLA {row.slaLimit} hr)
                          </span>

                          {rows.length > 1 && !editItem && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.tempId)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Form Input Columns */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {isSuperadmin && (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                              <Building className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>Area Cabang *</span>
                            </label>
                            <select
                              value={row.area}
                              onChange={(e) => handleUpdateRowArea(row.tempId, e.target.value as SJAArea)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 text-xs font-semibold"
                            >
                              {allAreas.map((a) => (
                                <option key={a} value={a}>
                                  {AREA_METADATA[a].name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>Tgl Terima Budget *</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={row.budgetReceivedDate}
                            onChange={(e) => handleUpdateRow(row.tempId, 'budgetReceivedDate', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg font-mono text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 text-xs"
                          />
                        </div>

                        <div className={isSuperadmin ? '' : 'md:col-span-2'}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Tag className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>Nomor SPP</span>
                              <span className="text-[10px] text-slate-400 font-normal">(Auto jika kosong)</span>
                            </label>
                            {!row.sppNumber && (
                              <button
                                type="button"
                                onClick={() => handleAutoGenerateSppNumber(row.tempId, row.area, idx)}
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                              >
                                + Isi No. Otomatis
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={row.sppNumber}
                            onChange={(e) => handleUpdateRow(row.tempId, 'sppNumber', e.target.value)}
                            placeholder={`Contoh: SPP/${AREA_METADATA[row.area]?.code || 'SJA'}/2026/10/...`}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg font-mono text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 text-xs font-semibold placeholder:text-slate-400 placeholder:font-normal"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>PIC Pengadaan *</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {areaInfo.name.split(' ')[1]}
                            </span>
                          </label>
                          <select
                            value={isPredefinedPic ? row.pic : '__CUSTOM__'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__CUSTOM__') {
                                handleUpdateRow(row.tempId, 'pic', '');
                              } else {
                                handleUpdateRow(row.tempId, 'pic', val);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 text-xs font-medium transition-colors"
                          >
                            <option value="-">- (Belum Ada PIC / Belum Ditugaskan)</option>
                            {branchPics.map((picName) => (
                              <option key={picName} value={picName}>
                                {picName}
                              </option>
                            ))}
                            <option value="__CUSTOM__">✍️ Lainnya (Ketik Manual)...</option>
                          </select>

                          {(!isPredefinedPic && row.pic !== '' && row.pic !== '-') && (
                            <div className="mt-1.5 animate-in fade-in">
                              <input
                                type="text"
                                required
                                value={row.pic}
                                onChange={(e) => handleUpdateRow(row.tempId, 'pic', e.target.value)}
                                placeholder="Ketik nama PIC manual..."
                                className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-blue-500 rounded-lg text-xs font-semibold text-blue-900 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                                autoFocus
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Tanggal PO (Opsional)
                          </label>
                          <input
                            type="date"
                            value={row.poDate}
                            onChange={(e) => handleUpdateRow(row.tempId, 'poDate', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg font-mono text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Nomor PO (Opsional)
                          </label>
                          <input
                            type="text"
                            value={row.poNumber}
                            onChange={(e) => handleUpdateRow(row.tempId, 'poNumber', e.target.value)}
                            placeholder="PO/2026/03/XXXX"
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg font-mono text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 text-xs"
                          />
                          {row.poNumber && row.poNumber.trim() !== '' && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 animate-in fade-in">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <span>No PO Terisi: Status Dokumen <strong>CLOSE</strong>. Histori kondisi khusus tetap disimpan sebagai Track Record faktor kendala.</span>
                            </div>
                          )}
                        </div>

                        {/* Fitur Kondisi Khusus & Track Record Kendala Pengadaan */}
                        <div className="col-span-full pt-1.5">
                          {row.poNumber && row.poNumber.trim() !== '' ? (
                            /* State PO Sudah Terisi: Menampilkan Track Record Kondisi Khusus jika ada */
                            row.specialCondition && row.specialCondition !== '' ? (
                              <div className="p-3.5 rounded-xl border bg-purple-50/80 dark:bg-purple-950/30 border-purple-200/90 dark:border-purple-800/60 shadow-2xs animate-in fade-in space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 dark:border-purple-800/50 pb-2.5">
                                  <div className="flex items-start sm:items-center gap-2 text-purple-900 dark:text-purple-200">
                                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shrink-0">
                                      <History className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold flex items-center gap-2 flex-wrap">
                                        <span>Track Record Kondisi Khusus (Riwayat Historis Faktor Penyebab)</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold">
                                          PO Terbit: {row.poNumber}
                                        </span>
                                      </p>
                                      <p className="text-[11px] text-purple-700/90 dark:text-purple-300/80 mt-0.5 leading-snug">
                                        Meskipun No PO telah diisikan (status CLOSE), data kondisi khusus tetap ditampilkan &amp; dicatat agar faktor penyebab kendala saat posisi outstanding dapat selalu diketahui dan diaudit.
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdateRow(row.tempId, 'specialCondition', '');
                                      handleUpdateRow(row.tempId, 'specialConditionReason', '');
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-100 dark:hover:bg-rose-900/80 active:scale-95 border border-rose-200 dark:border-rose-800 shadow-2xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
                                    title="Hapus riwayat track record kondisi khusus jika ingin dokumen benar-benar bersih tanpa catatan histori"
                                  >
                                    <RotateCcw className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                                    <span>Reset / Hapus Track Record</span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                                  {/* Baris Deteksi Cerdas dari Tulisan Foto / Teks Bebas */}
                                  <div className="col-span-full pb-2.5 border-b border-purple-200/60 dark:border-purple-800/50">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                                      <label className="text-[11px] font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                        <span>Deteksi Otomatis Faktor Kendala Sesuai Foto / Catatan:</span>
                                      </label>
                                      <span className="text-[10px] text-purple-700/80 dark:text-purple-400">
                                        Ketik tulisan sesuai foto (misal: <em>Waiting kelengkapan dokumen</em>)
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={row.notes || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          handleUpdateRow(row.tempId, 'notes', val);
                                          const det = detectSpecialConditionFromText(val);
                                          if (det.hasCondition) {
                                            handleUpdateRow(row.tempId, 'specialCondition', det.category);
                                            handleUpdateRow(row.tempId, 'specialConditionReason', det.reason);
                                          } else if (!val.trim()) {
                                            handleUpdateRow(row.tempId, 'specialCondition', '');
                                            handleUpdateRow(row.tempId, 'specialConditionReason', '');
                                          }
                                        }}
                                        placeholder="Ketik atau tempel teks riwayat sesuai foto... (Contoh: Waiting kelengkapan dokumen, Pending konfirmasi user, dll)"
                                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg text-xs font-medium text-purple-950 dark:text-purple-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs"
                                      />
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] text-purple-800 dark:text-purple-300 font-semibold">⚡ Cepat Pilih Sesuai Foto:</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const text = 'Waiting kelengkapan dokumen';
                                          handleUpdateRow(row.tempId, 'notes', text);
                                          const det = detectSpecialConditionFromText(text);
                                          handleUpdateRow(row.tempId, 'specialCondition', det.category);
                                          handleUpdateRow(row.tempId, 'specialConditionReason', text);
                                        }}
                                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 transition-colors cursor-pointer"
                                      >
                                        📋 Waiting kelengkapan dokumen
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const text = 'Waiting kelengkapan dokumen vendor by email';
                                          handleUpdateRow(row.tempId, 'notes', text);
                                          const det = detectSpecialConditionFromText(text);
                                          handleUpdateRow(row.tempId, 'specialCondition', det.category);
                                          handleUpdateRow(row.tempId, 'specialConditionReason', text);
                                        }}
                                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 transition-colors cursor-pointer"
                                      >
                                        ✉️ Waiting dokumen vendor (email)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const text = 'Pending konfirmasi anggaran / user pemohon';
                                          handleUpdateRow(row.tempId, 'notes', text);
                                          const det = detectSpecialConditionFromText(text);
                                          handleUpdateRow(row.tempId, 'specialCondition', det.category);
                                          handleUpdateRow(row.tempId, 'specialConditionReason', text);
                                        }}
                                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 transition-colors cursor-pointer"
                                      >
                                        ⏳ Pending konfirmasi user / budget
                                      </button>
                                    </div>
                                  </div>

                                  {/* Dropdown Kategori Kendala */}
                                  <div className={!PRESET_SPECIAL_CONDITIONS.includes(row.specialCondition) ? "md:col-span-4" : "md:col-span-5"}>
                                    <label className="text-[11px] font-bold text-purple-900 dark:text-purple-300 block mb-1">
                                      Faktor / Kategori Kendala (Historis):
                                    </label>
                                    <select
                                      value={
                                        PRESET_SPECIAL_CONDITIONS.includes(row.specialCondition)
                                          ? row.specialCondition
                                          : row.specialCondition ? '__CUSTOM__' : ''
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '__CUSTOM__') {
                                          handleUpdateRow(row.tempId, 'specialCondition', 'Kendala Khusus Lainnya');
                                        } else {
                                          handleUpdateRow(row.tempId, 'specialCondition', val);
                                        }
                                      }}
                                      className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 focus:outline-none"
                                    >
                                      <option value="">Tidak Ada (Hapus Track Record)</option>
                                      <option value="Menunggu Kelengkapan Dokumen Vendor">📋 Menunggu Kelengkapan Dokumen Vendor</option>
                                      <option value="Kendala Vendor / Stok Kosong">📦 Kendala Vendor / Stok Kosong</option>
                                      <option value="Pending Konfirmasi User / Budget">⏳ Pending Konfirmasi User / Budget</option>
                                      <option value="Perubahan Data / Spek SPP">📝 Perubahan Data / Spek SPP</option>
                                      <option value="Menunggu Sampel / Approval Teknis">🧪 Menunggu Sampel / Approval Teknis</option>
                                      <option value="Hold PO / Penundaan Manajemen">⏸️ Hold PO / Penundaan Manajemen</option>
                                      <option value="Batal Realisasi PO">🚫 Batal Realisasi PO</option>
                                      <option value="__CUSTOM__">✍️ Kendala Khusus Lainnya (Ketik Manual)...</option>
                                    </select>
                                  </div>

                                  {/* Input Kategori Manual */}
                                  {(!PRESET_SPECIAL_CONDITIONS.includes(row.specialCondition) && row.specialCondition !== '') && (
                                    <div className="md:col-span-3 animate-in fade-in">
                                      <label className="text-[11px] font-bold text-purple-900 dark:text-purple-300 block mb-1">
                                        Nama Kategori Faktor:
                                      </label>
                                      <input
                                        type="text"
                                        value={row.specialCondition}
                                        onChange={(e) => handleUpdateRow(row.tempId, 'specialCondition', e.target.value)}
                                        placeholder="Ketik nama kategori..."
                                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg text-xs font-semibold text-purple-950 dark:text-purple-200 focus:outline-none shadow-2xs"
                                      />
                                    </div>
                                  )}

                                  {/* Rincian Alasan Kendala */}
                                  <div className={(!PRESET_SPECIAL_CONDITIONS.includes(row.specialCondition)) ? "md:col-span-5" : "md:col-span-7"}>
                                    <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-300 mb-1">
                                      Penjelasan Faktor Penyebab (Detail Alasan):
                                    </label>
                                    <textarea
                                      rows={2}
                                      value={row.specialConditionReason || ''}
                                      onChange={(e) => handleUpdateRow(row.tempId, 'specialConditionReason', e.target.value)}
                                      placeholder="Rincian faktor penyebab kendala sebelum PO terbit..."
                                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg text-xs text-purple-950 dark:text-purple-100 focus:outline-none font-sans resize-y shadow-2xs"
                                    />
                                    <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 leading-tight">
                                      📌 Data ini tersimpan sebagai track record riwayat penyebab kendala saat dokumen masih outstanding.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 rounded-xl border bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>Dokumen Normal (Tanpa Kendala Khusus) · No PO: <strong className="font-mono text-slate-800 dark:text-slate-200">{row.poNumber}</strong></span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateRow(row.tempId, 'specialCondition', 'Pending Konfirmasi User / Budget');
                                  }}
                                  className="text-[11px] text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                                >
                                  <History className="w-3 h-3" />
                                  <span>+ Catat Track Record Kendala (Jika Sempat Tertahan)</span>
                                </button>
                              </div>
                            )
                          ) : (
                            /* State Posisi Masih Outstanding (Belum Ada No PO) */
                            <div className={`p-3 rounded-xl border transition-all ${
                              row.specialCondition && row.specialCondition !== ''
                                ? 'bg-purple-50/70 dark:bg-purple-950/25 border-purple-200 dark:border-purple-800/60 shadow-2xs'
                                : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/60'
                            }`}>
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                                {/* Baris Deteksi Cerdas dari Tulisan Foto / Teks Bebas */}
                                <div className="col-span-full pb-2.5 border-b border-purple-200/60 dark:border-purple-800/50">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                                    <label className="text-[11px] font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                      <span>Deteksi Otomatis Kondisi Khusus Sesuai Foto / Keterangan:</span>
                                    </label>
                                    <span className="text-[10px] text-purple-700/80 dark:text-purple-400">
                                      Ketik tulisan sesuai foto (misal: <em>Waiting kelengkapan dokumen</em>)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={row.notes || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        handleUpdateRow(row.tempId, 'notes', val);
                                        const det = detectSpecialConditionFromText(val);
                                        if (det.hasCondition) {
                                          handleUpdateRow(row.tempId, 'specialCondition', det.category);
                                          handleUpdateRow(row.tempId, 'specialConditionReason', det.reason);
                                        } else if (!val.trim()) {
                                          handleUpdateRow(row.tempId, 'specialCondition', '');
                                          handleUpdateRow(row.tempId, 'specialConditionReason', '');
                                        }
                                      }}
                                      placeholder="Ketik atau tempel teks sesuai foto... (Contoh: Waiting kelengkapan dokumen, Pending konfirmasi user, dll)"
                                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg text-xs font-medium text-purple-950 dark:text-purple-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs"
                                    />
                                  </div>
                                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-purple-800 dark:text-purple-300 font-semibold">⚡ Cepat Pilih Sesuai Foto:</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const text = 'Waiting kelengkapan dokumen';
                                        handleUpdateRow(row.tempId, 'notes', text);
                                        const det = detectSpecialConditionFromText(text);
                                        handleUpdateRow(row.tempId, 'specialCondition', det.category);
                                        handleUpdateRow(row.tempId, 'specialConditionReason', text);
                                      }}
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 transition-colors cursor-pointer"
                                    >
                                      📋 Waiting kelengkapan dokumen
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const text = 'Waiting kelengkapan dokumen vendor by email';
                                        handleUpdateRow(row.tempId, 'notes', text);
                                        const det = detectSpecialConditionFromText(text);
                                        handleUpdateRow(row.tempId, 'specialCondition', det.category);
                                        handleUpdateRow(row.tempId, 'specialConditionReason', text);
                                      }}
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 transition-colors cursor-pointer"
                                    >
                                      ✉️ Waiting dokumen vendor (email)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const text = 'Pending konfirmasi anggaran / user pemohon';
                                        handleUpdateRow(row.tempId, 'notes', text);
                                        const det = detectSpecialConditionFromText(text);
                                        handleUpdateRow(row.tempId, 'specialCondition', det.category);
                                        handleUpdateRow(row.tempId, 'specialConditionReason', text);
                                      }}
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 transition-colors cursor-pointer"
                                    >
                                      ⏳ Pending konfirmasi user / budget
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const text = 'Stok vendor distributor kosong / indent';
                                        handleUpdateRow(row.tempId, 'notes', text);
                                        const det = detectSpecialConditionFromText(text);
                                        handleUpdateRow(row.tempId, 'specialCondition', det.category);
                                        handleUpdateRow(row.tempId, 'specialConditionReason', text);
                                      }}
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700 transition-colors cursor-pointer"
                                    >
                                      📦 Kendala vendor / stok kosong
                                    </button>
                                  </div>
                                </div>

                                {/* 1. Dropdown Pilihan Kondisi Khusus */}
                                <div className={
                                  row.specialCondition && row.specialCondition !== ''
                                    ? (!PRESET_SPECIAL_CONDITIONS.includes(row.specialCondition) ? "md:col-span-4" : "md:col-span-4")
                                    : "md:col-span-12"
                                }>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-bold flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
                                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                      <span>Kondisi Khusus / Faktor Kendala (Status: Outstanding)</span>
                                    </label>
                                    {row.specialCondition && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleUpdateRow(row.tempId, 'specialCondition', '');
                                          handleUpdateRow(row.tempId, 'specialConditionReason', '');
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-100 dark:hover:bg-rose-900/80 active:scale-95 border border-rose-200 dark:border-rose-800 shadow-2xs transition-all cursor-pointer"
                                        title="Kembalikan ke status normal (hapus kondisi khusus)"
                                      >
                                        <RotateCcw className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                                        <span>Reset Normal</span>
                                      </button>
                                    )}
                                  </div>

                                  <select
                                    value={
                                      PRESET_SPECIAL_CONDITIONS.includes(row.specialCondition)
                                        ? row.specialCondition
                                        : row.specialCondition ? '__CUSTOM__' : ''
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '__CUSTOM__') {
                                        handleUpdateRow(row.tempId, 'specialCondition', 'Kendala Khusus Lainnya');
                                      } else {
                                        handleUpdateRow(row.tempId, 'specialCondition', val);
                                      }
                                    }}
                                    className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors focus:outline-none ${
                                      row.specialCondition && row.specialCondition !== ''
                                        ? 'bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200'
                                        : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <option value="">Tidak Ada (Normal - Berjalan Sesuai SLA)</option>
                                    <option value="Menunggu Kelengkapan Dokumen Vendor">📋 Menunggu Kelengkapan Dokumen Vendor</option>
                                    <option value="Kendala Vendor / Stok Kosong">📦 Kendala Vendor / Stok Kosong</option>
                                    <option value="Pending Konfirmasi User / Budget">⏳ Pending Konfirmasi User / Budget</option>
                                    <option value="Perubahan Data / Spek SPP">📝 Perubahan Data / Spek SPP</option>
                                    <option value="Menunggu Sampel / Approval Teknis">🧪 Menunggu Sampel / Approval Teknis</option>
                                    <option value="Hold PO / Penundaan Manajemen">⏸️ Hold PO / Penundaan Manajemen</option>
                                    <option value="Batal Realisasi PO">🚫 Batal Realisasi PO</option>
                                    <option value="__CUSTOM__">✍️ Kendala Khusus Lainnya (Ketik Manual)...</option>
                                  </select>
                                </div>

                                {/* 2. Kolom Nama / Kategori (Ketik Bebas) */}
                                {(!PRESET_SPECIAL_CONDITIONS.includes(row.specialCondition) && row.specialCondition !== '') && (
                                  <div className="md:col-span-4 animate-in fade-in">
                                    <label className="text-[11px] font-bold text-purple-900 dark:text-purple-300 block mb-1">
                                      Nama / Kategori Kendala Khusus (Ketik Bebas):
                                    </label>
                                    <input
                                      type="text"
                                      value={row.specialCondition}
                                      onChange={(e) => handleUpdateRow(row.tempId, 'specialCondition', e.target.value)}
                                      placeholder="Contoh: Kendala Khusus Lainnya, Menunggu Izin Edar..."
                                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg text-xs font-semibold text-purple-950 dark:text-purple-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs"
                                    />
                                  </div>
                                )}

                                {/* 3. Detail Rincian Penjelasan Kendala (Ketik Manual) */}
                                {row.specialCondition && row.specialCondition !== '' && (
                                  <div className={(!PRESET_SPECIAL_CONDITIONS.includes(row.specialCondition)) ? "md:col-span-4 animate-in fade-in" : "md:col-span-8 animate-in fade-in"}>
                                    <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-300 mb-1">
                                      Detail Kendala / Rincian Penjelasan (Ketik Manual):
                                    </label>
                                    <textarea
                                      rows={2}
                                      value={row.specialConditionReason || ''}
                                      onChange={(e) => handleUpdateRow(row.tempId, 'specialConditionReason', e.target.value)}
                                      placeholder="Contoh: Menunggu kelengkapan dokumen vendor berupa surat garansi resmi & faktur proforma, atau menunggu konfirmasi stok dari distributor..."
                                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg text-xs text-purple-950 dark:text-purple-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans resize-y shadow-2xs"
                                    />
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                                      💡 Saat nomor PO diisikan, data ini tetap ditampilkan &amp; tersimpan sebagai Track Record riwayat faktor penyebab kendala.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Fitur Khusus: Toggle Mode Dispensasi Urgent / Advance PO */}
                        <div className="col-span-full pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={row.isUrgentAdvance}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  handleUpdateRow(row.tempId, 'isUrgentAdvance', checked);
                                  if (checked) {
                                    handleUpdateRow(row.tempId, 'budgetStatus', 'PENDING_ACC');
                                    if (!row.poDate) {
                                      handleUpdateRow(row.tempId, 'poDate', new Date().toISOString().split('T')[0]);
                                    }
                                    if (!row.sppNumber) {
                                      handleUpdateRow(row.tempId, 'sppNumber', `SPP-PENDING-ACC-${Date.now().toString().slice(-4)}`);
                                    }
                                  } else {
                                    handleUpdateRow(row.tempId, 'budgetStatus', 'APPROVED');
                                  }
                                }}
                                className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer w-4 h-4"
                              />
                              <div>
                                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                                  <span>Dispensasi Urgent / Advance PO (PO Terbit Mendahului ACC Budget)</span>
                                </span>
                                <span className="text-[10px] text-amber-700 dark:text-amber-400 block">
                                  Aktifkan jika kondisi darurat (mesin mogok/stok kritis) sehingga PO wajib dikerjakan lebih dulu sebelum SPP di-ACC.
                                </span>
                              </div>
                            </label>

                            {row.isUrgentAdvance && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-200/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 whitespace-nowrap">
                                STATUS: PENDING BUDGET ACC
                              </span>
                            )}
                          </div>

                          {row.isUrgentAdvance && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 p-3 rounded-lg bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/30 animate-in fade-in duration-150">
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-1">
                                  Alasan Kondisi Darurat:
                                </label>
                                <select
                                  value={row.urgentReason}
                                  onChange={(e) => handleUpdateRow(row.tempId, 'urgentReason', e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-md text-xs text-slate-800 dark:text-slate-200 font-medium"
                                >
                                  <option value="Breakdown Mesin Pabrik / Line Stop (Kritis)">🚨 Breakdown Mesin Pabrik / Line Stop (Kritis)</option>
                                  <option value="Stok Bahan Baku / Spare Part Kritis (Stock-Out)">📦 Stok Bahan Baku / Spare Part Kritis (Stock-Out)</option>
                                  <option value="Batas Waktu Penawaran Khusus Vendor (Validity Price)">⏳ Batas Waktu Penawaran Khusus Vendor (Validity Price)</option>
                                  <option value="Kebutuhan K3 & Operasional Darurat">🦺 Kebutuhan K3 & Operasional Darurat</option>
                                  <option value="Instruksi Khusus Manajemen">📋 Instruksi Khusus Manajemen</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-1">
                                  Otorisator / Disetujui Oleh:
                                </label>
                                <select
                                  value={['Kepala Cabang / Plant Manager', 'Asst. Manager Procurement', 'Manager Procurement SJA', 'Direksi / General Manager', 'Superadmin SJA'].includes(row.urgentApprovedBy) ? row.urgentApprovedBy : '__CUSTOM__'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '__CUSTOM__') {
                                      handleUpdateRow(row.tempId, 'urgentApprovedBy', '');
                                    } else {
                                      handleUpdateRow(row.tempId, 'urgentApprovedBy', val);
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-md text-xs text-slate-800 dark:text-slate-200 font-medium"
                                >
                                  <option value="Kepala Cabang / Plant Manager">Kepala Cabang / Plant Manager</option>
                                  <option value="Asst. Manager Procurement">Asst. Manager Procurement</option>
                                  <option value="Manager Procurement SJA">Manager Procurement SJA</option>
                                  <option value="Direksi / General Manager">Direksi / General Manager</option>
                                  <option value="Superadmin SJA">Superadmin SJA</option>
                                  <option value="__CUSTOM__">✍️ Lainnya (Ketik Manual)...</option>
                                </select>

                                {!['Kepala Cabang / Plant Manager', 'Asst. Manager Procurement', 'Manager Procurement SJA', 'Direksi / General Manager', 'Superadmin SJA'].includes(row.urgentApprovedBy) && (
                                  <input
                                    type="text"
                                    value={row.urgentApprovedBy}
                                    onChange={(e) => handleUpdateRow(row.tempId, 'urgentApprovedBy', e.target.value)}
                                    placeholder="Ketik nama / jabatan otorisator..."
                                    className="w-full mt-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-amber-500 rounded-md text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                                    autoFocus
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Kotak Kalkulasi Hari Kerja Eksekutif Metode 1 */}
              <div className="p-4 bg-slate-900 dark:bg-slate-950 text-white rounded-xl space-y-2.5 mt-4 border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>Jumlah Hari Proses (Formula Hari Kerja):</span>
                  </span>
                  <span className="font-mono text-blue-300 font-bold text-sm">
                    {avgProcessDays} Hari Kerja (Rata-rata dari {rows.length} Data)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-[11px] pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-slate-400 block">Status PO:</span>
                    <span className="font-bold font-mono text-emerald-400">
                      {closedCount} CLOSE <span className="text-slate-400 font-normal">/</span> {openCount} OPEN
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Status SLA:</span>
                    <span className="font-bold font-mono text-blue-400">
                      {ontimeCount} ONTIME <span className="text-slate-400 font-normal">/</span> {lateCount} TERLAMBAT
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Pengecualian:</span>
                    <span className="text-slate-300 font-mono">
                      {totalWeekendSkipped} akhir pekan, {totalHolidaySkipped} libur SKB
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 pt-1 font-mono">
                  *Sabtu, Minggu dan Hari Libur Nasional SKB 3 Menteri otomatis tidak dihitung dalam proses.
                </p>
              </div>

              {/* Footer Action Buttons Metode 1 */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white rounded-lg font-bold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Google Sheet...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan SPP ({rows.length} Data)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ============================================================== */}
        {/* KONTEN METODE 2: INPUT MODEL DATA COPY-PASTE DARI EXCEL */}
        {/* ============================================================== */}
        {activeInputMethod === 'PASTE_EXCEL' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Box Panduan Urutan Kolom & Tombol Bantuan */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                    <Columns className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Urutan Kolom Excel / Google Sheet yang Sesuai:</span>
                      <button
                        type="button"
                        onClick={() => setShowColumnHelp(!showColumnHelp)}
                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                        title="Tampilkan rincian kolom"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cukup copy (Ctrl+C) baris data dari Excel Anda, lalu paste (Ctrl+V) ke kotak di bawah.
                    </p>
                  </div>
                </div>

                {/* Tombol Copy Header & Template */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyExcelHeader}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    title="Salin judul kolom agar bisa di-paste di baris pertama Excel Anda"
                  >
                    {copiedHeaderToast ? (
                      <>
                        <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Header Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-3.5 h-3.5 text-slate-500" />
                        <span>Salin Format Header Excel</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    title="Muat contoh data 4 baris valid untuk pengujian langsung"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Muat Contoh Data</span>
                  </button>

                  {pastedText && (
                    <button
                      type="button"
                      onClick={() => setPastedText('')}
                      className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      title="Bersihkan teks"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Rincian Header 8 Kolom Standar */}
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-max text-slate-700 dark:text-slate-300">
                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900/40">
                    1. Tanggal Terima Budget
                  </span>
                  <span className="text-slate-300">→</span>
                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900/40">
                    2. Nomor SPP
                  </span>
                  <span className="text-slate-300">→</span>
                  <span
                    className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-900/40"
                    title="Cabang/area otomatis mengisi sesuai user atau PIC Loginnya jika kosong"
                  >
                    3. Cabang / Area (Oto Login)
                  </span>
                  <span className="text-slate-300">→</span>
                  <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-900/40">
                    4. PIC
                  </span>
                  <span className="text-slate-300">→</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-900/40">
                    5. Tanggal PO
                  </span>
                  <span className="text-slate-300">→</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-900/40">
                    6. No. PO
                  </span>
                  <span className="text-slate-300">→</span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-900/40">
                    7. Kondisi Khusus
                  </span>
                  <span className="text-slate-300">→</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                    8. SLA
                  </span>
                </div>
              </div>

              {/* Rincian Petunjuk Tambahan saat showColumnHelp aktif */}
              {showColumnHelp && (
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg border border-blue-200/80 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300 space-y-1.5 animate-in fade-in duration-150">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>Fitur Pintar Parser Excel:</span>
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 pl-1">
                    <li>
                      <strong>Urutan Kolom Sesuai:</strong> 1. Tanggal Terima Budget → 2. Nomor SPP → 3. Cabang / Area (Otomatis Login) → 4. PIC → 5. Tanggal PO → 6. No. PO → 7. Kondisi Khusus → 8. SLA.
                    </li>
                    <li>
                      <strong>Cabang / Area Otomatis:</strong> Kolom Cabang otomatis terisi sesuai user atau PIC yang sedang login ({AREA_METADATA[initialArea]?.name || initialArea}) bila di data paste dikosongkan.
                    </li>
                    <li>
                      <strong>Baris Header Otomatis Dilewati:</strong> Jika Anda menyalin judul kolom Excel, sistem otomatis mengabaikannya dan langsung memproses data.
                    </li>
                    <li>
                      <strong>Format Tanggal Fleksibel:</strong> Mendukung format standar Excel seperti <code className="font-mono bg-white dark:bg-slate-900 px-1 rounded">07/10/2026</code>, <code className="font-mono bg-white dark:bg-slate-900 px-1 rounded">2026-10-07</code>, maupun <code className="font-mono bg-white dark:bg-slate-900 px-1 rounded">08 October 2026</code>.
                    </li>
                    <li>
                      <strong>Paste 2 Kolom (Tanggal Terima &amp; No SPP):</strong> Jika hanya 2 kolom, cabang otomatis mengikuti user login dan kolom PIC otomatis diisi <strong>(-)</strong>.
                    </li>
                    <li>
                      <strong>Kondisi Khusus di Samping Kanan No. PO:</strong> Kolom ke-7 khusus untuk catatan kendala/kondisi (misal <em>"Waiting kelengkapan dokumen"</em>). Jika tidak ada keterangan kendala khusus atau dikosongkan, kolom Kondisi Khusus otomatis <strong>kosong (-)</strong>.
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Kotak Textarea Copy-Paste */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clipboard className="w-4 h-4 text-emerald-600" />
                  <span>Area Tempel / Paste Data Excel (Ctrl+V):</span>
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {pastedText ? `${pastedText.split('\n').filter((l) => l.trim()).length} baris teks terdeteksi` : 'Kotak masih kosong'}
                </span>
              </div>

              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Salin baris tabel dari Excel Anda (Ctrl+C), lalu paste (Ctrl+V) di sini... (Bisa minimal 1 data maupun banyak data sekaligus)\nUrutan Kolom Sesuai Format:\n1. Tanggal Terima Budget\t2. Nomor SPP\t3. Cabang / Area (Oto Login)\t4. PIC\t5. Tanggal PO\t6. No. PO\t7. Kondisi Khusus\t8. SLA\n\nContoh Paste Lengkap Tanpa Kondisi Khusus (Kolom Kondisi Khusus Kosong):\n08 October 2026\tSPP/014/PROD-III/IX/2026\tSukodono\tIDA\t09 Oktober\t4M261269\t\t10\n(PIC: IDA, Tanggal PO: 09 Oktober, No. PO: 4M261269, Kondisi Khusus: -)\n\nContoh Paste dengan Kondisi Khusus:\n07/10/2026\tSPP/KRW/2026/10/0102\tKarawang\tDevi\t\t\tWaiting kelengkapan dokumen\t10\n\nContoh Paste 2 Kolom (Tanggal Terima & Nomor SPP Saja):\n08 October 2026\tSPP/014/PROD-III/IX/2026\n(Cabang otomatis login, PIC otomatis diisi '-')`}
                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-all leading-relaxed"
              />
            </div>

            {/* ============================================================== */}
            {/* PREVIEW TABEL INTERAKTIF HASIL PASTE DENGAN KALKULASI REAL-TIME */}
            {/* ============================================================== */}
            {parsedExcelData.length > 0 ? (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/90 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Preview Data Hasil Paste ({parsedExcelData.length} Dokumen SPP)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-semibold border border-emerald-200 dark:border-emerald-800">
                      Rata-rata: {pasteKPI.avgDays} Hari Kerja
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-semibold border border-blue-200 dark:border-blue-800">
                      {pasteKPI.closed} Close / {pasteKPI.open} Open
                    </span>
                  </div>
                </div>

                <div className="border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 sticky top-0 z-10 text-[11px] font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700">No.</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700">Tgl Terima Budget</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700">Nomor SPP</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700">Cabang</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700">PIC</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700">Tgl PO</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700">No. PO</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700">Kondisi Khusus</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-center">SLA</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-center">Durasi Kerja</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px] bg-white dark:bg-slate-900">
                        {parsedExcelData.map((item, idx) => (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-2 px-3 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-2 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {item.budgetReceivedDate}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {item.sppNumber}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  item.area === 'SEPANJANG'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                    : item.area === 'KARAWANG'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                    : item.area === 'SUKODONO'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                }`}
                              >
                                {AREA_METADATA[item.area]?.name || item.area}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-800 dark:text-slate-200 whitespace-nowrap font-sans font-medium">
                              {item.pic === '-' || !item.pic ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700" title="Belum ada nama PIC yang ditugaskan">
                                  -
                                </span>
                              ) : (
                                item.pic
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {item.poDate || '-'}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {item.poNumber || <span className="text-slate-400 italic">Belum Ada</span>}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {item.specialCondition || (item.notes && item.notes.trim() !== '' && item.notes.trim() !== '-' && item.notes.trim().toLowerCase() !== 'normal') ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    <AlertCircle className="w-2.5 h-2.5 shrink-0 text-purple-600 dark:text-purple-400" />
                                    <span>{item.notes || item.specialCondition}</span>
                                  </span>
                                  {item.specialCondition && item.notes && item.notes.toLowerCase() !== item.specialCondition.toLowerCase() && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans max-w-[220px] truncate" title={item.specialCondition}>
                                      Kategori: {item.specialCondition}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600 font-mono text-[10px]">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono">
                              {item.slaLimit} Hari
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap font-bold">
                              <span
                                className={
                                  item.processDays === 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : item.statusOntime === 'ONTIME'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }
                              >
                                {item.processDays} Hari
                                {item.processDays === 0 && ' (0d)'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.statusPO === 'CLOSE'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                }`}
                              >
                                {item.statusPO}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Banner Aksi Lanjutan Hasil Paste */}
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-emerald-950 dark:text-emerald-200 font-medium">
                      Semua data telah di-parse &amp; dikalkulasi hari kerjanya. Siap disimpan &amp; disinkronkan ke Google Sheet!
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleTransferToManualRows}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      title="Pindahkan data ini ke Form Manual untuk koreksi atau aktifkan dispensasi urgent"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit di Form Manual</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveFromPaste}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan ke Google Sheet...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Simpan &amp; Sinkronkan Sekarang</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 text-slate-400 space-y-2">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Belum Ada Data yang Di-paste
                </h4>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  Silakan salin baris tabel dari Excel Anda (minimal 1 data sudah bisa langsung terdeteksi) lalu tekan <strong>Ctrl + V</strong> pada kotak teks di atas, atau klik tombol <strong>"Muat Contoh Data"</strong>.
                </p>
              </div>
            )}

            {/* Footer Modal Metode 2 */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveFromPaste}
                disabled={parsedExcelData.length === 0 || isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-lg font-bold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Google Sheet...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan SPP ({parsedExcelData.length} Data)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
