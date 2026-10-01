import React from 'react';
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
  Layers
} from 'lucide-react';
import { UserProfile, SJAArea } from '../types';
import { AREA_METADATA } from '../utils/initialData';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenNewSPP: () => void;
  onOpenPromptGuide: () => void;
  onOpenSecurity: () => void;
  onLogout: () => void;
  currentUser: UserProfile;
  activeAreaFilter: SJAArea | 'ALL';
  onSelectAreaFilter: (area: SJAArea | 'ALL') => void;
  totalItemsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenNewSPP,
  onOpenPromptGuide,
  onOpenSecurity,
  onLogout,
  currentUser,
  activeAreaFilter,
  onSelectAreaFilter,
  totalItemsCount,
}) => {
  const isSuperadmin = currentUser.role === 'SUPERADMIN';

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
        className={`fixed top-0 bottom-0 left-0 z-50 bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          isMobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header: Brand & Toggle Button */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-md shrink-0">
              SJA
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 transition-opacity duration-200">
                <span className="block font-bold text-sm tracking-tight text-white truncate">
                  Realisasi SPP
                </span>
                <span className="block text-[10px] text-slate-400 font-mono truncate">
                  {isSuperadmin ? 'Superadmin Portal' : `Area ${currentUser.area}`}
                </span>
              </div>
            )}
          </div>

          {/* Toggle Button for Desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
          >
            {isCollapsed ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>

          {/* Close Button for Mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button: "+ Input SPP" */}
        <div className="p-3 border-b border-slate-800/80 shrink-0 space-y-2">
          <button
            onClick={() => {
              onOpenNewSPP();
              if (isMobileOpen) onCloseMobile();
            }}
            className={`w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all ${
              isCollapsed && !isMobileOpen ? 'px-0' : 'px-4'
            }`}
            title="Input Data SPP Baru"
          >
            <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
            {(!isCollapsed || isMobileOpen) && (
              <span className="tracking-wide whitespace-nowrap">+ Input SPP</span>
            )}
          </button>

          {/* Area Selector for Superadmin */}
          {(!isCollapsed || isMobileOpen) && isSuperadmin && (
            <div className="pt-1">
              <label className="block text-[10px] font-mono text-slate-400 font-semibold mb-1 uppercase">
                Filter Area (Superadmin):
              </label>
              <select
                value={activeAreaFilter}
                onChange={(e) => onSelectAreaFilter(e.target.value as SJAArea | 'ALL')}
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-blue-300 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">🌐 Semua Area (Konsolidasi)</option>
                {allAreas.map((a) => (
                  <option key={a} value={a}>
                    🏢 {AREA_METADATA[a].name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Active Area Badge for Area User */}
          {(!isCollapsed || isMobileOpen) && !isSuperadmin && (
            <div className="px-2 py-1 bg-slate-800/70 border border-slate-700/60 rounded flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Area Cabang:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {currentUser.name}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="px-2 mb-1.5">
            {(!isCollapsed || isMobileOpen) && (
              <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
                Menu Utama
              </p>
            )}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
                title={isCollapsed && !isMobileOpen ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? 'text-blue-400'
                      : item.badgeColor
                      ? item.badgeColor
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />

                {(!isCollapsed || isMobileOpen) && (
                  <div className="flex-1 text-left truncate">
                    <span className="block truncate">{item.label}</span>
                  </div>
                )}

                {isCollapsed && !isMobileOpen && (
                  <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-950 text-white text-[11px] rounded shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 border border-slate-700">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer: User Card, SLA Info & Logout Button */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50 shrink-0 space-y-2">
          {(!isCollapsed || isMobileOpen) && (
            <div className="px-2 py-1.5 bg-slate-900/80 rounded border border-slate-800/80 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-cyan-400" /> SLA Limit:
                </span>
                <span className="font-bold text-cyan-300 font-mono">10 Hari Kerja</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span>Total Data:</span>
                <span className="text-slate-200 font-mono font-semibold">{totalItemsCount} Dokumen</span>
              </div>
            </div>
          )}

          {/* User Account Card */}
          <button
            onClick={onOpenSecurity}
            className={`w-full flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-left transition-colors border border-slate-700/40 ${
              isCollapsed && !isMobileOpen ? 'justify-center px-1' : ''
            }`}
            title="Kelola Role & Keamanan 2FA"
          >
            <div className="relative shrink-0">
              <div className="w-7 h-7 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                  currentUser.twoFactorEnabled ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={currentUser.twoFactorEnabled ? '2FA Aktif' : '2FA Belum Aktif'}
              />
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-200 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  {isSuperadmin ? 'SUPERADMIN' : `Area ${currentUser.area}`}
                </p>
              </div>
            )}
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 border border-rose-900/30 transition-colors ${
              isCollapsed && !isMobileOpen ? 'justify-center px-1' : ''
            }`}
            title="Keluar / Ganti Akun"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span>Keluar / Ganti Akun</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
