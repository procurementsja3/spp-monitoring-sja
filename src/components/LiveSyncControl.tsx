import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Radio, Check, ChevronDown, Clock, ShieldCheck, Sparkles, Pause, Play, Eye, EyeOff } from 'lucide-react';

export interface LiveSyncControlProps {
  onManualSync?: () => void | Promise<void>;
  isSyncing?: boolean;
  isAutoSyncEnabled?: boolean;
  onToggleAutoSync?: (enabled?: boolean) => void;
  autoSyncInterval?: number; // seconds
  onChangeAutoSyncInterval?: (seconds: number) => void;
  autoSyncCountdown?: number;
  lastSyncTime?: string | null;
  variant?: 'banner' | 'header' | 'table';
  showLiveBadge?: boolean; // Kontrol visibilitas badge live (default: false / disembunyikan)
  onToggleShowLiveBadge?: (show?: boolean) => void;
  className?: string;
}

export const LiveSyncControl: React.FC<LiveSyncControlProps> = ({
  onManualSync,
  isSyncing = false,
  isAutoSyncEnabled = true,
  onToggleAutoSync,
  autoSyncInterval = 30,
  onChangeAutoSyncInterval,
  autoSyncCountdown = 30,
  lastSyncTime,
  variant = 'banner',
  showLiveBadge = false, // Secara default disembunyikan sesuai permintaan pengguna
  onToggleShowLiveBadge,
  className = '',
}) => {
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpenMenu(false);
      }
    };
    if (isOpenMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpenMenu]);

  // Format relative last sync time
  const getFormattedLastSync = () => {
    if (!lastSyncTime) return 'Belum pernah';
    try {
      const date = new Date(lastSyncTime);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Baru saja';
    }
  };

  const intervals = [
    { label: '15 dtk', value: 15 },
    { label: '30 dtk (Default)', value: 30 },
    { label: '1 mnt', value: 60 },
    { label: '2 mnt', value: 120 },
  ];

  // ==========================================
  // VARIANT 1: BANNER (Hero Dashboard - Sesuai Foto User)
  // ==========================================
  if (variant === 'banner') {
    return (
      <div className={`relative inline-flex items-center gap-1.5 ${className}`} ref={menuRef}>
        {/* Tombol Utama: SINKRONKAN DATA (Sesuai Revisi Foto) */}
        {onManualSync && (
          <button
            type="button"
            onClick={onManualSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl border border-emerald-400/40 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 select-none group"
            title={`Klik untuk sinkronkan data sekarang (Sistem Auto Live Sync tetap aktif otomatis di latar belakang tiap ${autoSyncInterval} detik)`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-white transition-transform ${
                isSyncing ? 'animate-spin' : 'group-hover:rotate-180 duration-500'
              }`}
            />
            <span className="tracking-wide">
              {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data'}
            </span>
          </button>
        )}

        {/* Pill Status Auto Live Sync (Bisa disembunyikan/ditampilkan) */}
        {showLiveBadge && (
          <button
            type="button"
            onClick={() => setIsOpenMenu(!isOpenMenu)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all shadow-sm cursor-pointer select-none ${
              isAutoSyncEnabled
                ? 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-200 border-emerald-500/40'
                : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 border-slate-700/60'
            }`}
            title="Pengaturan Auto Live Sinkronisasi Data"
          >
            {isAutoSyncEnabled ? (
              <>
                {/* Radar Live Indicator */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-300">
                  LIVE {autoSyncCountdown}s
                </span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 text-amber-400" />
                <span className="text-[11px] text-slate-400 font-medium">Auto: Jeda</span>
              </>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpenMenu ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Dropdown Menu Pengaturan Auto Live Sync */}
        {isOpenMenu && showLiveBadge && (
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-slate-100 p-3.5 border border-slate-700/80 shadow-2xl backdrop-blur-xl z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Menu */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Auto Live Sinkronisasi</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isAutoSyncEnabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
              }`}>
                {isAutoSyncEnabled ? 'AKTIF' : 'JEDA'}
              </span>
            </div>

            {/* Switch Toggle Auto Sync */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="text-left">
                <div className="text-xs font-semibold text-white">Sinkronisasi Otomatis</div>
                <div className="text-[10px] text-slate-400">Refresh data live tanpa klik manual</div>
              </div>
              {onToggleAutoSync && (
                <button
                  type="button"
                  onClick={() => onToggleAutoSync()}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    isAutoSyncEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                  aria-label="Toggle Auto Sync"
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isAutoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              )}
            </div>

            {/* Opsi Sembunyikan Badge Live */}
            {onToggleShowLiveBadge && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="text-left">
                  <div className="text-xs font-semibold text-white">Tampilkan Tombol Live</div>
                  <div className="text-[10px] text-slate-400">Sembunyikan/tampilkan pill hitung mundur</div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleShowLiveBadge(false)}
                  className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <EyeOff className="w-3 h-3" />
                  <span>Sembunyikan</span>
                </button>
              </div>
            )}

            {/* Pilihan Interval Detik */}
            {isAutoSyncEnabled && onChangeAutoSyncInterval && (
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>Frekuensi Refresh Live:</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {intervals.map((it) => (
                    <button
                      key={it.value}
                      type="button"
                      onClick={() => onChangeAutoSyncInterval(it.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-left flex items-center justify-between border transition-all cursor-pointer ${
                        autoSyncInterval === it.value
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-800/40 hover:bg-slate-800 text-slate-300 border-slate-700/40'
                      }`}
                    >
                      <span>{it.label}</span>
                      {autoSyncInterval === it.value && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Info Terakhir Sinkron */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>Terakhir Sinkron:</span>
              <span className="font-mono text-emerald-300 font-semibold">{getFormattedLastSync()}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VARIANT 2: HEADER (TopHeader Bar)
  // ==========================================
  if (variant === 'header') {
    return (
      <div className={`relative inline-flex items-center gap-1.5 ${className}`} ref={menuRef}>
        {/* Tombol Sinkronkan Data Header */}
        {onManualSync && (
          <button
            type="button"
            onClick={onManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title={`Sinkronkan data sekarang dari Google Sheet (Auto Live Sync aktif tiap ${autoSyncInterval}s)`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${
                isSyncing ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden md:inline text-[11px] font-semibold">
              {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data'}
            </span>
          </button>
        )}

        {/* Live Pill in Header (Hanya tampil jika showLiveBadge diaktifkan) */}
        {showLiveBadge && (
          <button
            type="button"
            onClick={() => setIsOpenMenu(!isOpenMenu)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isAutoSyncEnabled
                ? 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60 hover:bg-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
            }`}
            title="Pengaturan Auto Live Sinkronisasi"
          >
            {isAutoSyncEnabled ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-mono hidden sm:inline">
                  LIVE {autoSyncCountdown}s
                </span>
              </>
            ) : (
              <span className="text-[10px] text-slate-400">Jeda</span>
            )}
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>
        )}

        {/* Dropdown Menu Header */}
        {isOpenMenu && showLiveBadge && (
          <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-3 border border-slate-200 dark:border-slate-800 shadow-xl z-50 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                Auto Live Sync
              </span>
              <span className="text-[10px] text-slate-400">{getFormattedLastSync()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-300">Status Live</span>
              {onToggleAutoSync && (
                <button
                  type="button"
                  onClick={() => onToggleAutoSync()}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                    isAutoSyncEnabled
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isAutoSyncEnabled ? 'ON' : 'OFF'}
                </button>
              )}
            </div>

            {isAutoSyncEnabled && onChangeAutoSyncInterval && (
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Interval:</span>
                <div className="grid grid-cols-2 gap-1">
                  {intervals.map((it) => (
                    <button
                      key={it.value}
                      type="button"
                      onClick={() => onChangeAutoSyncInterval(it.value)}
                      className={`px-2 py-1 rounded text-[10px] font-medium border text-left cursor-pointer ${
                        autoSyncInterval === it.value
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border-blue-400 dark:border-blue-700 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {it.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VARIANT 3: TABLE / GENERIC
  // ==========================================
  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`} ref={menuRef}>
      {onManualSync && (
        <button
          type="button"
          onClick={onManualSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-2xs cursor-pointer disabled:opacity-50"
          title={`Sinkronkan data terbaru dari Google Sheet sekarang (Auto Live Sync aktif tiap ${autoSyncInterval}s)`}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${
              isSyncing ? 'animate-spin' : ''
            }`}
          />
          <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data'}</span>
        </button>
      )}

      {showLiveBadge && isAutoSyncEnabled && (
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-medium"
          title={`Auto Live Sync aktif tiap ${autoSyncInterval} detik. Hitung mundur: ${autoSyncCountdown}s`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span>Live {autoSyncCountdown}s</span>
        </span>
      )}
    </div>
  );
};
