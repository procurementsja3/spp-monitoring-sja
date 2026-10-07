import React, { useMemo, useState, useEffect } from 'react';
import { SPPItem, SJAArea, UserProfile } from '../types';
import { AREA_METADATA, AREA_PIC_LIST } from '../utils/initialData';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Users,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  Box,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Award,
  X,
  FileText,
  Calendar,
  Sparkles,
  Building,
  User,
  Filter,
  RotateCcw,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { IsometricPicBarChart, PICMetricData } from './IsometricPicBarChart';

interface VendorAnalyticsProps {
  items: SPPItem[];
  currentUser: UserProfile;
  selectedPicFilter?: string;
  onSelectPicFilter?: (pic: string) => void;
  searchQuery?: string;
  onSearchQuery?: (q: string) => void;
  onEditItem?: (item: SPPItem) => void;
  onSyncGoogleSheet?: () => void | Promise<void>;
  isSyncingGoogleSheet?: boolean;
}

export const VendorAnalytics: React.FC<VendorAnalyticsProps> = ({
  items,
  currentUser,
  selectedPicFilter: propSelectedPicFilter,
  onSelectPicFilter,
  searchQuery: propSearchQuery,
  onSearchQuery,
  onEditItem,
  onSyncGoogleSheet,
  isSyncingGoogleSheet = false,
}) => {
  const isSuperadmin = currentUser.role === 'SUPERADMIN';
  const userArea: SJAArea =
    currentUser.area && currentUser.area !== 'ALL'
      ? (currentUser.area as SJAArea)
      : 'SEPANJANG';

  // Mode tampilan: 'ALL' (Lengkap), 'CHART_3D' (Hanya Grafik 3D), 'TABLE' (Tabel Scorecard)
  const [viewMode, setViewMode] = useState<'ALL' | 'CHART_3D' | 'TABLE'>('ALL');

  // Metrik yang ditampilkan pada pilar 3D Isometrik
  const [selected3DMetric, setSelected3DMetric] = useState<'MULTI' | 'ONTIME' | 'DURATION'>('MULTI');

  // Filter Area: Superadmin bebas memilih ALL / cabang; User Area terkunci ke userArea
  const [internalAreaFilter, setInternalAreaFilter] = useState<SJAArea | 'ALL'>(
    isSuperadmin ? 'ALL' : userArea
  );
  const selectedAreaFilter = isSuperadmin ? internalAreaFilter : userArea;

  // Filter PIC Sinkron (bisa dari Sidebar / internal)
  const [internalPicFilter, setInternalPicFilter] = useState<string>('ALL');
  const selectedPicFilter =
    propSelectedPicFilter !== undefined ? propSelectedPicFilter : internalPicFilter;
  const setPicFilter = (pic: string) => {
    setInternalPicFilter(pic);
    onSelectPicFilter?.(pic);
  };

  // Pencarian Teks PIC Sinkron (bisa dari Sidebar / internal)
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery =
    propSearchQuery !== undefined ? propSearchQuery : internalSearchQuery;
  const setSearch = (q: string) => {
    setInternalSearchQuery(q);
    onSearchQuery?.(q);
  };

  const [tierFilter, setTierFilter] = useState<'ALL' | 'EFFICIENT' | 'ATTENTION'>('ALL');
  const [sortBy, setSortBy] = useState<'TOTAL' | 'CLOSED' | 'ONTIME' | 'DAYS'>('TOTAL');

  // Personil yang dipilih untuk drill-down detail dokumen
  const [selectedPicDetail, setSelectedPicDetail] = useState<PICMetricData | null>(null);

  // Pagination & Sorting untuk Modal Rincian Dokumen PIC (Default 15 data & input terbaru di paling atas)
  const [modalPage, setModalPage] = useState<number>(1);
  const [modalPageSize, setModalPageSize] = useState<number>(15);

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

  useEffect(() => {
    setModalPage(1);
  }, [selectedPicDetail, modalPageSize]);

  // Kunci filter area jika bukan superadmin saat user berubah
  useEffect(() => {
    if (!isSuperadmin) {
      setInternalAreaFilter(userArea);
    }
  }, [isSuperadmin, userArea]);

  // Metrik PIC Buyer
  const rawPicMetrics: PICMetricData[] = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        closed: number;
        ontime: number;
        late: number;
        totalDays: number;
        items: SPPItem[];
        area?: SJAArea;
      }
    >();

    items.forEach((i) => {
      const p = i.pic?.trim() || 'Tanpa PIC';
      const c = map.get(p) || {
        total: 0,
        closed: 0,
        ontime: 0,
        late: 0,
        totalDays: 0,
        items: [],
        area: i.area,
      };
      c.total += 1;
      if (i.statusPO === 'CLOSE') c.closed += 1;
      if (i.statusOntime === 'ONTIME') c.ontime += 1;
      else c.late += 1;
      c.totalDays += i.processDays;
      c.items.push(i);
      if (!c.area && i.area) c.area = i.area;
      map.set(p, c);
    });

    return Array.from(map.entries()).map(([pic, data]) => {
      const ontimeRate = data.total > 0 ? (data.ontime / data.total) * 100 : 0;
      const avgDays = data.total > 0 ? +(data.totalDays / data.total).toFixed(1) : 0;

      // Cari area PIC dari data items atau daftar resmi AREA_PIC_LIST
      let picArea = data.area;
      if (!picArea) {
        for (const [aKey, pList] of Object.entries(AREA_PIC_LIST)) {
          if (pList.some((name) => name.toLowerCase() === pic.toLowerCase())) {
            picArea = aKey as SJAArea;
            break;
          }
        }
      }

      let tier = 'Performa Baik';
      if (ontimeRate >= 80 && avgDays <= 10) {
        tier = 'Sangat Efisien';
      } else if (ontimeRate < 65 || avgDays > 12) {
        tier = 'Perlu Perhatian';
      }

      return {
        pic,
        total: data.total,
        closed: data.closed,
        open: data.total - data.closed,
        ontime: data.ontime,
        late: data.late,
        ontimeRate: +ontimeRate.toFixed(1),
        avgDays,
        tier,
        items: data.items,
        area: picArea,
      };
    });
  }, [items]);

  // Daftar PIC terstruktur per-area sesuai daftar input data SPP resmi
  const picsByAreaMap = useMemo(() => {
    const map: Record<SJAArea, string[]> = {
      SEPANJANG: [...AREA_PIC_LIST.SEPANJANG],
      KARAWANG: [...AREA_PIC_LIST.KARAWANG],
      SUKODONO: [...AREA_PIC_LIST.SUKODONO],
      SEMARANG: [...AREA_PIC_LIST.SEMARANG],
    };

    // Sertakan PIC yang ada di data dokumen jika ada
    items.forEach((item) => {
      const p = item.pic?.trim();
      const a = item.area;
      if (p && a && map[a] && !map[a].includes(p)) {
        map[a].push(p);
      }
    });

    return map;
  }, [items]);

  // Chips tombol cepat PIC sesuai hak akses login & filter area aktif
  const availablePicChips = useMemo(() => {
    // Jika login sebagai user cabang: HANYA tampilkan PIC cabang tersebut
    if (!isSuperadmin) {
      return (picsByAreaMap[userArea] || []).map((picName) => ({
        name: picName,
        area: userArea,
      }));
    }

    // Jika Superadmin:
    if (selectedAreaFilter === 'ALL') {
      const list: { name: string; area: SJAArea }[] = [];
      (Object.keys(picsByAreaMap) as SJAArea[]).forEach((areaKey) => {
        picsByAreaMap[areaKey].forEach((picName) => {
          list.push({ name: picName, area: areaKey });
        });
      });
      return list;
    }
    return (picsByAreaMap[selectedAreaFilter] || []).map((picName) => ({
      name: picName,
      area: selectedAreaFilter,
    }));
  }, [isSuperadmin, userArea, selectedAreaFilter, picsByAreaMap]);

  // Filter & Urutkan Data PIC (Mematuhi hak akses area login)
  const filteredMetrics = useMemo(() => {
    return rawPicMetrics
      .filter((m) => {
        // 1. Filter Area Cabang (Area user hanya dapat melihat areanya sendiri)
        const targetArea = isSuperadmin ? selectedAreaFilter : userArea;
        const matchesArea = targetArea === 'ALL' || m.area === targetArea;

        // 2. Filter Nama PIC Spesifik
        const matchesPic =
          selectedPicFilter === 'ALL' ||
          m.pic.toLowerCase() === selectedPicFilter.toLowerCase();

        // 3. Kolom Pencarian Cepat PIC
        const q = searchQuery.toLowerCase().trim();
        const areaName = m.area ? AREA_METADATA[m.area]?.name?.toLowerCase() || '' : '';
        const matchesSearch =
          !q ||
          m.pic.toLowerCase().includes(q) ||
          areaName.includes(q);

        // 4. Filter Status Performa
        const matchesTier =
          tierFilter === 'ALL'
            ? true
            : tierFilter === 'EFFICIENT'
            ? m.tier === 'Sangat Efisien'
            : m.tier === 'Perlu Perhatian';

        return matchesArea && matchesPic && matchesSearch && matchesTier;
      })
      .sort((a, b) => {
        if (sortBy === 'TOTAL') return b.total - a.total;
        if (sortBy === 'CLOSED') return b.closed - a.closed;
        if (sortBy === 'ONTIME') return b.ontimeRate - a.ontimeRate;
        if (sortBy === 'DAYS') return a.avgDays - b.avgDays; // Tercepat dulu
        return 0;
      });
  }, [rawPicMetrics, isSuperadmin, selectedAreaFilter, userArea, selectedPicFilter, searchQuery, tierFilter, sortBy]);

  // Cek apakah ada filter aktif
  const hasActiveFilter =
    (isSuperadmin && selectedAreaFilter !== 'ALL') ||
    selectedPicFilter !== 'ALL' ||
    Boolean(searchQuery.trim()) ||
    tierFilter !== 'ALL';

  // Handler reset semua filter pencarian
  const handleResetFilters = () => {
    if (isSuperadmin) {
      setInternalAreaFilter('ALL');
    }
    setPicFilter('ALL');
    setSearch('');
    setTierFilter('ALL');
    setSortBy('TOTAL');
  };

  // Metrik dinamis sesuai filter yang dipilih atasan
  const totalSpp = filteredMetrics.reduce((sum, m) => sum + m.total, 0);
  const closedTotal = filteredMetrics.reduce((sum, m) => sum + m.closed, 0);
  const openTotal = filteredMetrics.reduce((sum, m) => sum + m.open, 0);
  const ontimeTotal = filteredMetrics.reduce((sum, m) => sum + m.ontime, 0);
  const lateTotal = totalSpp - ontimeTotal;
  const overallOntimeRate = totalSpp > 0 ? ((ontimeTotal / totalSpp) * 100).toFixed(1) : '0';

  // Deteksi PIC Tunggal yang sedang disorot atasan
  const singleSpotlightPic = useMemo(() => {
    if (selectedPicFilter !== 'ALL') {
      return filteredMetrics.find((m) => m.pic.toLowerCase() === selectedPicFilter.toLowerCase()) || null;
    }
    if (searchQuery.trim() && filteredMetrics.length === 1) {
      return filteredMetrics[0];
    }
    return null;
  }, [filteredMetrics, selectedPicFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Analitik Kinerja PIC */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/90 dark:border-slate-800/90 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Analisa Kinerja &amp; Produktivitas
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Grafik 3D Isometrik</span>
            </span>
            {!isSuperadmin && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                Mode Cabang: {AREA_METADATA[userArea]?.name || userArea}
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>
              {isSuperadmin
                ? 'Dashboard Analitik & Efisiensi Realisasi SPP per PIC (Seluruh Cabang)'
                : `Analitik Realisasi SPP per PIC - ${AREA_METADATA[userArea]?.name || userArea}`}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isSuperadmin
              ? 'Superadmin dapat mencari dan memantau performa PIC seluruh 4 cabang atau memilih cabang spesifik.'
              : `Menampilkan khusus daftar personil PIC dan performa pengadaan ${AREA_METADATA[userArea]?.name} sesuai akun login.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
          {/* Tombol Sinkronisasi 2 Arah Google Sheet */}
          {onSyncGoogleSheet && (
            <button
              onClick={onSyncGoogleSheet}
              disabled={isSyncingGoogleSheet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Sinkronisasi 2 Arah Google Sheet: Tarik pembaruan dan hapus di aplikasi jika data di Google Sheet telah dihapus"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isSyncingGoogleSheet ? 'animate-spin' : ''}`} />
              <span>{isSyncingGoogleSheet ? 'Menyinkronkan...' : 'Sinkron 2 Arah'}</span>
            </button>
          )}

          {/* Tab Pengalih Mode Tampilan */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900/90 p-1 border border-slate-200/90 dark:border-slate-800">
            <button
              onClick={() => setViewMode('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Lengkap
            </button>
            <button
              onClick={() => setViewMode('CHART_3D')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'CHART_3D'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Grafik 3D</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tabel Scorecard
            </button>
          </div>
        </div>
      </div>

      {/* 4 Kartu Ringkasan KPI Eksekutif (Update Real-Time Mengikuti Filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              {selectedPicFilter !== 'ALL' ? `Personil PIC Aktif` : `Total Staf PIC`}
            </span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white truncate">
            {selectedPicFilter !== 'ALL' ? (
              <span className="text-blue-600 dark:text-blue-400">{selectedPicFilter}</span>
            ) : (
              <>
                {filteredMetrics.length} <span className="text-xs font-normal font-sans text-slate-400">Personil</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Menangani total {totalSpp} dokumen pengajuan SPP
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">PO Selesai (Close)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {closedTotal} <span className="text-xs font-normal font-sans text-slate-400">SPP</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {totalSpp > 0 ? Math.round((closedTotal / totalSpp) * 100) : 0}% telah ber-Nomor PO
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Antrean PO (Open)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {openTotal} <span className="text-xs font-normal font-sans text-slate-400">SPP</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Menunggu penerbitan nomor PO
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Kepatuhan SLA (≤ 10 Hari)</span>
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {overallOntimeRate}%
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {ontimeTotal} ontime · {lateTotal} lewat batas
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOOLBAR PENCARIAN & FILTER KHUSUS ATASAN (PIC PER MASING-MASING AREA) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs space-y-3.5">
        {/* Baris 1: Kolom Pencarian Cepat PIC, Filter Area, dan Filter Dropdown PIC */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Kolom Pencarian Cepat Nama PIC */}
          <div className="md:col-span-4 relative">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5 font-mono">
              <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Cari Nama PIC:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={
                  isSuperadmin
                    ? "Ketik nama PIC (contoh: Aji, Felita, Ozi)..."
                    : `Cari PIC ${AREA_METADATA[userArea]?.name || ''}...`
                }
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                list="pic-autocomplete-list"
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Datalist untuk Autocomplete Cepat */}
            <datalist id="pic-autocomplete-list">
              {availablePicChips.map((p) => (
                <option key={`${p.area}-${p.name}`} value={p.name}>
                  PIC {p.name} - {AREA_METADATA[p.area]?.name || p.area}
                </option>
              ))}
            </datalist>
          </div>

          {/* Filter Area Cabang: Superadmin bisa ganti cabang; User Area terkunci ke cabang login */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5 font-mono">
              <Building className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Area Cabang:</span>
            </label>
            {isSuperadmin ? (
              <select
                value={selectedAreaFilter}
                onChange={(e) => {
                  setInternalAreaFilter(e.target.value as SJAArea | 'ALL');
                  setPicFilter('ALL');
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">🌐 Semua Area Cabang (Sepanjang, Karawang, Sukodono, Semarang)</option>
                <option value="SEPANJANG">🏢 SJA Sepanjang (Lampiran 1)</option>
                <option value="KARAWANG">🏢 SJA Karawang (Lampiran 2)</option>
                <option value="SUKODONO">🏢 SJA Sukodono (Lampiran 3)</option>
                <option value="SEMARANG">🏢 SJA Semarang (Lampiran 4)</option>
              </select>
            ) : (
              <div className="w-full px-3 py-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 rounded-xl text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{AREA_METADATA[userArea]?.name || userArea}</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-200/70 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold">
                  Cabang Login
                </span>
              </div>
            )}
          </div>

          {/* Filter Dropdown PIC: Superadmin bisa pilih Semua PIC; Area User hanya melihat PIC areanya */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5 font-mono">
              <User className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>
                {isSuperadmin
                  ? 'Pilih PIC (Semua / Per-Area):'
                  : `Pilih PIC ${AREA_METADATA[userArea]?.name || ''}:`}
              </span>
            </label>
            <select
              value={selectedPicFilter}
              onChange={(e) => setPicFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {isSuperadmin ? (
                <>
                  <option value="ALL">👤 Semua Nama PIC ({rawPicMetrics.length} Terdaftar)</option>

                  {/* SJA Sepanjang */}
                  <optgroup label="🏢 SJA Sepanjang (Lampiran 1)">
                    {(picsByAreaMap.SEPANJANG || []).map((picName) => {
                      const m = rawPicMetrics.find((x) => x.pic.toLowerCase() === picName.toLowerCase());
                      return (
                        <option key={`SEPANJANG-${picName}`} value={picName}>
                          {picName} {m ? `(${m.total} SPP · ${m.closed} Close)` : '(0 SPP)'}
                        </option>
                      );
                    })}
                  </optgroup>

                  {/* SJA Karawang */}
                  <optgroup label="🏢 SJA Karawang (Lampiran 2)">
                    {(picsByAreaMap.KARAWANG || []).map((picName) => {
                      const m = rawPicMetrics.find((x) => x.pic.toLowerCase() === picName.toLowerCase());
                      return (
                        <option key={`KARAWANG-${picName}`} value={picName}>
                          {picName} {m ? `(${m.total} SPP · ${m.closed} Close)` : '(0 SPP)'}
                        </option>
                      );
                    })}
                  </optgroup>

                  {/* SJA Sukodono */}
                  <optgroup label="🏢 SJA Sukodono (Lampiran 3)">
                    {(picsByAreaMap.SUKODONO || []).map((picName) => {
                      const m = rawPicMetrics.find((x) => x.pic.toLowerCase() === picName.toLowerCase());
                      return (
                        <option key={`SUKODONO-${picName}`} value={picName}>
                          {picName} {m ? `(${m.total} SPP · ${m.closed} Close)` : '(0 SPP)'}
                        </option>
                      );
                    })}
                  </optgroup>

                  {/* SJA Semarang */}
                  <optgroup label="🏢 SJA Semarang (Lampiran 4)">
                    {(picsByAreaMap.SEMARANG || []).map((picName) => {
                      const m = rawPicMetrics.find((x) => x.pic.toLowerCase() === picName.toLowerCase());
                      return (
                        <option key={`SEMARANG-${picName}`} value={picName}>
                          {picName} {m ? `(${m.total} SPP · ${m.closed} Close)` : '(0 SPP)'}
                        </option>
                      );
                    })}
                  </optgroup>
                </>
              ) : (
                <>
                  <option value="ALL">
                    👤 Semua PIC {AREA_METADATA[userArea]?.name || ''} ({picsByAreaMap[userArea]?.length || 0} Personil)
                  </option>
                  {(picsByAreaMap[userArea] || []).map((picName) => {
                    const m = rawPicMetrics.find((x) => x.pic.toLowerCase() === picName.toLowerCase());
                    return (
                      <option key={`${userArea}-${picName}`} value={picName}>
                        {picName} {m ? `(${m.total} SPP · ${m.closed} Close)` : '(0 SPP)'}
                      </option>
                    );
                  })}
                </>
              )}
            </select>
          </div>
        </div>

        {/* Baris 2: Pintasan Tombol Cepat (Chips) Nama PIC Per-Area */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>
                ⚡ Pintasan PIC{' '}
                {isSuperadmin
                  ? selectedAreaFilter === 'ALL'
                    ? 'Semua Cabang'
                    : AREA_METADATA[selectedAreaFilter]?.name
                  : AREA_METADATA[userArea]?.name}:
              </span>
            </span>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar flex-wrap">
            <button
              type="button"
              onClick={() => setPicFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer text-xs ${
                selectedPicFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Semua PIC {isSuperadmin ? '' : `(${AREA_METADATA[userArea]?.name.split(' ')[1] || ''})`}
            </button>

            {availablePicChips.map((p) => {
              const isSelected = selectedPicFilter.toLowerCase() === p.name.toLowerCase();
              const metricsInfo = rawPicMetrics.find((x) => x.pic.toLowerCase() === p.name.toLowerCase());
              const count = metricsInfo?.total || 0;

              return (
                <button
                  key={`${p.area}-${p.name}`}
                  type="button"
                  onClick={() => setPicFilter(isSelected ? 'ALL' : p.name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-800'
                  }`}
                  title={`Klik untuk memfilter data performa PIC ${p.name} (${AREA_METADATA[p.area]?.name})`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      p.area === 'SEPANJANG'
                        ? 'bg-blue-500'
                        : p.area === 'KARAWANG'
                        ? 'bg-emerald-500'
                        : p.area === 'SUKODONO'
                        ? 'bg-purple-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <span>{p.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded ${
                      isSelected
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Baris 3: Pengatur Pilar 3D, Status Performa & Urutan */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          {/* Pengalih Metrik Pilar 3D */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
              <Box className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Metrik 3D:</span>
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <button
                type="button"
                onClick={() => setSelected3DMetric('MULTI')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  selected3DMetric === 'MULTI'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📊 3 Pilar
              </button>
              <button
                type="button"
                onClick={() => setSelected3DMetric('ONTIME')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  selected3DMetric === 'ONTIME'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🎯 Kepatuhan SLA
              </button>
              <button
                type="button"
                onClick={() => setSelected3DMetric('DURATION')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  selected3DMetric === 'DURATION'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ⏱️ Lead Time
              </button>
            </div>
          </div>

          {/* Filter Status Performa */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 dark:text-slate-400">Status:</span>
            <button
              type="button"
              onClick={() => setTierFilter('ALL')}
              className={`px-2 py-0.5 rounded-md font-medium cursor-pointer transition-colors text-xs ${
                tierFilter === 'ALL'
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('EFFICIENT')}
              className={`px-2 py-0.5 rounded-md font-medium cursor-pointer transition-colors text-xs ${
                tierFilter === 'EFFICIENT'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Sangat Efisien
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('ATTENTION')}
              className={`px-2 py-0.5 rounded-md font-medium cursor-pointer transition-colors text-xs ${
                tierFilter === 'ATTENTION'
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Perlu Perhatian
            </button>
          </div>

          {/* Pengurutan */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="TOTAL">Volume SPP Terbanyak</option>
              <option value="CLOSED">PO Close Terbanyak</option>
              <option value="ONTIME">Kepatuhan Ontime Tertinggi</option>
              <option value="DAYS">Durasi Rata-rata Tercepat</option>
            </select>
          </div>

          {/* Tombol Sinkronisasi 2 Arah Google Sheet */}
          {onSyncGoogleSheet && (
            <button
              type="button"
              onClick={onSyncGoogleSheet}
              disabled={isSyncingGoogleSheet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50 shrink-0 ml-auto"
              title="Sinkronisasi 2 Arah Google Sheet: Tarik pembaruan dan hapus di aplikasi jika data di Google Sheet telah dihapus"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isSyncingGoogleSheet ? 'animate-spin' : ''}`} />
              <span>{isSyncingGoogleSheet ? 'Menyinkronkan...' : 'Sinkron 2 Arah'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE SPOTLIGHT CARD (KARTU SOROTAN KHUSUS JIKA ATASAN MEMILIH 1 PIC) */}
      {/* ========================================================================= */}
      {singleSpotlightPic && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border border-blue-500/40 shadow-xl text-white space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                {singleSpotlightPic.pic.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base text-white">
                    Sorotan Performa: {singleSpotlightPic.pic}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/40">
                    {singleSpotlightPic.area ? AREA_METADATA[singleSpotlightPic.area]?.name : 'Personil PIC SJA'}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      singleSpotlightPic.tier === 'Sangat Efisien'
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                        : singleSpotlightPic.tier === 'Perlu Perhatian'
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-400/40'
                        : 'bg-slate-700 text-slate-200 border border-slate-600'
                    }`}
                  >
                    {singleSpotlightPic.tier}
                  </span>
                </div>
                <p className="text-xs text-blue-200/80 mt-0.5">
                  Analisis terpusat untuk mempermudah pemantauan performa kerja oleh atasan.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedPicDetail(singleSpotlightPic)}
                className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Lihat {singleSpotlightPic.total} Rincian SPP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPicFilter('ALL')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Tampilkan Semua
              </button>
            </div>
          </div>

          {/* 4 Metrik Inti PIC */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 font-mono text-center">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase font-sans text-blue-300 block font-semibold">Total SPP</span>
              <span className="text-lg font-bold text-white">{singleSpotlightPic.total} Dokumen</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase font-sans text-emerald-300 block font-semibold">PO Close</span>
              <span className="text-lg font-bold text-emerald-400">
                {singleSpotlightPic.closed} ({singleSpotlightPic.total > 0 ? Math.round((singleSpotlightPic.closed / singleSpotlightPic.total) * 100) : 0}%)
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase font-sans text-amber-300 block font-semibold">PO Open</span>
              <span className="text-lg font-bold text-amber-400">{singleSpotlightPic.open} Dokumen</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase font-sans text-purple-300 block font-semibold">Kepatuhan SLA</span>
              <span className="text-lg font-bold text-white">
                {singleSpotlightPic.ontimeRate}% <span className="text-xs font-normal text-slate-300">({singleSpotlightPic.avgDays} hr)</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 1. SEKSI GRAFIK 3D ISOMETRIK */}
      {(viewMode === 'ALL' || viewMode === 'CHART_3D') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Box className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Grafik Batang 3D Isometrik Kinerja Personil PIC:</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Menampilkan {filteredMetrics.length} Personil PIC
            </span>
          </div>

          <IsometricPicBarChart
            metrics={filteredMetrics}
            selectedMetric={selected3DMetric}
            activePic={selectedPicDetail?.pic || (selectedPicFilter !== 'ALL' ? selectedPicFilter : null)}
            onSelectPic={(picName) => {
              const found = rawPicMetrics.find((m) => m.pic.toLowerCase() === picName.toLowerCase());
              if (found) setSelectedPicDetail(found);
            }}
          />
        </div>
      )}

      {/* 2. SEKSI TABEL SCORECARD LENGKAP */}
      {(viewMode === 'ALL' || viewMode === 'TABLE') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200/90 dark:border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Tabel Evaluasi Scorecard &amp; Kecepatan Proses per PIC</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Kalkulasi hari kerja murni (akhir pekan &amp; libur nasional SKB 3 Menteri otomatis dipotong).
              </p>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              Total {filteredMetrics.length} data personil
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50/90 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase font-mono text-[11px] border-b border-slate-200/90 dark:border-slate-800/90">
                <tr>
                  <th className="px-4 py-2.5 text-center">No.</th>
                  <th className="px-4 py-2.5">Nama PIC &amp; Cabang</th>
                  <th className="px-4 py-2.5 text-center">Total SPP</th>
                  <th className="px-4 py-2.5 text-center">PO Close</th>
                  <th className="px-4 py-2.5 text-center">PO Open</th>
                  <th className="px-4 py-2.5 text-center">Ontime (%)</th>
                  <th className="px-4 py-2.5 text-center">Rata-rata Hari Proses</th>
                  <th className="px-4 py-2.5 text-center">Status Performa</th>
                  <th className="px-4 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {filteredMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                      Tidak ada data personil PIC yang cocok dengan kriteria filter atau pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredMetrics.map((p, idx) => {
                    const isVeryGood = p.tier === 'Sangat Efisien';
                    const isUnderEvaluation = p.tier === 'Perlu Perhatian';

                    return (
                      <tr
                        key={p.pic}
                        onClick={() => setSelectedPicDetail(p)}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 text-center font-mono text-slate-400 text-xs">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold">
                              {p.pic.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="block font-bold">{p.pic}</span>
                              {p.area && (
                                <span className="text-[10px] font-normal text-slate-400 font-mono">
                                  {AREA_METADATA[p.area]?.name || p.area}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {p.total}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                          {p.closed}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-amber-700 dark:text-amber-400 font-bold">
                          {p.open}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`font-mono font-bold ${
                              p.ontimeRate >= 80
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {p.ontimeRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-slate-700 dark:text-slate-300">
                          {p.avgDays} hr
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              isVeryGood
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : isUnderEvaluation
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {p.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                            Lihat Dokumen →
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. MODAL / DRAWER DRILL-DOWN DOKUMEN PER PERSONIL PIC */}
      {selectedPicDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header Modal Drilldown */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                  {selectedPicDetail.pic.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Rincian Dokumen PIC: {selectedPicDetail.pic}
                    </h3>
                    {selectedPicDetail.area && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {AREA_METADATA[selectedPicDetail.area]?.name || selectedPicDetail.area}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedPicDetail.tier === 'Sangat Efisien'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : selectedPicDetail.tier === 'Perlu Perhatian'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {selectedPicDetail.tier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Menangani {selectedPicDetail.total} dokumen SPP ({selectedPicDetail.closed} PO Close · {selectedPicDetail.open} PO Open) · Kepatuhan SLA: {selectedPicDetail.ontimeRate}%
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPicDetail(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rekapan Mini Metrik Personil */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Beban SPP</span>
                <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {selectedPicDetail.total} Dokumen
                </span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">PO Selesai (Close)</span>
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {selectedPicDetail.closed} PO ({selectedPicDetail.total > 0 ? Math.round((selectedPicDetail.closed / selectedPicDetail.total) * 100) : 0}%)
                </span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Kepatuhan SLA (≤ 10 hr)</span>
                <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {selectedPicDetail.ontimeRate}% ({selectedPicDetail.ontime} ontime)
                </span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Rata-Rata Lead Time</span>
                <span className="text-base font-bold font-mono text-purple-600 dark:text-purple-400">
                  {selectedPicDetail.avgDays} Hari Kerja
                </span>
              </div>
            </div>

            {/* Tabel Daftar Dokumen yang Ditangani PIC Terpilih */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(() => {
                const sortedModalItems = [...(selectedPicDetail.items || [])].sort((a, b) => {
                  const timeA = getItemInputTimestamp(a);
                  const timeB = getItemInputTimestamp(b);
                  if (timeA !== timeB) return timeB - timeA;
                  if (a.poDate && b.poDate && a.poDate !== b.poDate) return b.poDate.localeCompare(a.poDate);
                  if (a.budgetReceivedDate !== b.budgetReceivedDate) return b.budgetReceivedDate.localeCompare(a.budgetReceivedDate);
                  return b.sppNumber.localeCompare(a.sppNumber);
                });

                const totalModalPages = Math.max(1, Math.ceil(sortedModalItems.length / modalPageSize));
                const validModalPage = Math.min(Math.max(1, modalPage), totalModalPages);
                const modalStartIndex = (validModalPage - 1) * modalPageSize;
                const modalEndIndex = modalStartIndex + modalPageSize;
                const paginatedModalItems = sortedModalItems.slice(modalStartIndex, modalEndIndex);

                return (
                  <>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                      <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Daftar Dokumen Pengadaan yang Ditangani ({sortedModalItems.length} Dokumen):
                      </span>
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-sans">
                        Urutan data input terbaru posisi paling atas
                      </span>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-3 py-2">Nomor SPP</th>
                            <th className="px-3 py-2">Tgl Terima Budget</th>
                            <th className="px-3 py-2">Nomor PO</th>
                            <th className="px-3 py-2">Tgl PO</th>
                            <th className="px-3 py-2 text-center">Durasi Kerja</th>
                            <th className="px-3 py-2 text-center">Status PO</th>
                            <th className="px-3 py-2 text-center">Status SLA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                          {paginatedModalItems.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">
                                {item.sppNumber}
                                {item.isUrgentAdvance && (
                                  <span className="ml-1 text-[9px] font-bold text-amber-600">⚡ DARURAT</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                                {item.budgetReceivedDate}
                              </td>
                              <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                                {item.poNumber || <span className="text-slate-400 italic font-sans text-[11px]">Belum terbit</span>}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                                {item.poDate || '-'}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold">
                                <span
                                  className={
                                    item.processDays <= 10
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }
                                >
                                  {item.processDays} hr
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.statusPO === 'CLOSE'
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                  }`}
                                >
                                  {item.statusPO}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.statusOntime === 'ONTIME'
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                                  }`}
                                >
                                  {item.statusOntime}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar Modal (15 data per halaman) */}
                    {sortedModalItems.length > 15 && (
                      <div className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                        <span className="text-slate-500 font-mono text-[11px]">
                          Menampilkan {modalStartIndex + 1} - {Math.min(modalEndIndex, sortedModalItems.length)} dari {sortedModalItems.length} dokumen (Halaman {validModalPage} dari {totalModalPages})
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setModalPage(1)}
                            disabled={validModalPage === 1}
                            className="p-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 cursor-pointer"
                            title="Halaman Pertama"
                          >
                            <ChevronsLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                            disabled={validModalPage === 1}
                            className="p-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 cursor-pointer"
                            title="Halaman Sebelumnya"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                            {validModalPage} / {totalModalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setModalPage((p) => Math.min(totalModalPages, p + 1))}
                            disabled={validModalPage === totalModalPages}
                            className="p-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 cursor-pointer"
                            title="Halaman Selanjutnya"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalPage(totalModalPages)}
                            disabled={validModalPage === totalModalPages}
                            className="p-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 cursor-pointer"
                            title="Halaman Terakhir"
                          >
                            <ChevronsRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Footer Modal */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Dokumen resmi pengadaan PT Sinar Jernih Angkasa (SJA)
              </span>
              <button
                type="button"
                onClick={() => setSelectedPicDetail(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
