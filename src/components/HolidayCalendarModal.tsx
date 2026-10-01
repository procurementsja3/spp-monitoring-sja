import React, { useState } from 'react';
import { IndonesianHoliday, UserProfile } from '../types';
import { Calendar, Plus, Trash2, Info, CheckCircle2 } from 'lucide-react';

interface HolidayCalendarModalProps {
  holidays: IndonesianHoliday[];
  onAddHoliday: (holiday: IndonesianHoliday) => void;
  onDeleteHoliday: (date: string) => void;
  currentUser: UserProfile;
}

export const HolidayCalendarModal: React.FC<HolidayCalendarModalProps> = ({
  holidays,
  onAddHoliday,
  onDeleteHoliday,
  currentUser,
}) => {
  const [selectedYear, setSelectedYear] = useState('2026');
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'NASIONAL' | 'CUTI_BERSAMA'>('NASIONAL');

  const filteredHolidays = holidays
    .filter((h) => h.date.startsWith(selectedYear))
    .sort((a, b) => a.date.localeCompare(b.date));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newName) return;
    onAddHoliday({
      date: newDate,
      name: newName,
      type: newType,
    });
    setNewDate('');
    setNewName('');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-700" />
            <span>Master Kalender Hari Libur Nasional &amp; Cuti Bersama (SKB 3 Menteri)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar tanggal merah yang otomatis <strong>dikecualikan (tidak dihitung)</strong> dalam rumus durasi hari proses SPP ke PO.
          </p>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
          {['2025', '2026', '2027'].map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                selectedYear === year
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahun {year}
            </button>
          ))}
        </div>
      </div>

      {/* Info Card: Cara Kerja Rumus */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
          <Info className="w-4 h-4 text-cyan-600" />
          <span>Aturan Resmi Penghitungan Hari Kerja (Working Days Procurement SLA):</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-600 pt-1">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <span><strong>Hari Sabtu &amp; Minggu:</strong> Diabaikan secara otomatis oleh kalender sistem.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <span><strong>Hari Libur Nasional:</strong> Tanggal merah resmi SKB tidak menambah beban SLA tim.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <span><strong>Batas Normal H+3:</strong> Dihitung dari 3 hari kerja penuh setelah tanggal budget diterima.</span>
          </div>
        </div>
      </div>

      {/* Form Tambah Hari Libur Kustom (Khusus Admin) */}
      {currentUser.role === 'ADMIN_PENGADAAN' && (
        <form onSubmit={handleAdd} className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Tambah Hari Libur / Cuti Bersama Kustom Perusahaan
            </span>
            <span className="text-[11px] text-slate-400">Hak Akses: Admin Pengadaan</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 mb-1">Tanggal Libur *</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-600 mb-1">Nama Hari Libur / Keterangan *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: Cuti Bersama Internal Pabrik / Maintenance"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Kategori</label>
              <div className="flex gap-2">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none"
                >
                  <option value="NASIONAL">Libur Nasional</option>
                  <option value="CUTI_BERSAMA">Cuti Bersama</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tabel Daftar Hari Libur */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            Daftar Libur Resmi Tahun {selectedYear} ({filteredHolidays.length} Hari)
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Sistem otomatis mengecualikan tanggal ini dari penghitungan proses PO
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 uppercase font-mono text-[11px] border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Tanggal</th>
                <th className="px-4 py-2.5">Hari</th>
                <th className="px-4 py-2.5">Nama Hari Libur / Keterangan</th>
                <th className="px-4 py-2.5">Tipe Libur</th>
                {currentUser.role === 'ADMIN_PENGADAAN' && (
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredHolidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tidak ada tanggal libur di tahun {selectedYear}.
                  </td>
                </tr>
              ) : (
                filteredHolidays.map((h) => {
                  const dateObj = new Date(h.date + 'T12:00:00');
                  const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });

                  return (
                    <tr key={h.date} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                        {h.date}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{dayName}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{h.name}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-[11px] font-semibold ${
                            h.type === 'NASIONAL' ? 'text-rose-700' : 'text-cyan-700'
                          }`}
                        >
                          {h.type === 'NASIONAL' ? 'Libur Nasional' : 'Cuti Bersama'}
                        </span>
                      </td>
                      {currentUser.role === 'ADMIN_PENGADAAN' && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => onDeleteHoliday(h.date)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Hapus Libur Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
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
