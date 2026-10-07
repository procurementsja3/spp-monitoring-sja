import React, { useState } from 'react';
import { getMasterPromptText, generateStandaloneGitHubHtml } from '../utils/promptGenerator';
import { Sparkles, Copy, Check, Download, Github, Code, ExternalLink, X } from 'lucide-react';

interface PromptGitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromptGitHubModal: React.FC<PromptGitHubModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'PROMPT' | 'GITHUB_HTML' | 'API_ERP'>('PROMPT');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const masterPrompt = getMasterPromptText();

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(masterPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  const handleDownloadStandaloneHtml = () => {
    const htmlContent = generateStandaloneGitHubHtml();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-4xl w-full p-6 my-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-indigo-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Master Prompt AI &amp; Paket Hosting GitHub Pages
              </h2>
              <p className="text-xs text-slate-500">
                Prompt terstruktur untuk AI generator, file standalone HTML mandiri, dan arsitektur integrasi ERP.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
          <button
            onClick={() => setActiveTab('PROMPT')}
            className={`flex-1 py-1.5 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'PROMPT'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Salin Prompt Master AI</span>
          </button>
          <button
            onClick={() => setActiveTab('GITHUB_HTML')}
            className={`flex-1 py-1.5 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'GITHUB_HTML'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>Unduh Standalone HTML (GitHub Pages)</span>
          </button>
          <button
            onClick={() => setActiveTab('API_ERP')}
            className={`flex-1 py-1.5 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'API_ERP'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Dokumentasi REST API &amp; ERP</span>
          </button>
        </div>

        {/* TAB 1: PROMPT MASTER */}
        {activeTab === 'PROMPT' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <p className="text-slate-600">
                Gunakan master prompt teruji di bawah ini untuk menghasilkan aplikasi serupa pada platform AI atau dokumen spesifikasi teknis software (SRS):
              </p>
              <button
                onClick={handleCopyPrompt}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPrompt ? 'Prompt Berhasil Disalin!' : 'Salin Seluruh Prompt'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap border border-slate-800">
              {masterPrompt}
            </pre>
          </div>
        )}

        {/* TAB 2: GITHUB PAGES STANDALONE HTML */}
        {activeTab === 'GITHUB_HTML' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Github className="w-4 h-4 text-slate-800" />
                    <span>Single-File HTML Siap Hosting di GitHub Pages</span>
                  </h3>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Unduh file <code>index.html</code> mandiri (Zero-Config, Tailwind CDN, Google Sheet API &amp; Formula Hari Kerja tertanam).
                  </p>
                </div>
                <button
                  onClick={handleDownloadStandaloneHtml}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File index.html</span>
                </button>
              </div>

              {downloadSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded font-medium flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>File <code>index.html</code> telah berhasil diunduh ke komputer Anda!</span>
                </div>
              )}
            </div>

            {/* Langkah Setup GitHub Pages */}
            <div className="p-4 bg-slate-900 text-slate-200 rounded-lg space-y-3">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                3 Langkah Praktis Menjalankan di GitHub Pages (Gratis Selamanya):
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-300 text-[11px] leading-relaxed">
                <li>
                  Buat repositori baru di GitHub Anda (misal: <code>spp-monitoring</code>).
                </li>
                <li>
                  Unggah file <code>index.html</code> yang baru saja Anda unduh ke root repositori tersebut.
                </li>
                <li>
                  Buka menu <strong>Settings &gt; Pages</strong> di repositori Anda, pada bagian <strong>Branch</strong> pilih <code>main</code> / <code>root</code>, lalu klik <strong>Save</strong>.
                </li>
              </ol>
              <p className="text-[11px] text-cyan-300 pt-1">
                Aplikasi Anda akan langsung online di: <code>https://username.github.io/spp-monitoring/</code>
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: API & ERP INTEGRATION */}
        {activeTab === 'API_ERP' && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Spesifikasi endpoint REST API untuk sinkronisasi otomatis dengan sistem ERP perusahaan (SAP, Oracle NetSuite, Accurate, atau Odoo):
            </p>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px]">GET</span>
                  <span>/api/v1/spp</span>
                </div>
                <div className="text-slate-500 font-sans text-xs mt-1">
                  Mengambil daftar seluruh SPP beserta kalkulasi hari kerja proses dan status SLA.
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-800 rounded text-[10px]">POST</span>
                  <span>/api/v1/spp</span>
                </div>
                <div className="text-slate-500 font-sans text-xs mt-1">
                  Menerima data pengajuan SPP baru dari modul Budget ERP perusahaan.
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px]">PATCH</span>
                  <span>/api/v1/spp/:sppNumber/po</span>
                </div>
                <div className="text-slate-500 font-sans text-xs mt-1">
                  Update nomor PO dan tanggal PO dari ERP, yang otomatis mengubah status menjadi CLOSE.
                </div>
              </div>
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
