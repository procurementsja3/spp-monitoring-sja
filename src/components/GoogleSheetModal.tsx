import React, { useState, useEffect } from 'react';
import { GoogleSheetConfig, AreaSheetConfigMap, SJAArea, UserProfile } from '../types';
import { 
  testGoogleSheetConnection,
  AREA_CONFIG_SPECS 
} from '../utils/googleSheetsConnector';
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
  Zap
} from 'lucide-react';

interface GoogleSheetModalProps {
  currentUser: UserProfile;
  areaConfigs: AreaSheetConfigMap;
  onUpdateAreaConfig: (area: SJAArea, newConfig: Partial<GoogleSheetConfig>) => void;
  onPullFromSheet: (area: SJAArea) => Promise<void>;
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
  const isSuperadmin = currentUser.role === 'SUPERADMIN';
  const defaultArea: SJAArea = isSuperadmin ? 'SEPANJANG' : (currentUser.area as SJAArea);
  const [selectedArea, setSelectedArea] = useState<SJAArea>(defaultArea);

  // Sync selected area with current user if not superadmin
  useEffect(() => {
    if (!isSuperadmin && currentUser.area && currentUser.area !== 'ALL') {
      setSelectedArea(currentUser.area as SJAArea);
    }
  }, [currentUser, isSuperadmin]);

  const currentConfig = areaConfigs[selectedArea] || {
    webAppUrl: '',
    sheetName: `SPP_${selectedArea}`,
    autoSync: true,
    syncStatus: 'idle',
  };

  const [urlInput, setUrlInput] = useState(currentConfig.webAppUrl || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Update input text when active area changes
  useEffect(() => {
    setUrlInput(areaConfigs[selectedArea]?.webAppUrl || '');
    setFeedbackMsg(null);
  }, [selectedArea, areaConfigs]);

  const currentSpec = AREA_CONFIG_SPECS[selectedArea];

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    onUpdateAreaConfig(selectedArea, {
      webAppUrl: cleanUrl,
      syncStatus: cleanUrl ? 'connected' : 'idle',
      lastSyncTime: new Date().toISOString(),
    });
    setFeedbackMsg({
      type: 'success',
      text: `Web App URL untuk cabang ${currentSpec.name} (User: ${currentSpec.username}) berhasil disimpan.`,
    });
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
      await onPullFromSheet(selectedArea);
      setFeedbackMsg({
        type: 'success',
        text: `Berhasil menarik dan menyinkronkan data Google Sheets terbaru untuk cabang ${currentSpec.name}.`,
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

      {/* Area Selector Tabs */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <span>{isSuperadmin ? 'Pilih Cabang untuk Dikonfigurasi (Superadmin Mode):' : 'Cabang Anda Saat Ini:'}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {isSuperadmin ? 'Superadmin dapat mengakses semua cabang' : `Login sebagai: ${currentUser.name}`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {allAreas.map((areaKey) => {
            const spec = AREA_CONFIG_SPECS[areaKey];
            const isSelected = selectedArea === areaKey;
            const areaConfig = areaConfigs[areaKey];
            const isConfigured = !!areaConfig?.webAppUrl;
            const isDisabled = !isSuperadmin && currentUser.area !== areaKey;

            return (
              <button
                key={areaKey}
                type="button"
                disabled={isDisabled}
                onClick={() => setSelectedArea(areaKey)}
                className={`p-2.5 rounded-lg border text-left transition-all relative ${
                  isSelected
                    ? 'bg-white border-blue-600 shadow-sm ring-1 ring-blue-600'
                    : isDisabled
                    ? 'bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                    : 'bg-white/80 hover:bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 truncate">{spec.name}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConfigured ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                    title={isConfigured ? 'Web App URL Tersambung' : 'Belum Ada URL'}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>User: <strong className="text-slate-700">{spec.username}</strong></span>
                  <span className={isConfigured ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                    {isConfigured ? 'Siap' : 'Belum'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
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
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                >
                  Simpan URL
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
            >
              <DownloadCloud className={`w-3.5 h-3.5 ${isProcessing ? 'animate-bounce text-blue-600' : 'text-slate-600'}`} />
              <span>Tarik Data Terbaru ({currentSpec.name})</span>
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
      </div>
    </div>
  );
};
