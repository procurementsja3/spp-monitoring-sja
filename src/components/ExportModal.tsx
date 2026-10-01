import React, { useState } from 'react';
import { SPPItem } from '../types';
import { exportToExcel, exportToCSV, triggerPrintPDF } from '../utils/exportHelpers';
import { FileSpreadsheet, FileText, Download, Printer, X, CheckCircle } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SPPItem[];
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, items }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('Semua Data');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CLOSE' | 'OPEN' | 'TERLAMBAT'>('ALL');
  const [exportFormat, setExportFormat] = useState<'EXCEL' | 'PDF' | 'CSV'>('EXCEL');
  const [reportTitle, setReportTitle] = useState('Laporan Realisasi SPP & Pemantauan SLA Pengadaan');

  if (!isOpen) return null;

  const exportItems = items.filter((item) => {
    if (filterStatus === 'CLOSE') return item.statusPO === 'CLOSE';
    if (filterStatus === 'OPEN') return item.statusPO === 'OPEN';
    if (filterStatus === 'TERLAMBAT') return item.statusOntime === 'TERLAMBAT';
    return true;
  });

  const handleExecuteExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const safeTitle = `Laporan_SPP_${selectedPeriod.replace(/\s+/g, '_')}_${timestamp}`;

    if (exportFormat === 'EXCEL') {
      exportToExcel(exportItems, `${safeTitle}.xls`);
    } else if (exportFormat === 'CSV') {
      exportToCSV(exportItems, `${safeTitle}.csv`);
    } else if (exportFormat === 'PDF') {
      triggerPrintPDF(exportItems, reportTitle, selectedPeriod);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Ekspor Laporan Realisasi SPP
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dokumen audit internal berstandar perbankan &amp; korporat.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Format Pilihan */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Pilih Format Dokumen *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setExportFormat('EXCEL')}
                className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1 transition-all ${
                  exportFormat === 'EXCEL'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold shadow-2xs'
                    : 'border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Microsoft Excel</span>
                <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">.xls Spreadsheet</span>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('PDF')}
                className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1 transition-all ${
                  exportFormat === 'PDF'
                    ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 font-bold shadow-2xs'
                    : 'border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span>Laporan PDF</span>
                <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">Cetak &amp; Tanda Tangan</span>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('CSV')}
                className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1 transition-all ${
                  exportFormat === 'CSV'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-bold shadow-2xs'
                    : 'border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Format CSV</span>
                <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">Universal Raw Data</span>
              </button>
            </div>
          </div>

          {/* Filter Status PO */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Filter Status PO / SLA
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">Semua Data ({items.length} SPP)</option>
                <option value="CLOSE">Hanya PO Close (Selesai)</option>
                <option value="OPEN">Hanya PO Open (Dalam Proses)</option>
                <option value="TERLAMBAT">Hanya yang Melewati SLA</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Keterangan Periode
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="Maret 2026">Maret 2026 (Bulan Berjalan)</option>
                <option value="Februari 2026">Februari 2026</option>
                <option value="Kuartal 1 2026">Kuartal 1 2026 (Q1)</option>
                <option value="Semua Data">Semua Data Historis</option>
              </select>
            </div>
          </div>

          {/* Judul Laporan */}
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
              Judul Header Dokumen Laporan
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Preview Rincian */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/90 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">Dokumen yang akan diekspor:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {exportItems.length} dari {items.length} Dokumen SPP
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExecuteExport}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              {exportFormat === 'PDF' ? <Printer className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>{exportFormat === 'PDF' ? 'Buka Pratinjau Cetak PDF' : `Unduh File ${exportFormat}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
