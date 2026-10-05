import React, { useState, useEffect } from 'react';
import { UserProfile, SystemNotification } from '../types';
import { Bell, ShieldCheck, Menu, PanelLeft, Calendar, Clock, LogOut, Sun, Moon } from 'lucide-react';

interface TopHeaderProps {
  currentUser: UserProfile;
  activeTab: string;
  notifications: SystemNotification[];
  onOpenNotifications: () => void;
  onOpenSecurity: () => void;
  onToggleSidebar: () => void;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isTwoWaySyncing?: boolean;
  onTriggerTwoWaySync?: () => void;
  lastTwoWaySyncTime?: Date | null;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  activeTab,
  notifications,
  onOpenNotifications,
  onOpenSecurity,
  onToggleSidebar,
  onLogout,
  isSidebarCollapsed,
  theme,
  onToggleTheme,
  isTwoWaySyncing = false,
  onTriggerTwoWaySync,
  lastTwoWaySyncTime,
}) => {
  const unreadAlerts = notifications.filter((n) => !n.read).length;
  const urgentCount = notifications.filter((n) => !n.read && n.severity === 'urgent').length;

  // Real-time Digital Clock & Calendar System
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Hari dan Tanggal Bahasa Indonesia
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = dayNames[currentTime.getDay()];
  const dateNumber = String(currentTime.getDate()).padStart(2, '0');
  const monthName = monthNames[currentTime.getMonth()];
  const yearNumber = currentTime.getFullYear();

  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');

  // Deteksi zona waktu (WIB / WITA / WIT)
  const tzOffsetHours = -currentTime.getTimezoneOffset() / 60;
  let tzName = 'WIB';
  if (tzOffsetHours === 8) tzName = 'WITA';
  else if (tzOffsetHours === 9) tzName = 'WIT';
  else if (tzOffsetHours !== 7) {
    tzName = `GMT${tzOffsetHours >= 0 ? '+' : ''}${tzOffsetHours}`;
  }

  const tabLabels: Record<string, string> = {
    dashboard: 'Dashboard Realisasi SPP',
    monitoring: 'Daftar SPP & Realisasi',
    analytics: 'Analisa Kinerja PIC',
    holidays: 'Kalender Hari Libur (SKB 3 Menteri)',
    googlesheet: 'Integrasi Google Sheet',
  };

  const isSuperadmin = currentUser.role === 'SUPERADMIN';

  return (
    <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-30 transition-colors duration-200">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Sidebar Toggle Button & Current Page Title */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 transition-colors shadow-2xs"
            title={isSidebarCollapsed ? 'Buka / Perluas Sidebar' : 'Ciutkan Sidebar'}
          >
            <Menu className="w-4 h-4 lg:hidden" />
            <PanelLeft className="w-4 h-4 hidden lg:block" />
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white tracking-tight truncate max-w-[130px] sm:max-w-xs md:max-w-none">
              {tabLabels[activeTab] || 'Monitoring Realisasi SPP'}
            </h1>
            <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              SLA 10 Hari Kerja
            </span>
            <span
              className={`hidden md:inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                isSuperadmin
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
              }`}
            >
              {isSuperadmin ? 'Semua Area (Superadmin)' : `Area: ${currentUser.name}`}
            </span>
            {onTriggerTwoWaySync && (
              <button
                type="button"
                onClick={onTriggerTwoWaySync}
                disabled={isTwoWaySyncing}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs"
                title={`Sinkronisasi 2-Arah Aktif. Input di Sheet maupun di Aplikasi disamakan otomatis.${
                  lastTwoWaySyncTime ? ` Terakhir sinkron: ${lastTwoWaySyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''
                }. Klik untuk sinkron sekarang.`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{isTwoWaySyncing ? 'Menyinkronkan...' : 'Auto-Sync 2-Arah'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Center: Kolom Tanggal & Jam Digital Otomatis Real-time (Executive Styling) */}
        <div className="flex items-center justify-center">
          {/* Desktop & Tablet Display */}
          <div className="hidden md:flex items-center gap-3 bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/90 rounded-lg px-3.5 py-1.5 shadow-2xs">
            {/* Hari & Tanggal */}
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-white">{dayName},</span>
              <span className="font-medium text-slate-600 dark:text-slate-400">
                {dateNumber} {monthName} {yearNumber}
              </span>
            </div>

            {/* Separator Divider */}
            <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-800" aria-hidden="true" />

            {/* Jam Digital Real-time */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2" title="Sistem Jam Real-time Aktif">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="font-mono text-xs font-bold text-slate-900 dark:text-white tracking-wider flex items-center tabular-nums">
                <span>{hours}</span>
                <span className="text-blue-600 dark:text-blue-400 animate-pulse">:</span>
                <span>{minutes}</span>
                <span className="text-blue-600 dark:text-blue-400 animate-pulse">:</span>
                <span className="text-blue-600 dark:text-blue-400 font-extrabold">{seconds}</span>
                <span className="ml-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{tzName}</span>
              </div>
            </div>
          </div>

          {/* Mobile Display (Compact) */}
          <div className="flex md:hidden items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{hours}:{minutes}:{seconds}</span>
            <span className="text-[9px] text-slate-400 font-sans uppercase">{dayName.slice(0, 3)}</span>
          </div>
        </div>

        {/* Right: Theme Toggle (Dark/Light), Security, Notification, Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* TOMBOL MODE GELAP / TERANG (LUXURY EXECUTIVE TOGGLE) */}
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-all shadow-2xs"
            title={theme === 'dark' ? 'Beralih ke Mode Terang (Light Mode)' : 'Beralih ke Mode Gelap (Dark Mode)'}
            aria-label="Toggle dark/light mode"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
                <span className="hidden sm:inline font-medium text-amber-300 text-[11px]">Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline font-medium text-slate-600 text-[11px]">Gelap</span>
              </>
            )}
          </button>

          {/* Tombol Keamanan 2FA & Hak Akses (Khusus Mode Superadmin) */}
          {isSuperadmin ? (
            <button
              onClick={onOpenSecurity}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              title="Pusat Keamanan 2FA & Hak Akses (Superadmin)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="hidden sm:inline font-semibold text-[11px]">Keamanan 2FA</span>
              <span className="hidden md:inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-200/80 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
                Superadmin
              </span>
            </button>
          ) : (
            /* Badge Akun Cabang (Bersih, Sederhana & Ramah Staf Operasional) */
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 text-xs font-medium"
              title={`Akun Aktif: ${currentUser.name} (${currentUser.area})`}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline font-semibold text-[11px]">
                {currentUser.name}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Online
              </span>
            </div>
          )}

          {/* Notification Alert Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-800 shadow-2xs transition-colors"
            title="Notifikasi & Peringatan H+3"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts > 0 && (
              <span
                className={`absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center text-white ${
                  urgentCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-amber-600'
                }`}
              >
                {unreadAlerts}
              </span>
            )}
          </button>

          {/* Quick Logout Button */}
          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/90 dark:border-slate-800 shadow-2xs transition-colors"
            title="Keluar / Ganti Akun"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
