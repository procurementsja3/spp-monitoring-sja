import React, { useState } from 'react';
import { SystemNotification, SPPItem } from '../types';
import { 
  Bell, Mail, MessageSquare, CheckCheck, X, ExternalLink, Copy, Check,
  Phone, Trash2, Ban, RotateCcw, AlertTriangle, ShieldAlert, Settings, Search, UserCheck, Plus
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SystemNotification[];
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  items: SPPItem[];
}

interface WaContactInfo {
  phone: string;
  isPermanentlyDisabled: boolean;
}

const PIC_AREA_MAP: Record<string, string> = {
  Felita: 'SJA Sepanjang',
  Yuli: 'SJA Sepanjang',
  Tika: 'SJA Sepanjang',
  Ayu: 'SJA Sepanjang',
  Ozi: 'SJA Karawang',
  Yusa: 'SJA Karawang',
  Frans: 'SJA Karawang',
  'Siti Kardiah': 'SJA Karawang',
  Aji: 'SJA Sukodono',
  Ida: 'SJA Sukodono',
  George: 'SJA Sukodono',
  Dika: 'SJA Semarang',
  Safira: 'SJA Semarang',
  Ratnawati: 'SJA Semarang',
};

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearNotifications,
  items,
}) => {
  const [activeDrawerTab, setActiveDrawerTab] = useState<'NOTIFICATIONS' | 'WA_SETTINGS'>('NOTIFICATIONS');
  const [selectedItemForAlert, setSelectedItemForAlert] = useState<SPPItem | null>(null);
  const [alertChannel, setAlertChannel] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [sentFeedback, setSentFeedback] = useState<string | null>(null);
  const [picSearch, setPicSearch] = useState('');

  // State untuk form tambah/edit cepat nomor WA di tab pengaturan
  const [quickPicSelect, setQuickPicSelect] = useState('Felita');
  const [quickPhoneInput, setQuickPhoneInput] = useState('');

  // Registry Nomor WhatsApp & Status Blokir Permanen per PIC
  const [waContacts, setWaContacts] = useState<Record<string, WaContactInfo>>(() => {
    try {
      const saved = localStorage.getItem('sja_wa_pic_registry_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveWaContacts = (updated: Record<string, WaContactInfo>) => {
    setWaContacts(updated);
    try {
      localStorage.setItem('sja_wa_pic_registry_v1', JSON.stringify(updated));
    } catch (err) {
      console.warn('Gagal menyimpan kontak WA ke localStorage', err);
    }
  };

  const handleUpdatePhone = (pic: string, phone: string) => {
    const existing = waContacts[pic] || { phone: '', isPermanentlyDisabled: false };
    const updated = {
      ...waContacts,
      [pic]: { ...existing, phone: phone.replace(/[^\d+]/g, '') }
    };
    saveWaContacts(updated);
  };

  const handleSaveQuickPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPicSelect) return;
    handleUpdatePhone(quickPicSelect, quickPhoneInput);
    setSentFeedback(`Nomor WhatsApp untuk ${quickPicSelect} berhasil disimpan.`);
    setQuickPhoneInput('');
    setTimeout(() => setSentFeedback(null), 3000);
  };

  const handleDeletePhone = (pic: string) => {
    const existing = waContacts[pic] || { phone: '', isPermanentlyDisabled: false };
    const updated = {
      ...waContacts,
      [pic]: { ...existing, phone: '' }
    };
    saveWaContacts(updated);
    setSentFeedback(`Nomor WhatsApp untuk PIC ${pic} berhasil dihapus.`);
    setTimeout(() => setSentFeedback(null), 3000);
  };

  const handlePermanentDisableWA = (pic: string) => {
    const existing = waContacts[pic] || { phone: '', isPermanentlyDisabled: false };
    const updated = {
      ...waContacts,
      [pic]: { ...existing, isPermanentlyDisabled: true }
    };
    saveWaContacts(updated);
    setSentFeedback(`Pengiriman pesan WhatsApp untuk PIC ${pic} telah DINONAKTIFKAN SECARA PERMANEN.`);
    setTimeout(() => setSentFeedback(null), 4000);
  };

  const handleRestoreWA = (pic: string) => {
    const existing = waContacts[pic] || { phone: '', isPermanentlyDisabled: false };
    const updated = {
      ...waContacts,
      [pic]: { ...existing, isPermanentlyDisabled: false }
    };
    saveWaContacts(updated);
    setSentFeedback(`Izin pengiriman pesan WhatsApp untuk PIC ${pic} telah dipulihkan.`);
    setTimeout(() => setSentFeedback(null), 3000);
  };

  if (!isOpen) return null;

  const h3Items = items.filter((i) => i.isHPlus3Overdue);

  const generateWaMessage = (item: SPPItem) => {
    return `🚨 *PERINGATAN RESMI SLA PENGADAAN*
Kepada Yth. Sdr/i. *${item.pic}* (PIC Pengadaan)

Mohon perhatian bahwa pengajuan:
• *No. SPP*: ${item.sppNumber}
• *Tanggal Terima Budget*: ${item.budgetReceivedDate}
• *Durasi Kerja*: ${item.processDays} Hari Kerja (Libur & Akhir Pekan Dikecualikan)

Status saat ini telah melewati batas toleransi *H+3 hari kerja* tanpa penerbitan Nomor PO.
Mohon segera melengkapi dokumen dan menerbitkan PO untuk menjaga integritas SLA Divisi.`;
  };

  const handleCopyWa = (item: SPPItem) => {
    const text = generateWaMessage(item);
    navigator.clipboard.writeText(text);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  const handleSimulateSendEmail = (item: SPPItem) => {
    setSentFeedback(`Email peringatan resmi berhasil dikirim ke PIC (${item.pic}) dan tembusan Head of Procurement.`);
    setTimeout(() => setSentFeedback(null), 4000);
  };

  // Evaluasi nomor WA dan status untuk PIC terpilih
  const activePic = selectedItemForAlert?.pic || '';
  const currentContact = waContacts[activePic] || { phone: '', isPermanentlyDisabled: false };
  const rawDigits = currentContact.phone.replace(/\D/g, '');
  const cleanPhone = rawDigits.startsWith('0') 
    ? '62' + rawDigits.slice(1) 
    : rawDigits.startsWith('62') 
    ? rawDigits 
    : rawDigits.length > 0 
    ? '62' + rawDigits 
    : '';

  const waUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(selectedItemForAlert ? generateWaMessage(selectedItemForAlert) : '')}`
    : `https://wa.me/?text=${encodeURIComponent(selectedItemForAlert ? generateWaMessage(selectedItemForAlert) : '')}`;

  // Daftar seluruh PIC pengadaan dari semua cabang
  const allMasterPics = Array.from(new Set([
    'Felita', 'Yuli', 'Tika', 'Ayu',
    'Ozi', 'Yusa', 'Frans', 'Siti Kardiah',
    'Aji', 'Ida', 'George',
    'Dika', 'Safira', 'Ratnawati',
    ...items.map((i) => i.pic).filter(Boolean),
  ])).sort();

  const filteredMasterPics = allMasterPics.filter((pic) => 
    pic.toLowerCase().includes(picSearch.toLowerCase()) ||
    (PIC_AREA_MAP[pic] || '').toLowerCase().includes(picSearch.toLowerCase())
  );

  const totalConfiguredPhones = Object.values(waContacts).filter((c) => c.phone && c.phone.trim() !== '').length;
  const totalBannedContacts = Object.values(waContacts).filter((c) => c.isPermanentlyDisabled).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col transition-colors">
          {/* Header Drawer */}
          <div className="p-4 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Pusat Notifikasi &amp; Alert H+3
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {activeDrawerTab === 'NOTIFICATIONS' && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  title="Tandai semua dibaca"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Baca Semua</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Selector: Notifikasi vs Pengaturan WhatsApp */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950 p-1.5 gap-1.5 text-xs">
            <button
              onClick={() => setActiveDrawerTab('NOTIFICATIONS')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeDrawerTab === 'NOTIFICATIONS'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Notifikasi &amp; Alert</span>
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-bold">
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveDrawerTab('WA_SETTINGS')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeDrawerTab === 'WA_SETTINGS'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>Pengaturan WhatsApp</span>
              {totalBannedContacts > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-900 text-rose-200 rounded-full text-[10px] font-bold">
                  {totalBannedContacts} Blokir
                </span>
              )}
            </button>
          </div>

          {sentFeedback && (
            <div className="m-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg font-medium">
              {sentFeedback}
            </div>
          )}

          {/* TAB 1: NOTIFIKASI & ALERT H+3 */}
          {activeDrawerTab === 'NOTIFICATIONS' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Urgent H+3 Overview Section */}
              {h3Items.length > 0 && (
                <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-rose-800 dark:text-rose-300 font-bold">
                    <span>🚨 {h3Items.length} SPP Melewati H+3 Tanpa PO</span>
                    <span className="text-[10px] font-normal font-mono text-rose-600 dark:text-rose-400">Tindakan Diperlukan</span>
                  </div>
                  <div className="space-y-1.5">
                    {h3Items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-rose-200 dark:border-rose-900/60 text-xs flex items-center justify-between shadow-2xs"
                      >
                        <div>
                          <div className="font-mono font-semibold text-slate-900 dark:text-white">{item.sppNumber}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            PIC: {item.pic} · {item.processDays} hari kerja
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {waContacts[item.pic]?.isPermanentlyDisabled ? (
                            <button
                              onClick={() => {
                                setSelectedItemForAlert(item);
                                setAlertChannel('WHATSAPP');
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="WhatsApp Dinonaktifkan Permanen untuk PIC ini (Klik untuk melihat/pulihkan)"
                            >
                              <Ban className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedItemForAlert(item);
                                setAlertChannel('WHATSAPP');
                              }}
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Kirim pesan WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedItemForAlert(item);
                              setAlertChannel('EMAIL');
                            }}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Kirim Notifikasi Email Resmi"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Banner Pintasan Pengaturan WA */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Kontak WhatsApp PIC</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {totalConfiguredPhones} nomor aktif · {totalBannedContacts} diblokir permanen
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveDrawerTab('WA_SETTINGS')}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Pengaturan WA</span>
                </button>
              </div>

              {/* List of general notifications */}
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-2 font-mono">
                Log Notifikasi Real-time
              </div>

              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs space-y-2">
                  <p>Tidak ada notifikasi aktif saat ini. Seluruh alur proses dalam status aman.</p>
                  <p className="text-[11px] text-slate-400">
                    Anda dapat beralih ke tab <strong>"Pengaturan WhatsApp"</strong> di atas untuk mengatur nomor kontak atau menonaktifkan pengiriman pesan secara permanen.
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const isUrgent = n.severity === 'urgent';
                  return (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border text-xs transition-colors shadow-2xs ${
                        n.read
                          ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          : isUrgent
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-slate-900 dark:text-white font-medium'
                          : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-slate-900 dark:text-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-slate-900 dark:text-white">{n.title}</div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap">
                          {new Date(n.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-1 leading-relaxed">
                        {n.message}
                      </p>
                      {n.sppNumber && (
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>No: {n.sppNumber}</span>
                          {n.picTarget && <span>PIC: {n.picTarget}</span>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: PENGATURAN WHATSAPP & PEMBERHENTIAN/BLOKIR PERMANEN */}
          {activeDrawerTab === 'WA_SETTINGS' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {/* Petunjuk & Kebijakan Opsional */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-1 text-xs text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Pengaturan Kontak WhatsApp PIC</span>
                </div>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                  Pilih PIC pada <strong>drop down list</strong> di bawah untuk memasukkan nomor (opsional/tidak wajib), menghapus nomor, atau memblokir pengiriman WA secara permanen.
                </p>
              </div>

              {/* DROPDOWN SELECTOR KONTAK PIC */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                      <span>Pilih Kontak PIC (Drop Down List):</span>
                    </span>
                    <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 font-mono">
                      {allMasterPics.length} PIC Terdaftar
                    </span>
                  </label>
                  <select
                    value={quickPicSelect}
                    onChange={(e) => setQuickPicSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                  >
                    {allMasterPics.map((pic) => {
                      const c = waContacts[pic];
                      const isBanned = c?.isPermanentlyDisabled;
                      const hasPhone = c?.phone && c.phone.trim() !== '';
                      const statusLabel = isBanned 
                        ? ' [🚫 WA Dinonaktifkan Permanen]' 
                        : hasPhone 
                        ? ` [✓ ${c.phone}]` 
                        : ' [○ Tanpa Nomor / Opsional]';

                      return (
                        <option key={pic} value={pic}>
                          {pic} ({PIC_AREA_MAP[pic] || 'SJA'}){statusLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* KARTU KELOLA KONTAK TERPILIH (SATU KARTU RAPI, TIDAK MEMANJANG) */}
                {(() => {
                  const selectedContact = waContacts[quickPicSelect] || { phone: '', isPermanentlyDisabled: false };
                  const isBanned = selectedContact.isPermanentlyDisabled;
                  const hasPhone = selectedContact.phone && selectedContact.phone.trim() !== '';
                  const rawNum = selectedContact.phone.replace(/\D/g, '');
                  const formattedWa = rawNum.startsWith('0') ? '62' + rawNum.slice(1) : rawNum.startsWith('62') ? rawNum : rawNum ? '62' + rawNum : '';

                  return (
                    <div className={`p-3.5 rounded-xl border text-xs space-y-3 transition-colors ${
                      isBanned 
                        ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                        : hasPhone 
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}>
                      {/* Baris Informasi PIC */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{quickPicSelect}</span>
                            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 font-mono">
                              ({PIC_AREA_MAP[quickPicSelect] || 'Procurement Area'})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Status Pengiriman: {isBanned ? 'Dinonaktifkan Permanen' : hasPhone ? 'Nomor Terdaftar' : 'Manual / Belum Ada Nomor'}
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isBanned
                            ? 'bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-200'
                            : hasPhone
                            ? 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {isBanned ? '🚫 Diblokir Permanen' : hasPhone ? '🟢 Siap Kirim' : '⚪ Opsional (Kosong)'}
                        </span>
                      </div>

                      {/* Jika Diblokir Permanen */}
                      {isBanned ? (
                        <div className="space-y-2.5">
                          <div className="p-2.5 bg-rose-100/70 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-200 text-xs">
                            <div className="flex items-center gap-1.5 font-bold mb-1">
                              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              <span>PENGIRIMAN WA DINONAKTIFKAN SECARA PERMANEN</span>
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              Akun WhatsApp untuk PIC <strong>{quickPicSelect}</strong> telah dimatikan secara permanen. Sistem tidak akan mengirimkan notifikasi WA lagi ke kontak ini.
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleRestoreWA(quickPicSelect)}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Pulihkan Izin WhatsApp untuk {quickPicSelect}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Jika Masih Aktif / Belum Diblokir */
                        <div className="space-y-2.5">
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                              <span>Nomor WhatsApp Tujuan:</span>
                              <span className="text-[10px] text-slate-400 italic">Tidak wajib diisi (opsional)</span>
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                type="tel"
                                value={selectedContact.phone}
                                onChange={(e) => handleUpdatePhone(quickPicSelect, e.target.value)}
                                placeholder="Contoh: 081234567890 (Boleh dikosongkan)"
                                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                              />
                              {hasPhone && (
                                <button
                                  type="button"
                                  onClick={() => handleDeletePhone(quickPicSelect)}
                                  className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-center gap-1 transition-colors cursor-pointer text-xs font-medium"
                                  title="Hapus nomor WhatsApp ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Hapus</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Tombol Aksi Kontrol */}
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handlePermanentDisableWA(quickPicSelect)}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 hover:border-rose-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Nonaktifkan dan blokir pengiriman pesan WA secara permanen untuk PIC ini"
                            >
                              <Ban className="w-3.5 h-3.5 text-rose-500" />
                              <span>Nonaktifkan WA Permanen</span>
                            </button>

                            {hasPhone && (
                              <a
                                href={`https://wa.me/${formattedWa}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                                title="Tes buka obrolan WhatsApp"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Tes Buka Chat</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Ringkasan Status Direktori Kontak */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Total: {allMasterPics.length} PIC</span>
                  <span>• {totalConfiguredPhones} Nomor Terisi</span>
                  <span>• {totalBannedContacts} Dinonaktifkan</span>
                </div>
              </div>
            </div>
          )}

          {/* Dialog Dispatch Alert Simulator jika ada item yang dipilih dari daftar H+3 */}
          {selectedItemForAlert && activeDrawerTab === 'NOTIFICATIONS' && (
            <div className="p-4 bg-slate-900 dark:bg-slate-950 text-white border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {alertChannel === 'EMAIL' ? 'Kirim Peringatan Email Resmi' : 'Kirim Pengingat Pesan WhatsApp'}
                </span>
                <button
                  onClick={() => setSelectedItemForAlert(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {alertChannel === 'EMAIL' ? (
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-800/80 p-2.5 rounded-lg font-mono text-[11px] space-y-1 border border-slate-700">
                    <div><span className="text-slate-400">To:</span> {selectedItemForAlert.pic.toLowerCase().replace(' ', '.')}@procurement.co.id</div>
                    <div><span className="text-slate-400">Subject:</span> [PERINGATAN H+3] SPP Belum Terbit PO: {selectedItemForAlert.sppNumber}</div>
                    <div className="text-slate-300 pt-1 border-t border-slate-700">
                      Telah melampaui {selectedItemForAlert.processDays} hari kerja sejak terima tanggal budget.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleSimulateSendEmail(selectedItemForAlert);
                      setSelectedItemForAlert(null);
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Kirim Email Notifikasi Otomatis</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs">
                  {/* Konfigurasi Nomor WhatsApp PIC (Tidak Wajib Isi & Kontrol Blokir Permanen) */}
                  <div className="p-2.5 bg-slate-800/90 rounded-lg border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-semibold text-slate-200">
                          Kontak WA: <strong>{activePic}</strong>
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        currentContact.isPermanentlyDisabled
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : cleanPhone
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {currentContact.isPermanentlyDisabled 
                          ? '🚫 WA Dinonaktifkan Permanen' 
                          : cleanPhone 
                          ? '✓ Nomor Tersimpan' 
                          : 'Opsional (Boleh Kosong)'}
                      </span>
                    </div>

                    {/* Input Nomor Telepon (Tidak Wajib Isi) */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>Nomor WhatsApp Tujuan:</span>
                        <span className="text-[10px] text-slate-400 italic">Tidak wajib diisi</span>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="tel"
                          disabled={currentContact.isPermanentlyDisabled}
                          value={currentContact.phone}
                          onChange={(e) => handleUpdatePhone(activePic, e.target.value)}
                          placeholder="Contoh: 081234567890 (Boleh Dikosongkan)"
                          className={`flex-1 px-2.5 py-1.5 bg-slate-900 border rounded font-mono text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 ${
                            currentContact.isPermanentlyDisabled ? 'opacity-40 cursor-not-allowed border-slate-800' : 'border-slate-700'
                          }`}
                        />
                        {currentContact.phone && !currentContact.isPermanentlyDisabled && (
                          <button
                            type="button"
                            onClick={() => handleDeletePhone(activePic)}
                            className="px-2 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                            title="Hapus nomor WhatsApp ini"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span className="hidden sm:inline">Hapus</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tombol Kontrol: Nonaktifkan WA Permanen / Pulihkan Akses */}
                    <div className="pt-1 flex items-center justify-between border-t border-slate-700/60 text-[11px]">
                      {currentContact.isPermanentlyDisabled ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-rose-300 text-[10px]">
                            Pengiriman WA diblokir permanen
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRestoreWA(activePic)}
                            className="px-2 py-1 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded flex items-center gap-1 transition-colors cursor-pointer text-[10px] font-semibold"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Pulihkan Akses WA</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-slate-400 text-[10px]">
                            Cegah pengiriman WA ke PIC ini:
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePermanentDisableWA(activePic)}
                            className="px-2 py-1 bg-slate-900 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800 rounded flex items-center gap-1 transition-colors cursor-pointer text-[10px]"
                            title="Nonaktifkan dan blokir pengiriman pesan WA secara permanen untuk PIC ini"
                          >
                            <Ban className="w-3 h-3 text-rose-400" />
                            <span>Nonaktifkan WA Permanen</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Jika WA Dinonaktifkan Permanen: Tampilkan Banner Pemblokiran */}
                  {currentContact.isPermanentlyDisabled ? (
                    <div className="p-3 bg-rose-950/50 border border-rose-900/80 rounded-lg text-rose-200 text-xs space-y-1.5 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold text-rose-300">
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>PENGIRIMAN WA DINONAKTIFKAN SECARA PERMANEN</span>
                      </div>
                      <p className="text-[11px] text-rose-300/80 leading-relaxed">
                        Akun WhatsApp untuk PIC <strong>{activePic}</strong> telah dinonaktifkan secara permanen. Sistem tidak akan mengirimkan pesan WhatsApp lagi ke kontak ini demi menjaga privasi dan kebijakan pengadaan.
                      </p>
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 bg-slate-800/90 border border-slate-700 text-slate-400 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60 mt-2"
                      >
                        <Ban className="w-3.5 h-3.5 text-rose-400" />
                        <span>Pengiriman WA Terkunci Permanen</span>
                      </button>
                    </div>
                  ) : (
                    /* Jika Masih Aktif: Tampilkan Teks Pesan dan Tombol Kirim */
                    <>
                      <div className="bg-slate-800/80 p-2.5 rounded-lg text-[11px] whitespace-pre-line font-mono text-emerald-300 max-h-28 overflow-y-auto border border-slate-700">
                        {generateWaMessage(selectedItemForAlert)}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopyWa(selectedItemForAlert)}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                        >
                          {copiedMsg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedMsg ? 'Tersalin!' : 'Salin Pesan'}</span>
                        </button>
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>
                            {cleanPhone ? `Kirim ke WA (${cleanPhone})` : 'Buka WhatsApp'}
                          </span>
                        </a>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer Drawer */}
          <div className="p-3 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              {activeDrawerTab === 'NOTIFICATIONS' 
                ? 'Engine Notifikasi Otomatis H+3' 
                : `${totalConfiguredPhones} Nomor Terdaftar · ${totalBannedContacts} Diblokir Permanen`}
            </span>
            {activeDrawerTab === 'NOTIFICATIONS' && (
              <button
                onClick={onClearNotifications}
                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-medium transition-colors cursor-pointer"
              >
                Hapus Riwayat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

