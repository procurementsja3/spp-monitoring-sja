import React, { useState, useEffect, useMemo } from 'react';
import { SPPItem, SJAArea, UserProfile, IndonesianHoliday } from '../types';
import { AREA_METADATA, AREA_PIC_LIST } from '../utils/initialData';
import { calculateWorkingDays, DEFAULT_INDONESIAN_HOLIDAYS } from '../utils/holidayCalendar';
import {
  LayoutDashboard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  Building2,
  TrendingUp,
  FileText,
  Users,
  ArrowRight,
  Plus,
  Calendar,
  AlertCircle,
  ShieldCheck,
  CalendarRange,
  CalendarX2,
  Coffee,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Table,
  LayoutGrid,
  Search,
  X,
  ExternalLink,
  CalendarDays,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';

interface ExecutiveDashboardProps {
  items: SPPItem[];
  currentUser: UserProfile;
  activeAreaFilter: SJAArea | 'ALL';
  holidays?: IndonesianHoliday[];
  onSelectAreaFilter: (area: SJAArea | 'ALL') => void;
  onNavigateToMonitoring: () => void;
  onOpenNewSPP: () => void;
  onEditItem: (item: SPPItem) => void;
  onFilterSpeed?: (speedMode: 'SPEED_LE_3' | 'SPEED_4_7' | 'SPEED_8_10' | 'SPEED_GT_10', label: string) => void;
  selectedPicFilter?: string;
  onSelectPicFilter?: (pic: string) => void;
  searchPicQuery?: string;
  onSearchPicQuery?: (q: string) => void;
  onSyncGoogleSheet?: () => void | Promise<void>;
  isSyncingGoogleSheet?: boolean;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  items,
  currentUser,
  activeAreaFilter,
  holidays = DEFAULT_INDONESIAN_HOLIDAYS,
  onSelectAreaFilter,
  onNavigateToMonitoring,
  onOpenNewSPP,
  onEditItem,
  onFilterSpeed,
  selectedPicFilter: propSelectedPicFilter,
  onSelectPicFilter,
  searchPicQuery: propSearchPicQuery,
  onSearchPicQuery,
  onSyncGoogleSheet,
  isSyncingGoogleSheet = false,
}) => {
  const isSuperadmin = currentUser.role === 'SUPERADMIN';
  const allAreas: SJAArea[] = ['SEPANJANG', 'KARAWANG', 'SUKODONO', 'SEMARANG'];
  const userArea: SJAArea = (currentUser.area !== 'ALL' ? currentUser.area : 'SEPANJANG') as SJAArea;
  const relevantAreas: SJAArea[] = isSuperadmin ? allAreas : [userArea];
  const [showFormulaExplanation, setShowFormulaExplanation] = useState(false);

  // Mode Tampilan Dashboard: 'SIMPLIFIED' (Ringkas/Sederhana) vs 'DETAILED' (Lengkap/Rinci)
  const [isSimplifiedMode, setIsSimplifiedMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sja_dashboard_simple_mode');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true; // Default aktifkan Mode Sederhana/Ringkas
  });

  const [showLeadTimeDetail, setShowLeadTimeDetail] = useState<boolean>(false);

  // Pagination & Sorting Data Realisasi PO (Default 15 data per halaman & input terbaru di paling atas)
  const [realizationPage, setRealizationPage] = useState<number>(1);
  const [realizationPageSize, setRealizationPageSize] = useState<number>(15);

  // Helper mendeteksi timestamp input terbaru (dari createdAt, ID timestamp, updatedAt, poDate, atau budgetReceivedDate)
  const getItemInputTimestamp = (item: SPPItem): number => {
    if (item.createdAt) {
      const t = new Date(item.createdAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    const match = item.id?.match(/(\d{13})/);
    if (match) {
      const t = parseInt(match[1], 10);
      if (!isNaN(t) && t > 0) return t;
    }
    if (item.updatedAt) {
      const t = new Date(item.updatedAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (item.poDate) {
      const t = new Date(item.poDate).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (item.budgetReceivedDate) {
      const t = new Date(item.budgetReceivedDate).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    return 0;
  };

  // Filter Kecepatan Realisasi PO langsung di halaman Dashboard (Memunculkan data di bawah 4 kotak)
  const [selectedSpeedFilter, setSelectedSpeedFilter] = useState<'ALL' | 'SPEED_LE_3' | 'SPEED_4_7' | 'SPEED_8_10' | 'SPEED_GT_10'>('ALL');

  // State Filter Pencarian Per-Masing-Masing Kolom Header Tabel Realisasi PO
  const [colSearchSpp, setColSearchSpp] = useState<string>('');
  const [colSearchBudgetReceived, setColSearchBudgetReceived] = useState<string>('');
  const [colSearchPo, setColSearchPo] = useState<string>('');
  const [colSearchCalendarDays, setColSearchCalendarDays] = useState<string>('');
  const [colSearchHolidays, setColSearchHolidays] = useState<string>('');
  const [colSearchNetDays, setColSearchNetDays] = useState<string>('');
  const [colSearchSla, setColSearchSla] = useState<'ALL' | 'ONTIME' | 'TERLAMBAT' | 'FAST-TRACK'>('ALL');
  const [showColSearchRow, setShowColSearchRow] = useState<boolean>(true);

  const activeColFiltersCount = [
    colSearchSpp.trim(),
    colSearchBudgetReceived.trim(),
    colSearchPo.trim(),
    colSearchCalendarDays.trim(),
    colSearchHolidays.trim(),
    colSearchNetDays.trim(),
    colSearchSla !== 'ALL' ? colSearchSla : '',
  ].filter(Boolean).length;

  const handleResetColFilters = () => {
    setColSearchSpp('');
    setColSearchBudgetReceived('');
    setColSearchPo('');
    setColSearchCalendarDays('');
    setColSearchHolidays('');
    setColSearchNetDays('');
    setColSearchSla('ALL');
  };

  useEffect(() => {
    setRealizationPage(1);
  }, [
    selectedSpeedFilter, 
    activeAreaFilter, 
    items.length, 
    realizationPageSize,
    colSearchSpp,
    colSearchBudgetReceived,
    colSearchPo,
    colSearchCalendarDays,
    colSearchHolidays,
    colSearchNetDays,
    colSearchSla
  ]);

  const handleSelectSpeedBox = (speedMode: 'SPEED_LE_3' | 'SPEED_4_7' | 'SPEED_8_10' | 'SPEED_GT_10') => {
    setSelectedSpeedFilter((prev) => (prev === speedMode ? 'ALL' : speedMode));
  };

  const getSpeedFilterLabel = () => {
    switch (selectedSpeedFilter) {
      case 'SPEED_LE_3':
        return 'Sangat Cepat (≤ 3 Hari Kerja)';
      case 'SPEED_4_7':
        return 'Standar (4 - 7 Hari Kerja)';
      case 'SPEED_8_10':
        return 'Mendekati SLA (8 - 10 Hari Kerja)';
      case 'SPEED_GT_10':
        return 'Melebihi SLA (> 10 Hari Kerja)';
      default:
        return 'Semua Dokumen PO Terbit';
    }
  };

  const toggleDashboardMode = (simple: boolean) => {
    setIsSimplifiedMode(simple);
    try {
      localStorage.setItem('sja_dashboard_simple_mode', String(simple));
    } catch {}
  };

  // Filter Periode Bulanan untuk Rekapan PIC
  const [selectedPicMonth, setSelectedPicMonth] = useState<string>('ALL');
  const [picViewMode, setPicViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [picSearch, setPicSearch] = useState<string>('');
  const [activePicDetail, setActivePicDetail] = useState<{
    picName: string;
    monthLabel: string;
    items: SPPItem[];
  } | null>(null);

  // Total dan rasio umum
  const totalSPP = items.length;
  const closedPOs = items.filter((i) => i.statusPO === 'CLOSE').length;
  const openPOs = totalSPP - closedPOs;
  const completionRate = totalSPP > 0 ? ((closedPOs / totalSPP) * 100).toFixed(1) : '0';

  const ontimeCount = items.filter((i) => i.statusOntime === 'ONTIME').length;
  const lateCount = totalSPP - ontimeCount;
  const ontimeRate = totalSPP > 0 ? ((ontimeCount / totalSPP) * 100).toFixed(1) : '0';

  const urgentItems = items.filter((i) => i.isUrgentAdvance);
  const urgentCount = urgentItems.length;
  const urgentPendingBudgetCount = urgentItems.filter((i) => i.budgetStatus === 'PENDING_ACC').length;

  const h3AlertItems = items.filter((i) => i.isHPlus3Overdue);
  const h3AlertCount = h3AlertItems.length;

  // Analisis Perhitungan Hari Kerja & Pengurangan Libur (Resume Lead Time)
  let totalGrossCalendarDays = 0;
  let totalWeekendDaysDeducted = 0;
  let totalHolidayDaysDeducted = 0;
  const holidaysEncounteredMap = new Map<string, number>();

  const leadTimeDetailedRecords = items.map((item) => {
    const calc = calculateWorkingDays(item.budgetReceivedDate, item.poDate || undefined, holidays);
    totalGrossCalendarDays += calc.totalCalendarDays;
    totalWeekendDaysDeducted += calc.weekendDaysSkipped;
    totalHolidayDaysDeducted += calc.holidayDaysSkipped;

    calc.holidaysSkippedList.forEach((h) => {
      holidaysEncounteredMap.set(h, (holidaysEncounteredMap.get(h) || 0) + 1);
    });

    const isUrgent = !!item.isUrgentAdvance;
    const hasPo = item.poNumber && item.poNumber.trim() !== '';
    const netWorkingDays = isUrgent && hasPo ? 0 : calc.workingDays;

    return {
      item,
      calc,
      netWorkingDays,
      isUrgent,
      hasPo,
    };
  });

  const closedLeadTimes = leadTimeDetailedRecords.filter((r) => r.hasPo);
  const avgClosedWorkingDays = closedLeadTimes.length > 0
    ? (closedLeadTimes.reduce((acc, c) => acc + c.netWorkingDays, 0) / closedLeadTimes.length).toFixed(1)
    : '0';

  const totalClosedNetWorkingDays = closedLeadTimes.reduce((acc, c) => acc + c.netWorkingDays, 0);
  const totalClosedGrossDays = closedLeadTimes.reduce((acc, c) => acc + c.calc.totalCalendarDays, 0);
  const totalClosedWeekendSkipped = closedLeadTimes.reduce((acc, c) => acc + c.calc.weekendDaysSkipped, 0);
  const totalClosedHolidaysSkipped = closedLeadTimes.reduce((acc, c) => acc + c.calc.holidayDaysSkipped, 0);

  const minWorkingDays = closedLeadTimes.length > 0
    ? Math.min(...closedLeadTimes.map((c) => c.netWorkingDays))
    : 0;

  const maxWorkingDays = closedLeadTimes.length > 0
    ? Math.max(...closedLeadTimes.map((c) => c.netWorkingDays))
    : 0;

  // Distribusi kecepatan lead time penyelesaian
  const speedFast = closedLeadTimes.filter((c) => c.netWorkingDays <= 3).length;
  const speedMedium = closedLeadTimes.filter((c) => c.netWorkingDays > 3 && c.netWorkingDays <= 7).length;
  const speedNearSla = closedLeadTimes.filter((c) => c.netWorkingDays > 7 && c.netWorkingDays <= 10).length;
  const speedOverdue = closedLeadTimes.filter((c) => c.netWorkingDays > 10).length;

  const filteredSpeedRecords = closedLeadTimes.filter((record) => {
    if (selectedSpeedFilter === 'SPEED_LE_3') return record.netWorkingDays <= 3;
    if (selectedSpeedFilter === 'SPEED_4_7') return record.netWorkingDays > 3 && record.netWorkingDays <= 7;
    if (selectedSpeedFilter === 'SPEED_8_10') return record.netWorkingDays > 7 && record.netWorkingDays <= 10;
    if (selectedSpeedFilter === 'SPEED_GT_10') return record.netWorkingDays > 10;
    return true;
  });

  // Analisis per Area Cabang SJA
  const areaBreakdown = relevantAreas.map((areaKey) => {
    const areaItems = items.filter((i) => i.area === areaKey);
    const count = areaItems.length;
    const closed = areaItems.filter((i) => i.statusPO === 'CLOSE').length;
    const open = count - closed;
    const ontime = areaItems.filter((i) => i.statusOntime === 'ONTIME').length;
    const rate = count > 0 ? Math.round((ontime / count) * 100) : 100;
    const avgDays = count > 0 ? (areaItems.reduce((acc, c) => acc + c.processDays, 0) / count).toFixed(1) : '0';
    const urgentInArea = areaItems.filter((i) => i.isUrgentAdvance).length;
    const h3InArea = areaItems.filter((i) => i.isHPlus3Overdue).length;

    return {
      areaKey,
      metadata: AREA_METADATA[areaKey],
      count,
      closed,
      open,
      ontime,
      rate,
      avgDays,
      urgentInArea,
      h3InArea,
    };
  });

  // Helper Format Bulan & Tahun (YYYY-MM)
  const getMonthKey = (dateStr?: string): string => {
    if (!dateStr || dateStr.length < 7) return '';
    return dateStr.slice(0, 7);
  };

  const formatMonthLabel = (monthKey: string): string => {
    if (!monthKey || !monthKey.includes('-')) return monthKey || 'Semua Periode';
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month} ${year}`;
  };

  // Kumpulkan semua periode bulan unik dari data input SPP
  const availablePicMonths = Array.from(
    new Set(
      items
        .map((i) => getMonthKey(i.budgetReceivedDate || i.poDate))
        .filter((m) => m && m.length === 7)
    )
  ).sort().reverse();

  // Filter item berdasarkan periode bulanan yang dipilih untuk analisa PIC
  const picFilteredItems = items.filter((item) => {
    if (selectedPicMonth === 'ALL') return true;
    const itemMonth = getMonthKey(item.budgetReceivedDate || item.poDate);
    return itemMonth === selectedPicMonth;
  });

  // Rekapan Data Dikelompokkan Per Nama PIC (Dinamis dari input data pengguna)
  const picGroupMap = new Map<string, {
    name: string;
    total: number;
    closed: number;
    open: number;
    ontime: number;
    totalDays: number;
    urgentCount: number;
    areas: Set<string>;
    items: SPPItem[];
  }>();

  picFilteredItems.forEach((item) => {
    const name = item.pic && item.pic.trim() !== '' ? item.pic.trim() : 'Belum Ditugaskan';
    const prev = picGroupMap.get(name) || {
      name,
      total: 0,
      closed: 0,
      open: 0,
      ontime: 0,
      totalDays: 0,
      urgentCount: 0,
      areas: new Set<string>(),
      items: [],
    };

    prev.total += 1;
    if (item.statusPO === 'CLOSE') prev.closed += 1;
    else prev.open += 1;

    if (item.statusOntime === 'ONTIME' || item.isUrgentAdvance) prev.ontime += 1;
    prev.totalDays += item.processDays;
    if (item.isUrgentAdvance) prev.urgentCount += 1;
    prev.areas.add(AREA_METADATA[item.area]?.name.split(' ')[1] || item.area);
    prev.items.push(item);

    picGroupMap.set(name, prev);
  });

  const picRankings = Array.from(picGroupMap.values())
    .map((p) => ({
      name: p.name,
      total: p.total,
      closed: p.closed,
      open: p.open,
      ontimeRate: p.total > 0 ? Math.round((p.ontime / p.total) * 100) : 0,
      avgDays: p.total > 0 ? (p.totalDays / p.total).toFixed(1) : '0',
      urgentCount: p.urgentCount,
      areas: Array.from(p.areas),
      items: p.items,
    }))
    .sort((a, b) => b.total - a.total);

  const effectivePicQuery = (propSearchPicQuery !== undefined && propSearchPicQuery !== '' ? propSearchPicQuery : picSearch).toLowerCase().trim();

  const displayedPicRankings = picRankings.filter((p) => {
    // 1. Jika bukan Superadmin, hanya tampilkan PIC milik cabang login
    if (!isSuperadmin && currentUser.area && currentUser.area !== 'ALL') {
      const branchPics = AREA_PIC_LIST[currentUser.area as SJAArea] || [];
      if (!branchPics.some((b) => b.toLowerCase() === p.name.toLowerCase())) {
        return false;
      }
    }

    // 2. Filter PIC spesifik jika disetel dari Sidebar / Dropdown
    if (propSelectedPicFilter && propSelectedPicFilter !== 'ALL') {
      if (p.name.toLowerCase() !== propSelectedPicFilter.toLowerCase()) {
        return false;
      }
    }

    // 3. Pencarian Teks
    if (!effectivePicQuery) return true;
    return (
      p.name.toLowerCase().includes(effectivePicQuery) ||
      p.areas.some((a) => a.toLowerCase().includes(effectivePicQuery))
    );
  });

  // Matriks Bulanan Per PIC (Untuk Tampilan Tabel Rekap Bulanan)
  const picMonthlyMatrix: {
    picName: string;
    monthKey: string;
    monthLabel: string;
    total: number;
    closed: number;
    open: number;
    ontimeRate: number;
    avgDays: string;
    urgentCount: number;
    areas: string[];
    items: SPPItem[];
  }[] = [];

  const comboMap = new Map<string, {
    picName: string;
    monthKey: string;
    total: number;
    closed: number;
    open: number;
    ontime: number;
    totalDays: number;
    urgentCount: number;
    areas: Set<string>;
    items: SPPItem[];
  }>();

  items.forEach((item) => {
    const picName = item.pic && item.pic.trim() !== '' ? item.pic.trim() : 'Belum Ditugaskan';
    const mKey = getMonthKey(item.budgetReceivedDate || item.poDate) || 'Belum Ada Tanggal';
    const comboKey = `${picName}__${mKey}`;

    const prev = comboMap.get(comboKey) || {
      picName,
      monthKey: mKey,
      total: 0,
      closed: 0,
      open: 0,
      ontime: 0,
      totalDays: 0,
      urgentCount: 0,
      areas: new Set<string>(),
      items: [],
    };

    prev.total += 1;
    if (item.statusPO === 'CLOSE') prev.closed += 1;
    else prev.open += 1;

    if (item.statusOntime === 'ONTIME' || item.isUrgentAdvance) prev.ontime += 1;
    prev.totalDays += item.processDays;
    if (item.isUrgentAdvance) prev.urgentCount += 1;
    prev.areas.add(AREA_METADATA[item.area]?.name.split(' ')[1] || item.area);
    prev.items.push(item);

    comboMap.set(comboKey, prev);
  });

  Array.from(comboMap.values()).forEach((c) => {
    if (selectedPicMonth === 'ALL' || c.monthKey === selectedPicMonth) {
      if (picSearch.trim() === '' || c.picName.toLowerCase().includes(picSearch.toLowerCase())) {
        picMonthlyMatrix.push({
          picName: c.picName,
          monthKey: c.monthKey,
          monthLabel: formatMonthLabel(c.monthKey),
          total: c.total,
          closed: c.closed,
          open: c.open,
          ontimeRate: c.total > 0 ? Math.round((c.ontime / c.total) * 100) : 0,
          avgDays: c.total > 0 ? (c.totalDays / c.total).toFixed(1) : '0',
          urgentCount: c.urgentCount,
          areas: Array.from(c.areas),
          items: c.items,
        });
      }
    }
  });

  picMonthlyMatrix.sort((a, b) => b.monthKey.localeCompare(a.monthKey) || b.total - a.total);

  // Komponen Interaktif 4 Kotak Distribusi Kecepatan Penerbitan PO
  const renderSpeedDistributionBoxes = () => (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
          <span>Distribusi Kecepatan Penerbitan PO ({closedPOs} Dokumen Selesai):</span>
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            (Klik kotak untuk memunculkan data langsung di bawahnya)
          </span>
        </span>
        <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
          Dihitung murni hari kerja efektif
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        {/* 1. Sangat Cepat (≤ 3 Hari) */}
        <div
          onClick={() => handleSelectSpeedBox('SPEED_LE_3')}
          className={`p-3 rounded-xl transition-all cursor-pointer group relative overflow-hidden ${
            selectedSpeedFilter === 'SPEED_LE_3'
              ? 'ring-2 ring-emerald-500 bg-emerald-100/90 dark:bg-emerald-950/80 border-emerald-500 shadow-md scale-[1.02]'
              : 'bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-md hover:scale-[1.02]'
          }`}
          title="Klik untuk langsung memunculkan dokumen ≤ 3 hari di bawah"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block tracking-tight">
              Sangat Cepat (≤ 3 Hari)
            </span>
            <ArrowRight className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 transition-all ${
              selectedSpeedFilter === 'SPEED_LE_3' ? 'rotate-90 text-emerald-700 font-bold' : 'opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5'
            }`} />
          </div>
          <div className="text-2xl font-bold font-mono my-1 text-emerald-700 dark:text-emerald-300">
            {speedFast}
          </div>
          <div className="flex items-center justify-between text-[10px] text-emerald-700/80">
            <span>{closedPOs > 0 ? Math.round((speedFast / closedPOs) * 100) : 0}% dari PO terbit</span>
            <span className={`font-semibold underline underline-offset-2 ${
              selectedSpeedFilter === 'SPEED_LE_3' ? 'text-emerald-900 dark:text-white font-bold' : 'text-emerald-800 dark:text-emerald-300'
            }`}>
              {selectedSpeedFilter === 'SPEED_LE_3' ? '✓ Tampil di Bawah' : 'Tampilkan Data ↓'}
            </span>
          </div>
        </div>

        {/* 2. Standar (4 - 7 Hari) */}
        <div
          onClick={() => handleSelectSpeedBox('SPEED_4_7')}
          className={`p-3 rounded-xl transition-all cursor-pointer group relative overflow-hidden ${
            selectedSpeedFilter === 'SPEED_4_7'
              ? 'ring-2 ring-blue-500 bg-blue-100/90 dark:bg-blue-950/80 border-blue-500 shadow-md scale-[1.02]'
              : 'bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md hover:scale-[1.02]'
          }`}
          title="Klik untuk langsung memunculkan dokumen 4 - 7 hari di bawah"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 block tracking-tight">
              Standar (4 - 7 Hari)
            </span>
            <ArrowRight className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 transition-all ${
              selectedSpeedFilter === 'SPEED_4_7' ? 'rotate-90 text-blue-700 font-bold' : 'opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5'
            }`} />
          </div>
          <div className="text-2xl font-bold font-mono my-1 text-blue-700 dark:text-blue-300">
            {speedMedium}
          </div>
          <div className="flex items-center justify-between text-[10px] text-blue-700/80">
            <span>{closedPOs > 0 ? Math.round((speedMedium / closedPOs) * 100) : 0}% dari PO terbit</span>
            <span className={`font-semibold underline underline-offset-2 ${
              selectedSpeedFilter === 'SPEED_4_7' ? 'text-blue-900 dark:text-white font-bold' : 'text-blue-800 dark:text-blue-300'
            }`}>
              {selectedSpeedFilter === 'SPEED_4_7' ? '✓ Tampil di Bawah' : 'Tampilkan Data ↓'}
            </span>
          </div>
        </div>

        {/* 3. Mendekati SLA (8 - 10 Hari) */}
        <div
          onClick={() => handleSelectSpeedBox('SPEED_8_10')}
          className={`p-3 rounded-xl transition-all cursor-pointer group relative overflow-hidden ${
            selectedSpeedFilter === 'SPEED_8_10'
              ? 'ring-2 ring-amber-500 bg-amber-100/90 dark:bg-amber-950/80 border-amber-500 shadow-md scale-[1.02]'
              : 'bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 hover:border-amber-500 dark:hover:border-amber-400 hover:shadow-md hover:scale-[1.02]'
          }`}
          title="Klik untuk langsung memunculkan dokumen 8 - 10 hari di bawah"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block tracking-tight">
              Mendekati SLA (8 - 10 Hari)
            </span>
            <ArrowRight className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 transition-all ${
              selectedSpeedFilter === 'SPEED_8_10' ? 'rotate-90 text-amber-700 font-bold' : 'opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5'
            }`} />
          </div>
          <div className="text-2xl font-bold font-mono my-1 text-amber-700 dark:text-amber-300">
            {speedNearSla}
          </div>
          <div className="flex items-center justify-between text-[10px] text-amber-700/80">
            <span>{closedPOs > 0 ? Math.round((speedNearSla / closedPOs) * 100) : 0}% dari PO terbit</span>
            <span className={`font-semibold underline underline-offset-2 ${
              selectedSpeedFilter === 'SPEED_8_10' ? 'text-amber-900 dark:text-white font-bold' : 'text-amber-800 dark:text-amber-300'
            }`}>
              {selectedSpeedFilter === 'SPEED_8_10' ? '✓ Tampil di Bawah' : 'Tampilkan Data ↓'}
            </span>
          </div>
        </div>

        {/* 4. Melebihi SLA (> 10 Hari) */}
        <div
          onClick={() => handleSelectSpeedBox('SPEED_GT_10')}
          className={`p-3 rounded-xl transition-all cursor-pointer group relative overflow-hidden ${
            selectedSpeedFilter === 'SPEED_GT_10'
              ? 'ring-2 ring-rose-500 bg-rose-100/90 dark:bg-rose-950/80 border-rose-500 shadow-md scale-[1.02]'
              : 'bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 hover:border-rose-500 dark:hover:border-rose-400 hover:shadow-md hover:scale-[1.02]'
          }`}
          title="Klik untuk langsung memunculkan dokumen > 10 hari di bawah"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block tracking-tight">
              Melebihi SLA (&gt; 10 Hari)
            </span>
            <ArrowRight className={`w-3.5 h-3.5 text-rose-600 dark:text-rose-400 transition-all ${
              selectedSpeedFilter === 'SPEED_GT_10' ? 'rotate-90 text-rose-700 font-bold' : 'opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5'
            }`} />
          </div>
          <div className="text-2xl font-bold font-mono my-1 text-rose-700 dark:text-rose-300">
            {speedOverdue}
          </div>
          <div className="flex items-center justify-between text-[10px] text-rose-700/80">
            <span>{closedPOs > 0 ? Math.round((speedOverdue / closedPOs) * 100) : 0}% dari PO terbit</span>
            <span className={`font-semibold underline underline-offset-2 ${
              selectedSpeedFilter === 'SPEED_GT_10' ? 'text-rose-900 dark:text-white font-bold' : 'text-rose-800 dark:text-rose-300'
            }`}>
              {selectedSpeedFilter === 'SPEED_GT_10' ? '✓ Tampil di Bawah' : 'Tampilkan Data ↓'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Tabel Dinamis yang Menampilkan Data Sesuai Kriteria 4 Kotak di Atasnya
  const renderSpeedDataTable = () => {
    const isFiltered = selectedSpeedFilter !== 'ALL';
    const baseRecords = isFiltered ? filteredSpeedRecords : closedLeadTimes;

    // Filter Per-Masing-Masing Kolom Header
    const colFilteredDisplayRecords = useMemo(() => {
      return baseRecords.filter(({ item, calc, netWorkingDays, isUrgent }) => {
        // 1. No. SPP & Cabang & PIC
        if (colSearchSpp.trim()) {
          const q = colSearchSpp.trim().toLowerCase();
          const sppMatch = item.sppNumber.toLowerCase().includes(q);
          const areaName = (AREA_METADATA[item.area]?.name || item.area).toLowerCase();
          const areaCode = (AREA_METADATA[item.area]?.code || '').toLowerCase();
          const picMatch = (item.pic || '').toLowerCase().includes(q);
          if (!sppMatch && !areaName.includes(q) && !areaCode.includes(q) && !picMatch) {
            return false;
          }
        }

        // 2. Tgl Terima Budget
        if (colSearchBudgetReceived.trim()) {
          const q = colSearchBudgetReceived.trim().toLowerCase();
          if (!(item.budgetReceivedDate || '').toLowerCase().includes(q)) {
            return false;
          }
        }

        // 3. Tgl & No. PO
        if (colSearchPo.trim()) {
          const q = colSearchPo.trim().toLowerCase();
          const poNumMatch = (item.poNumber || '').toLowerCase().includes(q);
          const poDateMatch = (item.poDate || '').toLowerCase().includes(q);
          if (!poNumMatch && !poDateMatch) {
            return false;
          }
        }

        // 4. Hari Kalender
        if (colSearchCalendarDays.trim()) {
          const q = colSearchCalendarDays.trim().toLowerCase();
          const calStr = String(calc.totalCalendarDays);
          if (!calStr.includes(q)) {
            return false;
          }
        }

        // 5. Hari Libur Dipotong
        if (colSearchHolidays.trim()) {
          const q = colSearchHolidays.trim().toLowerCase();
          const totalLibur = calc.weekendDaysSkipped + calc.holidayDaysSkipped;
          const liburStr = String(totalLibur);
          const wkdStr = String(calc.weekendDaysSkipped);
          const skbStr = String(calc.holidayDaysSkipped);
          if (!liburStr.includes(q) && !wkdStr.includes(q) && !skbStr.includes(q)) {
            return false;
          }
        }

        // 6. Durasi Bersih
        if (colSearchNetDays.trim()) {
          const q = colSearchNetDays.trim().toLowerCase();
          const durStr = String(netWorkingDays);
          if (!durStr.includes(q)) {
            return false;
          }
        }

        // 7. Status SLA
        if (colSearchSla !== 'ALL') {
          if (colSearchSla === 'FAST-TRACK') {
            if (!isUrgent) return false;
          } else if (colSearchSla === 'ONTIME') {
            const isOntime = isUrgent || netWorkingDays <= item.slaLimit;
            if (!isOntime || isUrgent) return false;
          } else if (colSearchSla === 'TERLAMBAT') {
            const isOntime = isUrgent || netWorkingDays <= item.slaLimit;
            if (isOntime) return false;
          }
        }

        return true;
      });
    }, [
      baseRecords,
      colSearchSpp,
      colSearchBudgetReceived,
      colSearchPo,
      colSearchCalendarDays,
      colSearchHolidays,
      colSearchNetDays,
      colSearchSla,
    ]);

    // Urutkan data realisasi PO: Data input terbaru posisi paling atas
    const sortedDisplayRecords = useMemo(() => {
      return [...colFilteredDisplayRecords].sort((a, b) => {
        const timeA = getItemInputTimestamp(a.item);
        const timeB = getItemInputTimestamp(b.item);
        if (timeA !== timeB) return timeB - timeA; // Descending: terbaru di atas
        if (a.item.poDate && b.item.poDate && a.item.poDate !== b.item.poDate) {
          return b.item.poDate.localeCompare(a.item.poDate);
        }
        if (a.item.budgetReceivedDate !== b.item.budgetReceivedDate) {
          return b.item.budgetReceivedDate.localeCompare(a.item.budgetReceivedDate);
        }
        return b.item.sppNumber.localeCompare(a.item.sppNumber);
      });
    }, [colFilteredDisplayRecords]);

    // Kalkulasi Halaman & Irisan Data Paginated (Default 15 data per halaman)
    const totalRealizationPages = Math.max(1, Math.ceil(sortedDisplayRecords.length / realizationPageSize));
    const validRealizationPage = Math.min(Math.max(1, realizationPage), totalRealizationPages);
    const realStartIndex = (validRealizationPage - 1) * realizationPageSize;
    const realEndIndex = realStartIndex + realizationPageSize;
    const paginatedDisplayRecords = sortedDisplayRecords.slice(realStartIndex, realEndIndex);

    const realizationPageNumbers = useMemo(() => {
      if (totalRealizationPages <= 7) {
        return Array.from({ length: totalRealizationPages }, (_, i) => i + 1);
      }
      const pages: (number | string)[] = [];
      if (validRealizationPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalRealizationPages);
      } else if (validRealizationPage >= totalRealizationPages - 3) {
        pages.push(1, '...', totalRealizationPages - 4, totalRealizationPages - 3, totalRealizationPages - 2, totalRealizationPages - 1, totalRealizationPages);
      } else {
        pages.push(1, '...', validRealizationPage - 1, validRealizationPage, validRealizationPage + 1, '...', totalRealizationPages);
      }
      return pages;
    }, [validRealizationPage, totalRealizationPages]);

    return (
      <div className="space-y-3 pt-1 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs bg-slate-50/80 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {isFiltered ? (
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span>Data Dokumen Realisasi PO:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                    selectedSpeedFilter === 'SPEED_LE_3'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : selectedSpeedFilter === 'SPEED_4_7'
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      : selectedSpeedFilter === 'SPEED_8_10'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                  }`}>
                    {getSpeedFilterLabel()} ({sortedDisplayRecords.length} dari {filteredSpeedRecords.length} Dokumen)
                  </span>
                </span>
              ) : (
                <span>
                  Daftar Dokumen Realisasi PO ({sortedDisplayRecords.length}
                  {activeColFiltersCount > 0 ? ` dari ${closedLeadTimes.length}` : ''} PO Terbit):
                </span>
              )}
            </span>

            {isFiltered && (
              <button
                onClick={() => setSelectedSpeedFilter('ALL')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-semibold cursor-pointer px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-900 transition-colors"
                title="Tampilkan semua dokumen realisasi PO tanpa filter kecepatan"
              >
                ✕ Hapus Filter Kecepatan
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tombol Toggle Kolom Pencarian Header */}
            <button
              type="button"
              onClick={() => setShowColSearchRow((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                showColSearchRow
                  ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="Tampilkan atau sembunyikan baris pencarian per kolom header"
            >
              <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{showColSearchRow ? 'Filter Kolom Aktif' : 'Buka Pencarian Kolom'}</span>
              {activeColFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeColFiltersCount}
                </span>
              )}
            </button>

            {/* Tombol Reset Filter Kolom jika ada teks filter aktif */}
            {activeColFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetColFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                title="Hapus seluruh teks pencarian kolom header"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filter Kolom ({activeColFiltersCount})</span>
              </button>
            )}

            {/* Tombol Sinkronisasi 2 Arah Google Sheet */}
            {onSyncGoogleSheet && (
              <button
                type="button"
                onClick={onSyncGoogleSheet}
                disabled={isSyncingGoogleSheet}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
                title="Sinkronisasi 2 Arah Google Sheet: Tarik pembaruan dan perbarui kolom hari kerja di Google Sheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isSyncingGoogleSheet ? 'animate-spin' : ''}`} />
                <span>{isSyncingGoogleSheet ? 'Menyinkronkan...' : 'Sinkron 2 Arah'}</span>
              </button>
            )}

            <button
              onClick={() => {
                if (isFiltered) {
                  onFilterSpeed?.(selectedSpeedFilter, getSpeedFilterLabel());
                } else {
                  onNavigateToMonitoring();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
              title="Filter dan kelola dokumen ini di Tabel Data SPP Monitoring"
            >
              <span>Buka di Tabel SPP Utama</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {sortedDisplayRecords.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Tidak ada dokumen PO yang cocok dengan kriteria pencarian kolom
            </p>
            <p className="text-[11px] text-slate-500">
              {activeColFiltersCount > 0
                ? `${activeColFiltersCount} filter kolom sedang aktif. Silakan ubah kata kunci atau klik tombol Reset Filter Kolom.`
                : 'Klik kotak kriteria lainnya di atas atau klik tombol Tampilkan Semua Dokumen.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              {activeColFiltersCount > 0 && (
                <button
                  onClick={handleResetColFilters}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Reset Pencarian Kolom
                </button>
              )}
              {isFiltered && (
                <button
                  onClick={() => setSelectedSpeedFilter('ALL')}
                  className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Kembali ke Semua Dokumen
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200/90 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-xs">
                  {/* Baris 1: Judul Header Kolom */}
                  <tr>
                    <th className="px-3.5 py-2.5 min-w-[200px]">No. SPP &amp; Cabang</th>
                    <th className="px-3.5 py-2.5 min-w-[130px]">Tgl Terima Budget</th>
                    <th className="px-3.5 py-2.5 min-w-[180px]">Tgl &amp; No. PO</th>
                    <th className="px-3.5 py-2.5 text-center min-w-[105px]">Hari Kalender</th>
                    <th className="px-3.5 py-2.5 text-center min-w-[130px]">Hari Libur Dipotong</th>
                    <th className="px-3.5 py-2.5 text-center min-w-[110px]">Durasi Bersih</th>
                    <th className="px-3.5 py-2.5 text-center min-w-[110px]">Status SLA</th>
                    <th className="px-3 py-2.5 text-center min-w-[75px]">Aksi</th>
                  </tr>

                  {/* Baris 2: Kolom Pencarian Per Masing-Masing Header (Sesuai Permintaan Pengguna) */}
                  {showColSearchRow && (
                    <tr className="bg-slate-50/95 dark:bg-slate-900/95 border-t border-slate-200/70 dark:border-slate-800/70 text-[11px] font-normal">
                      {/* 1. Filter No. SPP & Cabang */}
                      <th className="px-2.5 py-2">
                        <div className="relative">
                          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={colSearchSpp}
                            onChange={(e) => setColSearchSpp(e.target.value)}
                            placeholder="Cari SPP / Cabang / PIC..."
                            className="w-full pl-6 pr-5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                            title="Filter pencarian nomor SPP, cabang, atau nama PIC"
                          />
                          {colSearchSpp && (
                            <button
                              type="button"
                              onClick={() => setColSearchSpp('')}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                              title="Hapus pencarian ini"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </th>

                      {/* 2. Filter Tgl Terima Budget */}
                      <th className="px-2.5 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={colSearchBudgetReceived}
                            onChange={(e) => setColSearchBudgetReceived(e.target.value)}
                            placeholder="Cari tgl terima..."
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                            title="Filter pencarian tanggal terima budget (contoh: 2026-10 atau 07)"
                          />
                          {colSearchBudgetReceived && (
                            <button
                              type="button"
                              onClick={() => setColSearchBudgetReceived('')}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                              title="Hapus pencarian ini"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </th>

                      {/* 3. Filter Tgl & No. PO */}
                      <th className="px-2.5 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={colSearchPo}
                            onChange={(e) => setColSearchPo(e.target.value)}
                            placeholder="Cari No. PO / tgl..."
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                            title="Filter pencarian nomor PO atau tanggal PO"
                          />
                          {colSearchPo && (
                            <button
                              type="button"
                              onClick={() => setColSearchPo('')}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                              title="Hapus pencarian ini"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </th>

                      {/* 4. Filter Hari Kalender */}
                      <th className="px-2 py-2 text-center">
                        <div className="relative">
                          <input
                            type="text"
                            value={colSearchCalendarDays}
                            onChange={(e) => setColSearchCalendarDays(e.target.value)}
                            placeholder="Hari..."
                            className="w-full px-1.5 py-1 text-xs text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                            title="Filter pencarian jumlah total hari kalender"
                          />
                          {colSearchCalendarDays && (
                            <button
                              type="button"
                              onClick={() => setColSearchCalendarDays('')}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                              title="Hapus pencarian ini"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </th>

                      {/* 5. Filter Hari Libur Dipotong */}
                      <th className="px-2 py-2 text-center">
                        <div className="relative">
                          <input
                            type="text"
                            value={colSearchHolidays}
                            onChange={(e) => setColSearchHolidays(e.target.value)}
                            placeholder="Libur..."
                            className="w-full px-1.5 py-1 text-xs text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                            title="Filter pencarian potongan hari libur (akhir pekan & SKB)"
                          />
                          {colSearchHolidays && (
                            <button
                              type="button"
                              onClick={() => setColSearchHolidays('')}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                              title="Hapus pencarian ini"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </th>

                      {/* 6. Filter Durasi Bersih */}
                      <th className="px-2 py-2 text-center">
                        <div className="relative">
                          <input
                            type="text"
                            value={colSearchNetDays}
                            onChange={(e) => setColSearchNetDays(e.target.value)}
                            placeholder="Durasi..."
                            className="w-full px-1.5 py-1 text-xs text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                            title="Filter pencarian durasi bersih hari kerja (contoh: 0 atau 1)"
                          />
                          {colSearchNetDays && (
                            <button
                              type="button"
                              onClick={() => setColSearchNetDays('')}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                              title="Hapus pencarian ini"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </th>

                      {/* 7. Filter Status SLA */}
                      <th className="px-2 py-2 text-center">
                        <select
                          value={colSearchSla}
                          onChange={(e) => setColSearchSla(e.target.value as any)}
                          className="w-full px-1 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans cursor-pointer"
                          title="Filter status SLA"
                        >
                          <option value="ALL">Semua SLA</option>
                          <option value="ONTIME">ONTIME</option>
                          <option value="TERLAMBAT">TERLAMBAT</option>
                          <option value="FAST-TRACK">FAST-TRACK</option>
                        </select>
                      </th>

                      {/* 8. Tombol Reset Header */}
                      <th className="px-2 py-2 text-center">
                        {activeColFiltersCount > 0 ? (
                          <button
                            type="button"
                            onClick={handleResetColFilters}
                            className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Reset seluruh kolom pencarian"
                          >
                            Reset
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px] select-none" title="Filter kolom siap digunakan">
                            Filter
                          </span>
                        )}
                      </th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-mono">
                  {paginatedDisplayRecords.map(({ item, calc, netWorkingDays, isUrgent }) => {
                    const isOntime = isUrgent || netWorkingDays <= item.slaLimit;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => onEditItem(item)}
                        className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                        title="Klik baris untuk melihat / mengedit detail SPP"
                      >
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{item.sppNumber}</span>
                            {isUrgent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                ⚡ DARURAT
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            {AREA_METADATA[item.area]?.name || item.area} · PIC: {item.pic}
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {item.budgetReceivedDate}
                        </td>

                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {item.poNumber || '-'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.poDate || '-'}
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-500 dark:text-slate-400">
                          {calc.totalCalendarDays} hari
                        </td>

                        <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 text-[11px]">
                            <span>-{calc.weekendDaysSkipped + calc.holidayDaysSkipped} hari</span>
                          </div>
                          <div className="text-[9px] text-slate-400 font-sans mt-0.5">
                            ({calc.weekendDaysSkipped} wkd, {calc.holidayDaysSkipped} skb)
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                          <span className={`font-bold text-xs ${isOntime ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {netWorkingDays} hari kerja
                          </span>
                        </td>

                        <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                          {isUrgent ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              FAST-TRACK
                            </span>
                          ) : isOntime ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              ONTIME
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                              TERLAMBAT
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <span className="text-[11px] font-sans font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
                            Detail →
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Navigation Bar untuk Realisasi PO (Default 15 Data Per Halaman) */}
            {sortedDisplayRecords.length > 0 && (
              <div className="p-3.5 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                {/* Info Status Halaman & Data */}
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-mono text-[11px] flex-wrap justify-center sm:justify-start">
                  <span>
                    Menampilkan <strong className="text-slate-900 dark:text-white font-bold">{realStartIndex + 1}</strong> -{' '}
                    <strong className="text-slate-900 dark:text-white font-bold">{Math.min(realEndIndex, sortedDisplayRecords.length)}</strong> dari{' '}
                    <strong className="text-slate-900 dark:text-white font-bold">{sortedDisplayRecords.length}</strong> data realisasi PO
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold font-sans">
                    Halaman {validRealizationPage} dari {totalRealizationPages}
                  </span>
                </div>

                {/* Kontrol Navigasi & Opsi Jumlah Baris */}
                <div className="flex items-center flex-wrap gap-2 justify-center sm:justify-end">
                  <div className="flex items-center gap-1.5 font-sans text-[11px] text-slate-500">
                    <span className="hidden md:inline">Tampilkan:</span>
                    <select
                      value={realizationPageSize}
                      onChange={(e) => {
                        setRealizationPageSize(Number(e.target.value));
                        setRealizationPage(1);
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                      title="Pilih jumlah baris yang ditampilkan per halaman"
                    >
                      <option value={15}>15 baris</option>
                      <option value={25}>25 baris</option>
                      <option value={50}>50 baris</option>
                      <option value={sortedDisplayRecords.length}>Semua data</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setRealizationPage(1)}
                      disabled={validRealizationPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                      title="Halaman Pertama (Data Terbaru)"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRealizationPage((p) => Math.max(1, p - 1))}
                      disabled={validRealizationPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1 px-0.5">
                      {realizationPageNumbers.map((p, idx) =>
                        p === '...' ? (
                          <span key={`real-dots-${idx}`} className="px-1 text-slate-400 font-mono text-xs select-none">
                            ...
                          </span>
                        ) : (
                          <button
                            key={`real-page-${p}`}
                            type="button"
                            onClick={() => setRealizationPage(Number(p))}
                            className={`min-w-[28px] h-7 px-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                              validRealizationPage === p
                                ? 'bg-blue-600 text-white shadow-xs scale-105'
                                : 'border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setRealizationPage((p) => Math.min(totalRealizationPages, p + 1))}
                      disabled={validRealizationPage === totalRealizationPages}
                      className="p-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                      title="Halaman Selanjutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRealizationPage(totalRealizationPages)}
                      disabled={validRealizationPage === totalRealizationPages}
                      className="p-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                      title="Halaman Terakhir"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner Eksekutif dengan Tombol Sederhanakan Tampilan */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-xl border border-blue-600/30">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/25 border border-blue-400/30 text-blue-200">
                Dashboard Operasional & SLA
              </span>
              <span className="text-xs text-blue-200/80 font-mono">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Sistem Monitoring Realisasi SPP</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-blue-900/60 border border-blue-400/30 text-blue-200">
                {isSuperadmin ? (activeAreaFilter === 'ALL' ? 'Multi-Cabang SJA' : AREA_METADATA[activeAreaFilter]?.name) : `Area ${currentUser.name}`}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 mt-1 max-w-2xl">
              {isSimplifiedMode
                ? 'Ringkasan ringkas data pengajuan SPP, realisasi penerbitan PO vendor, dan kepatuhan SLA 10 hari kerja.'
                : 'Ringkasan data pengajuan SPP dari Tim Budget, realisasi penerbitan PO vendor, kepatuhan batas waktu SLA 10 hari kerja, dan resume durasi kerja bersih (bebas hari libur).'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Tombol Pengubah Mode Tampilan (Sederhana vs Lengkap) */}
            <div className="flex items-center bg-blue-950/80 p-1 rounded-xl border border-blue-400/30 text-xs shadow-inner">
              <button
                onClick={() => toggleDashboardMode(true)}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSimplifiedMode
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-blue-200 hover:text-white'
                }`}
                title="Tampilkan ringkasan data yang bersih dan sederhana"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>Tampilan Ringkas</span>
              </button>
              <button
                onClick={() => toggleDashboardMode(false)}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  !isSimplifiedMode
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-blue-200 hover:text-white'
                }`}
                title="Tampilkan seluruh detail grafik, tabel & formula teknis"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                <span>Tampilan Rinci</span>
              </button>
            </div>

            {onSyncGoogleSheet && (
              <button
                onClick={onSyncGoogleSheet}
                disabled={isSyncingGoogleSheet}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl border border-emerald-400/40 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Sinkronisasi 2 Arah Google Sheet: Tarik pembaruan dan hapus data di aplikasi jika baris di Google Sheet telah dihapus"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGoogleSheet ? 'animate-spin' : ''}`} />
                <span>{isSyncingGoogleSheet ? 'Menyinkronkan...' : 'Sinkron 2 Arah'}</span>
              </button>
            )}

            <button
              onClick={onOpenNewSPP}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-800 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Input SPP</span>
            </button>
            <button
              onClick={onNavigateToMonitoring}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600/60 hover:bg-blue-600 text-white font-semibold text-xs rounded-xl border border-blue-400/40 shadow-xs transition-colors cursor-pointer"
            >
              <span>Tabel SPP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Area Switcher Tabs untuk Superadmin */}
        {isSuperadmin && (
          <div className="relative z-10 mt-5 pt-4 border-t border-blue-500/30 flex items-center gap-2 overflow-x-auto text-xs pb-1">
            <span className="text-[11px] text-blue-200 font-medium shrink-0 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-300" />
              <span>Filter Area:</span>
            </span>
            <button
              onClick={() => onSelectAreaFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeAreaFilter === 'ALL'
                  ? 'bg-white text-blue-900 font-bold shadow-xs'
                  : 'bg-blue-900/40 text-blue-100 hover:bg-blue-800/60 border border-blue-400/20'
              }`}
            >
              🌐 Semua Cabang ({items.length})
            </button>
            {allAreas.map((areaKey) => {
              const count = items.filter((i) => i.area === areaKey).length;
              return (
                <button
                  key={areaKey}
                  onClick={() => onSelectAreaFilter(areaKey)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    activeAreaFilter === areaKey
                      ? 'bg-white text-blue-900 font-bold shadow-xs'
                      : 'bg-blue-900/40 text-blue-100 hover:bg-blue-800/60 border border-blue-400/20'
                  }`}
                >
                  <span>{AREA_METADATA[areaKey]?.name.split(' ')[1]}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/30 font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* KPI Cards: Mode Sederhana (4 Kartu Inti + Strip Status) vs Mode Lengkap (6 Kartu) */}
      {isSimplifiedMode ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total SPP Masuk */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Total SPP Masuk</span>
                <FileText className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">
                {totalSPP}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <span>Pengajuan dari Tim Budget</span>
              </div>
            </div>

            {/* Card 2: Realisasi PO Selesai (Close) */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="font-semibold uppercase tracking-wider text-[10px]">PO Selesai (Close)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {closedPOs}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                  ({completionRate}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            {/* Card 3: Menunggu No. PO (Open) */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Menunggu PO (Open)</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {openPOs}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {openPOs > 0 ? `${openPOs} proses penerbitan PO` : 'Semua PO telah terbit'}
              </div>
            </div>

            {/* Card 4: Kepatuhan SLA On-Time */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Kepatuhan SLA (≤ 10 Hari)</span>
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">
                  {ontimeRate}%
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  {ontimeCount} Ontime
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {lateCount > 0 ? `${lateCount} SPP melebihi batas SLA` : '100% tepat batas SLA'}
              </div>
            </div>
          </div>

          {/* Quick Status Strip (Informasi ringkas durasi & status darurat) */}
          <div className="p-2.5 px-4 bg-slate-100/90 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-3 text-slate-700 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <CalendarRange className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Rata-rata Lead Time:</span>
                <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold">{avgClosedWorkingDays} hari kerja</strong>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">(otomatis memotong libur SKB)</span>
              </span>

              {urgentCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <Zap className="w-3 h-3 fill-current" />
                  <span>{urgentCount} PO Darurat</span>
                </span>
              )}

              {h3AlertCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{h3AlertCount} Alert H+3</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Batas SLA: 10 Hari Kerja</span>
              <span>·</span>
              <span>Potongan Libur: {totalClosedWeekendSkipped + totalClosedHolidaysSkipped} Hari</span>
            </div>
          </div>
        </div>
      ) : (
        /* 6 Executive Metric Cards Asli Saat Mode Lengkap */
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
          {/* Metric 1: Total SPP Masuk */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Total SPP</span>
              <FileText className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {totalSPP}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              Dari Tim Budget
            </div>
          </div>

          {/* Metric 2: Realisasi PO Selesai */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[10px]">PO Selesai (Close)</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {closedPOs}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>Rasio Selesai</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{completionRate}%</span>
            </div>
          </div>

          {/* Metric 3: PO Pending (Open) */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Antrean PO (Open)</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {openPOs}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              {openPOs > 0 ? `${openPOs} menunggu No. PO` : 'Antrean nihil'}
            </div>
          </div>

          {/* Metric 4: Kepatuhan SLA On-Time */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Kepatuhan SLA</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {ontimeRate}%
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{ontimeCount} ontime</span>
              <span>·</span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">{lateCount} lewat</span>
            </div>
          </div>

          {/* Metric 5: PO Darurat (Advance PO) */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/80 dark:border-amber-900/60 shadow-2xs bg-amber-50/20 dark:bg-amber-950/10">
            <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-400 mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[10px]">PO Darurat</span>
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {urgentCount}
            </div>
            <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 truncate">
              {urgentPendingBudgetCount > 0 ? (
                <span className="font-medium text-rose-600 dark:text-rose-400">{urgentPendingBudgetCount} pending budget ACC</span>
              ) : (
                'Fast-Track terselesaikan'
              )}
            </div>
          </div>

          {/* Metric 6: Peringatan Kritis (H+3 & >10hr) */}
          <div
            className={`p-4 rounded-xl border shadow-2xs transition-all ${
              h3AlertCount > 0
                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Alert Kritis</span>
              <AlertTriangle className={`w-3.5 h-3.5 ${h3AlertCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
            </div>
            <div className={`text-2xl font-bold font-mono ${h3AlertCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {h3AlertCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              {h3AlertCount > 0 ? `${h3AlertCount} dokumen H+3 tanpa PO` : 'Tidak ada antrean kritis'}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION BARU: RESUME & REKAPAN DURASI LEAD TIME PROSES SPP S/D TERBIT PO */}
      {/* (DIKURANGI SABTU-MINGGU & LIBUR NASIONAL SKB 3 MENTERI)                   */}
      {/* ========================================================================= */}
      {isSimplifiedMode && !showLeadTimeDetail ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 shrink-0">
                <CalendarRange className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Resume Lead Time &amp; Distribusi Kecepatan Realisasi PO</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    Rata-rata: {avgClosedWorkingDays} Hari Kerja
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Dihitung murni hari kerja efektif (potong {totalClosedWeekendSkipped}x akhir pekan &amp; {totalClosedHolidaysSkipped}x libur SKB 3 Menteri). Klik salah satu kotak di bawah untuk memfilter data langsung di Tabel SPP:
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLeadTimeDetail(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Rincian Libur SKB</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4 Kotak Distribusi Kecepatan Interaktif */}
          {renderSpeedDistributionBoxes()}

          {/* Tabel Dinamis yang Menampilkan Data Sesuai Kriteria 4 Kotak di Atasnya */}
          {renderSpeedDataTable()}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
                  <CalendarRange className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Resume Durasi Proses SPP s/d Terbit PO (Lead Time Realisasi)</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Dihitung murni hari kerja efektif dari Tanggal Terima Budget ke Tanggal Terbit PO (otomatis memotong Sabtu-Minggu &amp; Libur SKB).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setShowFormulaExplanation((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{showFormulaExplanation ? 'Tutup Aturan' : 'Aturan Perhitungan'}</span>
                {showFormulaExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isSimplifiedMode && (
                <button
                  onClick={() => setShowLeadTimeDetail(false)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                  title="Sembunyikan rincian tabel & grafik lead time"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Ringkaskan</span>
                </button>
              )}
            </div>
          </div>

        {/* Banner Edukatif & Penjelasan Formula Pengurangan Hari (Sesuai Permintaan Pengguna) */}
        {showFormulaExplanation && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50/80 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-950/30 border border-blue-200/80 dark:border-blue-900/50 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <span className="p-1 rounded-md bg-blue-600 text-white mt-0.5 shrink-0">
                <Check className="w-3.5 h-3.5" />
              </span>
              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Ketentuan Resmi Perhitungan Hari Kerja Pengadaan SJA:
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Durasi proses dihitung dari <strong>Tanggal Terima dari Tim Budget</strong> sampai dengan <strong>Tanggal PO Diterbitkan ke Vendor</strong>. Hari non-efektif berikut otomatis dikeluarkan dari masa proses:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs pt-1">
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-slate-800 space-y-1">
                <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>1. Hari yang Sama = 0 Hari (&lt; 24 Jam)</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Jika SPP diterima <strong>7 Okt</strong> dan PO terbit <strong>7 Okt</strong>, proses selesai di hari yang sama (&lt; 24 jam) sehingga dihitung <strong>0 hari kerja</strong> (Same-day response).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-slate-800 space-y-1">
                <span className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>2. Hari Berikutnya = 1 Hari (&gt; 24 Jam)</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Jika SPP diterima <strong>7 Okt</strong> dan PO terbit <strong>8 Okt</strong>, durasi telah melewati 24 jam pertama kerja, sehingga terhitung <strong>1 hari kerja</strong>.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-slate-800 space-y-1">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CalendarX2 className="w-3.5 h-3.5" />
                  <span>3. Potong Libur &amp; Weekend</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Sabtu-Minggu &amp; Libur SKB 3 Menteri otomatis dipotong. Misal terima <strong>Jumat</strong> dan PO terbit <strong>Senin</strong>, akhir pekan dipotong sehingga hanya <strong>1 hari kerja</strong>.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-slate-800 space-y-1">
                <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>4. PO Darurat (Dispensasi)</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Untuk kondisi darurat (mesin pabrik breakdown / spare part kritis) PO terbit mendahului ACC budget, dihitung <strong>0 hari kerja (Fast-Track ONTIME)</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4 Kartu Metrik Ringkasan Durasi Bersih */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Rata-Rata Lead Time Bersih PO Close */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Rata-Rata Lead Time Bersih
            </span>
            <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {avgClosedWorkingDays} <span className="text-xs font-sans font-normal text-slate-500">hari kerja</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span>Batas toleransi SLA:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-mono">10 hari</strong>
            </div>
          </div>

          {/* Card 2: Total Hari Libur yang Dipotong */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Hari Libur Dipotong
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {totalClosedWeekendSkipped + totalClosedHolidaysSkipped} <span className="text-xs font-sans font-normal text-slate-500">hari kalender</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {totalClosedWeekendSkipped}x akhir pekan, {totalClosedHolidaysSkipped}x libur SKB
            </div>
          </div>

          {/* Card 3: Kecepatan Tercepat & Terlama */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Rentang Durasi Realisasi
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white pt-0.5">
              {minWorkingDays} <span className="text-xs font-sans font-normal text-slate-400">s/d</span> {maxWorkingDays} <span className="text-xs font-sans font-normal text-slate-400">hari kerja</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Dari {closedPOs} dokumen PO yang telah terbit
            </div>
          </div>

          {/* Card 4: Kepatuhan SLA Lead Time */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Tingkat Ketepatan Target
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {ontimeRate}%
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{ontimeCount} tepat waktu</span>
              <span>·</span>
              <span className="text-rose-600 dark:text-rose-400">{lateCount} terlambat</span>
            </div>
          </div>
        </div>

        {/* Distribusi Kecepatan Penyelesaian PO (Interaktif) */}
        {renderSpeedDistributionBoxes()}

        {/* Tabel Dinamis yang Menampilkan Data Sesuai Kriteria 4 Kotak di Atasnya (Menggantikan Sampel Rekapan Dokumen) */}
        {renderSpeedDataTable()}
      </div>
      )}

      {/* Grid 2 Kolom: Komparasi Per Area Cabang & Pipeline Realisasi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1 & 2: Matriks Realisasi Cabang SJA */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  {isSuperadmin
                    ? 'Kinerja Realisasi Berdasarkan Cabang SJA'
                    : `Kinerja Realisasi ${AREA_METADATA[userArea]?.name || 'Cabang'}`}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isSuperadmin
                  ? 'Perbandingan volume pengajuan, penyelesaian PO, dan tingkat ketepatan SLA 10 hari kerja 4 cabang.'
                  : `Pemantauan volume pengajuan, penyelesaian PO, dan tingkat ketepatan SLA 10 hari kerja cabang ${AREA_METADATA[userArea]?.name || ''}.`}
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Rata-rata Durasi: {avgClosedWorkingDays} hari kerja
            </span>
          </div>

          <div className="space-y-3.5">
            {areaBreakdown.map((item) => {
              const isSelected = activeAreaFilter === item.areaKey;
              return (
                <div
                  key={item.areaKey}
                  onClick={() => isSuperadmin && onSelectAreaFilter(item.areaKey)}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-400/80 shadow-xs'
                      : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {item.metadata.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        {item.metadata.code}
                      </span>
                      {item.urgentInArea > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Zap className="w-2.5 h-2.5 fill-current" />
                          <span>{item.urgentInArea} Urgent</span>
                        </span>
                      )}
                      {item.h3InArea > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>{item.h3InArea} H+3</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-900 dark:text-white font-bold">{item.count}</strong> SPP
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        <strong>{item.closed}</strong> Close
                      </span>
                      <span className="text-amber-600 dark:text-amber-400">
                        <strong>{item.open}</strong> Open
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {item.rate}% SLA
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar Visual (Close PO vs Open PO) */}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${item.count > 0 ? (item.closed / item.count) * 100 : 0}%` }}
                      title={`Close PO: ${item.closed}`}
                    />
                    <div
                      className="bg-amber-500 h-full transition-all"
                      style={{ width: `${item.count > 0 ? (item.open / item.count) * 100 : 0}%` }}
                      title={`Open PO: ${item.open}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kolom 3: Pipeline Realisasi & Dokumen Memerlukan Tindakan */}
        <div className="space-y-6">
          {/* Box 1: Pipeline Tahapan Pengadaan */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Pipeline Status Dokumen</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-900 dark:text-blue-200 block">1. Masuk dari Tim Budget</span>
                  <span className="text-[11px] text-blue-700/80 dark:text-blue-300/80">Dokumen terdaftar di sistem</span>
                </div>
                <span className="text-base font-bold font-mono text-blue-700 dark:text-blue-300">
                  {totalSPP}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-200 block">2. Menunggu No. PO (Open)</span>
                  <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80">Negosiasi vendor &amp; proses PO</span>
                </div>
                <span className="text-base font-bold font-mono text-amber-700 dark:text-amber-300">
                  {openPOs}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 block">3. Realisasi Terbit (Close)</span>
                  <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">PO terbit &amp; barang diproses</span>
                </div>
                <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  {closedPOs}
                </span>
              </div>
            </div>
          </div>

          {/* Box 2: Dokumen Darurat & Tindakan Segera */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Perhatian Segera ({urgentCount + h3AlertCount})</span>
              </h3>
              <button
                onClick={onNavigateToMonitoring}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Lihat Semua
              </button>
            </div>

            {urgentItems.length === 0 && h3AlertItems.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                ✅ Semua proses pengadaan berjalan normal tanpa antrean darurat.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {urgentItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onEditItem(item)}
                    className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 hover:border-amber-400 transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-amber-900 dark:text-amber-200">
                        {item.sppNumber}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                        PO DARURAT
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 truncate">
                      {item.urgentReason || 'Kondisi Urgent'}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex justify-between">
                      <span>Area: {AREA_METADATA[item.area]?.name.split(' ')[1]}</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {item.budgetStatus === 'PENDING_ACC' ? 'Menunggu ACC Budget' : 'ACC Terbit'}
                      </span>
                    </div>
                  </div>
                ))}

                {h3AlertItems.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onEditItem(item)}
                    className="p-2.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 hover:border-rose-400 transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-rose-900 dark:text-rose-200">
                        {item.sppNumber}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100">
                        H+3 ALERT
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      PIC: {item.pic} · Sudah {item.processDays} hari kerja belum terbit PO
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Baris Bawah: Efisiensi & Distribusi Beban Kerja PIC Pengadaan (Rekapan Bulanan) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Efisiensi &amp; Distribusi Beban Kerja PIC Pengadaan</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rekapitulasi performa per nama PIC periode bulanan dari data pengajuan SPP dan penerbitan PO vendor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Periode Bulan */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1">
              <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <select
                value={selectedPicMonth}
                onChange={(e) => setSelectedPicMonth(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
                title="Pilih Periode Bulan Rekapan"
              >
                <option value="ALL" className="bg-white dark:bg-slate-900">📅 Semua Periode (Akumulasi)</option>
                {availablePicMonths.map((m) => (
                  <option key={m} value={m} className="bg-white dark:bg-slate-900">
                    🗓️ {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Mode Tampilan (Kartu vs Tabel) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setPicViewMode('CARDS')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  picViewMode === 'CARDS'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Tampilan Kartu Sesuai Desain"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kartu PIC</span>
              </button>
              <button
                onClick={() => setPicViewMode('TABLE')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  picViewMode === 'TABLE'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Tampilan Tabel Rekap Bulanan"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabel Bulanan</span>
              </button>
            </div>

            <button
              onClick={onNavigateToMonitoring}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer pl-1"
            >
              <span>Tabel SPP</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Baris Pencarian & Indikator Periode Aktif */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200/60 dark:border-blue-900/50">
              Periode: {formatMonthLabel(selectedPicMonth)}
            </span>
            <span className="text-slate-500">
              Total {displayedPicRankings.length} PIC terdaftar
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={propSearchPicQuery !== undefined ? propSearchPicQuery : picSearch}
              onChange={(e) => {
                setPicSearch(e.target.value);
                onSearchPicQuery?.(e.target.value);
              }}
              placeholder={
                isSuperadmin
                  ? "Cari nama PIC..."
                  : `Cari PIC ${AREA_METADATA[userArea]?.name || ''}...`
              }
              className="w-full pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
            {(propSearchPicQuery || picSearch) && (
              <button
                type="button"
                onClick={() => {
                  setPicSearch('');
                  onSearchPicQuery?.('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* TAMPILAN 1: GRID KARTU (Sesuai Foto Unggahan Pengguna) */}
        {picViewMode === 'CARDS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {displayedPicRankings.length === 0 ? (
              <div className="col-span-full p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500">
                Tidak ada data PIC yang sesuai pada periode ini.
              </div>
            ) : (
              displayedPicRankings.map((pic) => (
                <div
                  key={pic.name}
                  onClick={() => setActivePicDetail({ picName: pic.name, monthLabel: selectedPicMonth, items: pic.items })}
                  className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-2 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group relative"
                  title="Klik untuk melihat rincian dokumen SPP yang dikerjakan"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {pic.name}
                      </span>
                      {pic.areas.length > 0 && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                          {pic.areas.join('/')}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                      pic.ontimeRate >= 90
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : pic.ontimeRate >= 75
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    }`}>
                      {pic.ontimeRate}% Ontime
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                    <span><strong className="text-slate-900 dark:text-white">{pic.total}</strong> SPP</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold"><strong className="text-emerald-700 dark:text-emerald-300">{pic.closed}</strong> Close</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold"><strong className="text-amber-700 dark:text-amber-300">{pic.open}</strong> Open</span>
                  </div>

                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <span>Rata-rata:</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{pic.avgDays} hari</span>
                  </div>

                  {pic.urgentCount > 0 && (
                    <div className="pt-0.5">
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <Zap className="w-2.5 h-2.5 fill-current" />
                        <span>{pic.urgentCount} PO Darurat</span>
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAMPILAN 2: TABEL REKAPITULASI MATRIKS BULANAN */}
        {picViewMode === 'TABLE' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200/90 dark:border-slate-800">
                <tr>
                  <th className="px-3.5 py-2.5">No</th>
                  <th className="px-3.5 py-2.5">Nama PIC</th>
                  <th className="px-3.5 py-2.5">Periode Bulan</th>
                  <th className="px-3.5 py-2.5">Area / Cabang</th>
                  <th className="px-3.5 py-2.5 text-center">Total SPP</th>
                  <th className="px-3.5 py-2.5 text-center">Close PO</th>
                  <th className="px-3.5 py-2.5 text-center">Open PO</th>
                  <th className="px-3.5 py-2.5 text-center">% Ontime</th>
                  <th className="px-3.5 py-2.5 text-center">Rata-rata Durasi</th>
                  <th className="px-3.5 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-mono">
                {picMonthlyMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500 font-sans">
                      Tidak ada data rekapan pada filter ini.
                    </td>
                  </tr>
                ) : (
                  picMonthlyMatrix.map((row, idx) => (
                    <tr
                      key={`${row.picName}-${row.monthKey}-${idx}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-3.5 py-2.5 text-slate-400 font-sans">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-bold text-slate-900 dark:text-white font-sans">
                        {row.picName}
                        {row.urgentCount > 0 && (
                          <span className="ml-1.5 px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            ⚡ {row.urgentCount} Darurat
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-blue-600 dark:text-blue-400 font-semibold font-sans">
                        {row.monthLabel}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-sans">
                        {row.areas.join(', ') || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-bold text-slate-900 dark:text-white">
                        {row.total}
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {row.closed}
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-bold text-amber-600 dark:text-amber-400">
                        {row.open}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          row.ontimeRate >= 90
                            ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : row.ontimeRate >= 75
                            ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        }`}>
                          {row.ontimeRate}%
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-slate-700 dark:text-slate-300">
                        {row.avgDays} hari
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-sans">
                        <button
                          onClick={() => setActivePicDetail({ picName: row.picName, monthLabel: row.monthKey, items: row.items })}
                          className="px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded transition-colors cursor-pointer"
                        >
                          Lihat Dokumen
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL POPUP: RINCIAN DOKUMEN SPP PER PIC TERPILIH */}
      {activePicDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Rincian Pengadaan PIC: {activePicDetail.picName}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Periode: <strong className="text-blue-600 dark:text-blue-400">{formatMonthLabel(activePicDetail.monthLabel)}</strong> · Total {activePicDetail.items.length} Dokumen SPP
                </p>
              </div>
              <button
                onClick={() => setActivePicDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List SPP Items */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200/90 dark:border-slate-800">
                    <tr>
                      <th className="px-3 py-2">No. SPP</th>
                      <th className="px-3 py-2">Cabang</th>
                      <th className="px-3 py-2">Tgl Terima Budget</th>
                      <th className="px-3 py-2">No. PO &amp; Tgl</th>
                      <th className="px-3 py-2 text-center">Durasi Kerja</th>
                      <th className="px-3 py-2 text-center">Status</th>
                      <th className="px-3 py-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {activePicDetail.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                          {item.sppNumber}
                          {item.isUrgentAdvance && (
                            <span className="ml-1 text-[9px] font-bold text-amber-600">⚡ DARURAT</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-sans text-slate-600 dark:text-slate-400">
                          {AREA_METADATA[item.area]?.name.split(' ')[1] || item.area}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {item.budgetReceivedDate}
                        </td>
                        <td className="px-3 py-2">
                          <div>{item.poNumber || <span className="text-amber-500 font-sans italic">Menunggu PO</span>}</div>
                          {item.poDate && <div className="text-[10px] text-slate-400">{item.poDate}</div>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.processDays} hari
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.statusOntime === 'ONTIME'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                          }`}>
                            {item.statusOntime}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center font-sans">
                          <button
                            onClick={() => {
                              setActivePicDetail(null);
                              onEditItem(item);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-[11px]"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
              <button
                onClick={() => setActivePicDetail(null)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
