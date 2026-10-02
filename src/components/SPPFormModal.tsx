import React, { useState, useEffect } from 'react';
import { SPPItem, IndonesianHoliday, SJAArea, UserProfile } from '../types';
import { calculateWorkingDays } from '../utils/holidayCalendar';
import { AREA_METADATA, AREA_PIC_LIST } from '../utils/initialData';
import { Plus, Trash2, Clock, Calendar, User, Tag, Layers, Check, Building, Edit2, Zap, AlertTriangle } from 'lucide-react';

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
  notes: string;
}

interface SPPFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemsData: Partial<SPPItem>[]) => void;
  editItem?: SPPItem | null;
  holidays: IndonesianHoliday[];
  currentUser: UserProfile;
  currentAreaFilter: SJAArea | 'ALL';
}

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

  // Baris default dibuat KOSONG untuk Nomor SPP (tanpa dummy auto-generate)
  const createDefaultRow = (index = 0, rowArea: SJAArea = initialArea): DraftRow => {
    const todayISO = new Date().toISOString().split('T')[0];
    const defaultPic = AREA_PIC_LIST[rowArea]?.[0] || 'Felita';

    return {
      tempId: `draft-${Date.now()}-${index}-${Math.random()}`,
      budgetReceivedDate: todayISO,
      sppNumber: '', // Dibuat kosong sesuai permintaan pengguna
      pic: defaultPic,
      area: rowArea,
      poDate: '',
      poNumber: '',
      slaLimit: 10,
      isUrgentAdvance: false,
      urgentReason: 'Breakdown Mesin Pabrik / Line Stop (Kritis)',
      urgentApprovedBy: 'Kepala Cabang / Plant Manager',
      budgetStatus: 'APPROVED',
      notes: '',
    };
  };

  const [rows, setRows] = useState<DraftRow[]>([createDefaultRow(0, initialArea)]);
  const [commonDate, setCommonDate] = useState(new Date().toISOString().split('T')[0]);
  const [commonArea, setCommonArea] = useState<SJAArea>(initialArea);
  const [commonPic, setCommonPic] = useState(AREA_PIC_LIST[initialArea]?.[0] || 'Felita');
  const [customRowCount, setCustomRowCount] = useState<number>(20);

  useEffect(() => {
    if (editItem) {
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
          notes: editItem.notes || '',
        },
      ]);
    } else {
      setRows([createDefaultRow(0, initialArea)]);
    }
  }, [editItem, isOpen, initialArea]);

  if (!isOpen) return null;

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

  // Handler tambah baris kustom manual (20, 30, 50 atau angka bebas lainnya)
  const handleAddCustomRows = (count?: number) => {
    const n = count !== undefined ? count : Number(customRowCount);
    if (isNaN(n) || n <= 0) return;
    const clamped = Math.min(n, 200); // Batas aman hingga 200 baris sekaligus
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

  // Saat area pada suatu baris diubah, otomatis update PIC default area tersebut
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
          pic: defaultPicForArea 
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
          pic: defaultPicForArea
        };
      })
    );
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0) return;

    const payload: Partial<SPPItem>[] = rows.map((r) => ({
      budgetReceivedDate: r.budgetReceivedDate,
      sppNumber: r.sppNumber.trim() || (r.isUrgentAdvance ? `SPP-PENDING-ACC-${Date.now().toString().slice(-4)}` : ''),
      pic: r.pic.trim() || AREA_PIC_LIST[r.area]?.[0] || 'Felita',
      area: r.area,
      poDate: r.poDate || undefined,
      poNumber: r.poNumber.trim() || undefined,
      slaLimit: Number(r.slaLimit || 10),
      isUrgentAdvance: r.isUrgentAdvance,
      urgentReason: r.isUrgentAdvance ? r.urgentReason : undefined,
      urgentApprovedBy: r.isUrgentAdvance ? r.urgentApprovedBy : undefined,
      budgetStatus: r.isUrgentAdvance ? r.budgetStatus : 'APPROVED',
      notes: r.notes || (r.isUrgentAdvance ? `Dispensasi Urgent: ${r.urgentReason} (Disetujui: ${r.urgentApprovedBy})` : undefined),
    }));

    onSave(payload);
    onClose();
  };

  const allAreas: SJAArea[] = ['SEPANJANG', 'KARAWANG', 'SUKODONO', 'SEMARANG'];

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl max-w-5xl w-full my-6 flex flex-col max-h-[92vh] transition-colors">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
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
              {isSuperadmin
                ? 'Superadmin dapat memilih area cabang dan PIC pengadaan resmi masing-masing cabang.'
                : `Input pengajuan SPP khusus cabang ${currentUser.name}.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!editItem && (
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-800 shadow-2xs">
                {rows.length} Baris Data
              </span>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm p-1 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar Tambah Baris Cepat & Input Manual Baris (Hanya saat Input Baru) */}
        {!editItem && (
          <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-2xs transition-colors"
                title="Tambah 1 baris"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ 1 Baris</span>
              </button>

              <button
                type="button"
                onClick={handleAdd5Rows}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg border border-slate-200/90 dark:border-slate-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>+5</span>
              </button>

              <button
                type="button"
                onClick={handleAdd10Rows}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg border border-slate-200/90 dark:border-slate-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>+10</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddCustomRows(20)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg border border-slate-200/90 dark:border-slate-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>+20</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddCustomRows(30)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg border border-slate-200/90 dark:border-slate-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>+30</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddCustomRows(50)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg border border-slate-200/90 dark:border-slate-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>+50</span>
              </button>

              {/* Fitur Tambah Baris Manual (Ketik Angka Bebas Sesuai Foto 2) */}
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
                  placeholder="20 / 30 / 50..."
                  className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-700 rounded-lg text-center font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomRows()}
                  disabled={!customRowCount || customRowCount <= 0}
                  className="px-2.5 py-1 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-2xs transition-colors text-[11px]"
                  title={`Tambah ${customRowCount || 0} baris baru`}
                >
                  + Tambah Baris
                </button>
              </div>
            </div>

            {/* Bulk Apply Bar */}
            <div className="flex items-center flex-wrap gap-2 text-[11px] bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Terapkan Massal:</span>

              {/* Bulk Date */}
              <input
                type="date"
                value={commonDate}
                onChange={(e) => setCommonDate(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-md font-mono text-[11px] text-slate-800 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={handleApplyCommonDate}
                className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-md shadow-2xs"
              >
                Tgl Budget
              </button>

              {/* Bulk Area (Superadmin) */}
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
                    className="px-2 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold rounded-md shadow-2xs"
                  >
                    Area
                  </button>
                </>
              )}

              {/* Bulk PIC */}
              <select
                value={commonPic}
                onChange={(e) => setCommonPic(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-md text-[11px] text-slate-800 dark:text-slate-200 font-medium"
              >
                {(AREA_PIC_LIST[commonArea] || []).map((picName) => (
                  <option key={picName} value={picName}>
                    {picName} ({AREA_METADATA[commonArea].name.split(' ')[1]})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyCommonPic}
                className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-md shadow-2xs"
              >
                PIC
              </button>
            </div>
          </div>
        )}

        {/* List Baris Input */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
          <div className="space-y-3">
            {rows.map((row, idx) => {
              const calc = calculateWorkingDays(row.budgetReceivedDate, row.poDate || undefined, holidays);
              const processDays = calc.workingDays;
              const isClose = row.poNumber && row.poNumber.trim() !== '';
              const isOntime = processDays <= (row.slaLimit || 10);
              const areaInfo = AREA_METADATA[row.area] || { name: row.area, code: 'SJA' };

              const branchPics = AREA_PIC_LIST[row.area] || [];
              const isPredefinedPic = branchPics.includes(row.pic);

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
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Form Input Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
                    {/* Area Selector (Superadmin only) */}
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

                    {/* 1. Tanggal Terima Budget */}
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

                    {/* 2. Nomor SPP (Kosong secara default, user ketik sendiri) */}
                    <div className={isSuperadmin ? '' : 'md:col-span-2'}>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>Nomor SPP *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={row.sppNumber}
                        onChange={(e) => handleUpdateRow(row.tempId, 'sppNumber', e.target.value)}
                        placeholder={`Contoh: SPP/${AREA_METADATA[row.area]?.code || 'SJA'}/2026/10/...`}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg font-mono text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 text-xs font-semibold placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>

                    {/* 3. PIC Pengadaan (Dropdown Otomatis Per Masing-Masing Area + Opsi Ketik Manual) */}
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
                        {branchPics.map((picName) => (
                          <option key={picName} value={picName}>
                            {picName}
                          </option>
                        ))}
                        <option value="__CUSTOM__">✍️ Lainnya (Ketik Manual)...</option>
                      </select>

                      {/* Kotak Input Manual bila memilih Lainnya atau saat nama tidak ada di list bawaan */}
                      {(!isPredefinedPic || row.pic === '') && (
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

                    {/* 4. Tanggal PO */}
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

                    {/* 5. Nomor PO */}
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
                              Aktifkan jika kondisi darurat (mesin pabrik mogok/stok kritis) sehingga nomor PO wajib dikerjakan lebih dulu sebelum SPP di-ACC.
                            </span>
                          </div>
                        </label>

                        {row.isUrgentAdvance && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-200/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 whitespace-nowrap">
                            STATUS: PENDING BUDGET ACC
                          </span>
                        )}
                      </div>

                      {/* Detail Dispensasi Urgent saat aktif */}
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

          {/* Kotak Kalkulasi Hari Kerja Eksekutif */}
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

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/90 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan SPP ({rows.length} Data)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
