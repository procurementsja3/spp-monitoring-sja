import React, { useState, useEffect, useMemo } from 'react';
import { GoogleSheetConfig, AreaSheetConfigMap, SJAArea, UserProfile, SPPItem } from '../types';
import { 
  testGoogleSheetConnection,
  AREA_CONFIG_SPECS,
  generateGoogleAppsScriptCode
} from '../utils/googleSheetsConnector';
import { OFFICIAL_4_PLANTS_CONFIGS, sanitizeSukodonoUrl } from '../utils/cloudSync';
import { exportToExcel } from '../utils/exportHelpers';
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
  Server,
  Eye,
  Search,
  RefreshCw,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

interface GoogleSheetModalProps {
  currentUser: UserProfile;
  areaConfigs: AreaSheetConfigMap;
  onUpdateAreaConfig: (area: SJAArea, newConfig: Partial<GoogleSheetConfig>) => void | Promise<void>;
  onPullFromSheet: (area: SJAArea) => Promise<any>;
  onPushToSheet: (area: SJAArea) => Promise<void>;
  itemsByAreaCount: Record<SJAArea, number>;
  items?: SPPItem[];
  onNavigateToTable?: (area: SJAArea) => void;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  currentUser,
  areaConfigs,
  onUpdateAreaConfig,
  onPullFromSheet,
  onPushToSheet,
  itemsByAreaCount,
  items = [],
  onNavigateToTable,
}) => {
  const isSuperadmin = currentUser.role === 'SUPERADMIN' || currentUser.username?.toLowerCase() === 'superadmin';
  const defaultArea: SJAArea = isSuperadmin ? 'SEPANJANG' : (currentUser.area as SJAArea);
  const [selectedArea, setSelectedArea] = useState<SJAArea>(defaultArea);
  const [activeView, setActiveView] = useState<'CONFIG' | 'DATA_VIEWER'>('CONFIG');

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
    spreadsheetUrl: selectedArea === 'SUKODONO'
      ? sanitizeSukodonoUrl(userAreaConfig?.spreadsheetUrl || defaultAreaConfig?.spreadsheetUrl)
      : (userAreaConfig?.spreadsheetUrl?.trim() || defaultAreaConfig?.spreadsheetUrl || ''),
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
  const [showSukodonoHelpModal, setShowSukodonoHelpModal] = useState(false);

  // Filter & Search untuk Data Viewer
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSE'>('ALL');
  const [slaFilter, setSlaFilter] = useState<'ALL' | 'ONTIME' | 'TERLAMBAT'>('ALL');
  const [picFilter, setPicFilter] = useState<string>('ALL');

  // Update input text when active area changes
  useEffect(() => {
    const def = OFFICIAL_4_PLANTS_CONFIGS[selectedArea];
    const usr = areaConfigs[selectedArea];
    setUrlInput(usr?.webAppUrl?.trim() || def?.webAppUrl || '');
    const cleanSpreadsheet = selectedArea === 'SUKODONO'
      ? sanitizeSukodonoUrl(usr?.spreadsheetUrl || def?.spreadsheetUrl)
      : (usr?.spreadsheetUrl?.trim() || def?.spreadsheetUrl || '');
    setSpreadsheetUrlInput(cleanSpreadsheet);
    setFeedbackMsg(null);
    setIsCopied(false);
  }, [selectedArea, areaConfigs]);

  const currentSpec = AREA_CONFIG_SPECS[selectedArea];
  const appsScriptCode = generateGoogleAppsScriptCode(selectedArea);

  // Data SPP cabang yang sedang dipilih
  const areaItems = useMemo(() => {
    return items.filter((item) => item.area === selectedArea);
  }, [items, selectedArea]);

  // Daftar PIC unik di cabang ini
  const uniquePics = useMemo(() => {
    const set = new Set<string>();
    areaItems.forEach((i) => {
      if (i.pic && i.pic.trim()) set.add(i.pic.trim());
    });
    return Array.from(set).sort();
  }, [areaItems]);

  // Data terfilter untuk viewer
  const filteredViewerItems = useMemo(() => {
    return areaItems.filter((item) => {
      if (statusFilter !== 'ALL' && item.statusPO !== statusFilter) return false;
      if (slaFilter !== 'ALL' && item.statusOntime !== slaFilter) return false;
      if (picFilter !== 'ALL' && item.pic !== picFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.sppNumber.toLowerCase().includes(q) ||
        (item.pic && item.pic.toLowerCase().includes(q)) ||
        (item.poNumber && item.poNumber.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.budgetReceivedDate && item.budgetReceivedDate.toLowerCase().includes(q))
      );
    });
  }, [areaItems, searchQuery, statusFilter, slaFilter, picFilter]);

  // KPI Ringkasan untuk cabang ini
  const areaKPI = useMemo(() => {
    const total = areaItems.length;
    const closed = areaItems.filter((i) => i.statusPO === 'CLOSE').length;
    const open = areaItems.filter((i) => i.statusPO === 'OPEN').length;
    const ontime = areaItems.filter((i) => i.statusOntime === 'ONTIME').length;
    const late = areaItems.filter((i) => i.statusOntime === 'TERLAMBAT').length;
    const h3Overdue = areaItems.filter((i) => i.isHPlus3Overdue).length;
    const avgDays = total > 0
      ? (areaItems.reduce((acc, curr) => acc + (curr.processDays || 0), 0) / total).toFixed(1)
      : '0.0';
    return { total, closed, open, ontime, late, h3Overdue, avgDays };
  }, [areaItems]);

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
        text: 'Gagal menyalin kode. Silakan klik "Lihat Kode" dan salin secara manual.',
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
      setShowSukodonoHelpModal(false);
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
      const pingResult = await testGoogleSheetConnection(urlInput.trim(), selectedArea);
      setFeedbackMsg({
        type: 'success',
        text: `Koneksi Berhasil! Terhubung ke Google Sheet ${pingResult.branch || currentSpec.name} (Akun: ${pingResult.username || currentSpec.username}, Total baris data: ${pingResult.totalRows ?? areaItems.length}).`,
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
        textMsg = `✓ Sinkronisasi 2 arah berhasil: ${res.totalInSheet ?? areaItems.length} data SPP untuk ${currentSpec.name} aktif diselaraskan (${res.addedCount ?? 0} baru, ${res.updatedCount ?? 0} diperbarui).`;
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
      const count = itemsByAreaCount[selectedArea] || areaItems.length;
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

  // Handler Buka Google Sheet secara Cerdas (Mencegah 404 Sukodono)
  const handleOpenSpreadsheet = () => {
    const rawUrl = currentConfig.spreadsheetUrl?.trim();

    // Deteksi jika tautan Sukodono masih ID rusak 404 lama
    if (selectedArea === 'SUKODONO' && (!rawUrl || rawUrl.includes('1a2xdnsX1QlKIyifygmMZnX0VkKnf-dXyX-iCb6XnHtM'))) {
      setShowSukodonoHelpModal(true);
      return;
    }

    if (rawUrl && rawUrl.startsWith('http')) {
      window.open(rawUrl, '_blank');
    } else {
      // Fallback pencarian file di Google Drive
      window.open(`https://docs.google.com/spreadsheets/u/0/?q=SPP_${selectedArea}`, '_blank');
    }
  };

  // Handler Download Excel dari Data Viewer
  const handleExportExcelViewer = () => {
    const filename = `SPP_${selectedArea}_GoogleSheet_${new Date().toISOString().slice(0, 10)}.xls`;
    exportToExcel(filteredViewerItems, filename);
  };

  const allAreas: SJAArea[] = ['SEPANJANG', 'KARAWANG', 'SUKODONO', 'SEMARANG'];

  return (
    <div className="space-y-4">
      {/* Top Banner Card: Mode Switcher & Cloud Persistence */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl shadow-md text-white border border-emerald-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Database className="w-5 h-5 text-emerald-300" />
              </span>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>Integrasi &amp; Akses Google Sheet</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-mono font-medium">
                  {currentSpec.name} ({currentSpec.code})
                </span>
              </h2>
            </div>
            <p className="text-xs text-emerald-100/90 leading-relaxed max-w-2xl">
              Hubungkan sistem pemantauan SLA pengadaan dengan Google Sheet 4 cabang secara real-time. Sinkronisasi 2 arah otomatis dan data tersimpan permanen di cloud.
            </p>
          </div>

          {/* Toggle View: Form Konfigurasi vs Lihat Data Live */}
          <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl border border-white/10 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveView('CONFIG')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'CONFIG'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Pengaturan &amp; Cloud Sync</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('DATA_VIEWER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'DATA_VIEWER'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Lihat Data Live ({areaItems.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Area Selector Dropdown List */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              {isSuperadmin
                ? 'Pilih Cabang untuk Dikelola (Superadmin Dropdown):'
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
                const rowCount = items.filter((i) => i.area === areaKey).length;
                const statusText = count === 2 ? `✅ ${rowCount} Data Terhubung` : count === 1 ? `⚠️ 1 Link (${rowCount} Data)` : 'Belum Ada Link';

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
              Username: {currentSpec.username} · {areaItems.length} Data SPP
            </span>
          </div>
        )}
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : feedbackMsg.type === 'info'
              ? 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
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

      {/* ========================================================================= */}
      {/* TAMPILAN 1: DATA VIEWER (LIHAT DATA LANGSUNG DI APLIKASI) */}
      {/* ========================================================================= */}
      {activeView === 'DATA_VIEWER' ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Card Header & Ringkasan KPI Data Live */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600 text-white shadow-2xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                      Data Live Google Sheet · {currentSpec.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Terhubung Apps Script</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Menampilkan seluruh data SPP hasil sinkronisasi Google Sheet cabang {currentSpec.name}.
                  </p>
                </div>
              </div>

              {/* Action Buttons: Refresh, Export, Open Spreadsheet */}
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePull}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Tarik data terbaru langsung dari Google Sheet"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                  <span>Refresh Data</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcelViewer}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Ekspor seluruh data tabel ini ke format Microsoft Excel (.xls)"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Ekspor Excel (.xls)</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenSpreadsheet}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Buka dokumen di Google Sheets / Google Drive"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Buka Spreadsheet</span>
                </button>
              </div>
            </div>

            {/* Quick KPI Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-center font-mono">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Total SPP</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">{areaKPI.total}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-sans">Selesai (CLOSE)</span>
                <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">{areaKPI.closed}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <span className="text-[10px] text-blue-700 dark:text-blue-400 block font-sans">Proses (OPEN)</span>
                <span className="text-base font-extrabold text-blue-700 dark:text-blue-300">{areaKPI.open}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
                <span className="text-[10px] text-teal-700 dark:text-teal-400 block font-sans">Sesuai SLA</span>
                <span className="text-base font-extrabold text-teal-700 dark:text-teal-300">{areaKPI.ontime}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-sans">Terlambat (&gt;10 Hr)</span>
                <span className="text-base font-extrabold text-rose-700 dark:text-rose-300">{areaKPI.late}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                <span className="text-[10px] text-purple-700 dark:text-purple-400 block font-sans">Rata-rata Hari</span>
                <span className="text-base font-extrabold text-purple-700 dark:text-purple-300">{areaKPI.avgDays} hr</span>
              </div>
            </div>

            {/* Filter Bar: Pencarian & Dropdown Status */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari No. SPP, PIC, No. PO..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {/* Filter PIC */}
                {uniquePics.length > 0 && (
                  <select
                    value={picFilter}
                    onChange={(e) => setPicFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="ALL">Semua PIC ({uniquePics.length})</option>
                    {uniquePics.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                )}

                {/* Filter Status PO */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <option value="ALL">Semua Status PO</option>
                  <option value="CLOSE">CLOSE (Selesai)</option>
                  <option value="OPEN">OPEN (Proses)</option>
                </select>

                {/* Filter SLA */}
                <select
                  value={slaFilter}
                  onChange={(e) => setSlaFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <option value="ALL">Semua SLA</option>
                  <option value="ONTIME">ONTIME (&le;10 hari)</option>
                  <option value="TERLAMBAT">TERLAMBAT (&gt;10 hari)</option>
                </select>

                {onNavigateToTable && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTable(selectedArea)}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1"
                    title="Buka pada tabel utama dengan fitur edit & rekap lengkap"
                  >
                    <span>Ke Tabel Utama</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabel Live Data SPP */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900 text-white z-10 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">No</th>
                    <th className="py-2.5 px-3">Nomor SPP</th>
                    <th className="py-2.5 px-3">Tgl Terima Budget</th>
                    <th className="py-2.5 px-3">PIC</th>
                    <th className="py-2.5 px-3">Tanggal PO</th>
                    <th className="py-2.5 px-3">Nomor PO</th>
                    <th className="py-2.5 px-3 text-center">Hari Kerja</th>
                    <th className="py-2.5 px-3 text-center">Status PO</th>
                    <th className="py-2.5 px-3 text-center">Status SLA</th>
                    <th className="py-2.5 px-3">Catatan / Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                  {filteredViewerItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                          {searchQuery || statusFilter !== 'ALL' || slaFilter !== 'ALL'
                            ? 'Tidak ada data SPP yang cocok dengan filter pencarian.'
                            : `Belum ada data SPP yang dimuat untuk cabang ${currentSpec.name}.`}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Klik tombol &quot;Refresh Data&quot; di atas untuk menarik data terbaru dari Google Sheet.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredViewerItems.map((item, idx) => {
                      const isClosed = item.statusPO === 'CLOSE';
                      const isOntime = item.statusOntime === 'ONTIME';
                      return (
                        <tr
                          key={item.id || item.sppNumber || idx}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors font-sans"
                        >
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[10px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            {item.sppNumber}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {item.budgetReceivedDate || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {item.pic || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {item.poDate || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {item.poNumber ? (
                              <span className="font-semibold text-slate-900 dark:text-white">{item.poNumber}</span>
                            ) : (
                              <span className="text-slate-400 italic">Belum Ada PO</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            <span className={item.processDays > 10 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}>
                              {item.processDays} hari
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                isClosed
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                              }`}
                            >
                              {item.statusPO}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                isOntime
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              }`}
                            >
                              {item.statusOntime}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.notes || ''}>
                            {item.notes || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Table Info */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>Menampilkan {filteredViewerItems.length} dari total {areaItems.length} data SPP ({currentSpec.name})</span>
              <button
                type="button"
                onClick={() => setActiveView('CONFIG')}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Beralih ke Pengaturan URL &amp; Script</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* TAMPILAN 2: FORM PENGATURAN, URL, & KODE APPS SCRIPT                      */
        /* ========================================================================= */
        <div className="space-y-4">
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
                    Buka atau simpan link Google Sheet untuk cabang ini ({areaItems.length} data tersinkronisasi)
                  </p>
                </div>
              </div>

              {/* Action Buttons: Lihat Data Live & Buka G Sheet */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('DATA_VIEWER')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Lihat data SPP cabang ini langsung di dalam aplikasi"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Data Live ({areaItems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenSpreadsheet}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={`Buka Google Sheet ${currentSpec.name} di Tab Baru`}
                >
                  <span>Buka G Sheet {currentSpec.name.split(' ')[1]}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Kotak Peringatan & Bantuan Khusus Sukodono jika URL belum disetel langsung */}
            {selectedArea === 'SUKODONO' && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-[11px] block text-amber-950 dark:text-amber-100">
                      Bantuan Akses Google Sheet Sukodono (39 Data Tersinkronisasi)
                    </span>
                    <span className="text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed block">
                      Google Apps Script Sukodono telah aktif dengan <strong>39 baris data SPP</strong>. Jika tautan langsung bawaan sebelumnya tidak dapat dibuka (404), Anda dapat langsung melihat datanya di aplikasi ini atau mencari file <code>SPP_Sukodono</code> di Google Drive Anda.
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 pl-6">
                  <button
                    type="button"
                    onClick={() => setActiveView('DATA_VIEWER')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>👁️ Lihat 39 Baris Data Sukodono Sekarang</span>
                  </button>

                  <a
                    href="https://drive.google.com/drive/search?q=SPP_Sukodono"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer no-underline"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>🔍 Cari File &quot;SPP_Sukodono&quot; di Google Drive</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setShowSukodonoHelpModal(true)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Petunjuk Tautan Aktif</span>
                  </button>
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
              <p className="text-[10px] text-slate-500 mt-1">
                *Tautan ini disimpan permanen ke server cloud dan akan otomatis terbuka saat mengklik tombol &quot;Buka G Sheet&quot;.
              </p>
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
          <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>Web App URL Google Sheets · {currentSpec.name}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Username terhubung: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{currentSpec.username}</span> · Tab: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{currentSpec.defaultSheetName}</span>
                </p>
              </div>

              {/* Toggle Auto Sync saat Login */}
              <label className="flex items-center gap-2 cursor-pointer text-xs select-none bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={currentConfig.autoSync ?? true}
                  onChange={handleToggleAutoSync}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-medium text-slate-700 dark:text-slate-300">Tarik data otomatis saat login</span>
              </label>
            </div>

            <form onSubmit={handleSaveUrl} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deployment Web App URL (akhiran /exec) untuk {currentSpec.name}:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    required
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={`https://script.google.com/macros/s/AKfycb.../exec (Google Sheet ${currentSpec.name})`}
                    className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Cloud className="w-3.5 h-3.5 text-blue-400" />
                      <span>Simpan URL</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTestingPing || !urlInput.trim()}
                      className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 rounded-lg font-bold text-xs shadow-xs transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
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
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePull}
                  disabled={isProcessing || !currentConfig.webAppUrl}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
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
                  <span>Kirim {areaItems.length} Data ke Sheet ({currentSpec.name})</span>
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
                  1. <strong>Input &amp; Update di Google Sheet:</strong> Saat Anda menambah atau mengubah data di Google Sheet, klik tombol <em>&quot;Sinkron 2 Arah&quot;</em> atau tombol refresh untuk memuat data terbaru ke aplikasi.<br />
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
                    const cfgSpreadsheet = areaKey === 'SUKODONO'
                      ? sanitizeSukodonoUrl(usr?.spreadsheetUrl || def?.spreadsheetUrl)
                      : (usr?.spreadsheetUrl?.trim() || def?.spreadsheetUrl || '');
                    const cfg: GoogleSheetConfig = {
                      ...def,
                      ...usr,
                      webAppUrl: usr?.webAppUrl?.trim() || def?.webAppUrl || '',
                      spreadsheetUrl: cfgSpreadsheet,
                    };
                    const hasSheet = !!cfg.spreadsheetUrl?.trim();
                    const hasWeb = !!cfg.webAppUrl?.trim();
                    const isRowSelected = selectedArea === areaKey;
                    const rowItemsCount = items.filter((i) => i.area === areaKey).length;

                    return (
                      <tr
                        key={areaKey}
                        className={`transition-colors ${
                          isRowSelected
                            ? 'bg-blue-50/50 dark:bg-blue-950/20'
                            : 'hover:bg-slate-100/40 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{spec.name}</span>
                            {isRowSelected && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-mono font-medium">
                                Aktif
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            User: <strong className="text-slate-700 dark:text-slate-300">{spec.username}</strong> · {rowItemsCount} SPP
                          </div>
                        </td>

                        <td className="py-2.5 px-3 max-w-[200px]">
                          {hasSheet ? (
                            <div className="flex items-center gap-1.5">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span
                                className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate"
                                title={cfg.spreadsheetUrl}
                              >
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
                              <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span
                                className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate"
                                title={cfg.webAppUrl}
                              >
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
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Lengkap &amp; Tersimpan
                            </span>
                          ) : hasSheet || hasWeb ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
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
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedArea(areaKey);
                                setActiveView('DATA_VIEWER');
                              }}
                              className="px-2 py-1 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                              title="Lihat data SPP cabang ini"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat Data</span>
                            </button>

                            {isSuperadmin && !isRowSelected && (
                              <button
                                type="button"
                                onClick={() => setSelectedArea(areaKey)}
                                className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-[10px] font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                              >
                                Kelola
                              </button>
                            )}
                            {hasSheet && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (areaKey === 'SUKODONO' && cfg.spreadsheetUrl?.includes('1a2xdnsX1QlKIyifygmMZnX0VkKnf-dXyX-iCb6XnHtM')) {
                                    setSelectedArea('SUKODONO');
                                    setShowSukodonoHelpModal(true);
                                  } else {
                                    window.open(cfg.spreadsheetUrl, '_blank');
                                  }
                                }}
                                className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded transition-colors cursor-pointer"
                                title={`Buka Dokumen Spreadsheet ${spec.name}`}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
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
      )}

      {/* ========================================================================= */}
      {/* MODAL PEMANDU & PERBAIKAN AKSES GOOGLE SHEET SUKODONO                     */}
      {/* ========================================================================= */}
      {showSukodonoHelpModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Akses Google Sheet SJA Sukodono
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Solusi Akses Dokumen &amp; Tinjau Data Live
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSukodonoHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-300 space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>39 Baris Data Sukodono Aktif &amp; Siap Dilihat:</span>
                </span>
                <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed">
                  Data Google Sheet Sukodono Anda tetap aman dan terhubung melalui Google Apps Script. Munculnya pesan <em>&quot;file tidak ada (404)&quot;</em> hanya karena URL lama di Google Drive telah berubah/dipindahkan.
                </p>
              </div>

              {/* 3 Opsi Solusi Cepat */}
              <div className="space-y-2">
                {/* Opsi 1: Lihat Data Langsung di Aplikasi */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('DATA_VIEWER');
                    setShowSukodonoHelpModal(false);
                  }}
                  className="w-full p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-left transition-all shadow-xs cursor-pointer group flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Eye className="w-4 h-4" />
                      <span>1. Lihat Seluruh 39 Data Sukodono di Aplikasi Ini</span>
                    </span>
                    <span className="text-[11px] text-blue-100 block">
                      Buka tabel lengkap dengan status PO, SLA, tanggal, dan fitur ekspor Excel.
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-blue-200 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>

                {/* Opsi 2: Buka Pencarian Google Drive Otomatis */}
                <a
                  href="https://drive.google.com/drive/search?q=SPP_Sukodono"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-left transition-all cursor-pointer block no-underline group"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <Search className="w-4 h-4 text-emerald-600" />
                        <span>2. Cari File &quot;SPP_Sukodono&quot; di Google Drive Anda</span>
                      </span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block">
                        Otomatis mencari file di akun <code>sjaprocurement@gmail.com</code> tanpa error 404.
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                </a>
              </div>

              {/* Opsi 3: Masukkan Link Baru & Simpan */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  3. Punya Link Google Sheet Sukodono yang Aktif? Simpan di Sini:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={spreadsheetUrlInput}
                    onChange={(e) => setSpreadsheetUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSpreadsheetUrl}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Simpan &amp; Terapkan
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowSukodonoHelpModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
