import React, { useState, useRef } from 'react';
import { 
  ClipboardList, 
  BarChart3, 
  Calendar, 
  Database, 
  Plus, 
  PanelLeftClose, 
  PanelLeft, 
  X,
  Clock,
  ShieldCheck,
  Building,
  LogOut,
  Layers,
  Camera,
  RotateCcw,
  Upload,
  Check
} from 'lucide-react';
import { UserProfile, SJAArea } from '../types';
import { AREA_METADATA } from '../utils/initialData';
import { processImageFile } from '../utils/logoManager';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenNewSPP: () => void;
  onOpenPromptGuide?: () => void;
  onOpenSecurity: () => void;
  onLogout: () => void;
  currentUser: UserProfile;
  activeAreaFilter: SJAArea | 'ALL';
  onSelectAreaFilter: (area: SJAArea | 'ALL') => void;
  totalItemsCount: number;
  customLogo: string | null;
  onUpdateLogo: (newLogo: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenNewSPP,
  onOpenSecurity,
  onLogout,
  currentUser,
  activeAreaFilter,
  onSelectAreaFilter,
  totalItemsCount,
  customLogo,
  onUpdateLogo,
}) => {
  const isSuperadmin = currentUser.role === 'SUPERADMIN';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await processImageFile(file);
      onUpdateLogo(dataUrl);
      showToast('Logo berhasil diperbarui & disimpan otomatis!');
      setIsLogoModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Gagal memproses file foto');
    } finally {
      // Reset input agar bisa memilih file yang sama jika diinginkan
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResetLogo = () => {
    onUpdateLogo(null);
    showToast('Logo direset kembali ke default SJA');
    setIsLogoModalOpen(false);
  };

  const navItems = [
    {
      id: 'monitoring',
      label: 'Daftar SPP & Realisasi',
      icon: ClipboardList,
      description: 'Pemantauan pengadaan & SLA',
    },
    {
      id: 'analytics',
      label: 'Analitik Kinerja PIC',
      icon: BarChart3,
      description: 'Evaluasi efisiensi pengadaan',
    },
    {
      id: 'holidays',
      label: 'Kalender Hari Libur',
      icon: Calendar,
      description: 'SKB 3 Menteri & Weekend',
    },
    {
      id: 'googlesheet',
      label: 'Integrasi Google Sheet',
      icon: Database,
      badgeColor: 'text-emerald-500',
      description: 'Sinkronisasi 2 arah per area',
    },
  ];

  const handleSelectNav = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  const allAreas: SJAArea[] = ['SEPANJANG', 'KARAWANG', 'SUKODONO', 'SEMARANG'];

  return (
    <>
      {/* Toast Notifikasi Sukses Simpan Otomatis */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 shadow-xl px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 border-r border-slate-200/90 dark:border-slate-800/90 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          isMobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header: Brand Crest, Interactive Logo & Collapse Button */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800/90 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Interactive Logo Wrapper with Auto-Save */}
            <div className="relative group/logo shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                className="hidden"
                onChange={handleFileSelected}
              />

              <button
                type="button"
                onClick={() => setIsLogoModalOpen(true)}
                className="relative block rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 transition-transform active:scale-95"
                title="Klik untuk mengubah & menyimpan logo baru otomatis"
              >
                {customLogo ? (
                  <img
                    src={customLogo}
                    alt="Logo Perusahaan"
                    className="w-9 h-9 rounded-lg object-contain bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-md shrink-0 p-0.5"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-md shrink-0 ring-1 ring-white/10">
                    SJA
                  </div>
                )}

                {/* Camera Hover Badge */}
                <div className="absolute inset-0 bg-slate-900/70 rounded-lg flex items-center justify-center text-white opacity-0 group-hover/logo:opacity-100 transition-opacity backdrop-blur-2xs">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </button>
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 transition-opacity duration-200">
                <span className="block font-semibold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                  Realisasi SPP
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  {isSuperadmin ? 'Superadmin Portal' : `Area ${currentUser.area}`}
                </span>
              </div>
            )}
          </div>

          {/* Toggle Button for Desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
          >
            {isCollapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Close Button for Mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button: "+ Input SPP" */}
        <div className="p-3 border-b border-slate-200/90 dark:border-slate-800/80 shrink-0 space-y-2">
          <button
            onClick={() => {
              onOpenNewSPP();
              if (isMobileOpen) onCloseMobile();
            }}
            className={`w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-xs py-2.5 rounded-lg shadow-sm hover:shadow transition-all ${
              isCollapsed && !isMobileOpen ? 'px-0' : 'px-4'
            }`}
            title={isCollapsed && !isMobileOpen ? 'Tambah SPP Baru' : undefined}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {(!isCollapsed || isMobileOpen) && (
              <span className="truncate">Tambah SPP Baru</span>
            )}
          </button>
        </div>

        {/* Filter Area Dropdown/Selector (Khusus Superadmin) */}
        {isSuperadmin && (!isCollapsed || isMobileOpen) && (
          <div className="px-3 pt-3 pb-1 shrink-0">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1 flex items-center gap-1">
              <Building className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Filter Area Cabang:
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[11px]">
              <button
                onClick={() => onSelectAreaFilter('ALL')}
                className={`py-1 px-1.5 rounded text-center truncate transition-all ${
                  activeAreaFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Semua Area
              </button>
              {allAreas.map((areaKey) => (
                <button
                  key={areaKey}
                  onClick={() => onSelectAreaFilter(areaKey)}
                  className={`py-1 px-1.5 rounded text-center truncate transition-all ${
                    activeAreaFilter === areaKey
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={AREA_METADATA[areaKey]?.name}
                >
                  {AREA_METADATA[areaKey]?.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Menu Links */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {(!isCollapsed || isMobileOpen) && (
            <p className="px-2 pb-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
              Menu Utama
            </p>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-blue-50 dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-semibold border border-blue-200/80 dark:border-slate-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title={isCollapsed && !isMobileOpen ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                  }`}
                />

                {(!isCollapsed || isMobileOpen) && (
                  <div className="flex-1 text-left truncate">
                    <span className="block truncate">{item.label}</span>
                  </div>
                )}

                {isCollapsed && !isMobileOpen && (
                  <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 dark:bg-slate-950 text-white text-[11px] rounded-md shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 border border-slate-700">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer: SLA Info & User Card */}
        <div className="p-3 border-t border-slate-200/90 dark:border-slate-800/90 bg-slate-50/60 dark:bg-slate-950/50 shrink-0 space-y-2">
          {(!isCollapsed || isMobileOpen) && (
            <div className="px-2.5 py-2 bg-white dark:bg-slate-900/80 rounded-lg border border-slate-200/80 dark:border-slate-800/80 text-[11px] space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" /> SLA Limit:
                </span>
                <span className="font-semibold text-blue-700 dark:text-blue-300 font-mono">10 Hari Kerja</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px]">
                <span>Total Data:</span>
                <span className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{totalItemsCount} Dokumen</span>
              </div>
            </div>
          )}

          {/* User Account Tile */}
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200/60 dark:border-blue-800/60">
                {currentUser.name.charAt(0)}
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {currentUser.name}
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    {currentUser.role}
                  </span>
                </div>
              )}
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <button
                onClick={onLogout}
                className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                title="Keluar Akun"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Modal Edit / Ganti Logo Perusahaan (Auto-Save) */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Ganti Logo / Foto Profil
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tersimpan otomatis ke browser Anda
                </p>
              </div>
              <button
                onClick={() => setIsLogoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Preview Logo Saat Ini */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm p-1">
                {customLogo ? (
                  <img
                    src={customLogo}
                    alt="Pratinjau Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl rounded-lg">
                    SJA
                  </div>
                )}
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {customLogo ? 'Logo Kustom Aktif' : 'Logo Bawaan Standar (SJA)'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Pilih Foto dari Komputer</span>
              </button>

              {customLogo && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="w-full py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Kembalikan ke Logo Bawaan SJA</span>
                </button>
              )}
            </div>

            <p className="text-[10px] text-center text-slate-400 font-mono">
              Mendukung file PNG, JPG, WebP, dan SVG (disimpan otomatis).
            </p>
          </div>
        </div>
      )}
    </>
  );
};
