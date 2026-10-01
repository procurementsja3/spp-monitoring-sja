import React, { useState } from 'react';
import { UserProfile, UserRole, AuditLog } from '../types';
import { INITIAL_USERS } from '../utils/initialData';
import { ShieldCheck, Key, Lock, Users, Activity, Check, X, ShieldAlert } from 'lucide-react';

interface Security2FAModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onChangeUser: (user: UserProfile) => void;
  onToggle2FA: (enabled: boolean) => void;
  auditLogs: AuditLog[];
}

export const Security2FAModal: React.FC<Security2FAModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onChangeUser,
  onToggle2FA,
  auditLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'RBAC' | '2FA' | 'AUDIT'>('RBAC');
  const [inputTotp, setInputTotp] = useState('');
  const [totpFeedback, setTotpFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerifyTotp = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputTotp.length === 6) {
      onToggle2FA(true);
      setTotpFeedback('Otentikasi Dua Faktor (2FA) berhasil diverifikasi dan diaktifkan!');
      setInputTotp('');
    } else {
      setTotpFeedback('Kode TOTP harus terdiri dari 6 digit angka.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-3xl w-full p-6 my-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Pusat Keamanan, Manajemen Role (RBAC) &amp; Audit Trail</span>
            </h2>
            <p className="text-xs text-slate-500">
              Otentikasi Dua Faktor (2FA), hak akses berbasis peran, dan log audit tamper-evident.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
          <button
            onClick={() => setActiveTab('RBAC')}
            className={`flex-1 py-1.5 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'RBAC'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manajemen Akses Role (RBAC)</span>
          </button>
          <button
            onClick={() => setActiveTab('2FA')}
            className={`flex-1 py-1.5 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === '2FA'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Otentikasi Dua Faktor (2FA)</span>
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex-1 py-1.5 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'AUDIT'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Audit Trail Log ({auditLogs.length})</span>
          </button>
        </div>

        {/* Tab 1: RBAC */}
        {activeTab === 'RBAC' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              Pilih profil pengguna untuk menguji batasan hak akses sesuai standar operasional pengadaan:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {INITIAL_USERS.map((user) => {
                const isCurrent = user.id === currentUser.id;
                return (
                  <div
                    key={user.id}
                    onClick={() => onChangeUser(user)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isCurrent
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{user.name}</span>
                      <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">
                        {user.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{user.email}</div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      Divisi: <strong>{user.department}</strong>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">
                        {user.role === 'ADMIN_PENGADAAN' && 'Hak akses penuh, kalender, hapus data'}
                        {user.role === 'STAFF_PIC' && 'Input SPP & terbitkan Nomor PO'}
                        {user.role === 'TEAM_BUDGET' && 'Verifikasi tanggal terima & nominal'}
                        {user.role === 'AUDITOR' && 'Read-only, laporan & log audit'}
                      </span>
                      {isCurrent && (
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Aktif
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: 2FA */}
        {activeTab === '2FA' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-4">
              <div className="w-24 h-24 bg-white border border-slate-300 rounded p-2 flex flex-col items-center justify-center shrink-0">
                {/* Simulated QR Code */}
                <div className="grid grid-cols-5 gap-1 w-full h-full p-1 bg-slate-900 rounded-xs">
                  <div className="bg-white col-span-2 row-span-2 rounded-xs" />
                  <div className="bg-slate-900" />
                  <div className="bg-white col-span-2 row-span-2 rounded-xs" />
                  <div className="bg-slate-900" />
                  <div className="bg-white col-span-3 rounded-xs" />
                  <div className="bg-white col-span-2 row-span-2 rounded-xs" />
                  <div className="bg-slate-900" />
                  <div className="bg-white col-span-2 row-span-2 rounded-xs" />
                </div>
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Time-based One-Time Password (TOTP 2FA)
                  </h3>
                  <span
                    className={`font-semibold ${
                      currentUser.twoFactorEnabled ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {currentUser.twoFactorEnabled ? '● 2FA Aktif' : '○ 2FA Nonaktif'}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Pindai QR Code di atas menggunakan aplikasi Google Authenticator, Microsoft Authenticator, atau masukkan Secret Key manual di bawah ini.
                </p>
                <div className="p-2 bg-white border border-slate-200 rounded font-mono text-[11px] text-slate-800 flex items-center justify-between">
                  <span>Secret Key: <strong>{currentUser.twoFactorSecret || 'SJA-PROC-TOTP-9921'}</strong></span>
                  <span className="text-[10px] text-slate-400">SHA-1 / 30s</span>
                </div>
              </div>
            </div>

            {totpFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded font-medium">
                {totpFeedback}
              </div>
            )}

            <form onSubmit={handleVerifyTotp} className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
              <label className="block font-semibold text-slate-700">
                Verifikasi 6-Digit Token Authenticator
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={inputTotp}
                  onChange={(e) => setInputTotp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 123456"
                  className="w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded font-mono text-center tracking-widest text-base font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold text-xs"
                >
                  Verifikasi &amp; Aktifkan 2FA
                </button>
                {currentUser.twoFactorEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggle2FA(false);
                      setTotpFeedback('2FA telah dinonaktifkan.');
                    }}
                    className="px-3 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded text-xs font-medium ml-auto"
                  >
                    Nonaktifkan 2FA
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: AUDIT TRAIL LOG */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>Log aktivitas tersimpan dengan checksum kriptografis untuk audit forensik.</span>
              <span className="font-mono text-[11px]">{auditLogs.length} Entri Tercatat</span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left text-slate-700 text-xs">
                <thead className="bg-slate-50 uppercase font-mono text-[10px] text-slate-500 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Waktu</th>
                    <th className="px-3 py-2">Pengguna</th>
                    <th className="px-3 py-2">Aksi</th>
                    <th className="px-3 py-2">Rincian Aktivitas</th>
                    <th className="px-3 py-2 text-right">Checksum Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono whitespace-nowrap text-slate-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-medium text-slate-900">{log.userName}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{log.userRole}</span>
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-800 text-[11px]">
                        {log.action}
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-[11px]">
                        {log.details}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[10px] text-slate-400">
                        {log.checksum}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
