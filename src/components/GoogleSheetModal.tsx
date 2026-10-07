import React, { useState, useEffect } from 'react';
import { GoogleSheetConfig, AreaSheetConfigMap, SJAArea, UserProfile } from '../types';
import { 
  testGoogleSheetConnection,
  AREA_CONFIG_SPECS,
  generateGoogleAppsScriptCode
} from '../utils/googleSheetsConnector';
import { OFFICIAL_4_PLANTS_CONFIGS } from '../utils/cloudSync';
import { 
  Database, 
  UploadCloud, 
  DownloadCloud, 
  ShieldCheck, 
  AlertCircle,
  Building,
  Globe,
  Radio,
  CheckCircle2,
  Zap,
  FileSpreadsheet,
  ExternalLink,
  Copy,
  Check,
  FileCode2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Cloud,
  Server
} from 'lucide-react';

interface GoogleSheetModalProps {
  currentUser: UserProfile;
  areaConfigs: AreaSheetConfigMap;
  onUpdateAreaConfig: (area: SJAArea, newConfig: Partial<GoogleSheetConfig>) => void | Promise<void>;
  onPullFromSheet: (area: SJAArea) => Promise<any>;
  onPushToSheet: (area: SJAArea) => Promise<void>;
  itemsByAreaCount: Record<SJAArea, number>;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  currentUser,
  areaConfigs,
  onUpdateAreaConfig,
  onPullFromSheet,
  onPushToSheet,
  itemsByAreaCount,
}) => {
  const isSuperadmin = currentUser.role === 'SUPERADMIN' || currentUser.username?.toLowerCase() === 'superadmin';
  const defaultArea: SJAArea = isSuperadmin ? 'SEPANJANG' : (currentUser.area as SJAArea);
  const [selectedArea, setSelectedArea] = useState<SJAArea>(defaultArea);

  // Sync selected area with current user if not superadmin
  useEffect(() => {
    if (!isSuperadmin && currentUser.area && currentUser.area !== 'ALL') {
      setSelectedArea(currentUser.area as SJAArea);
    }
  }, [currentUser, isSuperadmin]);

  const defaultAreaConfig = OFFICIAL_4_PLANTS_CONFIGS[selectedArea];
  const userAreaConfig = areaConfigs[selectedArea];
  const currentConfig: GoogleSheetConfig = {
    ...defaultAreaConfig,
    ...userAreaConfig,
    webAppUrl: userAreaConfig?.webAppUrl?.trim() || defaultAreaConfig?.webAppUrl || '',
    spreadsheetUrl: userAreaConfig?.spreadsheetUrl?.trim() || defaultAreaConfig?.spreadsheetUrl || '',
    sheetName: userAreaConfig?.sheetName?.trim() || defaultAreaConfig?.sheetName || `SPP_${selectedArea}`,
    autoSync: true,
    syncStatus: userAreaConfig?.syncStatus || 'connected',
  };

  const [urlInput, setUrlInput] = useState(currentConfig.webAppUrl || '');
  const [spreadsheetUrlInput, setSpreadsheetUrlInput] = useState(currentConfig.spreadsheetUrl || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showScriptViewer, setShowScriptViewer] = useState(false);

  // Update input text when active area changes
  useEffect(() => {
    const def = OFFICIAL_4_PLANTS_CONFIGS[selectedArea];
    const usr = areaConfigs[selectedArea];
    setUrlInput(usr?.webAppUrl?.trim() || def?.webAppUrl || '');
    setSpreadsheetUrlInput(usr?.spreadsheetUrl?.trim() || def?.spreadsheetUrl || '');
    setFeedbackMsg(null);
    setIsCopied(false);
  }, [selectedArea, areaConfigs]);

  const currentSpec = AREA_CONFIG_SPECS[selectedArea];
  const appsScriptCode = generateGoogleAppsScriptCode(selectedArea);

  const handleCopyScript = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(appsScriptCode);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = appsScriptCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setFeedbackMsg({
        type: 'success',
        text: `Kode Google Apps Script untuk cabang ${currentSpec.name} berhasil disalin ke clipboard!`,
      });
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      setFeedbackMsg({
        type: 'error',
        text: 'Gagal menyalin otomatis. Silakan buka kotak kode dan salin teks secara manual.',
      });
    }
  };

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    setIsProcessing(true);
    try {
      await onUpdateAreaConfig(selectedArea, {
        webAppUrl: cleanUrl,
        syncStatus: cleanUrl ? 'connected' : 'idle',
        lastSyncTime: new Date().toISOString(),
      });
      setFeedbackMsg({
        type: 'success',
        text: `✓ Web App URL untuk cabang ${currentSpec.name} (User: ${currentSpec.username}) berhasil disimpan permanen ke Cloud Server. Data tidak hilang di PC lain!`,
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: `Gagal menyimpan URL ke cloud server: ${err.message || 'Koneksi terganggu'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSpreadsheetUrl = async () => {
    const clean = spreadsheetUrlInput.trim();
    setIsProcessing(true);
    try {
      await onUpdateAreaConfig(selectedArea, { spreadsheetUrl: clean });
      setFeedbackMsg({
        type: 'success',
        text: `✓ Tautan Dokumen Google Spreadsheet untuk ${currentSpec.name} berhasil disimpan permanen ke Cloud Server. Tersedia otomatis di seluruh PC/Browser!`,
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: `Gagal menyimpan tautan ke cloud server: ${err.message || 'Koneksi terganggu'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleAutoSync = () => {
    const nextVal = !currentConfig.autoSync;
    onUpdateAreaConfig(selectedArea, {
      autoSync: nextVal,
    });
    setFeedbackMsg({
      type: 'info',
      text: nextVal
        ? `Sinkronisasi otomatis saat login diaktifkan untuk ${currentSpec.name}.`
        : `Sinkronisasi otomatis saat login dinonaktifkan untuk ${currentSpec.name}.`,
    });
  };

  // Test Ping Google Apps Script
  const handleTestConnection = async () => {
    if (!urlInput.trim()) {
      setFeedbackMsg({
        type: 'error',
        text: 'Silakan masukkan Web App URL Google Apps Script terlebih dahulu.',
      });
      return;
    }

    setIsTestingPing(true);
    setFeedbackMsg(null);
    try {
      const pingResult = await testGoogleSheetConnection(urlInput.trim());
      setFeedbackMsg({
        type: 'success',
        text: `Koneksi Berhasil! Terhubung ke Google Sheet ${pingResult.branch || currentSpec.name} (Akun: ${pingResult.username || currentSpec.username}).`,
      });
      onUpdateAreaConfig(selectedArea, {
        webAppUrl: urlInput.trim(),
        syncStatus: 'connected',
        lastSyncTime: new Date().toISOString(),
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: `Tes Koneksi Gagal: ${err.message}. Pastikan saat Deploy di Apps Script, pilihan 'Who has access' diset ke 'Anyone'.`,
      });
    } finally {
      setIsTestingPing(false);
    }
  };

  const handlePull = async () => {
    setIsProcessing(true);
    setFeedbackMsg(null);
    try {
      const res: any = await onPullFromSheet(selectedArea);
      let textMsg = `Berhasil menyinkronkan data Google Sheets terbaru untuk cabang ${currentSpec.name}.`;
      if (res && typeof res === 'object') {
        textMsg = `✓ Sinkronisasi 2 arah berhasil: ${res.totalInSheet ?? 0} data SPP untuk ${currentSpec.name} aktif diselaraskan (${res.addedCount ?? 0} baru, ${res.updatedCount ?? 0} diperbarui).`;
        if (res.deletedCount && res.deletedCount > 0) {
          textMsg += ` ${res.deletedCount} data yang dihapus di Google Sheet telah berhasil dihapus dari aplikasi.`;
        }
      }
      setFeedbackMsg({
        type: 'success',
        text: textMsg,
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || `Gagal membaca data dari Google Sheets untuk ${currentSpec.name}.`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePush = async () => {
    setIsProcessing(true);
    setFeedbackMsg(null);
    try {
      await onPushToSheet(selectedArea);
      const count = itemsByAreaCount[selectedArea] || 0;
      setFeedbackMsg({
        type: 'success',
        text: `Berhasil mengirim ${count} data SPP ${currentSpec.name} ke Google Sheets.`,
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || `Gagal mengirim data ke Google Sheets untuk ${currentSpec.name}.`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const allAreas: SJAArea[] = ['SEPANJANG', 'KARAWANG', 'SUKODONO', 'SEMARANG'];

  return (
    <div className="space-y-6">
      {/* Header Modal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <span>Integrasi Google Sheets Per Area</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSuperadmin
              ? 'Superadmin dapat mengelola URL Google Sheet untuk seluruh 4 cabang (Sepanjang, Karawang, Sukodono, Semarang).'
              : `Terhubung otomatis ke Google Sheet khusus ${currentSpec.name} sesuai username login (${currentUser.username}).`}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Status ({currentSpec.name}):</span>
          {currentConfig.webAppUrl ? (
            <span className="font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Terkoneksi</span>
            </span>
          ) : (
            <span className="font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              Menunggu URL
            </span>
          )}
        </div>
      </div>

      {/* Cloud Persistence Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-xl border border-emerald-500/30 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
            <Cloud className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-300">Penyimpanan Cloud Server Aktif</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                Multi-PC &amp; Multi-Browser
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Data URL Dokumen Spreadsheet &amp; Web App URL tersimpan permanen di cloud server. Saat link dibagikan dan dicoba ke PC atau browser lain, data kedua link tetap ada dan tidak hilang.
            </p>
          </div>
        </div>
      </div>

      {/* Area Selector Dropdown List (Khusus Superadmin) */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              {isSuperadmin
                ? 'Pilih Cabang untuk Dikonfigurasi (Dropdown List Superadmin):'
                : 'Cabang Anda Saat Ini:'}
            </span>
          </label>
          <span className="text-[10px] text-slate-500 font-mono">
            {isSuperadmin ? 'Superadmin Mode · Bebas Beralih 4 Cabang' : `Login: ${currentUser.name}`}
          </span>
        </div>

        {isSuperadmin ? (
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value as SJAArea)}
              className="w-full sm:flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-emerald-400 dark:border-emerald-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
            >
              {allAreas.map((areaKey) => {
                const spec = AREA_CONFIG_SPECS[areaKey];
                const areaConfig = areaConfigs[areaKey];
                const hasWebApp = !!areaConfig?.webAppUrl?.trim();
                const hasSpreadsheet = !!areaConfig?.spreadsheetUrl?.trim();
                const count = (hasWebApp ? 1 : 0) + (hasSpreadsheet ? 1 : 0);
                const tag =
                  areaKey === 'SEPANJANG' ? 'Lampiran 1' :
                  areaKey === 'KARAWANG' ? 'Lampiran 2' :
                  areaKey === 'SUKODONO' ? 'Lampiran 3' : 'Lampiran 4';
                const statusText = count === 2 ? '✅ 2 Link Tersimpan' : count === 1 ? '⚠️ 1 Link' : 'Belum Ada Link';

                return (
                  <option key={areaKey} value={areaKey}>
                    🏢 {spec.name} ({tag}) — User: {spec.username} [{statusText}]
                  </option>
                );
              })}
            </select>

            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
              <span className="text-xs font-bold px-3 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-mono">
                {selectedArea === 'SEPANJANG' ? 'Lampiran 1' :
                 selectedArea === 'KARAWANG' ? 'Lampiran 2' :
                 selectedArea === 'SUKODONO' ? 'Lampiran 3' : 'Lampiran 4'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                User: <strong className="text-slate-700 dark:text-slate-300">{AREA_CONFIG_SPECS[selectedArea]?.username}</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900 text-xs">
            <span className="font-bold text-blue-900 dark:text-blue-300">
              🏢 {currentSpec.name} ({selectedArea === 'SEPANJANG' ? 'Lampiran 1' : selectedArea === 'KARAWANG' ? 'Lampiran 2' : selectedArea === 'SUKODONO' ? 'Lampiran 3' : 'Lampiran 4'})
            </span>
            <span className="text-blue-700 dark:text-blue-400 font-mono font-semibold">
              Username: {currentSpec.username}
            </span>
          </div>
        )}
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : feedbackMsg.type === 'info'
              ? 'bg-blue-50 text-blue-800 border border-blue-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : feedbackMsg.type === 'info' ? (
            <Zap className="w-4 h-4 text-blue-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Card Akses Langsung Buka Dokumen Google Spreadsheet */}
      <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-800/60 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-emerald-950 dark:text-emerald-300 uppercase tracking-wider font-mono">
                  Akses Langsung Dokumen Spreadsheet · {currentSpec.name}
                </h3>
                {currentConfig.spreadsheetUrl && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded">
                    <Cloud className="w-3 h-3" />
                    <span>Cloud Sync</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Buka atau simpan link Google Sheet untuk cabang ini
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={currentConfig.spreadsheetUrl?.trim() || 'https://docs.google.com/spreadsheets/'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer no-underline"
            >
              <span>Buka G Sheet {currentSpec.name.split(' ')[1]}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {selectedArea === 'SUKODONO' && (!spreadsheetUrlInput || spreadsheetUrlInput.includes('1a2xdnsX1QlKIyifygmMZnX0VkKnf-dXyX-iCb6XnHtM')) && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-[11px] block">Tautan Bawaan Sukodono Tidak Ditemukan di Google Drive (404)</span>
              <span className="text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed block">
                File spreadsheet bawaan Sukodono ini telah dipindahkan atau dihapus di Google Drive. Silakan salin URL Google Sheet Sukodono yang sedang Anda gunakan, lalu tempelkan di kotak di bawah ini dan klik &quot;Simpan Tautan&quot;.
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-semibold text-emerald-900 dark:text-emerald-300 mb-1">
            URL / Tautan Dokumen Google Spreadsheet:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={spreadsheetUrlInput}
              onChange={(e) => setSpreadsheetUrlInput(e.target.value)}
              placeholder={`https://docs.google.com/spreadsheets/d/... (Link Google Sheet ${currentSpec.name})`}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleSaveSpreadsheetUrl}
              disabled={isProcessing}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Simpan Tautan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card Panduan & Tombol Salin Kode Apps Script (Hanya Tampil untuk Superadmin) */}
      {isSuperadmin && (
        <div className="p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-xl border border-indigo-800/60 shadow-lg text-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/50 pb-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 shrink-0">
                <FileCode2 className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span>Kode Google Apps Script (Code.gs)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                      {currentSpec.name} ({currentSpec.code})
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  Salin kode ini dan tempelkan ke menu <strong>Extensions &gt; Apps Script</strong> pada spreadsheet Google Sheet cabang Anda.
                </p>
              </div>
            </div>

            {/* Tombol Utama: Salin Kode Apps Script */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleCopyScript}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500 ring-2 ring-emerald-400/50'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/25 ring-1 ring-indigo-400/50'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Kode Berhasil Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-200" />
                    <span>Salin Kode Apps Script</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowScriptViewer((prev) => !prev)}
                className="px-3 py-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Lihat / Sembunyikan kode lengkap"
              >
                <span>{showScriptViewer ? 'Tutup Kode' : 'Lihat Kode'}</span>
                {showScriptViewer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 4 Langkah Pemasangan Singkat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-[11px]">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Buka Google Sheet</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Klik <strong>Extensions</strong> &gt; <strong>Apps Script</strong> di lembar Google Sheet cabang {currentSpec.name}.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-[11px]">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                <span>Tempelkan Kode</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Hapus isi file <code>Code.gs</code>, lalu klik tombol <strong>Salin Kode Apps Script</strong> di atas dan <strong>Paste</strong>.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-[11px]">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                <span>Deploy Web App</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Klik <strong>Deploy</strong> &gt; <strong>New deployment</strong> (Web app). Set <em>Who has access</em> ke <strong>Anyone</strong>.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-[11px]">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">4</span>
                <span>Hubungkan URL</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Salin <strong>Web App URL</strong> (/exec), lalu simpan pada formulir di bawah ini dan klik <strong>Tes Koneksi</strong>.
              </p>
            </div>
          </div>

          {/* Collapsible Viewer Kode Script Lengkap */}
          {showScriptViewer && (
            <div className="space-y-2 pt-2 border-t border-indigo-800/40 animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-indigo-200">
                <span className="font-mono text-[11px]">File: Code.gs ({currentSpec.name})</span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer underline"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin teks ini</span>
                </button>
              </div>
              <div className="relative">
                <pre className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-80 overflow-y-auto leading-relaxed selection:bg-indigo-600 selection:text-white">
                  <code>{appsScriptCode}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Konfigurasi Web App URL Area */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Web App URL Google Sheets · {currentSpec.name}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Username terhubung: <span className="font-mono font-bold text-slate-800">{currentSpec.username}</span> · Tab: <span className="font-mono font-semibold text-slate-700">{currentSpec.defaultSheetName}</span>
            </p>
          </div>

          {/* Toggle Auto Sync saat Login */}
          <label className="flex items-center gap-2 cursor-pointer text-xs select-none bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={currentConfig.autoSync ?? true}
              onChange={handleToggleAutoSync}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="font-medium text-slate-700">Tarik data otomatis saat login</span>
          </label>
        </div>

        <form onSubmit={handleSaveUrl} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Deployment Web App URL (akhiran /exec) untuk {currentSpec.name}:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={`https://script.google.com/macros/s/AKfycb.../exec (Google Sheet ${currentSpec.name})`}
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Cloud className="w-3.5 h-3.5 text-blue-400" />
                  <span>Simpan URL</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingPing || !urlInput.trim()}
                  className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs shadow-xs transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                >
                  <Radio className={`w-3.5 h-3.5 ${isTestingPing ? 'animate-pulse text-blue-600' : ''}`} />
                  <span>{isTestingPing ? 'Menguji...' : 'Tes Koneksi'}</span>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              *Setiap user cabang saat login dengan akunnya (<span className="font-mono font-semibold">{currentSpec.username}</span>) akan langsung membaca dan menulis ke Google Sheet ini.
            </p>
          </div>
        </form>

        {/* Sync Actions Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePull}
              disabled={isProcessing || !currentConfig.webAppUrl}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
              title="Tarik data terbaru dari Google Sheet dan hapus data di aplikasi jika baris di Google Sheet telah dihapus"
            >
              <DownloadCloud className={`w-3.5 h-3.5 ${isProcessing ? 'animate-bounce text-blue-600' : 'text-slate-600'}`} />
              <span>Sinkron 2 Arah: Tarik Data &amp; Hapus yang Terhapus ({currentSpec.name})</span>
            </button>

            <button
              type="button"
              onClick={handlePush}
              disabled={isProcessing || !currentConfig.webAppUrl}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isProcessing ? 'animate-pulse' : ''}`} />
              <span>Kirim {itemsByAreaCount[selectedArea] || 0} Data ke Sheet ({currentSpec.name})</span>
            </button>
          </div>

          {currentConfig.lastSyncTime && (
            <span className="text-[10px] font-mono text-slate-400">
              Sinkronisasi: {new Date(currentConfig.lastSyncTime).toLocaleTimeString('id-ID')}
            </span>
          )}
        </div>

        {/* Info Box Komunikasi 2 Arah */}
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg border border-blue-200/80 dark:border-blue-900/60 text-[11px] text-blue-900 dark:text-blue-300 flex items-start gap-2">
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-bold block">Sistem Komunikasi 2 Arah Google Sheet Aktif:</span>
            <span>
              1. <strong>Input &amp; Update di Google Sheet:</strong> Saat Anda menambah atau mengubah data di Google Sheet, klik tombol <em>&quot;Sinkron 2 Arah&quot;</em> atau tombol refresh lonceng/header untuk memuat data terbaru ke aplikasi.<br />
              2. <strong>Hapus di Google Sheet:</strong> Apabila baris data di Google Sheet dihapus dan Anda melakukan sinkronisasi/refresh di aplikasi, data di aplikasi juga <strong>otomatis ikut terhapus secara permanen</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* Ringkasan Status Cloud Multi-Cabang (Sepanjang, Karawang, Sukodono, Semarang) */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Status Penyimpanan Cloud 4 Cabang SJA
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Penyimpanan kedua link berlaku sama untuk Sepanjang, Karawang, Sukodono, dan Semarang (Multi-PC Sync)
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            <Cloud className="w-3 h-3 text-blue-600" />
            <span>Terhubung ke Cloud Backend</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/40">
                <th className="py-2 px-3">Cabang &amp; Akun</th>
                <th className="py-2 px-3">Tautan Dokumen Spreadsheet</th>
                <th className="py-2 px-3">Web App URL Google Apps Script</th>
                <th className="py-2 px-3 text-center">Status Cloud</th>
                <th className="py-2 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-[11px]">
              {allAreas.map((areaKey) => {
                const spec = AREA_CONFIG_SPECS[areaKey];
                const def = OFFICIAL_4_PLANTS_CONFIGS[areaKey];
                const usr = areaConfigs[areaKey];
                const cfg: GoogleSheetConfig = {
                  ...def,
                  ...usr,
                  webAppUrl: usr?.webAppUrl?.trim() || def?.webAppUrl || '',
                  spreadsheetUrl: usr?.spreadsheetUrl?.trim() || def?.spreadsheetUrl || '',
                };
                const hasSheet = !!cfg.spreadsheetUrl?.trim();
                const hasWeb = !!cfg.webAppUrl?.trim();
                const isCurrent = selectedArea === areaKey;

                return (
                  <tr
                    key={areaKey}
                    className={`transition-colors ${
                      isCurrent
                        ? 'bg-blue-50/50 dark:bg-blue-950/20'
                        : 'hover:bg-slate-100/40 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{spec.name}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-mono font-medium">
                            Aktif
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        User: <strong className="text-slate-700 dark:text-slate-300">{spec.username}</strong>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 max-w-[200px]">
                      {hasSheet ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate" title={cfg.spreadsheetUrl}>
                            {cfg.spreadsheetUrl}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Belum diinput</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 max-w-[220px]">
                      {hasWeb ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate" title={cfg.webAppUrl}>
                            {cfg.webAppUrl}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Belum diinput</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {hasSheet && hasWeb ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Lengkap &amp; Tersimpan
                        </span>
                      ) : hasSheet || hasWeb ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          1 Link Tersimpan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-500 bg-slate-200/60 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                          Menunggu Input
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isSuperadmin && !isCurrent && (
                          <button
                            type="button"
                            onClick={() => setSelectedArea(areaKey)}
                            className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-[10px] font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                          >
                            Kelola
                          </button>
                        )}
                        {hasSheet && (
                          <a
                            href={cfg.spreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded transition-colors"
                            title={`Buka Dokumen Spreadsheet ${spec.name}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
