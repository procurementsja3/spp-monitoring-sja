/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  SPPItem, 
  UserProfile, 
  SystemNotification, 
  AuditLog, 
  IndonesianHoliday, 
  GoogleSheetConfig,
  SJAArea,
  AreaSheetConfigMap
} from './types';
import { 
  INITIAL_USERS, 
  buildProcessedSPP, 
  DEFAULT_AREA_SHEET_CONFIGS, 
  AREA_METADATA,
  SAMPLE_DEMO_ITEMS
} from './utils/initialData';
import { 
  DEFAULT_INDONESIAN_HOLIDAYS, 
  calculateWorkingDays 
} from './utils/holidayCalendar';
import { generateSHA256Hash } from './utils/cryptoSim';
import { fetchFromGoogleSheet, pushToGoogleSheet } from './utils/googleSheetsConnector';
import { getStoredLogo, saveStoredLogo, removeStoredLogo } from './utils/logoManager';

// Components
import { LoginView } from './components/LoginView';
import { TopHeader } from './components/TopHeader';
import { Sidebar } from './components/Sidebar';
import { KPISummary } from './components/KPISummary';
import { SPPTable } from './components/SPPTable';
import { SPPFormModal } from './components/SPPFormModal';
import { VendorAnalytics } from './components/VendorAnalytics';
import { HolidayCalendarModal } from './components/HolidayCalendarModal';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ExportModal } from './components/ExportModal';
import { Security2FAModal } from './components/Security2FAModal';
import { PromptGitHubModal } from './components/PromptGitHubModal';

