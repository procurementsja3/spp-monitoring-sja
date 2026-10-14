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

    // Deteksi khusus jika tautan Sukodono masih mengarah ke ID 404 yang telah terhapus
    if (area === 'SUKODONO' && (!savedSpreadsheetUrl || savedSpreadsheetUrl.includes('1a2xdnsX1QlKIyifygmMZnX0VkKnf-dXyX-iCb6XnHtM'))) {
      setSelectedSheetArea(area);
      setSheetUrlInput(savedSpreadsheetUrl || '');
      setIsSheetLinkModalOpen(true);
      showToast('Tautan Google Sheet Sukodono bawaan tidak ditemukan (404). Silakan masukkan tautan aktif Anda.');
      return;
    }

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

      {/* Sidebar Container (Liquid Glass Model) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white/70 dark:bg-slate-950/75 backdrop-blur-2xl backdrop-saturate-200 text-slate-800 dark:text-slate-100 border-r border-white/70 dark:border-white/10 shadow-[4px_0_36px_rgba(37,99,235,0.07)] dark:shadow-[4px_0_40px_rgba(0,0,0,0.65)] flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          isMobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Ambient Liquid Glass Glowing Fluid Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          {/* Liquid Orb 1 (Top Blue/Cyan fluid orb) */}
          <div className="absolute -top-20 -left-12 w-56 h-56 bg-gradient-to-br from-blue-500/25 via-cyan-400/20 to-transparent dark:from-blue-600/25 dark:via-cyan-500/20 rounded-full blur-3xl animate-liquid-orb-1" />
          {/* Liquid Orb 2 (Middle Indigo/Purple fluid orb) */}
          <div className="absolute top-1/3 -right-20 w-60 h-60 bg-gradient-to-tr from-indigo-500/25 via-purple-500/20 to-pink-500/10 dark:from-indigo-600/25 dark:via-purple-600/15 rounded-full blur-3xl animate-liquid-orb-2" />
          {/* Liquid Orb 3 (Bottom Emerald/Teal fluid orb) */}
          <div className="absolute -bottom-20 -left-10 w-52 h-52 bg-gradient-to-tr from-emerald-400/25 via-teal-400/20 to-transparent dark:from-emerald-500/20 dark:via-teal-500/15 rounded-full blur-3xl animate-liquid-orb-3" />
          {/* Specular Inner Glare Line on right border */}
          <div className="absolute inset-y-0 right-0 w-[1.5px] bg-gradient-to-b from-white/90 via-white/30 to-white/70 dark:from-white/30 dark:via-white/5 dark:to-white/20 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
          {/* Subtle horizontal glass sheen overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-white/20 dark:from-white/5 dark:via-transparent dark:to-white/[0.02] pointer-events-none" />
        </div>

        {/* Sidebar Header: Brand Crest, Interactive Logo & Collapse Button */}
        <div className="h-[4.25rem] px-3.5 flex items-center justify-between border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md shrink-0">
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
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/90 dark:bg-slate-900/90 border border-white/80 dark:border-white/15 shadow-md shadow-blue-500/10 shrink-0 p-0.5 flex items-center justify-center backdrop-blur-xs">
                    <div className="w-full h-full rounded-lg overflow-hidden bg-white/95 flex items-center justify-center p-0.5">
                      <img
                        src={customLogo}
                        alt="Logo Perusahaan"
                        className="w-full h-full object-contain rounded-md"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-md shadow-blue-500/25 shrink-0 ring-1 ring-white/30">
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
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white dark:border-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
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
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"></span>
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
            className="hidden lg:flex p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white/40 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 border border-transparent hover:border-white/50 dark:hover:border-white/10 backdrop-blur-xs transition-all shadow-2xs cursor-pointer"
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
            className="lg:hidden p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white/40 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 border border-transparent hover:border-white/50 dark:hover:border-white/10 backdrop-blur-xs transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button: "+ Input SPP" */}
        <div className="p-3 border-b border-white/60 dark:border-white/10 shrink-0 space-y-2 bg-gradient-to-b from-white/30 to-transparent dark:from-white/[0.02] dark:to-transparent">
          <button
            onClick={() => {
              onOpenNewSPP();
              if (isMobileOpen) onCloseMobile();
            }}
            className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.97] hover:scale-[1.02] hover:-translate-y-0.5 text-white font-semibold text-xs py-2.5 rounded-2xl shadow-lg shadow-blue-500/30 border border-white/35 hover:border-white/60 transition-all duration-300 ease-out cursor-pointer relative overflow-hidden group/btn ${
              isCollapsed && !isMobileOpen ? 'px-0' : 'px-4'
            }`}
            title={isCollapsed && !isMobileOpen ? 'Tambah SPP Baru' : undefined}
          >
            {/* iOS 26 Liquid Sheen Sweep */}
            <div className="absolute inset-0 -translate-x-[150%] group-hover/btn:translate-x-[200%] transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none skew-x-[-20deg]" />

            <div className="p-1 rounded-lg bg-white/20 ring-1 ring-white/30 shrink-0">
              <Plus className="w-3.5 h-3.5 shrink-0 transition-transform group-hover/btn:rotate-90 duration-300" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="truncate tracking-wide font-bold">Tambah SPP Baru</span>
            )}
          </button>
        </div>

        {/* Panel Filter Area & PIC Ringkas (Liquid Glass Dropdown) */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-3 pt-2 pb-2.5 shrink-0 border-b border-white/60 dark:border-white/10 bg-white/35 dark:bg-slate-900/35 backdrop-blur-md space-y-2">
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
                  className="w-full px-2.5 py-1.5 bg-white/75 dark:bg-slate-950/75 backdrop-blur-md border border-white/80 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 cursor-pointer shadow-2xs transition-all"
                >
                  <option value="ALL">🌐 Semua Area Cabang (4 Area)</option>
                  <option value="SEPANJANG">🏢 SJA Sepanjang (Lampiran 1)</option>
                  <option value="KARAWANG">🏢 SJA Karawang (Lampiran 2)</option>
                  <option value="SUKODONO">🏢 SJA Sukodono (Lampiran 3)</option>
                  <option value="SEMARANG">🏢 SJA Semarang (Lampiran 4)</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 dark:border-blue-400/20 rounded-xl text-xs backdrop-blur-xs">
                <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{AREA_METADATA[currentUser.area as SJAArea]?.name || currentUser.area}</span>
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-blue-200/70 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 font-bold border border-blue-300/40 dark:border-blue-700/40">
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
                className="w-full px-2.5 py-1.5 bg-white/75 dark:bg-slate-950/75 backdrop-blur-md border border-white/80 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 cursor-pointer shadow-2xs transition-all"
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
              <div className="flex items-center justify-between text-[10px] text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/15 px-2.5 py-1.5 rounded-xl border border-blue-500/20 dark:border-blue-400/20 backdrop-blur-xs">
                <span className="font-semibold truncate max-w-[85px]">PIC: {selectedPicFilter}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-1.5 py-0.5 rounded-md ${activeTab === 'dashboard' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'hover:underline'}`}
                    title="Buka Dashboard untuk PIC ini"
                  >
                    Dashboard
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('monitoring')}
                    className={`px-1.5 py-0.5 rounded-md ${activeTab === 'monitoring' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'hover:underline'}`}
                    title="Buka Daftar SPP untuk PIC ini"
                  >
                    Daftar SPP
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('analytics')}
                    className={`px-1.5 py-0.5 rounded-md ${activeTab === 'analytics' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'hover:underline'}`}
                    title="Buka Analisa Realisasi untuk PIC ini"
                  >
                    Realisasi
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Menu Links (Liquid Glass Items) */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {(!isCollapsed || isMobileOpen) && (
            <p className="px-2.5 pb-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-medium transition-all duration-300 ease-out group relative cursor-pointer overflow-hidden backdrop-blur-xl ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600/18 via-indigo-600/12 to-blue-500/10 dark:from-blue-500/25 dark:via-indigo-500/20 dark:to-blue-900/15 text-blue-800 dark:text-blue-200 font-bold border border-blue-400/50 dark:border-blue-400/40 shadow-[0_4px_20px_rgba(37,99,235,0.18)] dark:shadow-[0_4px_24px_rgba(37,99,235,0.35)] glass-capsule-light dark:glass-capsule-dark scale-[1.01]'
                      : 'text-slate-600 dark:text-slate-400 border border-transparent hover:border-white/90 dark:hover:border-white/20 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] hover:bg-gradient-to-r hover:from-white/90 hover:via-white/70 hover:to-white/85 dark:hover:from-slate-800/85 dark:hover:via-slate-800/60 dark:hover:to-indigo-950/50 hover:text-slate-900 dark:hover:text-white glass-capsule-light dark:glass-capsule-dark shadow-2xs'
                  }`}
                  title={isCollapsed && !isMobileOpen ? item.label : undefined}
                >
                  {/* iOS 26 Prismatic Liquid Light Sweep on Hover */}
                  <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/50 dark:via-white/25 to-transparent pointer-events-none skew-x-[-20deg]" />

                  {/* Glowing liquid active indicator on the left */}
                  {isActive ? (
                    <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1.5 rounded-full bg-gradient-to-b from-blue-400 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(59,130,246,0.9)] animate-pulse" />
                  ) : (
                    <span className="absolute left-1.5 top-3.5 bottom-3.5 w-1 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
                  )}

                  {/* Gem Glass Icon Pod */}
                  <div className={`p-2 rounded-xl transition-all duration-300 shrink-0 flex items-center justify-center relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/35 ring-1 ring-white/40 scale-105'
                      : 'bg-white/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 group-hover:bg-gradient-to-br group-hover:from-blue-500/25 group-hover:to-indigo-600/30 group-hover:text-blue-600 dark:group-hover:text-blue-300 group-hover:scale-110 group-hover:shadow-[0_0_14px_rgba(59,130,246,0.35)] border border-white/80 dark:border-white/10 group-hover:border-blue-400/40 backdrop-blur-md'
                  }`}>
                    <Icon className="w-4 h-4 transition-transform group-hover:rotate-3 duration-300" />
                  </div>

                  {/* Label & Dynamic Subtitle */}
                  {(!isCollapsed || isMobileOpen) && (
                    <div className="flex-1 text-left min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`block truncate text-xs transition-colors duration-200 ${
                          isActive
                            ? 'font-bold text-blue-700 dark:text-blue-300'
                            : 'font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-white'
                        }`}>
                          {item.label}
                        </span>
                        {item.id === 'googlesheet' && isSuperadmin && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/30 font-mono shadow-xs">
                            4 Area
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <span className={`block text-[10px] truncate transition-colors duration-200 ${
                          isActive
                            ? 'text-blue-600/80 dark:text-blue-300/80 font-medium'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-600/80 dark:group-hover:text-blue-300/80 font-normal'
                        }`}>
                          {item.description}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Collapsed Tooltip Bubble with iOS 26 Liquid Glass Style */}
                  {isCollapsed && !isMobileOpen && (
                    <div className="absolute left-full ml-3 px-3 py-2 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-2xl text-white text-[11px] rounded-xl shadow-2xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0 z-50 border border-white/20 glass-capsule-dark flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                      <div className="flex flex-col text-left">
                        <span className="font-bold">{item.label}</span>
                        {item.description && (
                          <span className="text-[9px] text-slate-400 font-normal">{item.description}</span>
                        )}
                      </div>
                    </div>
                  )}
                </button>

                {/* Submenu Khusus Superadmin: Sistem Dropdown List Ringkas untuk Buka & Atur Google Sheet Cabang */}
                {item.id === 'googlesheet' && isSuperadmin && (!isCollapsed || isMobileOpen) && (
                  <div className="mt-1 ml-3 pl-2.5 border-l-2 border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-r-xl border border-white/30 dark:border-white/5 space-y-1.5 p-2 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Pilih Cabang G-Sheet:</span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {/* Dropdown List Pemilihan Cabang */}
                      <select
                        value={selectedSidebarSheetArea}
                        onChange={(e) => setSelectedSidebarSheetArea(e.target.value as SJAArea)}
                        className="w-full px-2.5 py-1.5 bg-white/75 dark:bg-slate-950/75 backdrop-blur-md border border-white/80 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
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
                          className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-[11px] font-bold shadow-md shadow-emerald-600/20 border border-white/20 transition-all cursor-pointer"
                          title={`Buka Google Sheet ${AREA_METADATA[selectedSidebarSheetArea]?.name} di Tab Baru`}
                        >
                          <span>Buka Spreadsheet</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleEditAreaSheetLink(e, selectedSidebarSheetArea)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/60 hover:bg-white/90 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-white/70 dark:border-white/10 backdrop-blur-xs transition-colors cursor-pointer flex items-center gap-1"
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

        {/* Sidebar Footer: SLA Info & User Card (Liquid Glass Footer) */}
        <div className="p-3 border-t border-white/60 dark:border-white/10 bg-white/45 dark:bg-slate-950/50 backdrop-blur-md shrink-0 space-y-2">
          {(!isCollapsed || isMobileOpen) && (
            <div className="px-2.5 py-2 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/80 dark:border-white/10 text-[11px] space-y-1 shadow-2xs">
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

          {/* User Account Tile with iOS 26 Liquid Glass Hover */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-2xl border border-transparent hover:border-white/80 dark:hover:border-white/15 hover:bg-white/70 dark:hover:bg-slate-800/60 backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:shadow-blue-500/10 group/user relative overflow-hidden">
            {/* Liquid shine on hover */}
            <div className="absolute inset-0 -translate-x-[150%] group-hover/user:translate-x-[200%] transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent pointer-events-none skew-x-[-20deg]" />

            <div className="flex items-center gap-2.5 overflow-hidden relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md shadow-blue-500/25 ring-1 ring-white/40 transition-transform group-hover/user:scale-105 duration-300">
                {currentUser.name.charAt(0)}
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight group-hover/user:text-blue-600 dark:group-hover/user:text-blue-300 transition-colors">
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
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]"></span>
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
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer hover:scale-105 active:scale-95 relative"
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
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-[11px]">Tautan Bawaan Sukodono Tidak Ditemukan di Google Drive (404)</p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                        Data Sukodono tetap aman di Google Sheet. Jika ingin membuka dokumennya di tab baru, klik tombol cari di Google Drive di bawah ini untuk membuka file <code>SPP_Sukodono</code> langsung di akun Google Anda.
                      </p>
                    </div>
                  </div>
                  <div className="pt-1 pl-6">
                    <button
                      type="button"
                      onClick={() => window.open('https://drive.google.com/drive/search?q=SPP_Sukodono', '_blank')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Cari File &quot;SPP_Sukodono&quot; di Google Drive</span>
                    </button>
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
