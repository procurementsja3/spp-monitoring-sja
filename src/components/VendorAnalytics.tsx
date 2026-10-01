import React, { useMemo } from 'react';
import { SPPItem } from '../types';
import { TrendingUp, CheckCircle, Clock, Users, AlertTriangle } from 'lucide-react';

interface VendorAnalyticsProps {
  items: SPPItem[];
}

export const VendorAnalytics: React.FC<VendorAnalyticsProps> = ({ items }) => {
  // Metrik PIC Buyer
  const picMetrics = useMemo(() => {
    const map = new Map<
      string,
      { total: number; closed: number; ontime: number; late: number; totalDays: number }
    >();

    items.forEach((i) => {
      const p = i.pic || 'Tanpa PIC';
      const c = map.get(p) || { total: 0, closed: 0, ontime: 0, late: 0, totalDays: 0 };
      c.total += 1;
      if (i.statusPO === 'CLOSE') c.closed += 1;
      if (i.statusOntime === 'ONTIME') c.ontime += 1;
      else c.late += 1;
      c.totalDays += i.processDays;
      map.set(p, c);
    });

    return Array.from(map.entries()).map(([pic, data]) => {
      const ontimeRate = data.total > 0 ? (data.ontime / data.total) * 100 : 0;
      const avgDays = data.total > 0 ? +(data.totalDays / data.total).toFixed(1) : 0;

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
      };
    });
  }, [items]);

  const totalSpp = items.length;
  const ontimeTotal = items.filter((i) => i.statusOntime === 'ONTIME').length;
  const lateTotal = totalSpp - ontimeTotal;
  const overallOntimeRate = totalSpp > 0 ? ((ontimeTotal / totalSpp) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Analitik */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/90 dark:border-slate-800/90 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
            Dashboard Analitik &amp; Efisiensi Realisasi SPP per PIC
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pemantauan kecepatan pemrosesan, rasio ketepatan waktu SLA, dan status PO per penanggung jawab.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Rasio Ketepatan SLA Keseluruhan:</span>
          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{overallOntimeRate}%</span>
        </div>
      </div>

      {/* Ringkasan Status Efisiensi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Staf PIC Aktif</span>
            <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {picMetrics.length} <span className="text-xs font-normal font-sans text-slate-400">Personil</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Menangani total {totalSpp} pengajuan SPP
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Penyelesaian Tepat Waktu (Ontime)</span>
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {ontimeTotal} <span className="text-xs font-normal font-sans text-slate-400">SPP ({overallOntimeRate}%)</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Durasi &le; batas limit hari kerja yang ditentukan
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Terlambat Melewati SLA</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {lateTotal} <span className="text-xs font-normal font-sans text-slate-400">SPP</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Memerlukan percepatan penerbitan nomor PO
          </p>
        </div>
      </div>

      {/* Tabel Evaluasi Scorecard PIC */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200/90 dark:border-slate-800/90 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Evaluasi Efisiensi &amp; Kecepatan Proses per PIC
          </h3>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            Kalkulasi hari kerja (Sabtu, Minggu &amp; Libur Nasional tidak dihitung)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50/90 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase font-mono text-[11px] border-b border-slate-200/90 dark:border-slate-800/90">
              <tr>
                <th className="px-4 py-2.5">Nama PIC</th>
                <th className="px-4 py-2.5 text-center">Total SPP</th>
                <th className="px-4 py-2.5 text-center">PO Close</th>
                <th className="px-4 py-2.5 text-center">PO Open</th>
                <th className="px-4 py-2.5 text-center">Ontime (%)</th>
                <th className="px-4 py-2.5 text-center">Rata-rata Hari Proses</th>
                <th className="px-4 py-2.5 text-center">Status Performa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {picMetrics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                    Belum ada data analitik kinerja PIC. Silakan tambahkan data SPP baru atau sinkronkan dengan Google Sheet.
                  </td>
                </tr>
              ) : (
                picMetrics.map((p) => {
                  const isVeryGood = p.tier === 'Sangat Efisien';
                  const isUnderEvaluation = p.tier === 'Perlu Perhatian';

                  return (
                    <tr key={p.pic} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {p.pic}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">{p.total}</td>
                      <td className="px-4 py-3 text-center font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                        {p.closed}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-amber-700 dark:text-amber-400 font-semibold">
                        {p.open}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        <div className="inline-flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              p.ontimeRate >= 80 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {p.ontimeRate}%
                          </span>
                          <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                p.ontimeRate >= 80 ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${p.ontimeRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-800 dark:text-slate-200">
                        {p.avgDays} hari kerja
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-xs font-semibold ${
                            isVeryGood
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : isUnderEvaluation
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {p.tier}
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
    </div>
  );
};
