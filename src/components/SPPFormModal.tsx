import React, { useState, useEffect } from 'react';
import { SPPItem, IndonesianHoliday, SJAArea, UserProfile } from '../types';
import { calculateWorkingDays } from '../utils/holidayCalendar';
import { AREA_METADATA } from '../utils/initialData';
import { Plus, Trash2, Clock, Calendar, User, Tag, Layers, Check, Building } from 'lucide-react';

interface DraftRow {
  tempId: string;
  budgetReceivedDate: string;
  sppNumber: string;
  pic: string;
  area: SJAArea;
  poDate: string;
  poNumber: string;
  slaLimit: number;
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

  const createDefaultRow = (index = 0, rowArea: SJAArea = initialArea): DraftRow => {
    const todayISO = new Date().toISOString().split('T')[0];
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = AREA_METADATA[rowArea]?.code || 'SJA';

    return {
      tempId: `draft-${Date.now()}-${index}-${Math.random()}`,
      budgetReceivedDate: todayISO,
      sppNumber: `SPP/${code}/${year}/${month}/${randomNum}`,
      pic: 'Budi Santoso',
      area: rowArea,
      poDate: '',
      poNumber: '',
      slaLimit: 10,
    };
  };

  const [rows, setRows] = useState<DraftRow[]>([createDefaultRow(0, initialArea)]);
  const [commonDate, setCommonDate] = useState(new Date().toISOString().split('T')[0]);
  const [commonPic, setCommonPic] = useState('Budi Santoso');
  const [commonArea, setCommonArea] = useState<SJAArea>(initialArea);

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

