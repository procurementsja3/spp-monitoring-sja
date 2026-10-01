import React, { useState, useEffect } from 'react';
import { UserProfile, SystemNotification } from '../types';
import { Bell, ShieldCheck, Menu, PanelLeft, Calendar, Clock, LogOut } from 'lucide-react';

interface TopHeaderProps {
  currentUser: UserProfile;
  activeTab: string;
  notifications: SystemNotification[];
  onOpenNotifications: () => void;
  onOpenSecurity: () => void;
  onToggleSidebar: () => void;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
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

  // Deteksi zona waktu (WIB / WITA / WIT / GMT)
  const tzOffsetHours = -currentTime.getTimezoneOffset() / 60;
  let tzName = 'WIB';
  if (tzOffsetHours === 8) tzName = 'WITA';
  else if (tzOffsetHours === 9) tzName = 'WIT';
  else if (tzOffsetHours !== 7) {
    tzName = `GMT${tzOffsetHours >= 0 ? '+' : ''}${tzOffsetHours}`;
  }

  const tabLabels: Record<string, string> = {
    monitoring: 'Daftar SPP & Realisasi',
    analytics: 'Analitik Kinerja PIC',
    holidays: 'Kalender Hari Libur (SKB 3 Menteri)',
    googlesheet: 'Integrasi Google Sheet',
  };

  const isSuperadmin = currentUser.role === 'SUPERADMIN';

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Left: Sidebar Toggle Button & Current Page Title */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Sidebar Toggle Button (Mobile & Desktop) */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors"
            title={isSidebarCollapsed ? 'Buka / Perluas Sidebar' : 'Ciutkan Sidebar'}
          >
            <Menu className="w-5 h-5 lg:hidden" />
            <PanelLeft className="w-5 h-5 hidden lg:block" />
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate max-w-[140px] sm:max-w-xs md:max-w-none">
              {tabLabels[activeTab] || 'Monitoring Realisasi SPP'}
            </h1>
            <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
              SLA 10 Hari
            </span>
            <span
              className={`hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                isSuperadmin
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {isSuperadmin ? 'Semua Area (Superadmin)' : `Area: ${currentUser.name}`}
            </span>
          </div>
        </div>

        {/* Center: Kolom Sistem Hari, Tanggal & Jam Digital Otomatis Real-time */}
        <div className="flex items-center justify-center">
          {/* Desktop & Tablet Display */}
          <div className="hidden md:flex items-center gap-2.5 bg-slate-50 border border-slate-200/90 rounded-lg px-3.5 py-1.5 shadow-2xs">
            {/* Hari & Tanggal */}
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-bold text-slate-900">{dayName},</span>
              <span className="font-medium text-slate-600">
                {dateNumber} {monthName} {yearNumber}
              </span>
            </div>

            {/* Separator Divider */}
            <span className="h-3.5 w-px bg-slate-300" aria-hidden="true" />

            {/* Jam Digital Real-time */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2" title="Sistem Jam Real-time Aktif">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="font-mono text-xs font-bold text-slate-900 tracking-wider flex items-center tabular-nums">
                <span>{hours}</span>
                <span className="text-blue-600 animate-pulse">:</span>
                <span>{minutes}</span>
                <span className="text-blue-600 animate-pulse">:</span>
                <span className="text-blue-600 font-extrabold">{seconds}</span>
                <span className="ml-1 text-[10px] text-slate-500 font-semibold">{tzName}</span>
              </div>
            </div>
          </div>

          {/* Mobile Display (Compact) */}
          <div className="flex md:hidden items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-[11px] font-mono font-bold text-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{hours}:{minutes}:{seconds}</span>
            <span className="text-[9px] text-slate-400 font-sans uppercase">{dayName.slice(0, 3)}</span>
          </div>
        </div>

        {/* Right: Security & Role status, Notification Bell, Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Security & Role button */}
          <button
            onClick={onOpenSecurity}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors shadow-xs"
            title="Kelola Role & Keamanan 2FA"
          >
            <ShieldCheck
              className={`w-4 h-4 ${
                currentUser.twoFactorEnabled ? 'text-emerald-600' : 'text-amber-500'
              }`}
            />
            <span className="hidden sm:inline font-mono font-semibold">
              {currentUser.name.split(' ')[0]}
            </span>
          </button>

          {/* Notification Alert Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors"
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
            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 shadow-xs transition-colors"
            title="Keluar / Ganti Akun"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
