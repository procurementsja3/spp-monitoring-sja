import React, { useState } from 'react';
import { SPPItem, UserProfile, SJAArea } from '../types';
import { AREA_METADATA, AREA_PIC_LIST } from '../utils/initialData';
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
  Inbox,
  Zap,
  RefreshCw
} from 'lucide-react';

interface SPPTableProps {
  items: SPPItem[];
  currentUser: UserProfile;
  activeAreaFilter?: SJAArea | 'ALL';
  onSelectAreaFilter?: (area: SJAArea | 'ALL') => void;
  onEdit: (item: SPPItem) => void;
  onDelete: (id: string) => void;
  onDeleteBatch?: (ids: string[]) => void;
  onClearAll?: (syncWithGoogleSheet?: boolean) => void;
  isGoogleSheetConnected?: boolean;
  connectedSheetName?: string;
  onLoadSampleData?: () => void;
  onOpenNewSPP?: () => void;
  onQuickUpdatePO: (id: string, poNumber: string, poDate: string) => void;
  onSendInstantAlert: (item: SPPItem) => void;
  onOpenExportModal: () => void;
  activeKpiFilterLabel?: string;
  onResetKpiFilter?: () => void;
  selectedPicFilter?: string;
  onSelectPicFilter?: (pic: string) => void;
  onSyncGoogleSheet?: () => void | Promise<void>;
  isSyncingGoogleSheet?: boolean;
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
  isGoogleSheetConnected = false,
  connectedSheetName = '',
  onLoadSampleData,
  onOpenNewSPP,
  onQuickUpdatePO,
  onSendInstantAlert,
  onOpenExportModal,
  activeKpiFilterLabel,
  onResetKpiFilter,
  selectedPicFilter: propSelectedPicFilter,
  onSelectPicFilter,
  onSyncGoogleSheet,
  isSyncingGoogleSheet = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [syncGoogleSheetOnClear, setSyncGoogleSheetOnClear] = useState(true);
  const [filterPO, setFilterPO] = useState<'ALL' | 'OPEN' | 'CLOSE'>('ALL');
  const [filterSLA, setFilterSLA] = useState<'ALL' | 'ONTIME' | 'TERLAMBAT'>('ALL');
  const [filterAlert, setFilterAlert] = useState<'ALL' | 'H3' | 'SIGNIFICANT'>('ALL');
  const [internalSelectedPic, setInternalSelectedPic] = useState('ALL');
  const selectedPic = propSelectedPicFilter !== undefined ? propSelectedPicFilter : internalSelectedPic;
  const setSelectedPic = (pic: string) => {
    setInternalSelectedPic(pic);
    onSelectPicFilter?.(pic);
  };
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);
  const [filterSpecialConditionOnly, setFilterSpecialConditionOnly] = useState(false);

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
      (item.poNumber || '').toLowerCase().includes(q) ||
      (item.specialCondition || '').toLowerCase().includes(q);

    const matchPO = filterPO === 'ALL' || item.statusPO === filterPO;
    const matchSLA = filterSLA === 'ALL' || item.statusOntime === filterSLA;
    const matchPic = selectedPic === 'ALL' || item.pic === selectedPic;

    let matchAlert = true;
    if (filterAlert === 'H3') matchAlert = item.isHPlus3Overdue;
    if (filterAlert === 'SIGNIFICANT') matchAlert = item.isSignificantDelay;

    const matchUrgent = !filterUrgentOnly || !!item.isUrgentAdvance;
    const matchSpecial = !filterSpecialConditionOnly || Boolean(item.specialCondition && item.specialCondition.trim() !== '');

    return matchSearch && matchPO && matchSLA && matchPic && matchAlert && matchUrgent && matchSpecial;
  });

  // Handle select all / deselect all
  const isAllFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.includes(item.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const filteredItemIds = new Set(filteredItems.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredItemIds.has(id)));
    } else {
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
      onClearAll(syncGoogleSheetOnClear);
      setSelectedIds([]);
    }
    setDeleteConfirmModal({ isOpen: false, type: 'single' });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-2xs overflow-hidden transition-colors">
      {/* Controls Bar: Search & Filter Segmented Controls */}
      <div className="p-4 border-b border-slate-200/90 dark:border-slate-800/90 space-y-3">
        {/* Banner Filter Aktif (Distribusi Kecepatan / Alert) */}
        {activeKpiFilterLabel && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
              <span>
                Filter Aktif: <strong className="font-bold text-blue-950 dark:text-blue-100">{activeKpiFilterLabel}</strong> ({items.length} Dokumen ditemukan)
              </span>
            </div>
            {onResetKpiFilter && (
              <button
                onClick={onResetKpiFilter}
                className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white underline cursor-pointer self-start sm:self-auto"
              >
                Reset Filter (Tampilkan Seluruh Dokumen) →
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nomor SPP, PIC, Nomor PO..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
            />
          </div>

          {/* Action Buttons: Export & Kosongkan/Hapus Data & Sinkron 2 Arah */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Tombol Sinkronisasi 2 Arah Google Sheet */}
            {onSyncGoogleSheet && (
              <button
                onClick={onSyncGoogleSheet}
                disabled={isSyncingGoogleSheet}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-2xs cursor-pointer disabled:opacity-50"
                title="Tarik data terbaru dari Google Sheet dan hapus dari aplikasi jika data di Google Sheet telah dihapus"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isSyncingGoogleSheet ? 'animate-spin' : ''}`} />
                <span>{isSyncingGoogleSheet ? 'Menyinkronkan...' : 'Sinkron 2 Arah Google Sheet'}</span>
              </button>
            )}

            {/* Tombol Kosongkan Semua Data */}
            {items.length > 0 && onClearAll && (
              <button
                onClick={handlePromptClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-2xs"
                title="Hapus / Kosongkan seluruh data SPP saat ini"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Kosongkan Data ({items.length})</span>
              </button>
            )}

            {/* Tombol Ekspor */}
            <button
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Laporan PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Segmented Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Filter Status PO */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200/60 dark:border-slate-800/80">
            <button
              onClick={() => setFilterPO('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                filterPO === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua PO
            </button>
            <button
              onClick={() => setFilterPO('OPEN')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                filterPO === 'OPEN'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Open PO
            </button>
            <button
              onClick={() => setFilterPO('CLOSE')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                filterPO === 'CLOSE'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Close PO
            </button>
          </div>

          {/* Filter SLA */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200/60 dark:border-slate-800/80">
            <button
              onClick={() => setFilterSLA('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                filterSLA === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua SLA
            </button>
            <button
              onClick={() => setFilterSLA('ONTIME')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                filterSLA === 'ONTIME'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ontime
            </button>
            <button
              onClick={() => setFilterSLA('TERLAMBAT')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                filterSLA === 'TERLAMBAT'
                  ? 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tidak Ontime
            </button>
          </div>

          {/* Filter Alert H+3 */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200/60 dark:border-slate-800/80">
            <button
              onClick={() => setFilterAlert('ALL')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                filterAlert === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua Alert
            </button>
            <button
              onClick={() => setFilterAlert('H3')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                filterAlert === 'H3'
                  ? 'bg-rose-600 text-white shadow-2xs font-semibold'
                  : 'text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-300'
              }`}
            >
              Alert H+3
            </button>
          </div>

          {/* Filter Khusus PO Darurat / Advance PO */}
          {items.some((i) => i.isUrgentAdvance) && (
            <button
              onClick={() => setFilterUrgentOnly((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                filterUrgentOnly
                  ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border-amber-200 dark:border-amber-900/50'
              }`}
              title="Filter hanya dokumen dispensasi urgent / advance PO"
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>PO Darurat ({items.filter((i) => i.isUrgentAdvance).length})</span>
            </button>
          )}

          {/* Filter Kasus Khusus Pengadaan */}
          {items.some((i) => i.specialCondition && i.specialCondition.trim() !== '') && (
            <button
              onClick={() => setFilterSpecialConditionOnly((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                filterSpecialConditionOnly
                  ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border-purple-200 dark:border-purple-900/50'
              }`}
              title="Filter dokumen SPP yang memiliki kendala / kondisi khusus"
            >
              <AlertCircle className="w-3 h-3" />
              <span>Kasus Khusus ({items.filter((i) => i.specialCondition && i.specialCondition.trim() !== '').length})</span>
            </button>
          )}

          {/* Filter PIC Per Area */}
          <select
            value={selectedPic}
            onChange={(e) => setSelectedPic(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            {currentUser.role === 'SUPERADMIN' ? (
              <>
                <option value="ALL">👤 Semua PIC (Seluruh 4 Cabang)</option>
                <optgroup label="🏢 SJA Sepanjang (Lampiran 1)">
                  {AREA_PIC_LIST.SEPANJANG.map((p) => (
                    <option key={`table-sep-${p}`} value={p}>
                      PIC: {p} (Sepanjang)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🏢 SJA Karawang (Lampiran 2)">
                  {AREA_PIC_LIST.KARAWANG.map((p) => (
                    <option key={`table-krw-${p}`} value={p}>
                      PIC: {p} (Karawang)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🏢 SJA Sukodono (Lampiran 3)">
                  {AREA_PIC_LIST.SUKODONO.map((p) => (
                    <option key={`table-skd-${p}`} value={p}>
                      PIC: {p} (Sukodono)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🏢 SJA Semarang (Lampiran 4)">
                  {AREA_PIC_LIST.SEMARANG.map((p) => (
                    <option key={`table-smg-${p}`} value={p}>
                      PIC: {p} (Semarang)
                    </option>
                  ))}
                </optgroup>
                {uniquePics
                  .filter(
                    (p) =>
                      !AREA_PIC_LIST.SEPANJANG.includes(p) &&
                      !AREA_PIC_LIST.KARAWANG.includes(p) &&
                      !AREA_PIC_LIST.SUKODONO.includes(p) &&
                      !AREA_PIC_LIST.SEMARANG.includes(p)
                  )
                  .map((p) => (
                    <option key={`table-oth-${p}`} value={p}>
                      PIC: {p}
                    </option>
                  ))}
              </>
            ) : (
              <>
                <option value="ALL">
                  👤 Semua PIC {AREA_METADATA[currentUser.area as SJAArea]?.name || ''}
                </option>
                {(AREA_PIC_LIST[currentUser.area as SJAArea] || []).map((p) => (
                  <option key={`table-usr-${p}`} value={p}>
                    PIC: {p}
                  </option>
                ))}
              </>
            )}
          </select>

          {/* Filter Area (Khusus Superadmin) */}
          {currentUser.role === 'SUPERADMIN' && onSelectAreaFilter && (
            <select
              value={activeAreaFilter}
              onChange={(e) => onSelectAreaFilter(e.target.value as SJAArea | 'ALL')}
              className="text-xs bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-300 font-semibold rounded-lg px-2.5 py-1 focus:outline-none"
            >
              <option value="ALL">🌐 Semua Area Cabang</option>
              <option value="SEPANJANG">🏢 SJA Sepanjang</option>
              <option value="KARAWANG">🏢 SJA Karawang</option>
              <option value="SUKODONO">🏢 SJA Sukodono</option>
              <option value="SEMARANG">🏢 SJA Semarang</option>
            </select>
          )}

          <div className="ml-auto flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">
              Menampilkan {filteredItems.length} dari {items.length} SPP
            </span>
          </div>
        </div>

        {/* Selection Bulk Action Floating Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-3.5 py-2 rounded-lg text-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-rose-900 dark:text-rose-300 font-semibold">
              <span className="w-5 h-5 rounded-full bg-rose-200 dark:bg-rose-900/80 flex items-center justify-center text-[11px] font-bold">
                {selectedIds.length}
              </span>
              <span>Dokumen SPP dipilih</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-medium hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded transition-colors"
              >
                Batal Pilih
              </button>
              <button
                onClick={handlePromptDeleteBatch}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-2xs transition-colors"
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
        <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50/90 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider border-b border-slate-200/90 dark:border-slate-800/90 text-[11px]">
            <tr>
              <th className="px-3 py-2.5 w-8 text-center">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={handleToggleSelectAll}
                  disabled={filteredItems.length === 0}
                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  title="Pilih Semua Data"
                />
              </th>
              <th className="px-4 py-2.5 whitespace-nowrap">Tanggal Terima Budget</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Nomor SPP</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Area Cabang</th>
              <th className="px-4 py-2.5 whitespace-nowrap">PIC</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Tanggal PO</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Nomor PO</th>
              <th className="px-4 py-2.5 whitespace-nowrap">Kondisi Khusus</th>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">Jumlah Hari Proses</th>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">Status PO</th>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">Status SLA</th>
              <th className="px-4 py-2.5 text-right whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center">
                  <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3 px-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-2xs">
                      <Inbox className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {items.length === 0 ? 'Data SPP Masih Kosong' : 'Tidak Ada Data yang Cocok'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {items.length === 0
                          ? 'Belum ada data pengajuan SPP yang tersimpan. Anda dapat langsung menginput data baru melalui tombol di bawah atau sinkronkan dengan Google Sheet per area.'
                          : 'Tidak ditemukan dokumen SPP yang sesuai dengan kata kunci pencarian atau filter yang sedang aktif.'}
                      </p>
                    </div>
                    <div className="flex items-center flex-wrap justify-center gap-2 pt-2">
                      {items.length === 0 && onOpenNewSPP && (
                        <button
                          onClick={onOpenNewSPP}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Input SPP Baru</span>
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
                          className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
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
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      isSelected
                        ? 'bg-blue-50/50 dark:bg-blue-950/30'
                        : item.isHPlus3Overdue
                        ? 'bg-rose-50/40 dark:bg-rose-950/20'
                        : ''
                    }`}
                  >
                    {/* Checkbox select */}
                    <td className="px-3 py-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectItem(item.id)}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* 1. Tanggal Terima Budget */}
                    <td className="px-4 py-3 font-mono whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {item.budgetReceivedDate}
                    </td>

                    {/* 2. Nomor SPP */}
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{item.sppNumber}</span>
                        {item.isUrgentAdvance && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 rounded shadow-2xs"
                            title={`Dispensasi Urgent / PO Darurat: ${item.urgentReason || 'Kondisi Urgent'} (Disetujui: ${item.urgentApprovedBy || 'Manajer'})`}
                          >
                            <Zap className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                            <span>PO DARURAT</span>
                          </span>
                        )}
                        {item.isUrgentAdvance && item.budgetStatus === 'PENDING_ACC' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-900">
                            PENDING BUDGET ACC
                          </span>
                        )}
                        {item.isHPlus3Overdue && !item.isUrgentAdvance && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 rounded"
                            title="Peringatan: Belum dibuatkan PO setelah H+3 hari kerja dari tim budget"
                          >
                            H+3 ALERT
                          </span>
                        )}
                      </div>
                      {item.isUrgentAdvance && item.urgentReason && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-normal truncate max-w-[220px]" title={item.urgentReason}>
                          ⚠️ {item.urgentReason}
                        </div>
                      )}
                    </td>

                    {/* Area Cabang */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ${
                          item.area === 'SEPANJANG'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
                            : item.area === 'KARAWANG'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
                            : item.area === 'SUKODONO'
                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                        }`}
                      >
                        {AREA_METADATA[item.area]?.name || item.area}
                      </span>
                    </td>

                    {/* 3. PIC */}
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                      {item.pic}
                    </td>

                    {/* 4. Tanggal PO */}
                    <td className="px-4 py-3 font-mono whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {item.poDate || <span className="text-slate-400 dark:text-slate-600 italic">-</span>}
                    </td>

                    {/* 5. Nomor PO */}
                    <td className="px-4 py-3 font-mono whitespace-nowrap">
                      {item.poNumber ? (
                        <span className="font-semibold text-slate-900 dark:text-white">{item.poNumber}</span>
                      ) : (
                        <button
                          onClick={() => handleOpenQuickPo(item)}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1 rounded-lg transition-colors border border-blue-200/60 dark:border-blue-900/50"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>+ Masukkan No. PO</span>
                        </button>
                      )}
                    </td>

                    {/* Kondisi Khusus (Case Khusus Pengadaan) */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.specialCondition ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs">
                            <AlertCircle className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                            <span>{item.specialCondition}</span>
                          </span>
                          {item.specialConditionReason && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[200px]" title={item.specialConditionReason}>
                              {item.specialConditionReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 font-mono text-[11px]">-</span>
                      )}
                    </td>

                    {/* 6. Jumlah Hari Proses (Kalkulasi Hari Kerja) */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div
                        className={`font-mono font-bold text-xs ${
                          isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                        title="Dihitung dari tgl terima budget sampai tgl PO (Sabtu, Minggu & Libur Nasional tidak dihitung)"
                      >
                        {item.processDays} hari kerja
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        SLA: {item.slaLimit} hr
                      </div>
                    </td>

                    {/* 7. Status PO */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {hasPO ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                          <Check className="w-3.5 h-3.5" />
                          <span>Close</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Open</span>
                        </span>
                      )}
                    </td>

                    {/* 8. Status SLA */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {item.isUrgentAdvance ? (
                        <span className="text-amber-700 dark:text-amber-400 font-bold text-xs inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800" title="Kondisi darurat: respon cepat (Fast-Track SLA)">
                          <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                          <span>Fast-Track</span>
                        </span>
                      ) : isOverdue ? (
                        <span className="text-rose-700 dark:text-rose-400 font-semibold text-xs inline-flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Tidak Ontime</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-xs inline-flex items-center gap-1">
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
                            className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            title="Kirim pengingat pesan instan / email ke staf terkait"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(item)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Dokumen SPP"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePromptDeleteSingle(item)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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

      {/* Modal Konfirmasi Hapus Data */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {deleteConfirmModal.type === 'single'
                    ? 'Hapus Dokumen SPP?'
                    : deleteConfirmModal.type === 'batch'
                    ? `Hapus ${deleteConfirmModal.targetCount} Dokumen SPP?`
                    : 'Kosongkan Seluruh Data SPP?'}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {deleteConfirmModal.type === 'single' && (
                    <>
                      Apakah Anda yakin ingin menghapus SPP{' '}
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
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
                    <div className="space-y-3">
                      <p>
                        Apakah Anda yakin ingin mengosongkan seluruh data SPP (<strong>{deleteConfirmModal.targetCount} dokumen</strong>)? Seluruh rekaman data pada aplikasi saat ini akan dibersihkan.
                      </p>

                      {isGoogleSheetConnected && (
                        <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={syncGoogleSheetOnClear}
                            onChange={(e) => setSyncGoogleSheetOnClear(e.target.checked)}
                            className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-semibold text-emerald-900 dark:text-emerald-200 block">
                              Juga bersihkan data di Google Sheet ({connectedSheetName})
                            </span>
                            <span className="text-[11px] text-emerald-700/90 dark:text-emerald-400 block mt-0.5 leading-normal">
                              Seluruh baris isi data SPP di Google Sheet akan ikut dikosongkan. Baris 1 judul kolom (Header) tetap aman dan tidak akan terhapus.
                            </span>
                          </div>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, type: 'single' })}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Penerbitan Nomor PO Realisasi</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  SPP: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{quickPoModalItem.sppNumber}</span>
                </p>
              </div>
              <button
                onClick={() => setQuickPoModalItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickPo} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Nomor PO *
                </label>
                <input
                  type="text"
                  required
                  value={inputPoNumber}
                  onChange={(e) => setInputPoNumber(e.target.value)}
                  placeholder="PO/2026/03/0112"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Tanggal PO *
                </label>
                <input
                  type="date"
                  required
                  value={inputPoDate}
                  onChange={(e) => setInputPoDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px]">
                💡 Memasukkan Nomor PO otomatis mengupdate status PO menjadi <strong>CLOSE</strong> dan menghentikan perhitungan hari kerja SLA.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickPoModalItem(null)}
                  className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-2xs"
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
