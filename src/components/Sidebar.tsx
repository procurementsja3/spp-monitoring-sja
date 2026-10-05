import React, { useState, useRef } from 'react';
import { 
  LayoutDashboard,
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
  Check,
  ExternalLink,
  Edit2,
  FileSpreadsheet,
  Globe,
  Download,
  Copy,
  Search,
  AlertCircle,
} from 'lucide-react';
import { UserProfile, SJAArea, AreaSheetConfigMap, GoogleSheetConfig } from '../types';
import { AREA_METADATA, AREA_PIC_LIST } from '../utils/initialData';
import { processImageFile } from '../utils/logoManager';
import { OFFICIAL_4_PLANTS_CONFIGS } from '../utils/cloudSync';

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
  areaConfigs?: AreaSheetConfigMap;
  onUpdateAreaConfig?: (area: SJAArea, newConfig: Partial<GoogleSheetConfig>) => void;
  selectedPicFilter?: string;
  onSelectPicFilter?: (pic: string) => void;
  searchPicQuery?: string;
  onSearchPicQuery?: (q: string) => void;
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
  areaConfigs,
  onUpdateAreaConfig,
  selectedPicFilter,
  onSelectPicFilter,
  searchPicQuery,
  onSearchPicQuery,
}) => {
  const isSuperadmin = currentUser.role === 'SUPERADMIN';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Setting / Buka Tautan Google Sheet Cabang
  const [selectedSheetArea, setSelectedSheetArea] = useState<SJAArea | null>(null);
  const [selectedSidebarSheetArea, setSelectedSidebarSheetArea] = useState<SJAArea>('SEPANJANG');
  const [isSheetLinkModalOpen, setIsSheetLinkModalOpen] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState('');

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

  // Handler Buka Google Sheet Cabang (Superadmin)
  const handleOpenAreaSheet = (area: SJAArea) => {
    const config = areaConfigs?.[area];
    const savedSpreadsheetUrl = config?.spreadsheetUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS[area]?.spreadsheetUrl;

    if (savedSpreadsheetUrl && savedSpreadsheetUrl.startsWith('http')) {
      window.open(savedSpreadsheetUrl, '_blank');
      showToast(`Membuka Google Sheet ${AREA_METADATA[area].name}...`);
    } else {
      // Jika belum disetel tautan spreadsheet langsung, buka dialog konfigurasi
      setSelectedSheetArea(area);
      setSheetUrlInput(config?.spreadsheetUrl || OFFICIAL_4_PLANTS_CONFIGS[area]?.spreadsheetUrl || '');
      setIsSheetLinkModalOpen(true);
    }
  };

  const handleEditAreaSheetLink = (e: React.MouseEvent, area: SJAArea) => {
    e.stopPropagation();
    setSelectedSheetArea(area);
    setSheetUrlInput(areaConfigs?.[area]?.spreadsheetUrl?.trim() || OFFICIAL_4_PLANTS_CONFIGS[area]?.spreadsheetUrl || '');
    setIsSheetLinkModalOpen(true);
  };

  const handleSaveAndOpenSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSheetArea) return;
    const cleanUrl = sheetUrlInput.trim();
    if (cleanUrl) {
      onUpdateAreaConfig?.(selectedSheetArea, { spreadsheetUrl: cleanUrl });
      showToast(`Tautan Google Sheet ${AREA_METADATA[selectedSheetArea].name} tersimpan!`);
      window.open(cleanUrl, '_blank');
    } else {
      window.open('https://docs.google.com/spreadsheets/', '_blank');
    }
    setIsSheetLinkModalOpen(false);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Realisasi SPP',
      icon: LayoutDashboard,
      description: 'Ringkasan KPI & Cabang SJA',
    },
    {
      id: 'monitoring',
      label: 'Daftar SPP & Realisasi',
      icon: ClipboardList,
      description: 'Pemantauan pengadaan & SLA',
    },
    {
      id: 'analytics',
      label: 'Analisa Kinerja PIC',
      icon: BarChart3,
      description: 'Dashboard 3D Bar Code & Efisiensi',
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
      {/* Toast Notifikasi Sukses */}
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
        <div className="h-[4.25rem] px-3.5 flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800/90 shrink-0">
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
                className="relative block rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 transition-transform active:scale-95"
                title="Klik untuk mengubah & menyimpan logo baru otomatis"
              >
                {customLogo ? (
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-md shrink-0 p-0.5 flex items-center justify-center">
                    <div className="w-full h-full rounded-lg overflow-hidden bg-white flex items-center justify-center p-0.5">
                      <img
                        src={customLogo}
                        alt="Logo Perusahaan"
                        className="w-full h-full object-contain rounded-md"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-md shrink-0 ring-1 ring-white/10">
                    SJA
                  </div>
                )}

                {/* Camera Hover Badge */}
                <div className="absolute inset-0 bg-slate-900/70 rounded-xl flex items-center justify-center text-white opacity-0 group-hover/logo:opacity-100 transition-opacity backdrop-blur-2xs">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </button>

              {/* Status Online saat Sidebar dalam keadaan Ciut / Collapsed */}
              {isCollapsed && !isMobileOpen && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5"
                  title={`Status: Online (${isSuperadmin ? 'Superadmin' : `Area ${currentUser.area}`})`}
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white dark:border-slate-950"></span>
                </span>
              )}
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 transition-opacity duration-200 flex flex-col justify-center">
                <span className="block font-bold text-sm tracking-tight text-slate-900 dark:text-white truncate leading-tight">
                  Realisasi SPP
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate font-medium">
                  {isSuperadmin ? 'Superadmin Portal' : `Area  ${currentUser.area}`}
                </span>

                {/* Status Online dengan Bulatan Hijau Kedip-Kedip (Aktif untuk semua user login) */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide font-sans leading-none">
                    Online
                  </span>
                </div>
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

        {/* Action Button: "+ Input SPP" (Hanya untuk User Cabang, Tidak untuk Superadmin) */}
        {!isSuperadmin && (
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
        )}

        {/* Panel Filter Area & PIC Ringkas (Sistem Drop Down List Hemat Ruang agar Menu Utama Terlihat) */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-3 pt-2 pb-2.5 shrink-0 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
            {/* 1. Dropdown List Filter Area Cabang (Khusus Superadmin) */}
            {isSuperadmin ? (
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1">
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>Filter Area Cabang:</span>
                  </span>
                  {activeAreaFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => onSelectAreaFilter('ALL')}
                      className="text-[9px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-sans font-semibold"
                    >
                      Semua Area
                    </button>
                  )}
                </div>
                <select
                  value={activeAreaFilter}
                  onChange={(e) => onSelectAreaFilter(e.target.value as SJAArea | 'ALL')}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">🌐 Semua Area Cabang (4 Area)</option>
                  <option value="SEPANJANG">🏢 SJA Sepanjang (Lampiran 1)</option>
                  <option value="KARAWANG">🏢 SJA Karawang (Lampiran 2)</option>
                  <option value="SUKODONO">🏢 SJA Sukodono (Lampiran 3)</option>
                  <option value="SEMARANG">🏢 SJA Semarang (Lampiran 4)</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-lg text-xs">
                <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{AREA_METADATA[currentUser.area as SJAArea]?.name || currentUser.area}</span>
                </span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-200/70 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold">
                  Cabang Login
                </span>
              </div>
            )}

            {/* 2. Dropdown List Pencarian & Filter PIC */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <Search className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span>Pencarian PIC:</span>
                </span>
                {selectedPicFilter && selectedPicFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPicFilter?.('ALL');
                      onSearchPicQuery?.('');
                    }}
                    className="text-[9px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer font-sans font-semibold"
                  >
                    Reset PIC
                  </button>
                )}
              </div>

              <select
                value={selectedPicFilter || 'ALL'}
                onChange={(e) => {
                  onSelectPicFilter?.(e.target.value);
                  onSearchPicQuery?.('');
                }}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                {isSuperadmin ? (
                  <>
                    <option value="ALL">👤 Semua PIC (Seluruh 4 Cabang)</option>
                    <optgroup label="🏢 SJA Sepanjang (Lampiran 1)">
                      {AREA_PIC_LIST.SEPANJANG.map((p) => (
                        <option key={`sb-sep-${p}`} value={p}>
                          PIC: {p} (Sepanjang)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🏢 SJA Karawang (Lampiran 2)">
                      {AREA_PIC_LIST.KARAWANG.map((p) => (
                        <option key={`sb-krw-${p}`} value={p}>
                          PIC: {p} (Karawang)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🏢 SJA Sukodono (Lampiran 3)">
                      {AREA_PIC_LIST.SUKODONO.map((p) => (
                        <option key={`sb-skd-${p}`} value={p}>
                          PIC: {p} (Sukodono)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🏢 SJA Semarang (Lampiran 4)">
                      {AREA_PIC_LIST.SEMARANG.map((p) => (
                        <option key={`sb-smg-${p}`} value={p}>
                          PIC: {p} (Semarang)
                        </option>
                      ))}
                    </optgroup>
                  </>
                ) : (
                  <>
                    <option value="ALL">
                      👤 Semua PIC {AREA_METADATA[currentUser.area as SJAArea]?.name || ''}
                    </option>
                    {(AREA_PIC_LIST[currentUser.area as SJAArea] || []).map((p) => (
                      <option key={`sb-usr-${p}`} value={p}>
                        PIC: {p}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Quick Links saat PIC Terpilih */}
            {selectedPicFilter && selectedPicFilter !== 'ALL' && (
              <div className="flex items-center justify-between text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded-md border border-blue-200/60 dark:border-blue-900/40">
                <span className="font-semibold truncate max-w-[85px]">PIC: {selectedPicFilter}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-1 rounded ${activeTab === 'dashboard' ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-white font-bold' : 'hover:underline'}`}
                    title="Buka Dashboard untuk PIC ini"
                  >
                    Dashboard
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('monitoring')}
                    className={`px-1 rounded ${activeTab === 'monitoring' ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-white font-bold' : 'hover:underline'}`}
                    title="Buka Daftar SPP untuk PIC ini"
                  >
                    Daftar SPP
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('analytics')}
                    className={`px-1 rounded ${activeTab === 'analytics' ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-white font-bold' : 'hover:underline'}`}
                    title="Buka Analisa Realisasi untuk PIC ini"
                  >
                    Realisasi
                  </button>
                </div>
              </div>
            )}
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
              <div key={item.id} className="space-y-1">
                <button
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
                    <div className="flex-1 text-left truncate flex items-center justify-between">
                      <span className="block truncate">{item.label}</span>
                      {item.id === 'googlesheet' && isSuperadmin && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold">
                          4 Area
                        </span>
                      )}
                    </div>
                  )}

                  {isCollapsed && !isMobileOpen && (
                    <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 dark:bg-slate-950 text-white text-[11px] rounded-md shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 border border-slate-700">
                      {item.label}
                    </div>
                  )}
                </button>

                {/* Submenu Khusus Superadmin: Sistem Dropdown List Ringkas untuk Buka & Atur Google Sheet Cabang */}
                {item.id === 'googlesheet' && isSuperadmin && (!isCollapsed || isMobileOpen) && (
                  <div className="mt-1 ml-3 pl-2.5 border-l-2 border-emerald-500/40 dark:border-emerald-500/30 space-y-1.5 py-1 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Pilih Cabang G-Sheet:</span>
                      </span>
                    </div>

                    <div className="space-y-1">
                      {/* Dropdown List Pemilihan Cabang */}
                      <select
                        value={selectedSidebarSheetArea}
                        onChange={(e) => setSelectedSidebarSheetArea(e.target.value as SJAArea)}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                      >
                        <option value="SEPANJANG">🏢 SJA Sepanjang (Lampiran 1)</option>
                        <option value="KARAWANG">🏢 SJA Karawang (Lampiran 2)</option>
                        <option value="SUKODONO">🏢 SJA Sukodono (Lampiran 3)</option>
                        <option value="SEMARANG">🏢 SJA Semarang (Lampiran 4)</option>
                      </select>

                      {/* Tombol Aksi Buka dan Atur URL Cabang Terpilih */}
                      <div className="flex items-center gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleOpenAreaSheet(selectedSidebarSheetArea)}
                          className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                          title={`Buka Google Sheet ${AREA_METADATA[selectedSidebarSheetArea]?.name} di Tab Baru`}
                        >
                          <span>Buka Spreadsheet</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleEditAreaSheetLink(e, selectedSidebarSheetArea)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                          title={`Atur tautan URL Google Sheet ${AREA_METADATA[selectedSidebarSheetArea]?.name}`}
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Atur</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                  <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {currentUser.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate leading-none">
                      {currentUser.role}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 leading-none">·</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 leading-none">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span>Online</span>
                    </span>
                  </div>
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

      {/* Modal Dialog Atur / Buka Tautan Google Sheet Cabang */}
      {isSheetLinkModalOpen && selectedSheetArea && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Google Sheet · {AREA_METADATA[selectedSheetArea].name}
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold font-mono">
                      {selectedSheetArea === 'SEPANJANG' ? 'Lampiran 1' :
                       selectedSheetArea === 'KARAWANG' ? 'Lampiran 2' :
                       selectedSheetArea === 'SUKODONO' ? 'Lampiran 3' : 'Lampiran 4'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Akses Langsung Dokumen Spreadsheet Cabang
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSheetLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Info Format 13 Kolom Sesuai Lampiran */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Standar Format 13 Kolom Dokumen:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const csvContent = "ID Dokumen,Tanggal Terima Budget,Nomor SPP,Area Cabang,PIC Pengadaan,Tanggal PO,Nomor PO,Hari Kerja Proses,Status PO,Status SLA,Alert H+3,Catatan,Terakhir Diperbarui\n";
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `Template_SPP_${AREA_METADATA[selectedSheetArea].name.replace(/\s+/g, '_')}_13Kolom.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Download className="w-3 h-3" />
                  <span>Download CSV Header</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono leading-relaxed line-clamp-2">
                ID Dokumen, Tanggal Terima Budget, Nomor SPP, Area Cabang, PIC Pengadaan, Tanggal PO, Nomor PO, Hari Kerja Proses, Status PO, Status SLA, Alert H+3, Catatan, Terakhir Diperbarui
              </p>
            </div>

            <form onSubmit={handleSaveAndOpenSheet} className="space-y-3.5">
              {selectedSheetArea === 'SUKODONO' && (!sheetUrlInput || sheetUrlInput.includes('1a2xdnsX1QlKIyifygmMZnX0VkKnf-dXyX-iCb6XnHtM')) && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-[11px]">Tautan Bawaan Sukodono Tidak Ditemukan di Google Drive (404)</p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                      File spreadsheet bawaan Sukodono telah dipindahkan atau dihapus di Google Drive. Silakan buka Google Sheet Sukodono Anda, salin URL-nya dari kolom alamat browser, lalu tempelkan di kotak bawah ini.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL / Link Dokumen Google Spreadsheet ({selectedSheetArea === 'SEPANJANG' ? 'Lampiran 1' : selectedSheetArea === 'KARAWANG' ? 'Lampiran 2' : selectedSheetArea === 'SUKODONO' ? 'Lampiran 3' : 'Lampiran 4'}):
                </label>
                <input
                  type="url"
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Tempelkan tautan file Google Spreadsheet untuk cabang ini. Tautan akan tersimpan otomatis.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    window.open('https://docs.google.com/spreadsheets/', '_blank');
                    setIsSheetLinkModalOpen(false);
                  }}
                  className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors"
                >
                  Buka Google Sheets Home
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <span>Simpan &amp; Buka G Sheet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm p-1">
                <div className="w-full h-full rounded-xl overflow-hidden bg-white flex items-center justify-center p-0.5">
                  {customLogo ? (
                    <img
                      src={customLogo}
                      alt="Pratinjau Logo"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl rounded-lg">
                      SJA
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {customLogo ? 'Logo Kustom Aktif (Mengikuti Shape Dinamis)' : 'Logo Bawaan Standar (SJA)'}
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
                <span>Pilih Foto Baru dari Komputer</span>
              </button>

              {customLogo && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = customLogo;
                        link.download = 'logo.png';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        showToast('File logo.png berhasil diunduh!');
                      }}
                      className="py-2 px-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Unduh file logo.png untuk dimasukkan ke folder public/ agar otomatis muncul bagi semua pengguna"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh logo.png</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(customLogo);
                        showToast('Kode logo disalin ke clipboard!');
                      }}
                      className="py-2 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Salin kode Base64 untuk dikirim ke chat"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Kode</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="w-full py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Kembalikan ke Logo Default Sistem</span>
                  </button>
                </>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-slate-950/60 border border-blue-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <span className="font-semibold text-blue-900 dark:text-blue-300 block">
                💡 Agar Tampil Otomatis Bagi Semua User Lain:
              </span>
              <p className="text-[10px] leading-relaxed">
                Unduh file <strong>logo.png</strong> di atas, lalu masukkan ke dalam folder <strong>public/</strong> di laptop Anda dan lakukan Push ke GitHub. Semua user di link live akan otomatis melihat logo ini sejak halaman login awal!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
