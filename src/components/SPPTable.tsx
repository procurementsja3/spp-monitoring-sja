import React, { useState } from 'react';
import { SPPItem, UserProfile, SJAArea } from '../types';
import { AREA_METADATA } from '../utils/initialData';
import { 
  Search, 
  Filter, 
  FileSpreadsheet, 
  FileText, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Send, 
  Clock, 
  AlertCircle,
  AlertTriangle,
  Check,
  Plus,
  RotateCcw,
  Sparkles,
  Inbox
} from 'lucide-react';

interface SPPTableProps {
  items: SPPItem[];
  currentUser: UserProfile;
  activeAreaFilter?: SJAArea | 'ALL';
  onSelectAreaFilter?: (area: SJAArea | 'ALL') => void;
  onEdit: (item: SPPItem) => void;
  onDelete: (id: string) => void;
  onDeleteBatch?: (ids: string[]) => void;
  onClearAll?: () => void;
  onLoadSampleData?: () => void;
  onOpenNewSPP?: () => void;
  onQuickUpdatePO: (id: string, poNumber: string, poDate: string) => void;
  onSendInstantAlert: (item: SPPItem) => void;
  onOpenExportModal: () => void;
}

export const SPPTable: React.FC<SPPTableProps> = ({
  items,
  currentUser,
  activeAreaFilter = 'ALL',
  onSelectAreaFilter,
  onEdit,
  onDelete,
  onDeleteBatch,
  onClearAll,
  onLoadSampleData,
  onOpenNewSPP,
  onQuickUpdatePO,
  onSendInstantAlert,
  onOpenExportModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPO, setFilterPO] = useState<'ALL' | 'OPEN' | 'CLOSE'>('ALL');
  const [filterSLA, setFilterSLA] = useState<'ALL' | 'ONTIME' | 'TERLAMBAT'>('ALL');
  const [filterAlert, setFilterAlert] = useState<'ALL' | 'H3' | 'SIGNIFICANT'>('ALL');
  const [selectedPic, setSelectedPic] = useState('ALL');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // State modal konfirmasi hapus data
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'batch' | 'all';
    targetItem?: SPPItem;
    targetCount?: number;
  }>({
    isOpen: false,
    type: 'single',
  });

  // State untuk quick modal / inline prompt PO number
  const [quickPoModalItem, setQuickPoModalItem] = useState<SPPItem | null>(null);
  const [inputPoNumber, setInputPoNumber] = useState('');
  const [inputPoDate, setInputPoDate] = useState(new Date().toISOString().split('T')[0]);

  // Unique PICs list
  const uniquePics = Array.from(new Set(items.map((i) => i.pic))).filter(Boolean);

  // Filtering
  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      item.sppNumber.toLowerCase().includes(q) ||
      item.pic.toLowerCase().includes(q) ||
      (item.poNumber || '').toLowerCase().includes(q);

    const matchPO = filterPO === 'ALL' || item.statusPO === filterPO;
    const matchSLA = filterSLA === 'ALL' || item.statusOntime === filterSLA;
    const matchPic = selectedPic === 'ALL' || item.pic === selectedPic;

    let matchAlert = true;
    if (filterAlert === 'H3') matchAlert = item.isHPlus3Overdue;
    if (filterAlert === 'SIGNIFICANT') matchAlert = item.isSignificantDelay;

    return matchSearch && matchPO && matchSLA && matchPic && matchAlert;
  });

  // Handle select all / deselect all
  const isAllFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.includes(item.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Unselect filtered items
      const filteredItemIds = new Set(filteredItems.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredItemIds.has(id)));
    } else {
      // Select all filtered items
      const newSelected = new Set([...selectedIds, ...filteredItems.map((i) => i.id)]);
      setSelectedIds(Array.from(newSelected));
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Quick PO modal
  const handleOpenQuickPo = (item: SPPItem) => {
    setQuickPoModalItem(item);
    setInputPoNumber(item.poNumber || `PO/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/0`);
    setInputPoDate(item.poDate || new Date().toISOString().split('T')[0]);
  };

  const handleSaveQuickPo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPoModalItem) return;
    onQuickUpdatePO(quickPoModalItem.id, inputPoNumber, inputPoDate);
    setQuickPoModalItem(null);
  };

  // Trigger single item delete confirmation
  const handlePromptDeleteSingle = (item: SPPItem) => {
    setDeleteConfirmModal({
      isOpen: true,
      type: 'single',
      targetItem: item,
    });
  };

  // Trigger batch delete confirmation
  const handlePromptDeleteBatch = () => {
    if (selectedIds.length === 0) return;
    setDeleteConfirmModal({
      isOpen: true,
      type: 'batch',
      targetCount: selectedIds.length,
    });
  };

  // Trigger clear all confirmation
  const handlePromptClearAll = () => {
    setDeleteConfirmModal({
      isOpen: true,
      type: 'all',
      targetCount: items.length,
    });
  };

  // Execute deletion after confirmation
  const handleExecuteDelete = () => {
    if (deleteConfirmModal.type === 'single' && deleteConfirmModal.targetItem) {
      onDelete(deleteConfirmModal.targetItem.id);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmModal.targetItem?.id));
    } else if (deleteConfirmModal.type === 'batch' && onDeleteBatch) {
      onDeleteBatch(selectedIds);
      setSelectedIds([]);
    } else if (deleteConfirmModal.type === 'all' && onClearAll) {
      onClearAll();
      setSelectedIds([]);
    }
    setDeleteConfirmModal({ isOpen: false, type: 'single' });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      {/* Controls Bar: Search & Filter Segmented Controls */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nomor SPP, PIC, Nomor PO..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Action Buttons: Export & Kosongkan/Hapus Data */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Tombol Kosongkan Semua Data */}
            {items.length > 0 && onClearAll && (
              <button
                onClick={handlePromptClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold rounded-md transition-colors whitespace-nowrap"
                title="Hapus / Kosongkan seluruh data SPP saat ini"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Kosongkan Data ({items.length})</span>
              </button>
            )}

            {/* Tombol Ekspor */}
            <button
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md transition-colors whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>Laporan PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Segmented Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Filter Status PO */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
            <button
              onClick={() => setFilterPO('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterPO === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua PO
            </button>
            <button
              onClick={() => setFilterPO('OPEN')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterPO === 'OPEN' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Open PO
            </button>
            <button
              onClick={() => setFilterPO('CLOSE')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterPO === 'CLOSE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Close PO
            </button>
          </div>

          {/* Filter SLA */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
            <button
              onClick={() => setFilterSLA('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterSLA === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua SLA
            </button>
            <button
              onClick={() => setFilterSLA('ONTIME')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterSLA === 'ONTIME' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ontime
            </button>
            <button
              onClick={() => setFilterSLA('TERLAMBAT')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterSLA === 'TERLAMBAT' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tidak Ontime
            </button>
          </div>

          {/* Filter Alert H+3 */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
            <button
              onClick={() => setFilterAlert('ALL')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                filterAlert === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Alert
            </button>
            <button
              onClick={() => setFilterAlert('H3')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                filterAlert === 'H3' ? 'bg-rose-600 text-white shadow-xs font-semibold' : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              Alert H+3
            </button>
          </div>

          {/* Filter PIC */}
          <select
            value={selectedPic}
            onChange={(e) => setSelectedPic(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none"
          >
            <option value="ALL">Semua PIC</option>
            {uniquePics.map((p) => (
              <option key={p} value={p}>
                PIC: {p}
              </option>
            ))}
          </select>

          {/* Filter Area (Khusus Superadmin) */}
          {currentUser.role === 'SUPERADMIN' && onSelectAreaFilter && (
            <select
              value={activeAreaFilter}
              onChange={(e) => onSelectAreaFilter(e.target.value as SJAArea | 'ALL')}
              className="text-xs bg-blue-50 border border-blue-200 text-blue-800 font-semibold rounded-md px-2 py-1 focus:outline-none"
            >
              <option value="ALL">🌐 Semua Area Cabang</option>
              <option value="SEPANJANG">🏢 SJA Sepanjang</option>
              <option value="KARAWANG">🏢 SJA Karawang</option>
              <option value="SUKODONO">🏢 SJA Sukodono</option>
              <option value="SEMARANG">🏢 SJA Semarang</option>
            </select>
          )}

          <div className="ml-auto flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500 font-semibold">
              Menampilkan {filteredItems.length} dari {items.length} SPP
            </span>
          </div>
        </div>

        {/* Selection Bulk Action Floating Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-lg text-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-rose-900 font-semibold">
              <span className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center text-[11px] font-bold">
                {selectedIds.length}
              </span>
              <span>Dokumen SPP dipilih</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1 text-slate-600 hover:text-slate-800 font-medium hover:bg-rose-100 rounded transition-colors"
              >
                Batal Pilih
              </button>
              <button
                onClick={handlePromptDeleteBatch}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded shadow-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Data Terpilih ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* High-Density Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left text-slate-700">
          <thead className="bg-slate-50 text-slate-500 uppercase font-mono tracking-wider border-b border-slate-200 text-[11px]">
            <tr>
              <th className="px-3 py-2.5 w-8 text-center">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={handleToggleSelectAll}
                  disabled={filteredItems.length === 0}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  title="Pilih Semua Data"
                />
              </th>
              <th className="px-4 py-2.5 whitespace-nowrap">Tanggal Terima Budget</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Nomor SPP</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Area Cabang</th>
              <th className="px-4 py-2.5 whitespace-nowrap">PIC</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Tanggal PO</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Nomor PO</th>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">Jumlah Hari Proses</th>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">Status PO</th>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">Status SLA</th>
              <th className="px-4 py-2.5 text-right whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-16 text-center">
                  <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3 px-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-xs">
                      <Inbox className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-800">
                        {items.length === 0 ? 'Data SPP Masih Kosong' : 'Tidak Ada Data yang Cocok'}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {items.length === 0
                          ? 'Belum ada data pengajuan SPP yang tersimpan. Anda dapat langsung menginput data baru melalui tombol di bawah atau sinkronkan dengan Google Sheet per area.'
                          : 'Tidak ditemukan dokumen SPP yang sesuai dengan kata kunci pencarian atau filter yang sedang aktif.'}
                      </p>
                    </div>
                    <div className="flex items-center flex-wrap justify-center gap-2 pt-2">
                      {items.length === 0 && onOpenNewSPP && (
                        <button
                          onClick={onOpenNewSPP}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Input SPP Baru</span>
                        </button>
                      )}
                      {items.length === 0 && onLoadSampleData && (
                        <button
                          onClick={onLoadSampleData}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
                          title="Muat contoh data dummy untuk pengujian"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Muat Contoh Data Demo</span>
                        </button>
                      )}
                      {items.length > 0 && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setFilterPO('ALL');
                            setFilterSLA('ALL');
                            setFilterAlert('ALL');
                            setSelectedPic('ALL');
                          }}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors"
                        >
                          Reset Semua Filter
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const hasPO = item.statusPO === 'CLOSE';
                const isOverdue = item.statusOntime === 'TERLAMBAT';
                const isSelected = selectedIds.includes(item.id);

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-blue-50/40' : item.isHPlus3Overdue ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    {/* Checkbox select */}
                    <td className="px-3 py-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectItem(item.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* 1. Tanggal Terima Budget */}
                    <td className="px-4 py-3 font-mono whitespace-nowrap text-slate-600">
                      {item.budgetReceivedDate}
                    </td>

                    {/* 2. Nomor SPP */}
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{item.sppNumber}</span>
                        {item.isHPlus3Overdue && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-bold text-rose-700 bg-rose-100 rounded"
                            title="Peringatan: Belum dibuatkan PO setelah H+3 hari kerja dari tim budget"
                          >
                            H+3 ALERT
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Area Cabang */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                          item.area === 'SEPANJANG'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : item.area === 'KARAWANG'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.area === 'SUKODONO'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {AREA_METADATA[item.area]?.name || item.area}
                      </span>
                    </td>

                    {/* 3. PIC */}
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                      {item.pic}
                    </td>

                    {/* 4. Tanggal PO */}
                    <td className="px-4 py-3 font-mono whitespace-nowrap text-slate-600">
                      {item.poDate || <span className="text-slate-400 italic">-</span>}
                    </td>

                    {/* 5. Nomor PO - Otomatis terupdate menjadi Close jika ada nomor PO */}
                    <td className="px-4 py-3 font-mono whitespace-nowrap">
                      {item.poNumber ? (
                        <span className="font-semibold text-slate-900">{item.poNumber}</span>
                      ) : (
                        <button
                          onClick={() => handleOpenQuickPo(item)}
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>+ Masukkan No. PO</span>
                        </button>
                      )}
                    </td>

                    {/* 6. Jumlah Hari Proses (Kalkulasi Hari Kerja Tanpa Weekend & Libur Nasional) */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div
                        className={`font-mono font-bold text-xs ${
                          isOverdue ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                        title="Dihitung dari tgl terima budget dikurangi tgl PO (Sabtu, Minggu & Libur Nasional tidak dihitung)"
                      >
                        {item.processDays} hari kerja
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        SLA limit: {item.slaLimit} hr
                      </div>
                    </td>

                    {/* 7. Status PO (CLOSE jika posisi sudah ada nomor PO, OPEN jika belum) */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {hasPO ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                          <Check className="w-3.5 h-3.5" />
                          <span>Close</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Open</span>
                        </span>
                      )}
                    </td>

                    {/* 8. Status SLA (ONTIME atau TIDAK ONTIME) */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {isOverdue ? (
                        <span className="text-rose-700 font-semibold text-xs inline-flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Tidak Ontime</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-xs inline-flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Ontime</span>
                        </span>
                      )}
                    </td>

                    {/* 9. Kolom Aksi */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {item.isHPlus3Overdue && (
                          <button
                            onClick={() => onSendInstantAlert(item)}
                            className="p-1 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                            title="Kirim pengingat pesan instan / email ke staf terkait"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(item)}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit Dokumen SPP"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {/* Tombol Hapus: Terbuka untuk Superadmin dan Area User */}
                        <button
                          onClick={() => handlePromptDeleteSingle(item)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Dokumen SPP ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Konfirmasi Hapus Data (Single, Batch, All) */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {deleteConfirmModal.type === 'single'
                    ? 'Hapus Dokumen SPP?'
                    : deleteConfirmModal.type === 'batch'
                    ? `Hapus ${deleteConfirmModal.targetCount} Dokumen SPP?`
                    : 'Kosongkan Seluruh Data SPP?'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {deleteConfirmModal.type === 'single' && (
                    <>
                      Apakah Anda yakin ingin menghapus SPP{' '}
                      <span className="font-mono font-semibold text-slate-800">
                        {deleteConfirmModal.targetItem?.sppNumber}
                      </span>{' '}
                      (Area: {deleteConfirmModal.targetItem?.area})? Data ini akan dihapus permanen dari sistem.
                    </>
                  )}
                  {deleteConfirmModal.type === 'batch' && (
                    <>
                      Apakah Anda yakin ingin menghapus {deleteConfirmModal.targetCount} baris dokumen SPP yang dipilih? Tindakan ini tidak dapat dibatalkan.
                    </>
                  )}
                  {deleteConfirmModal.type === 'all' && (
                    <>
                      Apakah Anda yakin ingin mengosongkan seluruh data SPP ({deleteConfirmModal.targetCount} dokumen)? Seluruh rekaman lokal saat ini akan dibersihkan.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, type: 'single' })}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quick Input No PO */}
      {quickPoModalItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Penerbitan Nomor PO Realisasi</h3>
                <p className="text-xs text-slate-500">
                  SPP: <span className="font-mono font-semibold">{quickPoModalItem.sppNumber}</span>
                </p>
              </div>
              <button
                onClick={() => setQuickPoModalItem(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickPo} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nomor PO *
                </label>
                <input
                  type="text"
                  required
                  value={inputPoNumber}
                  onChange={(e) => setInputPoNumber(e.target.value)}
                  placeholder="PO/2026/03/0112"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tanggal PO *
                </label>
                <input
                  type="date"
                  required
                  value={inputPoDate}
                  onChange={(e) => setInputPoDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded border border-emerald-200 text-emerald-800 text-[11px]">
                💡 Memasukkan Nomor PO otomatis mengupdate status PO menjadi <strong>CLOSE</strong> dan menghentikan perhitungan hari kerja SLA.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickPoModalItem(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium shadow-xs"
                >
                  Simpan &amp; Close PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
