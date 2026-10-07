import React from 'react';
import { SPPItem } from '../types';
import { Clock, CheckCircle2, AlertTriangle, Layers, CalendarCheck, ArrowUpRight } from 'lucide-react';

interface KPISummaryProps {
  items: SPPItem[];
  onFilterHPlus3: () => void;
  onFilterOpen: () => void;
  onFilterLate: () => void;
  onResetFilter: () => void;
  activeFilterLabel?: string;
}

export const KPISummary: React.FC<KPISummaryProps> = ({
  items,
  onFilterHPlus3,
  onFilterOpen,
  onFilterLate,
  onResetFilter,
  activeFilterLabel,
}) => {
  const total = items.length;
  const closedPOs = items.filter((i) => i.statusPO === 'CLOSE').length;
  const openPOs = total - closedPOs;
  const ontimeCount = items.filter((i) => i.statusOntime === 'ONTIME').length;
  const lateCount = total - ontimeCount;
  const ontimeRate = total > 0 ? ((ontimeCount / total) * 100).toFixed(1) : '0';

  const h3AlertCount = items.filter((i) => i.isHPlus3Overdue).length;
  const significantDelayCount = items.filter((i) => i.isSignificantDelay).length;

  const totalDays = items.reduce((acc, curr) => acc + curr.processDays, 0);
  const avgProcessDays = total > 0 ? (totalDays / total).toFixed(1) : '0';

  return (
    <div className="space-y-3">
      {activeFilterLabel && (
        <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-lg transition-colors">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>
              Filter Aktif: <strong className="text-slate-900 dark:text-white font-semibold">{activeFilterLabel}</strong>
            </span>
          </div>
          <button
            onClick={onResetFilter}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-medium cursor-pointer transition-colors"
          >
            Tampilkan Semua ({total} Dokumen)
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Card 1: Total SPP */}
        <div
          onClick={onResetFilter}
          className="p-4 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 cursor-pointer group shadow-2xs hover:shadow-xs relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total SPP</span>
            <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            {total}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Dari Tim Budget
          </div>
        </div>

        {/* Card 2: SLA Ontime Rate */}
        <div
          onClick={onFilterLate}
          className="p-4 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 cursor-pointer group shadow-2xs hover:shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">SLA Ontime Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            {ontimeRate}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{ontimeCount} on-time</span>
            <span>·</span>
            <span className="text-rose-600 dark:text-rose-400 font-medium">{lateCount} lewat</span>
          </div>
        </div>

        {/* Card 3: Status PO (Close / Open) */}
        <div
          onClick={onFilterOpen}
          className="p-4 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 cursor-pointer group shadow-2xs hover:shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Realisasi PO</span>
            <CalendarCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            {closedPOs} <span className="text-xs font-normal text-slate-400 font-sans">Close /</span> {openPOs} <span className="text-xs font-normal text-amber-600 dark:text-amber-400 font-sans">Open</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {openPOs > 0 ? `${openPOs} menunggu No. PO` : 'Semua PO terpenuhi'}
          </div>
        </div>

        {/* Card 4: Rata-rata Hari Proses Kerja */}
        <div className="p-4 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Rata-rata Durasi</span>
            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
            {avgProcessDays} <span className="text-xs font-normal text-slate-400 font-sans">hari kerja</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Sabtu, Minggu &amp; Libur diskip
          </div>
        </div>

        {/* Card 5: Alert H+3 & Keterlambatan */}
        <div
          onClick={onFilterHPlus3}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer group shadow-2xs hover:shadow-xs ${
            h3AlertCount > 0
              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-700'
              : 'bg-white dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Alert H+3 Tanpa PO</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${h3AlertCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono tracking-tight ${h3AlertCount > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
            {h3AlertCount} <span className="text-xs font-normal font-sans text-rose-600 dark:text-rose-400">dokumen</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {significantDelayCount > 0 ? (
              <span className="text-rose-700 dark:text-rose-400 font-medium">{significantDelayCount} keterlambatan kritis</span>
            ) : (
              'Batas durasi aman'
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
