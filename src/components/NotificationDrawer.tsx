import React, { useState } from 'react';
import { SystemNotification, SPPItem } from '../types';
import { Bell, Mail, MessageSquare, CheckCheck, X, ExternalLink, Copy, Check } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SystemNotification[];
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  items: SPPItem[];
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearNotifications,
  items,
}) => {
  const [selectedItemForAlert, setSelectedItemForAlert] = useState<SPPItem | null>(null);
  const [alertChannel, setAlertChannel] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [sentFeedback, setSentFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const h3Items = items.filter((i) => i.isHPlus3Overdue);

  // Generate pesan template instan WhatsApp
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col">
          {/* Header Drawer */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Pusat Notifikasi &amp; Alert H+3
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                title="Tandai semua dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Baca Semua</span>
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {sentFeedback && (
            <div className="m-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded font-medium">
              {sentFeedback}
            </div>
          )}

          {/* Body: Daftar Notifikasi */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Urgent H+3 Overview Section */}
            {h3Items.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs text-rose-800 font-bold">
                  <span>🚨 {h3Items.length} SPP Melewati H+3 Tanpa PO</span>
                  <span className="text-[10px] font-normal font-mono">Perlu Tindakan</span>
                </div>
                <div className="space-y-1.5">
                  {h3Items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 bg-white rounded border border-rose-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono font-bold text-slate-900">{item.sppNumber}</div>
                        <div className="text-[11px] text-slate-500">
                          PIC: {item.pic} · {item.processDays} hari kerja
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedItemForAlert(item);
                            setAlertChannel('WHATSAPP');
                          }}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Kirim pesan WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItemForAlert(item);
                            setAlertChannel('EMAIL');
                          }}
                          className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
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

            {/* List of general notifications */}
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-2">
              Log Notifikasi Real-time
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada notifikasi aktif saat ini. Seluruh alur proses dalam status aman.
              </div>
            ) : (
              notifications.map((n) => {
                const isUrgent = n.severity === 'urgent';
                return (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg border text-xs transition-colors ${
                      n.read
                        ? 'bg-slate-50 border-slate-200 text-slate-600'
                        : isUrgent
                        ? 'bg-rose-50/80 border-rose-300 text-slate-900 font-medium'
                        : 'bg-amber-50/70 border-amber-300 text-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-900">{n.title}</div>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {new Date(n.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    {n.sppNumber && (
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>No: {n.sppNumber}</span>
                        {n.picTarget && <span>PIC: {n.picTarget}</span>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Modal / Dialog Dispatch Alert Simulator jika ada item yang dipilih */}
          {selectedItemForAlert && (
            <div className="p-4 bg-slate-900 text-white border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {alertChannel === 'EMAIL' ? 'Kirim Peringatan Email Resmi' : 'Kirim Pengingat Pesan WhatsApp'}
                </span>
                <button
                  onClick={() => setSelectedItemForAlert(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {alertChannel === 'EMAIL' ? (
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-800 p-2.5 rounded font-mono text-[11px] space-y-1">
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
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded text-xs flex items-center justify-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Kirim Email Notifikasi Otomatis</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-800 p-2.5 rounded text-[11px] whitespace-pre-line font-mono text-emerald-300 max-h-32 overflow-y-auto">
                    {generateWaMessage(selectedItemForAlert)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyWa(selectedItemForAlert)}
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded text-xs flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      {copiedMsg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedMsg ? 'Tersalin!' : 'Salin Pesan WA'}</span>
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(generateWaMessage(selectedItemForAlert))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-xs flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka WhatsApp</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Drawer */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono text-[11px]">
              Engine Notifikasi Otomatis H+3
            </span>
            <button
              onClick={onClearNotifications}
              className="text-slate-400 hover:text-rose-600 text-xs font-medium"
            >
              Hapus Riwayat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