export default function App() {
  // 0. Theme Mode: 'dark' atau 'light' (Luxury Enterprise Experience)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('sja_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sja_theme', theme);
    } catch {}
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Logo Perusahaan Kustom dengan LocalStorage Auto-Save
  const [customLogo, setCustomLogo] = useState<string | null>(() => getStoredLogo());

  const handleUpdateLogo = (newLogo: string | null) => {
    setCustomLogo(newLogo);
    if (newLogo) {
      saveStoredLogo(newLogo);
      addAuditLog('UPDATE_LOGO', 'Memperbarui dan menyimpan foto profil / logo perusahaan otomatis');
    } else {
      removeStoredLogo();
      addAuditLog('RESET_LOGO', 'Mereset logo perusahaan kembali ke default SJA');
    }
  };

  // 1. User & Authentication (5 Akun: 1 Superadmin + 4 Area Cabang)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('sja_active_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null; // Menampilkan halaman login terlebih dahulu saat pertama kali aplikasi dibuka
  });

  // 2. Data SPP Utama dengan LocalStorage Persistence (Dibersihkan sesuai permintaan "hapus data sesuai foto")
  const [items, setItems] = useState<SPPItem[]>(() => {
    try {
      const saved = localStorage.getItem('spp_monitoring_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Bersihkan data dummy mock lama jika masih tersimpan di browser
          const isLegacyMockData = parsed.every(
            (p: any) => p.id && (p.id.startsWith('SPP-SPJ-') || p.id.startsWith('SPP-KRW-') || p.id.startsWith('SPP-SKD-') || p.id.startsWith('SPP-SMG-'))
          );
          if (isLegacyMockData) {
            localStorage.removeItem('spp_monitoring_data');
            return [];
          }

          return parsed.map((item: any) => {
            const slaLimit = item.slaLimit === 3 ? 10 : (item.slaLimit || 10);
            return {
              ...item,
              area: item.area || 'SEPANJANG',
              slaLimit,
              statusOntime: item.processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT',
              isSignificantDelay: item.processDays > slaLimit,
            };
          });
        }
      }
    } catch {}
    return buildProcessedSPP();
  });

  // 3. Kalender Libur Nasional
  const [holidays, setHolidays] = useState<IndonesianHoliday[]>(() => {
    try {
      const saved = localStorage.getItem('indonesian_holidays');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_INDONESIAN_HOLIDAYS;
  });

  // 4. Tab Navigasi Aktif
  const [activeTab, setActiveTab] = useState<string>('monitoring');

  // 5. Filter Area (Superadmin dapat memilih ALL atau area tertentu)
  const [activeAreaFilter, setActiveAreaFilter] = useState<SJAArea | 'ALL'>('ALL');

  // 6. Konfigurasi Google Sheet Per-Area (Sepanjang, Karawang, Sukodono, Semarang)
  const [areaConfigs, setAreaConfigs] = useState<AreaSheetConfigMap>(() => {
    try {
      const saved = localStorage.getItem('sja_area_sheet_configs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_AREA_SHEET_CONFIGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('sja_area_sheet_configs', JSON.stringify(areaConfigs));
    } catch {}
  }, [areaConfigs]);

  const handleUpdateAreaConfig = (area: SJAArea, newConfig: Partial<GoogleSheetConfig>) => {
    setAreaConfigs((prev) => ({
      ...prev,
      [area]: {
        ...prev[area],
        ...newConfig,
      },
    }));
  };

  // 7. Audit Trail Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'log-1',
      timestamp: '2026-03-30T16:20:00Z',
      userEmail: 'superadmin@sja.co.id',
      userName: 'Superadmin SJA',
      userRole: 'SUPERADMIN',
      action: 'SYSTEM_BOOT',
      details: 'Inisialisasi sistem multi-area & konfigurasi Google Sheet per-cabang',
      ipAddress: '192.168.1.100',
      checksum: 'e7a48d1c90f23b6a',
    },
    {
      id: 'log-2',
      timestamp: '2026-03-30T17:15:00Z',
      userEmail: 'sepanjang@sja.co.id',
      userName: 'SJA Sepanjang',
      userRole: 'AREA_USER',
      action: 'UPDATE_PO_CLOSE',
      targetId: 'SPP/SPJ/2026/03/0014',
      details: 'Penerbitan No. PO/SPJ/2026/03/0112, status otomatis CLOSE',
      ipAddress: '192.168.1.142',
      checksum: 'b39f128c772e01ab',
    },
  ]);

  // 8. Notifikasi Sistem
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // 9. Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<SPPItem | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isPromptGuideOpen, setIsPromptGuideOpen] = useState(false);
  
  // 10. Sidebar state (Toggle sistem)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Filter KPI interaktif
  const [kpiFilter, setKpiFilter] = useState<{ mode: 'ALL' | 'H3' | 'OPEN' | 'LATE'; label?: string }>({
    mode: 'ALL',
  });

  // Simpan ke localStorage saat data berubah
  useEffect(() => {
    try {
      localStorage.setItem('spp_monitoring_data', JSON.stringify(items));
    } catch {}
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem('indonesian_holidays', JSON.stringify(holidays));
    } catch {}
  }, [holidays]);

  // Handler Login & Logout
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('sja_active_user', JSON.stringify(user));
    } catch {}
    if (user.role !== 'SUPERADMIN' && user.area !== 'ALL') {
      const userArea = user.area as SJAArea;
      setActiveAreaFilter(userArea);

      // Terhubung otomatis ke Google Sheet cabang sesuai username saat login
      const targetConfig = areaConfigs[userArea];
      if (
        targetConfig?.webAppUrl &&
        targetConfig.webAppUrl.trim().startsWith('http') &&
        targetConfig.autoSync !== false
      ) {
        handlePullFromSheet(userArea).catch((err) => {
          console.warn(`Gagal sinkronisasi otomatis Google Sheet ${userArea} saat login:`, err);
        });
      }
    } else {
      setActiveAreaFilter('ALL');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('sja_active_user');
    } catch {}
  };

  // Evaluasi Notifikasi Otomatis
  useEffect(() => {
    const alerts: SystemNotification[] = [];

    items.forEach((item) => {
      if (item.isHPlus3Overdue) {
        alerts.push({
          id: `h3-${item.id}`,
          title: `Peringatan H+3 (${AREA_METADATA[item.area]?.name}): ${item.sppNumber}`,
          message: `SPP diterima sejak ${item.budgetReceivedDate} (${item.processDays} hari kerja) belum ada No. PO. Segera follow up PIC ${item.pic}.`,
          severity: 'urgent',
          sppNumber: item.sppNumber,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'H_PLUS_3',
          picTarget: item.pic,
        });
      }

      if (item.isSignificantDelay) {
        alerts.push({
          id: `delay-${item.id}`,
          title: `Keterlambatan Signifikan (${AREA_METADATA[item.area]?.name}): ${item.sppNumber}`,
          message: `Durasi pengerjaan telah mencapai ${item.processDays} hari kerja (melebihi batas SLA ${item.slaLimit} hari kerja).`,
          severity: 'warning',
          sppNumber: item.sppNumber,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'SIGNIFICANT_DELAY',
          picTarget: item.pic,
        });
      }
    });

    setNotifications(alerts);
  }, [items]);

  // Tambah log aktivitas
  const addAuditLog = async (action: string, details: string, targetId?: string) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const rawPayload = `${now}|${currentUser.email}|${action}|${details}`;
    const checksum = await generateSHA256Hash(rawPayload);

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: now,
      userEmail: currentUser.email,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      targetId,
      details,
      ipAddress: '192.168.1.100',
      checksum,
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Simpan SPP Baru atau Update
  const handleSaveSPP = async (itemsData: Partial<SPPItem>[]) => {
    if (!itemsData || itemsData.length === 0 || !currentUser) return;

    if (editItem) {
      const formData = itemsData[0];
      const calc = calculateWorkingDays(formData.budgetReceivedDate!, formData.poDate, holidays);
      const processDays = calc.workingDays;
      const hasPo = formData.poNumber && formData.poNumber.trim() !== '';
      const statusPO = hasPo ? 'CLOSE' : 'OPEN';
      const slaLimit = formData.slaLimit || 10;
      const statusOntime = processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT';
      const isHPlus3Overdue = statusPO === 'OPEN' && processDays >= 3;
      const isSignificantDelay = processDays > slaLimit;

      const updatedList = items.map((i) => {
        if (i.id === editItem.id) {
          return {
            ...i,
            ...formData,
            area: formData.area || i.area,
            processDays,
            statusPO,
            statusOntime,
            isHPlus3Overdue,
            isSignificantDelay,
            updatedAt: new Date().toISOString(),
          } as SPPItem;
        }
        return i;
      });
      setItems(updatedList);
      await addAuditLog('UPDATE_SPP', `Memperbarui dokumen SPP ${formData.sppNumber} (Area: ${formData.area || editItem.area})`, editItem.id);
    } else {
      const newCreatedItems: SPPItem[] = itemsData.map((formData, index) => {
        const calc = calculateWorkingDays(formData.budgetReceivedDate!, formData.poDate, holidays);
        const processDays = calc.workingDays;
        const hasPo = formData.poNumber && formData.poNumber.trim() !== '';
        const statusPO = hasPo ? 'CLOSE' : 'OPEN';
        const slaLimit = formData.slaLimit || 10;
        const statusOntime = processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT';
        const isHPlus3Overdue = statusPO === 'OPEN' && processDays >= 3;
        const isSignificantDelay = processDays > slaLimit;

        const assignedArea: SJAArea = formData.area || (currentUser.role === 'SUPERADMIN' ? (activeAreaFilter !== 'ALL' ? activeAreaFilter : 'SEPANJANG') : (currentUser.area as SJAArea));

        return {
          id: `SPP-${Date.now()}-${index}`,
          budgetReceivedDate: formData.budgetReceivedDate!,
          sppNumber: formData.sppNumber!,
          pic: formData.pic || currentUser.name,
          area: assignedArea,
          poDate: formData.poDate,
          poNumber: formData.poNumber,
          processDays,
          statusPO,
          statusOntime,
          slaLimit,
          isHPlus3Overdue,
          isSignificantDelay,
          notes: formData.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      setItems((prev) => [...newCreatedItems, ...prev]);
      await addAuditLog(
        'CREATE_SPP_BATCH',
        `Menyimpan batch ${newCreatedItems.length} dokumen SPP baru`
      );
    }

    setEditItem(null);
  };

  // Quick Update No PO (Otomatis Close)
  const handleQuickUpdatePO = async (id: string, poNumber: string, poDate: string) => {
    const updated = items.map((i) => {
      if (i.id === id) {
        const calc = calculateWorkingDays(i.budgetReceivedDate, poDate, holidays);
        const processDays = calc.workingDays;
        const slaLimit = i.slaLimit || 10;
        return {
          ...i,
          poNumber,
          poDate,
          statusPO: 'CLOSE' as const,
          processDays,
          statusOntime: processDays <= slaLimit ? ('ONTIME' as const) : ('TERLAMBAT' as const),
          isHPlus3Overdue: false,
          isSignificantDelay: processDays > slaLimit,
          updatedAt: new Date().toISOString(),
        };
      }
      return i;
    });

    setItems(updated);
    await addAuditLog(
      'QUICK_UPDATE_PO_CLOSE',
      `Memperbarui No. PO ${poNumber} tanggal ${poDate} untuk SPP ID ${id} -> Status otomatis CLOSE`,
      id
    );
  };

  // Hapus Single SPP
  const handleDeleteSPP = async (id: string) => {
    const target = items.find((i) => i.id === id);
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    await addAuditLog('DELETE_SPP', `Menghapus dokumen SPP ${target?.sppNumber || id} (Area: ${target?.area})`, id);
  };

  // Hapus Banyak SPP Sekaligus (Batch Delete)
  const handleDeleteBatchSPP = async (ids: string[]) => {
    const count = ids.length;
    const updated = items.filter((i) => !ids.includes(i.id));
    setItems(updated);
    await addAuditLog('DELETE_SPP_BATCH', `Menghapus ${count} dokumen SPP sekaligus`);
  };

  // Kosongkan Seluruh Data SPP
  const handleClearAllSPP = async () => {
    const count = items.length;
    setItems([]);
    localStorage.removeItem('spp_monitoring_data');
    await addAuditLog('CLEAR_ALL_SPP', `Mengosongkan seluruh data SPP (${count} data dibersihkan)`);
  };

  // Muat Contoh Data Demo
  const handleLoadSampleData = async () => {
    const sampleItems = buildProcessedSPP(SAMPLE_DEMO_ITEMS);
    setItems(sampleItems);
    await addAuditLog('LOAD_SAMPLE_DATA', `Memuat kembali ${sampleItems.length} contoh data demo SPP`);
  };

  // Tambah / Hapus Libur Nasional
  const handleAddHoliday = async (newH: IndonesianHoliday) => {
    const nextHolidays = [...holidays, newH];
    setHolidays(nextHolidays);

    const reprocessed = items.map((item) => {
      const calc = calculateWorkingDays(item.budgetReceivedDate, item.poDate, nextHolidays);
      return {
        ...item,
        processDays: calc.workingDays,
        statusOntime: calc.workingDays <= item.slaLimit ? 'ONTIME' : 'TERLAMBAT',
        isHPlus3Overdue: item.statusPO === 'OPEN' && calc.workingDays >= 3,
        isSignificantDelay: calc.workingDays > 10,
      } as SPPItem;
    });
    setItems(reprocessed);

    await addAuditLog('ADD_HOLIDAY', `Menambahkan tanggal libur kustom: ${newH.name} (${newH.date})`);
  };

  const handleDeleteHoliday = async (date: string) => {
    const nextHolidays = holidays.filter((h) => h.date !== date);
    setHolidays(nextHolidays);
    await addAuditLog('DELETE_HOLIDAY', `Menghapus tanggal libur: ${date}`);
  };

  // Sinkronisasi Google Sheets Per-Area
  const handlePullFromSheet = async (area: SJAArea) => {
    const cfg = areaConfigs[area];
    if (!cfg?.webAppUrl) throw new Error(`Web App URL belum diisi untuk ${AREA_METADATA[area]?.name}`);
    const rawFromSheet = await fetchFromGoogleSheet(cfg.webAppUrl);
    if (rawFromSheet && rawFromSheet.length > 0) {
      const tagged: SPPItem[] = rawFromSheet.map((i) => {
        const calc = calculateWorkingDays(i.budgetReceivedDate, i.poDate, holidays);
        const processDays = calc.workingDays;
        const statusPO = i.poNumber && i.poNumber.trim() !== '' ? 'CLOSE' : 'OPEN';
        const slaLimit = i.slaLimit || 10;
        const statusOntime = processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT';
        const isHPlus3Overdue = statusPO === 'OPEN' && processDays >= 3;
        const isSignificantDelay = processDays > slaLimit;

        return {
          ...i,
          id: i.id || `SPP-${i.sppNumber || Date.now()}`,
          area: i.area || area,
          processDays,
          statusPO,
          statusOntime,
          slaLimit,
          isHPlus3Overdue,
          isSignificantDelay,
          updatedAt: i.updatedAt || new Date().toISOString(),
        };
      });

      setItems((prev) => [
        ...tagged,
        ...prev.filter((i) => i.area !== area),
      ]);
      setAreaConfigs((prev) => ({
        ...prev,
        [area]: {
          ...prev[area],
          lastSyncTime: new Date().toISOString(),
          syncStatus: 'connected',
        },
      }));
      await addAuditLog('GOOGLE_SHEET_READ', `Berhasil menarik ${rawFromSheet.length} baris SPP Google Sheets untuk ${AREA_METADATA[area]?.name}`);
    }
  };

  const handlePushToSheet = async (area: SJAArea) => {
    const cfg = areaConfigs[area];
    if (!cfg?.webAppUrl) throw new Error(`Web App URL belum diisi untuk ${AREA_METADATA[area]?.name}`);
    const areaItems = items.filter((i) => i.area === area);
    await pushToGoogleSheet(cfg.webAppUrl, areaItems);
    setAreaConfigs((prev) => ({
      ...prev,
      [area]: {
        ...prev[area],
        lastSyncTime: new Date().toISOString(),
        syncStatus: 'connected',
      },
    }));
    await addAuditLog('GOOGLE_SHEET_PUSH', `Berhasil mengekspor ${areaItems.length} data SPP ${AREA_METADATA[area]?.name} ke Google Sheets`);
  };

  // Jika belum login, tampilkan layar login
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        customLogo={customLogo}
      />
    );
  }

  // Filter items berdasarkan hak akses area pengguna
  const areaScopedItems = items.filter((item) => {
    if (currentUser.role === 'SUPERADMIN') {
      if (activeAreaFilter === 'ALL') return true;
      return item.area === activeAreaFilter;
    }
    return item.area === currentUser.area;
  });

  // Item terfilter berdasarkan klik di KPI Cards
  const displayedItems = areaScopedItems.filter((item) => {
    if (kpiFilter.mode === 'H3') return item.isHPlus3Overdue;
    if (kpiFilter.mode === 'OPEN') return item.statusPO === 'OPEN';
    if (kpiFilter.mode === 'LATE') return item.statusOntime === 'TERLAMBAT';
    return true;
  });

  // Hitung jumlah data per area untuk Google Sheet modal
  const itemsByAreaCount: Record<SJAArea, number> = {
    SEPANJANG: items.filter((i) => i.area === 'SEPANJANG').length,
    KARAWANG: items.filter((i) => i.area === 'KARAWANG').length,
    SUKODONO: items.filter((i) => i.area === 'SUKODONO').length,
    SEMARANG: items.filter((i) => i.area === 'SEMARANG').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Sidebar System (Navigasi, + Input SPP, Filter Area & Logout) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenNewSPP={() => {
          setEditItem(null);
          setIsFormOpen(true);
        }}
        onOpenSecurity={() => setIsSecurityOpen(true)}
        onLogout={handleLogout}
        currentUser={currentUser}
        activeAreaFilter={activeAreaFilter}
        onSelectAreaFilter={setActiveAreaFilter}
        totalItemsCount={areaScopedItems.length}
        customLogo={customLogo}
        onUpdateLogo={handleUpdateLogo}
        areaConfigs={areaConfigs}
        onUpdateAreaConfig={handleUpdateAreaConfig}
      />

      {/* Main Content Area dengan transisi margin/padding sesuai toggle sidebar */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header dengan Jam Digital Real-Time, Indikator Area & Toggle Button */}
        <TopHeader
          currentUser={currentUser}
          activeTab={activeTab}
          notifications={notifications}
          onOpenNotifications={() => setIsNotifOpen(true)}
          onOpenSecurity={() => setIsSecurityOpen(true)}
          onToggleSidebar={() => {
            if (window.innerWidth < 1024) {
              setIsMobileSidebarOpen((prev) => !prev);
            } else {
              setIsSidebarCollapsed((prev) => !prev);
            }
          }}
          onLogout={handleLogout}
          isSidebarCollapsed={isSidebarCollapsed}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* KPI Cards (Selalu terlihat di tab Monitoring) */}
          {activeTab === 'monitoring' && (
            <KPISummary
              items={areaScopedItems}
              onFilterHPlus3={() => setKpiFilter({ mode: 'H3', label: 'Alert H+3 Tanpa PO' })}
              onFilterOpen={() => setKpiFilter({ mode: 'OPEN', label: 'Status PO Open (Menunggu Penerbitan PO)' })}
              onFilterLate={() => setKpiFilter({ mode: 'LATE', label: 'Melewati Target SLA Durasi Kerja' })}
              onResetFilter={() => setKpiFilter({ mode: 'ALL' })}
              activeFilterLabel={kpiFilter.label}
            />
          )}

          {/* Tab 1: Monitoring SPP (Core Grid) */}
          {activeTab === 'monitoring' && (
            <SPPTable
              items={displayedItems}
              currentUser={currentUser}
              activeAreaFilter={activeAreaFilter}
              onSelectAreaFilter={setActiveAreaFilter}
              onEdit={(item) => {
                setEditItem(item);
                setIsFormOpen(true);
              }}
              onDelete={handleDeleteSPP}
              onDeleteBatch={handleDeleteBatchSPP}
              onClearAll={handleClearAllSPP}
              onLoadSampleData={handleLoadSampleData}
              onOpenNewSPP={() => {
                setEditItem(null);
                setIsFormOpen(true);
              }}
              onQuickUpdatePO={handleQuickUpdatePO}
              onSendInstantAlert={(item) => {
                setIsNotifOpen(true);
              }}
              onOpenExportModal={() => setIsExportOpen(true)}
            />
          )}

          {/* Tab 2: Analitik Kinerja PIC */}
          {activeTab === 'analytics' && <VendorAnalytics items={areaScopedItems} />}

          {/* Tab 3: Kalender Libur SKB 3 Menteri */}
          {activeTab === 'holidays' && (
            <HolidayCalendarModal
              holidays={holidays}
              onAddHoliday={handleAddHoliday}
              onDeleteHoliday={handleDeleteHoliday}
              currentUser={currentUser}
            />
          )}

          {/* Tab 4: Integrasi Google Sheet Per-Area */}
          {activeTab === 'googlesheet' && (
            <GoogleSheetModal
              currentUser={currentUser}
              areaConfigs={areaConfigs}
              onUpdateAreaConfig={handleUpdateAreaConfig}
              onPullFromSheet={handlePullFromSheet}
              onPushToSheet={handlePushToSheet}
              itemsByAreaCount={itemsByAreaCount}
            />
          )}
        </main>

        {/* Modals & Drawers */}
        <SPPFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveSPP}
          editItem={editItem}
          holidays={holidays}
          currentUser={currentUser}
          currentAreaFilter={activeAreaFilter}
        />

        <NotificationDrawer
          isOpen={isNotifOpen}
          onClose={() => setIsNotifOpen(false)}
          notifications={notifications}
          onMarkAllAsRead={() => {
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          }}
          onClearNotifications={() => setNotifications([])}
          items={areaScopedItems}
        />

        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          items={areaScopedItems}
        />

        <Security2FAModal
          isOpen={isSecurityOpen}
          onClose={() => setIsSecurityOpen(false)}
          currentUser={currentUser}
          onChangeUser={(user: UserProfile) => {
            setCurrentUser(user);
            try {
              localStorage.setItem('sja_active_user', JSON.stringify(user));
            } catch {}
            if (user.role !== 'SUPERADMIN' && user.area !== 'ALL') {
              setActiveAreaFilter(user.area as SJAArea);
            }
          }}
          onToggle2FA={(enabled) => {
            setCurrentUser((prev) => (prev ? { ...prev, twoFactorEnabled: enabled } : null));
            addAuditLog('TOGGLE_2FA', `Mengubah status 2FA menjadi ${enabled ? 'Aktif' : 'Nonaktif'}`);
          }}
          auditLogs={auditLogs}
        />

        <PromptGitHubModal
          isOpen={isPromptGuideOpen}
          onClose={() => setIsPromptGuideOpen(false)}
        />

        {/* Footer Minimalis & Mewah */}
        <footer className="border-t border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md py-4 px-6 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto transition-colors">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Sistem Monitoring Realisasi SPP</span>
            <span>·</span>
            <span>PT SJA Procurement Management</span>
            <span>·</span>
            <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
              {currentUser.role === 'SUPERADMIN' ? 'Akses: Superadmin (All Areas)' : `Akses: ${currentUser.name}`}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500 font-mono text-[11px]">
            <span>Kalkulasi: Working Days (SKB 3 Menteri)</span>
            <span>·</span>
            <span>Multi-Area Google Sheet Sync</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
