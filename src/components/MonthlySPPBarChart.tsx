import React, { useState, useMemo } from 'react';
import { SPPItem, SJAArea } from '../types';
import { AREA_METADATA } from '../utils/initialData';
import {
  BarChart3,
  Calendar,
  CalendarDays,
  TrendingUp,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  X,
  ExternalLink,
  Table as TableIcon,
  ShieldCheck,
  Building2,
  Maximize2,
  Users
} from 'lucide-react';

export interface MonthlyBarData {
  monthKey: string; // YYYY-MM
  monthName: string; // "Januari", etc.
  shortMonthName: string; // "Jan", etc.
  year: string;
  total: number;
  closed: number;
  open: number;
  ontime: number;
  late: number;
  avgProcessDays: number;
  items: SPPItem[];
}

interface MonthlySPPBarChartProps {
  items: SPPItem[];
  activeAreaFilter: SJAArea | 'ALL';
  onEditItem?: (item: SPPItem) => void;
  onNavigateToMonitoring?: () => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export const MonthlySPPBarChart: React.FC<MonthlySPPBarChartProps> = ({
  items,
  activeAreaFilter,
  onEditItem,
  onNavigateToMonitoring,
}) => {
  // 1. Filter tahun yang tersedia dari data budgetReceivedDate
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    items.forEach((item) => {
      if (item.budgetReceivedDate && item.budgetReceivedDate.length >= 4) {
        years.add(item.budgetReceivedDate.substring(0, 4));
      }
    });
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    return Array.from(years).sort().reverse();
  }, [items]);

  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return availableYears[0] || new Date().getFullYear().toString();
  });

  // Mode bar chart: 'TOTAL' (bar tunggal total masuk), 'PO_STATUS' (bar terbagi Close vs Open), 'SLA_STATUS' (Ontime vs Terlambat)
  const [chartMode, setChartMode] = useState<'TOTAL' | 'PO_STATUS' | 'SLA_STATUS'>('TOTAL');
  
  // Tampilan visual: 'CHART' (Grafik Bar) vs 'TABLE' (Tabel Ringkasan)
  const [viewType, setViewType] = useState<'CHART' | 'TABLE'>('CHART');

  // State Tooltip & Hover
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyBarData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; placement?: 'top' | 'bottom' } | null>(null);

  // State Modal Rincian Dokumen Bulanan saat Bar diklik
  const [selectedMonthModal, setSelectedMonthModal] = useState<MonthlyBarData | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const [modalFilterStatus, setModalFilterStatus] = useState<'ALL' | 'CLOSE' | 'OPEN'>('ALL');

  // 2. Kalkulasi Aggregasi Bulanan (12 Bulan Lengkap untuk Tahun yang Dipilih)
  const monthlyData = useMemo<MonthlyBarData[]>(() => {
    // Filter data sesuai tahun yang dipilih
    const yearItems = items.filter((item) => {
      if (!item.budgetReceivedDate) return false;
      return item.budgetReceivedDate.startsWith(selectedYear);
    });

    // Inisialisasi 12 bulan
    const months: MonthlyBarData[] = [];
    for (let m = 0; m < 12; m++) {
      const monthStr = String(m + 1).padStart(2, '0');
      const monthKey = `${selectedYear}-${monthStr}`;
      const monthItems = yearItems.filter(
        (i) => i.budgetReceivedDate && i.budgetReceivedDate.startsWith(monthKey)
      );

      const total = monthItems.length;
      const closed = monthItems.filter((i) => i.statusPO === 'CLOSE').length;
      const open = monthItems.filter((i) => i.statusPO === 'OPEN').length;
      const ontime = monthItems.filter((i) => i.statusOntime === 'ONTIME').length;
      const late = monthItems.filter((i) => i.statusOntime === 'TERLAMBAT').length;

      const closedWithDays = monthItems.filter(
        (i) => i.statusPO === 'CLOSE' && typeof i.processDays === 'number'
      );
      const avgDays =
        closedWithDays.length > 0
          ? Number(
              (
                closedWithDays.reduce((acc, curr) => acc + (curr.processDays || 0), 0) /
                closedWithDays.length
              ).toFixed(1)
            )
          : 0;

      months.push({
        monthKey,
        monthName: MONTH_NAMES[m],
        shortMonthName: SHORT_MONTH_NAMES[m],
        year: selectedYear,
        total,
        closed,
        open,
        ontime,
        late,
        avgProcessDays: avgDays,
        items: monthItems,
      });
    }

    return months;
  }, [items, selectedYear]);

  // Statistik Ringkasan Tahunan
  const summaryStats = useMemo<{
    totalYear: number;
    totalClosed: number;
    totalOpen: number;
    avgPerActiveMonth: string;
    peakMonth: MonthlyBarData | null;
    completionRate: number;
    activeMonthsCount: number;
  }>(() => {
    const totalYear = monthlyData.reduce((acc, m) => acc + m.total, 0);
    const totalClosed = monthlyData.reduce((acc, m) => acc + m.closed, 0);
    const totalOpen = monthlyData.reduce((acc, m) => acc + m.open, 0);
    
    // Bulan aktif (yang ada datanya)
    const activeMonths = monthlyData.filter((m) => m.total > 0);
    const avgPerActiveMonth =
      activeMonths.length > 0 ? (totalYear / activeMonths.length).toFixed(1) : '0';

    // Bulan puncak (tertinggi)
    let peakMonth: MonthlyBarData | null = null;
    monthlyData.forEach((m) => {
      if (!peakMonth || m.total > peakMonth.total) {
        if (m.total > 0) peakMonth = m;
      }
    });

    const completionRate = totalYear > 0 ? Math.round((totalClosed / totalYear) * 100) : 0;

    return {
      totalYear,
      totalClosed,
      totalOpen,
      avgPerActiveMonth,
      peakMonth,
      completionRate,
      activeMonthsCount: activeMonths.length,
    };
  }, [monthlyData]);

  // Nilai Maksimum untuk Skala Grafik Bar SVG
  const maxBarValue = useMemo(() => {
    const maxVal = Math.max(...monthlyData.map((m) => m.total), 5);
    // Bulatkan ke atas kelipatan 5 atau 10 agar proporsional
    return Math.ceil(maxVal / 5) * 5;
  }, [monthlyData]);

  // Breakdown Beban Kerja per PIC untuk Bulan yang sedang di-hover
  const hoveredPicBreakdown = useMemo(() => {
    if (!hoveredMonth || !hoveredMonth.items.length) return [];

    const map = new Map<
      string,
      {
        name: string;
        total: number;
        closed: number;
        open: number;
        ontime: number;
        late: number;
      }
    >();

    hoveredMonth.items.forEach((item) => {
      const rawPic = (item.pic || '').trim();
      const picName = rawPic || 'Tanpa PIC';
      const key = picName.toUpperCase();
      const existing = map.get(key) || {
        name: picName,
        total: 0,
        closed: 0,
        open: 0,
        ontime: 0,
        late: 0,
      };

      existing.total += 1;
      if (item.statusPO === 'CLOSE') {
        existing.closed += 1;
      } else {
        existing.open += 1;
      }
      if (item.statusOntime === 'ONTIME') {
        existing.ontime += 1;
      } else if (item.statusOntime === 'TERLAMBAT') {
        existing.late += 1;
      }
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [hoveredMonth]);

  // Handle Mouse Hover untuk Tooltip
  const handleMouseEnterBar = (
    e: React.MouseEvent<SVGGElement | HTMLDivElement>,
    month: MonthlyBarData
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredMonth(month);

    // Hitung posisi aman agar tooltip tidak terpotong di bagian atas atau samping layar
    const showBelow = rect.top < 340;
    const tooltipWidth = 290;
    const clampedX = Math.min(
      Math.max(rect.left + rect.width / 2, tooltipWidth / 2 + 16),
      window.innerWidth - tooltipWidth / 2 - 16
    );

    setTooltipPos({
      x: clampedX,
      y: showBelow ? rect.bottom + 12 : rect.top - 12,
      placement: showBelow ? 'bottom' : 'top',
    });
  };

  const handleMouseLeaveBar = () => {
    setHoveredMonth(null);
    setTooltipPos(null);
  };

  // Filter Dokumen di Dalam Modal Bulan yang Diklik
  const modalFilteredItems = useMemo(() => {
    if (!selectedMonthModal) return [];
    return selectedMonthModal.items.filter((item) => {
      if (modalFilterStatus !== 'ALL' && item.statusPO !== modalFilterStatus) return false;
      if (!modalSearchQuery.trim()) return true;
      const q = modalSearchQuery.toLowerCase();
      return (
        item.sppNumber.toLowerCase().includes(q) ||
        (item.poNumber || '').toLowerCase().includes(q) ||
        item.pic.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q)
      );
    });
  }, [selectedMonthModal, modalFilterStatus, modalSearchQuery]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5 transition-colors">
      {/* 1. Header Baris Judul & Kontrol */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Grafik Data SPP Periode Bulanan</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  Diterima Pihak Budget
                </span>
                {activeAreaFilter !== 'ALL' && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Cabang {AREA_METADATA[activeAreaFilter]?.name.split(' ')[1] || activeAreaFilter}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Menampilkan total kuantitas dokumen SPP masuk yang telah diserahkan &amp; diterima dari Tim Budget per bulan beserta status realisasinya.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Pilih Tahun, Mode Bar, & Tampilan */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Pilih Tahun */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
              title="Pilih Tahun Pengamatan"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} className="bg-white dark:bg-slate-900">
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Tampilan Data (Total vs Realisasi PO vs SLA) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <button
              onClick={() => setChartMode('TOTAL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                chartMode === 'TOTAL'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Tampilkan grafik batang total SPP masuk"
            >
              Total Masuk
            </button>
            <button
              onClick={() => setChartMode('PO_STATUS')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                chartMode === 'PO_STATUS'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Tampilkan komposisi PO Close vs Open"
            >
              Close vs Open
            </button>
            <button
              onClick={() => setChartMode('SLA_STATUS')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                chartMode === 'SLA_STATUS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Tampilkan kepatuhan batas waktu SLA 10 hari"
            >
              SLA On-Time
            </button>
          </div>

          {/* Toggle Grafik vs Tabel */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <button
              onClick={() => setViewType('CHART')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewType === 'CHART'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Tampilan Grafik Batang"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewType('TABLE')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewType === 'TABLE'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Tampilan Tabel Rekapitulasi"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Highlight Metric Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total SPP Diterima Tahun Terpilih */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50">
          <div className="flex items-center justify-between text-[11px] text-blue-700 dark:text-blue-300 font-semibold mb-1">
            <span>Total Masuk ({selectedYear})</span>
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-blue-900 dark:text-blue-100">
              {summaryStats.totalYear}
            </span>
            <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">Dokumen</span>
          </div>
          <div className="text-[10px] text-blue-600/90 dark:text-blue-400 mt-0.5 truncate">
            Dari serah terima Tim Budget
          </div>
        </div>

        {/* Rata-rata Masuk per Bulan */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <span>Rata-Rata Bulanan</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {summaryStats.avgPerActiveMonth}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dokumen / bln</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {summaryStats.activeMonthsCount} bulan aktif tercatat
          </div>
        </div>

        {/* Bulan Puncak Tertinggi */}
        <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50">
          <div className="flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold mb-1">
            <span>Bulan Puncak Masuk</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-indigo-900 dark:text-indigo-100">
              {summaryStats.peakMonth ? `${summaryStats.peakMonth.total}` : '0'}
            </span>
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {summaryStats.peakMonth ? summaryStats.peakMonth.shortMonthName : '-'}
            </span>
          </div>
          <div className="text-[10px] text-indigo-600/90 dark:text-indigo-400 mt-0.5 truncate">
            {summaryStats.peakMonth ? `${summaryStats.peakMonth.monthName} ${selectedYear}` : 'Belum ada data'}
          </div>
        </div>

        {/* Rasio Realisasi PO */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50">
          <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
            <span>Realisasi PO (Close)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-900 dark:text-emerald-100">
              {summaryStats.totalClosed}
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
              ({summaryStats.completionRate}%)
            </span>
          </div>
          <div className="text-[10px] text-emerald-600/90 dark:text-emerald-400 mt-0.5 truncate">
            {summaryStats.totalOpen} masih antrean Open
          </div>
        </div>
      </div>

      {/* 3. TAMPILAN UTAMA: GRAFIK BAR ATAU TABEL REKAPAN */}
      {viewType === 'CHART' ? (
        <div className="space-y-3">
          {/* Petunjuk Interaktif */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-blue-600 to-indigo-500 inline-block" />
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  {chartMode === 'TOTAL'
                    ? 'Total SPP Diterima'
                    : chartMode === 'PO_STATUS'
                    ? 'Total Masuk (Tinggi Pilar)'
                    : 'Total SPP Masuk'}
                </span>
              </span>

              {chartMode === 'PO_STATUS' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      PO Close
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      PO Open
                    </span>
                  </span>
                </>
              )}

              {chartMode === 'SLA_STATUS' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      On-Time (≤10 Hari)
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Terlambat (&gt;10 Hari)
                    </span>
                  </span>
                </>
              )}
            </div>

            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hidden sm:flex items-center gap-1">
              <span>💡 Klik pilar batang bulan untuk melihat daftar dokumen SPP</span>
            </div>
          </div>

          {/* Area Render Grafik Bar SVG Interaktif */}
          <div className="relative p-4 sm:p-6 bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto">
            <div className="min-w-[620px] h-64 sm:h-72 flex flex-col justify-between">
              {/* Gridlines & Nilai Y-Axis */}
              <div className="absolute inset-x-6 top-6 bottom-14 flex flex-col justify-between pointer-events-none opacity-40 dark:opacity-20">
                {[maxBarValue, Math.round(maxBarValue * 0.75), Math.round(maxBarValue * 0.5), Math.round(maxBarValue * 0.25), 0].map(
                  (val, idx) => (
                    <div key={idx} className="flex items-center gap-2 w-full">
                      <span className="text-[10px] font-mono text-slate-400 w-6 text-right shrink-0">
                        {val}
                      </span>
                      <div className="w-full border-b border-dashed border-slate-300 dark:border-slate-700" />
                    </div>
                  )
                )}
              </div>

              {/* 12 Pilar Batang Bulanan */}
              <div className="relative z-10 grid grid-cols-12 gap-2 sm:gap-3 h-full items-end pb-8 pt-4 px-8">
                {monthlyData.map((m) => {
                  const barHeightPct = maxBarValue > 0 ? (m.total / maxBarValue) * 100 : 0;
                  const hasData = m.total > 0;
                  const isHovered = hoveredMonth?.monthKey === m.monthKey;

                  // Hitung tinggi proporsi sub-bar
                  const closePct = m.total > 0 ? (m.closed / m.total) * 100 : 0;
                  const openPct = m.total > 0 ? (m.open / m.total) * 100 : 0;
                  const ontimePct = m.total > 0 ? (m.ontime / m.total) * 100 : 0;
                  const latePct = m.total > 0 ? (m.late / m.total) * 100 : 0;

                  return (
                    <div
                      key={m.monthKey}
                      className="group flex flex-col items-center justify-end h-full relative cursor-pointer"
                      onClick={() => setSelectedMonthModal(m)}
                      onMouseEnter={(e) => handleMouseEnterBar(e, m)}
                      onMouseLeave={handleMouseLeaveBar}
                    >
                      {/* Label Jumlah di Atas Bar ("Jumlah Berapa") */}
                      <div
                        className={`mb-1.5 transition-all duration-200 transform text-center ${
                          isHovered ? '-translate-y-1 scale-110' : ''
                        }`}
                      >
                        {hasData ? (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-tight shadow-xs ${
                              chartMode === 'TOTAL'
                                ? 'bg-blue-600 text-white'
                                : chartMode === 'PO_STATUS'
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                : 'bg-indigo-600 text-white'
                            }`}
                          >
                            {m.total}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-300 dark:text-slate-600 font-semibold opacity-60">
                            0
                          </span>
                        )}
                      </div>

                      {/* Batang Bar Dinamis */}
                      <div className="w-full max-w-[34px] sm:max-w-[42px] h-full flex items-end">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 overflow-hidden relative ${
                            hasData
                              ? 'shadow-sm group-hover:shadow-md group-hover:brightness-110'
                              : 'bg-slate-200/50 dark:bg-slate-800/40'
                          }`}
                          style={{
                            height: hasData ? `${Math.max(barHeightPct, 6)}%` : '4px',
                          }}
                        >
                          {/* Rendering mode bar sesuai pilihan user */}
                          {chartMode === 'TOTAL' && hasData && (
                            <div className="w-full h-full bg-gradient-to-t from-blue-600 via-indigo-600 to-blue-500" />
                          )}

                          {chartMode === 'PO_STATUS' && hasData && (
                            <div className="w-full h-full flex flex-col justify-end">
                              {/* Open PO (Kuning/Amber) di atas */}
                              {openPct > 0 && (
                                <div
                                  className="w-full bg-amber-500 transition-all"
                                  style={{ height: `${openPct}%` }}
                                  title={`Open PO: ${m.open}`}
                                />
                              )}
                              {/* Close PO (Hijau/Emerald) di bawah */}
                              {closePct > 0 && (
                                <div
                                  className="w-full bg-emerald-500 transition-all"
                                  style={{ height: `${closePct}%` }}
                                  title={`Close PO: ${m.closed}`}
                                />
                              )}
                            </div>
                          )}

                          {chartMode === 'SLA_STATUS' && hasData && (
                            <div className="w-full h-full flex flex-col justify-end">
                              {/* Terlambat di atas */}
                              {latePct > 0 && (
                                <div
                                  className="w-full bg-rose-500 transition-all"
                                  style={{ height: `${latePct}%` }}
                                  title={`Terlambat: ${m.late}`}
                                />
                              )}
                              {/* Ontime di bawah */}
                              {ontimePct > 0 && (
                                <div
                                  className="w-full bg-emerald-500 transition-all"
                                  style={{ height: `${ontimePct}%` }}
                                  title={`Ontime: ${m.ontime}`}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Label Nama Bulan di Sumbu X */}
                      <div className="mt-2 text-center">
                        <span
                          className={`text-[11px] font-semibold block transition-colors ${
                            isHovered
                              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                              : hasData
                              ? 'text-slate-800 dark:text-slate-200'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {m.shortMonthName}
                        </span>
                        {hasData && (
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 block leading-none">
                            {m.total} spp
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tooltip Mengambang Dinamis Saat Kursor Diarahkan ke Bar Bulan */}
          {hoveredMonth && tooltipPos && (
            <div
              className={`fixed z-50 pointer-events-none -translate-x-1/2 ${
                tooltipPos.placement === 'bottom' ? 'translate-y-0 mt-2' : '-translate-y-full mb-2'
              } bg-slate-900/95 dark:bg-black/95 text-white backdrop-blur-md rounded-xl p-3 border border-slate-700/80 shadow-2xl text-xs min-w-[260px] max-w-[320px] animate-in fade-in zoom-in-95 duration-150`}
              style={{
                left: `${tooltipPos.x}px`,
                top: `${tooltipPos.y}px`,
              }}
            >
              {/* Header Tooltip */}
              <div className="flex items-center justify-between border-b border-slate-700/70 pb-1.5 mb-2">
                <span className="font-bold text-slate-100 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    {hoveredMonth.monthName} {hoveredMonth.year}
                  </span>
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 font-bold border border-blue-400/30">
                  {hoveredMonth.total} Dokumen
                </span>
              </div>

              {/* Status Ringkasan Dokumen */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center text-slate-300">
                  <span>📥 Total SPP Diterima:</span>
                  <strong className="text-white font-mono">{hoveredMonth.total} SPP</strong>
                </div>

                <div className="flex justify-between items-center text-emerald-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    <span>Realisasi PO Terbit (Close):</span>
                  </span>
                  <strong className="font-mono">
                    {hoveredMonth.closed} ({hoveredMonth.total > 0 ? Math.round((hoveredMonth.closed / hoveredMonth.total) * 100) : 0}%)
                  </strong>
                </div>

                <div className="flex justify-between items-center text-amber-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    <span>Menunggu No. PO (Open):</span>
                  </span>
                  <strong className="font-mono">
                    {hoveredMonth.open} ({hoveredMonth.total > 0 ? Math.round((hoveredMonth.open / hoveredMonth.total) * 100) : 0}%)
                  </strong>
                </div>

                <div className="border-t border-slate-700/70 pt-1.5 mt-1.5 flex justify-between items-center text-slate-300 text-[10px]">
                  <span>Kepatuhan SLA (≤10 Hari):</span>
                  <span className="font-mono font-bold text-blue-300">
                    {hoveredMonth.total > 0 ? Math.round((hoveredMonth.ontime / hoveredMonth.total) * 100) : 0}% On-Time
                  </span>
                </div>

                {hoveredMonth.closed > 0 && (
                  <div className="flex justify-between items-center text-slate-400 text-[10px]">
                    <span>Rata-rata Lead Time:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {hoveredMonth.avgProcessDays} hari kerja
                    </span>
                  </div>
                )}
              </div>

              {/* Breakdown PIC Pekerjaan */}
              {hoveredPicBreakdown.length > 0 && (
                <div className="border-t border-slate-700/70 pt-2 mt-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200 mb-1.5">
                    <span className="flex items-center gap-1.5 text-indigo-300">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Breakdown PIC ({hoveredMonth.total} SPP):</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {hoveredPicBreakdown.length} PIC
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-[145px] overflow-y-auto pr-0.5 custom-scrollbar">
                    {hoveredPicBreakdown.map((pic) => {
                      const pct =
                        hoveredMonth.total > 0 ? Math.round((pic.total / hoveredMonth.total) * 100) : 0;
                      return (
                        <div
                          key={pic.name}
                          className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex flex-col gap-1 text-[10.5px]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-100 flex items-center gap-1.5 truncate max-w-[155px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                              <span className="truncate">{pic.name}</span>
                            </span>
                            <div className="flex items-center gap-1 font-mono text-[10px] shrink-0">
                              <strong className="text-white font-bold">{pic.total} SPP</strong>
                              <span className="text-indigo-300 font-medium">({pct}%)</span>
                            </div>
                          </div>

                          {/* Mini Progress Bar Close vs Open */}
                          <div className="w-full bg-slate-700/60 rounded-full h-1 overflow-hidden flex">
                            <div
                              className="bg-emerald-500 h-full transition-all"
                              style={{
                                width: `${pic.total > 0 ? (pic.closed / pic.total) * 100 : 0}%`,
                              }}
                              title={`Close: ${pic.closed}`}
                            />
                            <div
                              className="bg-amber-500 h-full transition-all"
                              style={{
                                width: `${pic.total > 0 ? (pic.open / pic.total) * 100 : 0}%`,
                              }}
                              title={`Open: ${pic.open}`}
                            />
                          </div>

                          {/* Rincian Status Realisasi PO PIC */}
                          <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                            <span className="text-emerald-400 font-mono">
                              ✓ {pic.closed} Close {pic.total > 0 && pic.closed === pic.total ? '(100%)' : ''}
                            </span>
                            {pic.open > 0 ? (
                              <span className="text-amber-400 font-mono font-medium">
                                ⏳ {pic.open} Open
                              </span>
                            ) : (
                              <span className="text-emerald-400/80 font-mono">
                                Selesai
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-blue-300/80 text-center">
                Klik bar untuk melihat rincian dokumen
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 4. TAMPILAN TABEL REKAPITULASI BULANAN */
        <div className="border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200/90 dark:border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Periode Bulan</th>
                  <th className="py-2.5 px-3 text-center">Total SPP Diterima Budget</th>
                  <th className="py-2.5 px-3 text-center">PO Terbit (Close)</th>
                  <th className="py-2.5 px-3 text-center">Menunggu PO (Open)</th>
                  <th className="py-2.5 px-3 text-center">Kepatuhan SLA (On-Time)</th>
                  <th className="py-2.5 px-3 text-center">Rata-rata Lead Time</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {monthlyData.map((m) => {
                  const hasData = m.total > 0;
                  const closeRate = hasData ? Math.round((m.closed / m.total) * 100) : 0;
                  const ontimeRate = hasData ? Math.round((m.ontime / m.total) * 100) : 0;

                  return (
                    <tr
                      key={m.monthKey}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        hasData ? '' : 'opacity-40'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {m.monthName} {m.year}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold font-mono text-sm px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                          {m.total} Dokumen
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {m.closed} ({closeRate}%)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                          {m.open} ({hasData ? 100 - closeRate : 0}%)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
                            ontimeRate >= 80
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : ontimeRate >= 50
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {ontimeRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                        {m.closed > 0 ? `${m.avgProcessDays} Hari Kerja` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {hasData ? (
                          <button
                            onClick={() => setSelectedMonthModal(m)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Lihat {m.total} Data →
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL DETAIL DOKUMEN SPP BULANAN SAAT PILAR GRAFIK DIKLIK */}
      {selectedMonthModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            {/* Header Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      Daftar Dokumen SPP Masuk · {selectedMonthModal.monthName} {selectedMonthModal.year}
                    </span>
                    <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-blue-600 text-white">
                      {selectedMonthModal.total} Dokumen
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Rincian data pengajuan SPP yang telah diserahkan &amp; diterima dari Tim Budget pada periode ini.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMonthModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls Filter & Pencarian Cepat di Dalam Modal */}
            <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  onClick={() => setModalFilterStatus('ALL')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    modalFilterStatus === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Semua ({selectedMonthModal.total})
                </button>
                <button
                  onClick={() => setModalFilterStatus('CLOSE')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    modalFilterStatus === 'CLOSE'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  PO Terbit ({selectedMonthModal.closed})
                </button>
                <button
                  onClick={() => setModalFilterStatus('OPEN')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    modalFilterStatus === 'OPEN'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Antrean Open ({selectedMonthModal.open})
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="Cari No SPP, PO, PIC, Area..."
                  className="w-full sm:w-64 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Body Tabel Dokumen */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {modalFilteredItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Tidak ada dokumen SPP yang sesuai filter pencarian.
                </div>
              ) : (
                <div className="border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">No. SPP</th>
                        <th className="py-2.5 px-3">Tgl Diterima Budget</th>
                        <th className="py-2.5 px-3">Area / PIC</th>
                        <th className="py-2.5 px-3">Realisasi PO</th>
                        <th className="py-2.5 px-3 text-center">Status PO</th>
                        <th className="py-2.5 px-3 text-center">Durasi &amp; SLA</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {modalFilteredItems.map((item) => {
                        const isClose = item.statusPO === 'CLOSE';
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-slate-900 dark:text-white block">
                                {item.sppNumber}
                              </span>
                              {item.specialCondition && (
                                <span className="inline-block mt-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800">
                                  {item.specialCondition}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                              {item.budgetReceivedDate}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-900 dark:text-white block">
                                {AREA_METADATA[item.area]?.name.split(' ')[1] || item.area}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                PIC: {item.pic}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {item.poNumber ? (
                                <div>
                                  <span className="font-mono font-bold text-slate-900 dark:text-white block">
                                    {item.poNumber}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    Tgl: {item.poDate || '-'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                                  Menunggu PO
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isClose
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                }`}
                              >
                                {isClose ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>CLOSE</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3" />
                                    <span>OPEN</span>
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {item.processDays} hari
                              </span>
                              <span
                                className={`block text-[10px] font-semibold ${
                                  item.statusOntime === 'ONTIME'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {item.statusOntime}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {onEditItem && (
                                <button
                                  onClick={() => {
                                    setSelectedMonthModal(null);
                                    onEditItem(item);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold text-[11px] transition-colors cursor-pointer"
                                >
                                  Detail / Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-3.5 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan {modalFilteredItems.length} dari {selectedMonthModal.total} dokumen SPP
              </span>
              <div className="flex items-center gap-2">
                {onNavigateToMonitoring && (
                  <button
                    onClick={() => {
                      setSelectedMonthModal(null);
                      onNavigateToMonitoring();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Buka Tabel Monitoring Utama</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedMonthModal(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