  const handleRemoveRow = (tempId: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  const handleUpdateRow = (tempId: string, field: keyof DraftRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, [field]: value } : r))
    );
  };

  const handleApplyCommonDate = () => {
    setRows((prev) => prev.map((r) => ({ ...r, budgetReceivedDate: commonDate })));
  };

  const handleApplyCommonPic = () => {
    setRows((prev) => prev.map((r) => ({ ...r, pic: commonPic })));
  };

  const handleApplyCommonArea = () => {
    setRows((prev) =>
      prev.map((r) => {
        const code = AREA_METADATA[commonArea]?.code || 'SJA';
        const parts = r.sppNumber.split('/');
        let newSpp = r.sppNumber;
        if (parts.length >= 4) {
          parts[1] = code;
          newSpp = parts.join('/');
        }
        return { ...r, area: commonArea, sppNumber: newSpp };
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
    totalProcessDays += calc.workingDays;
    totalWeekendSkipped += calc.weekendDaysSkipped;
    totalHolidaySkipped += calc.holidayDaysSkipped;

    const isClose = r.poNumber && r.poNumber.trim() !== '';
    if (isClose) closedCount++;

    const isOntime = calc.workingDays <= (r.slaLimit || 10);
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
      sppNumber: r.sppNumber.trim(),
      pic: r.pic,
      area: r.area,
      poDate: r.poDate || undefined,
      poNumber: r.poNumber.trim() || undefined,
      slaLimit: Number(r.slaLimit || 10),
    }));

    onSave(payload);
    onClose();
  };

  const allAreas: SJAArea[] = ['SEPANJANG', 'KARAWANG', 'SUKODONO', 'SEMARANG'];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-5xl w-full my-6 flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-800" />
              <span>
                {editItem
                  ? 'Edit Dokumen SPP'
                  : `Input Data SPP · ${
                      isSuperadmin ? 'Superadmin (Multi-Area)' : `Area ${currentUser.name}`
                    }`}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isSuperadmin
                ? 'Superadmin dapat menginput data untuk semua area cabang SJA tanpa batasan jumlah.'
                : `Input pengajuan SPP khusus cabang ${currentUser.name}.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!editItem && (
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md border bg-white text-slate-700 border-slate-200 shadow-xs">
                {rows.length} Baris Data Input
              </span>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 font-bold text-sm p-1 rounded"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar Tambah Baris Cepat */}
        {!editItem && (
          <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Baris</span>
              </button>

              <button
                type="button"
                onClick={handleAdd5Rows}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded border border-slate-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ 5 Baris</span>
              </button>

              <button
                type="button"
                onClick={handleAdd10Rows}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded border border-slate-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ 10 Baris</span>
              </button>
            </div>

            {/* Tombol Terapkan Cepat Tgl/PIC/Area */}
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium pl-1">Salin Nilai:</span>
              <input
                type="date"
                value={commonDate}
                onChange={(e) => setCommonDate(e.target.value)}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-[11px]"
                title="Pilih tanggal terima budget bersama"
              />
              <button
                type="button"
                onClick={handleApplyCommonDate}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded text-[11px]"
              >
                Terapkan Tgl
              </button>

              {/* Area selector for superadmin */}
              {isSuperadmin && (
                <>
                  <select
                    value={commonArea}
                    onChange={(e) => setCommonArea(e.target.value as SJAArea)}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-semibold text-blue-700"
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
                    className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold rounded text-[11px]"
                  >
                    Terapkan Area
                  </button>
                </>
              )}

              <select
                value={commonPic}
                onChange={(e) => setCommonPic(e.target.value)}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px]"
              >
                <option value="Budi Santoso">Budi Santoso</option>
                <option value="Siti Rahmawati">Siti Rahmawati</option>
                <option value="Denny Wijaya">Denny Wijaya</option>
                <option value="Rian Pratama">Rian Pratama</option>
              </select>
              <button
                type="button"
                onClick={handleApplyCommonPic}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded text-[11px]"
              >
                Terapkan PIC
              </button>
            </div>
          </div>
        )}

        {/* List Baris Input */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="space-y-3">
            {rows.map((row, idx) => {
              const calc = calculateWorkingDays(row.budgetReceivedDate, row.poDate || undefined, holidays);
              const processDays = calc.workingDays;
              const isClose = row.poNumber && row.poNumber.trim() !== '';
              const isOntime = processDays <= (row.slaLimit || 10);
              const areaInfo = AREA_METADATA[row.area] || { name: row.area, code: 'SJA' };

              return (
                <div
                  key={row.tempId}
                  className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-xs space-y-2 text-xs transition-colors"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">
                        Data SPP {idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                        {areaInfo.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900">
                        {processDays} Hari Kerja
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                          isClose ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isClose ? 'CLOSE' : 'OPEN'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                          isOntime ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isOntime ? 'ONTIME' : 'TERLAMBAT'}
                      </span>

                      {!editItem && rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.tempId)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded"
                          title="Hapus baris data ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 pt-1">
                    {/* Area Dropdown (Visible/Editable for Superadmin) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>Area Cabang *</span>
                      </label>
                      {isSuperadmin ? (
                        <select
                          value={row.area}
                          onChange={(e) => handleUpdateRow(row.tempId, 'area', e.target.value as SJAArea)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:bg-white text-xs font-semibold"
                        >
                          {allAreas.map((a) => (
                            <option key={a} value={a}>
                              {AREA_METADATA[a].name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          disabled
                          value={AREA_METADATA[row.area]?.name || row.area}
                          className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded text-slate-700 text-xs font-semibold cursor-not-allowed"
                        />
                      )}
                    </div>

                    {/* 1. Tanggal Terima Budget */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Tgl Terima Budget *</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={row.budgetReceivedDate}
                        onChange={(e) => handleUpdateRow(row.tempId, 'budgetReceivedDate', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 focus:outline-none focus:bg-white text-xs"
                      />
                    </div>

                    {/* 2. Nomor SPP */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>Nomor SPP *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={row.sppNumber}
                        onChange={(e) => handleUpdateRow(row.tempId, 'sppNumber', e.target.value)}
                        placeholder="SPP/2026/03/XXXX"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 focus:outline-none focus:bg-white text-xs font-semibold"
                      />
                    </div>

                    {/* 3. PIC */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>PIC Pengadaan *</span>
                      </label>
                      <select
                        value={row.pic}
                        onChange={(e) => handleUpdateRow(row.tempId, 'pic', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:bg-white text-xs"
                      >
                        <option value="Budi Santoso">Budi Santoso</option>
                        <option value="Siti Rahmawati">Siti Rahmawati</option>
                        <option value="Denny Wijaya">Denny Wijaya</option>
                        <option value="Rian Pratama">Rian Pratama</option>
                      </select>
                    </div>

                    {/* 4. Tanggal PO */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Tanggal PO (Opsional)
                      </label>
                      <input
                        type="date"
                        value={row.poDate}
                        onChange={(e) => handleUpdateRow(row.tempId, 'poDate', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 focus:outline-none focus:bg-white text-xs"
                      />
                    </div>

                    {/* 5. Nomor PO */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Nomor PO (Opsional)
                      </label>
                      <input
                        type="text"
                        value={row.poNumber}
                        onChange={(e) => handleUpdateRow(row.tempId, 'poNumber', e.target.value)}
                        placeholder="PO/2026/03/XXXX"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 focus:outline-none focus:bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Kotak Kalkulasi Hari Kerja */}
          <div className="p-4 bg-slate-900 text-white rounded-lg space-y-2 mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Jumlah Hari Proses (Rumus Pengurangan):</span>
              </span>
              <span className="font-mono text-cyan-300 font-bold text-sm">
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
                <span className="font-bold font-mono text-cyan-400">
                  {ontimeCount} ONTIME <span className="text-slate-400 font-normal">/</span> {lateCount} TERLAMBAT
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Pengecualian:</span>
                <span className="text-slate-300 font-mono">
                  {totalWeekendSkipped} akhir pekan, {totalHolidaySkipped} libur
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 pt-1 font-mono">
              *Sabtu, Minggu dan Hari Libur Nasional SKB 3 Menteri otomatis tidak dihitung dalam proses.
            </p>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
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
