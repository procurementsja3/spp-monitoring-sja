import React from 'react';
import { SPPItem } from '../types';
import { Clock, CheckCircle2, AlertTriangle, Layers, CalendarCheck } from 'lucide-react';

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
        <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md">
          <span>
            Filter Aktif: <strong className="text-slate-900">{activeFilterLabel}</strong>
          </span>
          <button
            onClick={onResetFilter}
            className="text-slate-500 hover:text-slate-900 underline font-medium cursor-pointer"
          >
            Tampilkan Semua ({total} SPP)
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Card 1: Total SPP */}
        <div
          onClick={onResetFilter}
          className="p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Total SPP Diterima</span>
            <Layers className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {total}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Dari Team Budget
          </div>
        </div>

        {/* Card 2: SLA Ontime Rate */}
        <div
          onClick={onFilterLate}
          className="p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">SLA Ontime Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {ontimeRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span className="text-emerald-700 font-medium">{ontimeCount} on-time</span>
            <span className="mx-1">·</span>
            <span className="text-rose-600 font-medium">{lateCount} terlambat</span>
          </div>
        </div>

        {/* Card 3: Status PO (Close / Open) */}
        <div
          onClick={onFilterOpen}
          className="p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Status PO Realisasi</span>
            <CalendarCheck className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {closedPOs} <span className="text-sm font-normal text-slate-400 font-sans">Close /</span> {openPOs} <span className="text-xs font-normal text-amber-700 font-sans">Open</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Otomatis Close saat No. PO terisi
          </div>
        </div>

        {/* Card 4: Rata-rata Hari Proses Kerja */}
        <div className="p-4 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Rata-rata Durasi</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            {avgProcessDays} <span className="text-xs font-medium text-slate-500 font-sans">hari kerja</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Sabtu, Minggu &amp; Libur diskip
          </div>
        </div>

        {/* Card 5: Alert H+3 & Keterlambatan */}
        <div
          onClick={onFilterHPlus3}
          className={`p-4 rounded-lg border transition-colors cursor-pointer group ${
            h3AlertCount > 0
              ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span className="font-medium">Alert H+3 Tanpa PO</span>
            <AlertTriangle className={`w-4 h-4 ${h3AlertCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono tracking-tight ${h3AlertCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {h3AlertCount} <span className="text-xs font-normal font-sans text-rose-600">dokumen</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {significantDelayCount > 0 ? (
              <span className="text-rose-700 font-medium">{significantDelayCount} keterlambatan kritis</span>
            ) : (
              'Batas proses aman'
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
