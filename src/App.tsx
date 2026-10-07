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
  AREA_PIC_LIST,
  SAMPLE_DEMO_ITEMS
} from './utils/initialData';
import { 
  DEFAULT_INDONESIAN_HOLIDAYS, 
  calculateWorkingDays 
} from './utils/holidayCalendar';
import { generateSHA256Hash } from './utils/cryptoSim';
import { 
  fetchFromGoogleSheet, 
  pushToGoogleSheet, 
  clearGoogleSheet, 
  normalizeDateString 
} from './utils/googleSheetsConnector';
import { CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { getStoredLogo, saveStoredLogo, removeStoredLogo } from './utils/logoManager';
import { 
  fetchCloudAreaConfigs, 
  saveCloudAreaConfigToServer, 
  fetchCloudSPPItems, 
  saveCloudSPPItemsToServer, 
  getFallbackAreaConfigs 
} from './utils/cloudSync';

import { ExecutiveDashboard } from './components/ExecutiveDashboard';
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

// Helper re-evaluasi dinamis seluruh metrik hari kerja proses (>24 jam = 1 hari, same day = 0 hari)
export function recalculateSPPFields(item: any, holidaysList: IndonesianHoliday[] = DEFAULT_INDONESIAN_HOLIDAYS): SPPItem {
  const isUrgent = !!item.isUrgentAdvance;
  const calc = calculateWorkingDays(item.budgetReceivedDate, item.poDate || undefined, holidaysList);
  const hasPo = !!(item.poNumber && String(item.poNumber).trim() !== '');
  const statusPO = hasPo ? 'CLOSE' : 'OPEN';
  const slaLimit = item.slaLimit === 3 ? 10 : (item.slaLimit || 10);
  const processDays = isUrgent && hasPo ? 0 : calc.workingDays;
  const statusOntime = isUrgent ? 'ONTIME' : (processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT');
  const isHPlus3Overdue = !isUrgent && statusPO === 'OPEN' && processDays >= 3;
  const isSignificantDelay = !isUrgent && processDays > slaLimit;

  return {
    ...item,
    area: item.area || 'SEPANJANG',
    processDays,
    statusPO,
    statusOntime,
    isHPlus3Overdue,
    isSignificantDelay,
    slaLimit,
  };
}

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

          return parsed.map((item: any) => recalculateSPPFields(item));
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
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // 5. Filter Area (Superadmin dapat memilih ALL atau area tertentu)
  const [activeAreaFilter, setActiveAreaFilter] = useState<SJAArea | 'ALL'>('ALL');

  // 5b. Filter & Pencarian PIC Global (Sinkron di Sidebar, Dashboard, Daftar SPP, & Realisasi)
  const [selectedPicFilter, setSelectedPicFilter] = useState<string>('ALL');
  const [searchPicQuery, setSearchPicQuery] = useState<string>('');

  // Saat akun login berganti atau bukan superadmin, sesuaikan filter area & PIC otomatis
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role !== 'SUPERADMIN' && currentUser.area && currentUser.area !== 'ALL') {
        setActiveAreaFilter(currentUser.area as SJAArea);
        const areaPics = AREA_PIC_LIST[currentUser.area as SJAArea] || [];
        if (selectedPicFilter !== 'ALL' && !areaPics.includes(selectedPicFilter)) {
          setSelectedPicFilter('ALL');
        }
      }
    }
  }, [currentUser]);

  // 6. Konfigurasi Google Sheet Per-Area (Sepanjang, Karawang, Sukodono, Semarang)
  // Dilengkapi Cloud Persistent Storage agar tidak hilang saat diakses dari PC / Browser lain
  const [areaConfigs, setAreaConfigs] = useState<AreaSheetConfigMap>(() => {
    return getFallbackAreaConfigs();
  });

  // Sinkronisasi dua arah dengan Cloud Server Backend (Multi-PC & Multi-Browser Support)
  useEffect(() => {
    let isMounted = true;
    const syncFromCloud = async () => {
      try {
        const cloudConfigs = await fetchCloudAreaConfigs();
        if (isMounted && cloudConfigs) {
          setAreaConfigs(cloudConfigs);
        }

        // Sinkronisasi data SPP dari cloud jika tersedia
        const cloudItems = await fetchCloudSPPItems();
        if (isMounted && cloudItems && cloudItems.length > 0) {
          setItems(cloudItems);
        }
      } catch (err) {
        console.warn('Sync cloud error:', err);
      }
    };

    // Ambil data pertama kali saat aplikasi dimuat
    syncFromCloud();

    // Polling periodik (setiap 12 detik) dan saat tab browser aktif kembali
    const interval = setInterval(syncFromCloud, 12000);
    const handleFocus = () => syncFromCloud();
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sja_area_sheet_configs', JSON.stringify(areaConfigs));
    } catch {}
  }, [areaConfigs]);

  const handleUpdateAreaConfig = async (area: SJAArea, newConfig: Partial<GoogleSheetConfig>) => {
    // 1. Update state lokal seketika (optimistic UI)
    setAreaConfigs((prev) => ({
      ...prev,
      [area]: {
        ...prev[area],
        ...newConfig,
      },
    }));

    // 2. Simpan permanen ke Cloud Backend Server
    try {
      const serverUpdated = await saveCloudAreaConfigToServer(area, newConfig);
      if (serverUpdated) {
        setAreaConfigs(serverUpdated);
      }
      addAuditLog('UPDATE_SHEET_CONFIG', `Penyimpanan link Google Sheet (${area}) ke Cloud Server permanen`);
    } catch (err) {
      console.error('Gagal simpan ke cloud backend:', err);
    }
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

  // Status & notifikasi toast sinkronisasi 2 arah Google Sheet
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [syncToast, setSyncToast] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    description: string;
  } | null>(null);
  
  // 10. Sidebar state (Toggle sistem)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Filter KPI interaktif & Distribusi Kecepatan Realisasi PO
  const [kpiFilter, setKpiFilter] = useState<{
    mode: 'ALL' | 'H3' | 'OPEN' | 'LATE' | 'SPEED_LE_3' | 'SPEED_4_7' | 'SPEED_8_10' | 'SPEED_GT_10';
    label?: string;
  }>({
    mode: 'ALL',
  });

  // Simpan ke localStorage & Cloud Server saat data berubah
  useEffect(() => {
    try {
      localStorage.setItem('spp_monitoring_data', JSON.stringify(items));
    } catch {}
    if (items.length > 0) {
      saveCloudSPPItemsToServer(items);
    }
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

  // Simpan SPP Baru atau Update (Otomatis Sinkron 2 Arah Langsung ke Google Sheet Cabang)
  const handleSaveSPP = async (itemsData: Partial<SPPItem>[]) => {
    if (!itemsData || itemsData.length === 0 || !currentUser) return;

    let updatedList: SPPItem[] = [];
    const affectedAreas = new Set<SJAArea>();
    let newCreatedItems: SPPItem[] = [];

    if (editItem) {
      const formData = itemsData[0];
      const isUrgent = !!formData.isUrgentAdvance;
      const calc = calculateWorkingDays(formData.budgetReceivedDate!, formData.poDate, holidays);
      const hasPo = formData.poNumber && formData.poNumber.trim() !== '';
      const statusPO = hasPo ? 'CLOSE' : 'OPEN';
      const slaLimit = formData.slaLimit || 10;
      // Jika dispensasi darurat & PO terbit: respon cepat = 0 hari kerja, selalu ONTIME
      const processDays = isUrgent && hasPo ? 0 : calc.workingDays;
      const statusOntime = isUrgent ? 'ONTIME' : (processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT');
      const isHPlus3Overdue = !isUrgent && statusPO === 'OPEN' && processDays >= 3;
      const isSignificantDelay = !isUrgent && processDays > slaLimit;

      const targetArea: SJAArea = (formData.area || editItem.area) as SJAArea;
      affectedAreas.add(targetArea);

      updatedList = items.map((i) => {
        if (i.id === editItem.id) {
          return {
            ...i,
            ...formData,
            area: targetArea,
            processDays,
            statusPO,
            statusOntime,
            isHPlus3Overdue,
            isSignificantDelay,
            isUrgentAdvance: isUrgent,
            urgentReason: formData.urgentReason || i.urgentReason,
            urgentApprovedBy: formData.urgentApprovedBy || i.urgentApprovedBy,
            budgetStatus: formData.budgetStatus || i.budgetStatus || (isUrgent ? 'PENDING_ACC' : 'APPROVED'),
            specialCondition: formData.specialCondition !== undefined ? formData.specialCondition : i.specialCondition,
            specialConditionReason: formData.specialConditionReason !== undefined ? formData.specialConditionReason : i.specialConditionReason,
            updatedAt: new Date().toISOString(),
          } as SPPItem;
        }
        return i;
      });

      setItems(updatedList);
      await addAuditLog('UPDATE_SPP', `Memperbarui dokumen SPP ${formData.sppNumber} (Area: ${targetArea})`, editItem.id);
    } else {
      newCreatedItems = itemsData.map((formData, index) => {
        const isUrgent = !!formData.isUrgentAdvance;
        const calc = calculateWorkingDays(formData.budgetReceivedDate!, formData.poDate, holidays);
        const hasPo = formData.poNumber && formData.poNumber.trim() !== '';
        const statusPO = hasPo ? 'CLOSE' : 'OPEN';
        const slaLimit = formData.slaLimit || 10;
        const processDays = isUrgent && hasPo ? 0 : calc.workingDays;
        const statusOntime = isUrgent ? 'ONTIME' : (processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT');
        const isHPlus3Overdue = !isUrgent && statusPO === 'OPEN' && processDays >= 3;
        const isSignificantDelay = !isUrgent && processDays > slaLimit;

        const assignedArea: SJAArea = formData.area || (currentUser.role === 'SUPERADMIN' ? (activeAreaFilter !== 'ALL' ? activeAreaFilter : 'SEPANJANG') : (currentUser.area as SJAArea));
        affectedAreas.add(assignedArea);

        const areaCode = assignedArea === 'SEPANJANG' ? 'SPJ' : assignedArea === 'KARAWANG' ? 'KRW' : assignedArea === 'SUKODONO' ? 'SKD' : 'SMG';
        const finalSppNumber = formData.sppNumber?.trim() || `SPP/${areaCode}/${new Date().getFullYear()}/${String(Date.now() + index).slice(-4)}`;

        return {
          id: `SPP-${Date.now()}-${index}`,
          budgetReceivedDate: formData.budgetReceivedDate || new Date().toISOString().split('T')[0],
          sppNumber: finalSppNumber,
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
          specialCondition: formData.specialCondition,
          specialConditionReason: formData.specialConditionReason,
          isUrgentAdvance: isUrgent,
          urgentReason: formData.urgentReason,
          urgentApprovedBy: formData.urgentApprovedBy,
          budgetStatus: formData.budgetStatus || (isUrgent ? 'PENDING_ACC' : 'APPROVED'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      updatedList = [...newCreatedItems, ...items];
      setItems(updatedList);
      await addAuditLog(
        'CREATE_SPP_BATCH',
        `Menyimpan batch ${newCreatedItems.length} dokumen SPP baru`
      );
    }

    setEditItem(null);

    // OTOMATIS CREATE / SINKRONKAN KE GOOGLE SHEET CABANG (2-WAY SYNC REAL-TIME)
    for (const area of Array.from(affectedAreas)) {
      const cfg = areaConfigs[area] || getFallbackAreaConfigs()[area];
      const targetUrl = cfg?.webAppUrl?.trim() || '';
      const areaName = AREA_METADATA[area]?.name || area;
      const itemsToPush: SPPItem[] = editItem
        ? updatedList.filter((i: SPPItem) => i.id === editItem.id)
        : newCreatedItems.filter((i: SPPItem) => i.area === area);

      if (itemsToPush.length === 0) continue;

      try {
        await pushToGoogleSheet(targetUrl, itemsToPush, 'UPSERT_BATCH', area);
        setSyncToast({
          type: 'success',
          title: `✓ Otomatis Masuk ke Google Sheet ${areaName}`,
          description: `${itemsToPush.length} data SPP (${itemsToPush.map((i: SPPItem) => i.sppNumber).join(', ')}) berhasil disimpan di aplikasi dan otomatis dibuatkan baris baru di Google Sheet ${areaName}.`,
        });
        setTimeout(() => setSyncToast(null), 6000);
      } catch (err: any) {
        console.error(`Gagal auto sync push ke Google Sheet (${area}):`, err);
        setSyncToast({
          type: 'warning',
          title: 'Tersimpan di Sistem (Google Sheet Tertunda)',
          description: `Data tersimpan di sistem aplikasi, namun pembuatan baris di Google Sheet ${areaName} mengalami kendala: ${err?.message || err}. Anda dapat menyinkronkan ulang lewat tab 'Integrasi Google Sheet'.`,
        });
        setTimeout(() => setSyncToast(null), 7000);
      }
    }
  };

  // Quick Update No PO (Otomatis Close & Auto Sync Google Sheet)
  const handleQuickUpdatePO = async (id: string, poNumber: string, poDate: string) => {
    const targetItem = items.find((i) => i.id === id);
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

    // Otomatis sinkronkan update nomor PO ke Google Sheet
    if (targetItem?.area) {
      const cfg = areaConfigs[targetItem.area] || getFallbackAreaConfigs()[targetItem.area];
      const targetUpdatedItem = updated.find((i) => i.id === id);
      if (targetUpdatedItem) {
        try {
          await pushToGoogleSheet(cfg?.webAppUrl || '', [targetUpdatedItem], 'UPSERT_BATCH', targetItem.area);
        } catch (err) {
          console.error(`Auto sync quick PO (${targetItem.area}) gagal:`, err);
        }
      }
    }
  };

  // Hapus Single SPP
  const handleDeleteSPP = async (id: string) => {
    const target = items.find((i) => i.id === id);
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    await addAuditLog('DELETE_SPP', `Menghapus dokumen SPP ${target?.sppNumber || id} (Area: ${target?.area})`, id);

    // Otomatis sinkronkan penghapusan ke Google Sheet jika cabang terhubung (Komunikasi 2 Arah)
    if (target?.area) {
      const cfg = areaConfigs[target.area];
      if (cfg?.webAppUrl && cfg.webAppUrl.trim().startsWith('http')) {
        try {
          const remainingAreaItems = updated.filter((i) => i.area === target.area);
          await pushToGoogleSheet(cfg.webAppUrl, remainingAreaItems, 'SYNC_FULL');
        } catch (err) {
          console.error(`Auto sync delete ke Google Sheet (${target.area}) gagal:`, err);
        }
      }
    }
  };

  // Hapus Banyak SPP Sekaligus (Batch Delete)
  const handleDeleteBatchSPP = async (ids: string[]) => {
    const targets = items.filter((i) => ids.includes(i.id));
    const count = ids.length;
    const updated = items.filter((i) => !ids.includes(i.id));
    setItems(updated);
    await addAuditLog('DELETE_SPP_BATCH', `Menghapus ${count} dokumen SPP sekaligus`);

    // Otomatis sinkronkan penghapusan batch ke Google Sheet (Komunikasi 2 Arah)
    const affectedAreas = Array.from(new Set(targets.map((t) => t.area)));
    for (const area of affectedAreas) {
      const cfg = areaConfigs[area];
      if (cfg?.webAppUrl && cfg.webAppUrl.trim().startsWith('http')) {
        try {
          const remainingAreaItems = updated.filter((i) => i.area === area);
          await pushToGoogleSheet(cfg.webAppUrl, remainingAreaItems, 'SYNC_FULL');
        } catch (err) {
          console.error(`Auto sync batch delete ke Google Sheet (${area}) gagal:`, err);
        }
      }
    }
  };

  // Kosongkan Seluruh Data SPP (dengan opsi sinkronisasi ke Google Sheet yang terhubung)
  const handleClearAllSPP = async (syncWithGoogleSheet: boolean = true) => {
    if (!currentUser) return;
    const isSuperadminAll = currentUser.role === 'SUPERADMIN' && activeAreaFilter === 'ALL';
    const targetArea = currentUser.role === 'SUPERADMIN' ? activeAreaFilter : currentUser.area;
    
    let updated: SPPItem[];
    let countCleared = 0;
    if (isSuperadminAll) {
      countCleared = items.length;
      updated = [];
    } else {
      const itemsToClear = items.filter((i) => i.area === targetArea);
      countCleared = itemsToClear.length;
      updated = items.filter((i) => i.area !== targetArea);
    }

    setItems(updated);
    try {
      localStorage.setItem('spp_monitoring_data', JSON.stringify(updated));
    } catch {}

    // Sinkronkan pengosongan ke Google Sheet jika opsi dicentang
    const clearedSheetNames: string[] = [];
    if (syncWithGoogleSheet) {
      const areasToSync: SJAArea[] = isSuperadminAll
        ? (['SEPANJANG', 'KARAWANG', 'SUKODONO', 'SEMARANG'] as SJAArea[])
        : ([targetArea as SJAArea]);

      for (const a of areasToSync) {
        const cfg = areaConfigs[a];
        if (cfg?.webAppUrl && cfg.webAppUrl.trim().startsWith('http')) {
          try {
            await clearGoogleSheet(cfg.webAppUrl);
            clearedSheetNames.push(AREA_METADATA[a]?.name || a);
          } catch (err) {
            console.error(`Gagal mengosongkan Google Sheet ${a}:`, err);
          }
        }
      }
    }

    const sheetLog = clearedSheetNames.length > 0
      ? ` serta membersihkan baris data Google Sheet (${clearedSheetNames.join(', ')})`
      : '';

    await addAuditLog(
      'CLEAR_ALL_SPP',
      `Mengosongkan ${countCleared} dokumen SPP${sheetLog}`
    );
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

  // Sinkronisasi Google Sheets Per-Area (2 Arah Penuh: Tarik data baru, update data, dan hapus data yang telah dihapus di Google Sheet)
  const handlePullFromSheet = async (area: SJAArea) => {
    const cfg = areaConfigs[area];
    if (!cfg?.webAppUrl) throw new Error(`Web App URL belum diisi untuk ${AREA_METADATA[area]?.name}`);
    
    const rawFromSheet = await fetchFromGoogleSheet(cfg.webAppUrl);
    if (!Array.isArray(rawFromSheet)) {
      throw new Error(`Format data tidak valid dari Google Sheet ${AREA_METADATA[area]?.name}`);
    }

    // Ambil data yang saat ini ada di aplikasi untuk area ini
    const existingAreaItems = items.filter((i) => i.area === area);

    // Proses data yang ditarik dari Google Sheet
    const tagged: SPPItem[] = rawFromSheet.map((i, idx) => {
      const cleanBudget = normalizeDateString(i.budgetReceivedDate) || new Date().toISOString().split('T')[0];
      const cleanPo = normalizeDateString(i.poDate);

      const calc = calculateWorkingDays(cleanBudget, cleanPo, holidays);
      const processDays = calc.workingDays;
      const hasPo = !!(i.poNumber && i.poNumber.trim() !== '');
      const statusPO = hasPo ? 'CLOSE' : 'OPEN';
      const slaLimit = i.slaLimit || 10;
      const statusOntime = processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT';
      const isHPlus3Overdue = statusPO === 'OPEN' && processDays >= 3;
      const isSignificantDelay = processDays > slaLimit;

      const existing = existingAreaItems.find(
        (cur) => cur.sppNumber.trim().toLowerCase() === (i.sppNumber || '').trim().toLowerCase()
      );

      return {
        ...i,
        id: existing?.id || i.id || `SPP-${Date.now()}-${idx}`,
        budgetReceivedDate: cleanBudget,
        sppNumber: i.sppNumber.trim(),
        area: area,
        pic: i.pic?.trim() || existing?.pic || 'PIC Pengadaan',
        poDate: cleanPo || undefined,
        poNumber: i.poNumber?.trim() || undefined,
        processDays,
        statusPO,
        statusOntime,
        slaLimit,
        isHPlus3Overdue,
        isSignificantDelay,
        specialCondition: i.specialCondition || existing?.specialCondition || undefined,
        specialConditionReason: i.specialConditionReason || existing?.specialConditionReason || undefined,
        notes: i.notes || existing?.notes || undefined,
        isUrgentAdvance: i.isUrgentAdvance ?? existing?.isUrgentAdvance ?? false,
        urgentReason: i.urgentReason || existing?.urgentReason,
        urgentApprovedBy: i.urgentApprovedBy || existing?.urgentApprovedBy,
        budgetStatus: i.budgetStatus || existing?.budgetStatus || (hasPo ? 'APPROVED' : undefined),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    // 1. Deteksi data yang dihapus di Google Sheet: ada di aplikasi tapi TIDAK ADA lagi di Google Sheet
    const newSheetSppSet = new Set(tagged.map((t) => t.sppNumber.toLowerCase()));
    const deletedFromSheet = existingAreaItems.filter((e) => !newSheetSppSet.has(e.sppNumber.toLowerCase()));
    const deletedCount = deletedFromSheet.length;

    // 2. Deteksi data baru yang ditambahkan di Google Sheet
    const existingSppSet = new Set(existingAreaItems.map((e) => e.sppNumber.toLowerCase()));
    const addedCount = tagged.filter((t) => !existingSppSet.has(t.sppNumber.toLowerCase())).length;
    const updatedCount = tagged.length - addedCount;

    // UPDATE STATE APLIKASI: Ganti data area ini dengan tagged (Sehingga data yang dihapus di Google Sheet otomatis terhapus dari aplikasi!)
    setItems((prev) => [
      ...tagged,
      ...prev.filter((i) => i.area !== area),
    ]);

    // 3. SINKRONISASI 2 ARAH BALIK KE GOOGLE SHEET:
    // Update kembali nilai kolom 'Hari Kerja Proses' dan 'Status SLA' hasil rekalkulasi terbaru ke Google Sheet
    try {
      const cfg = areaConfigs[area] || getFallbackAreaConfigs()[area];
      if (cfg?.webAppUrl && tagged.length > 0) {
        await pushToGoogleSheet(cfg.webAppUrl, tagged, 'UPSERT_BATCH', area);
      }
    } catch (pushBackErr) {
      console.warn(`[2-Way Sync Push-Back Notice] Gagal memperbarui kolom Hari Kerja di Google Sheet (${area}):`, pushBackErr);
    }

    setAreaConfigs((prev) => ({
      ...prev,
      [area]: {
        ...prev[area],
        lastSyncTime: new Date().toISOString(),
        syncStatus: 'connected',
      },
    }));

    const areaName = AREA_METADATA[area]?.name || area;
    let logText = `Sinkronisasi 2 arah ${areaName}: ${tagged.length} data aktif diselaraskan (${addedCount} baru, ${updatedCount} diperbarui, kolom hari kerja proses di Google Sheet terbarui)`;
    if (deletedCount > 0) {
      logText += `, serta ${deletedCount} data yang dihapus di Google Sheet telah dihapus dari aplikasi (${deletedFromSheet.map((d) => d.sppNumber).slice(0, 3).join(', ')}${deletedCount > 3 ? '...' : ''})`;
    }

    await addAuditLog('GOOGLE_SHEET_2WAY_SYNC', logText);

    return {
      area,
      areaName,
      totalInSheet: tagged.length,
      addedCount,
      updatedCount,
      deletedCount,
      deletedItemNumbers: deletedFromSheet.map((d) => d.sppNumber),
    };
  };

  // Handler Sinkronisasi 2 Arah Global (Dipanggil dari TopHeader, SPPTable, dll)
  const handleSyncGoogleSheet = async () => {
    if (!currentUser) return;
    setIsSyncingSheet(true);
    try {
      const isSuperadminAll = currentUser.role === 'SUPERADMIN' && activeAreaFilter === 'ALL';
      const areasToSync: SJAArea[] = isSuperadminAll
        ? (['SEPANJANG', 'KARAWANG', 'SUKODONO', 'SEMARANG'] as SJAArea[])
        : ([((currentUser.role === 'SUPERADMIN' ? activeAreaFilter : currentUser.area) as SJAArea)]);

      const configuredAreas = areasToSync.filter(
        (a) => areaConfigs[a]?.webAppUrl && areaConfigs[a].webAppUrl.trim().startsWith('http')
      );

      if (configuredAreas.length === 0) {
        setSyncToast({
          type: 'warning',
          title: 'Google Sheet Belum Terhubung',
          description: `Web App URL Google Apps Script belum diisi untuk ${
            areasToSync.map((a) => AREA_METADATA[a]?.name).join(', ')
          }. Silakan buka tab 'Integrasi Google Sheet' untuk mengatur link.`,
        });
        setTimeout(() => setSyncToast(null), 6000);
        return;
      }

      let totalInSheet = 0;
      let totalAdded = 0;
      let totalUpdated = 0;
      let totalDeleted = 0;

      for (const area of configuredAreas) {
        try {
          const res = await handlePullFromSheet(area);
          totalInSheet += res.totalInSheet;
          totalAdded += res.addedCount;
          totalUpdated += res.updatedCount;
          totalDeleted += res.deletedCount;
        } catch (err: any) {
          console.error(`Gagal sync area ${area}:`, err);
        }
      }

      let desc = `Total ${totalInSheet} data aktif tersinkronisasi (${totalAdded} baru, ${totalUpdated} diperbarui).`;
      if (totalDeleted > 0) {
        desc += ` ${totalDeleted} data yang telah dihapus di Google Sheet berhasil ikut dihapus dari aplikasi.`;
      } else {
        desc += ` Tidak ada data yang dihapus di Google Sheet. Data 100% selaras.`;
      }

      setSyncToast({
        type: 'success',
        title: '✓ Sinkronisasi 2 Arah Google Sheet Berhasil!',
        description: desc,
      });
      setTimeout(() => setSyncToast(null), 7000);
    } catch (err: any) {
      setSyncToast({
        type: 'error',
        title: 'Gagal Sinkronisasi Google Sheet',
        description: err.message || 'Terjadi gangguan koneksi saat menarik data dari Google Apps Script.',
      });
      setTimeout(() => setSyncToast(null), 6000);
    } finally {
      setIsSyncingSheet(false);
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

  // Filter items berdasarkan hak akses area pengguna dan filter PIC terpilih
  const areaScopedItems = items.filter((item) => {
    // 1. Hak Akses Area
    if (currentUser.role === 'SUPERADMIN') {
      if (activeAreaFilter !== 'ALL' && item.area !== activeAreaFilter) return false;
    } else {
      if (item.area !== currentUser.area) return false;
    }

    // 2. Filter PIC Global jika dipilih dari Sidebar / Toolbar
    if (selectedPicFilter !== 'ALL') {
      if (item.pic?.toLowerCase().trim() !== selectedPicFilter.toLowerCase().trim()) return false;
    }

    // 3. Pencarian Teks PIC Global jika diketik dari Sidebar / Toolbar
    if (searchPicQuery.trim()) {
      const q = searchPicQuery.toLowerCase().trim();
      const picMatch = item.pic?.toLowerCase().includes(q);
      const sppMatch = item.sppNumber?.toLowerCase().includes(q);
      const poMatch = item.poNumber?.toLowerCase().includes(q);
      if (!picMatch && !sppMatch && !poMatch) return false;
    }

    return true;
  });

  // Item terfilter berdasarkan klik di KPI Cards & Distribusi Kecepatan Realisasi PO
  const displayedItems = areaScopedItems.filter((item) => {
    if (kpiFilter.mode === 'H3') return item.isHPlus3Overdue;
    if (kpiFilter.mode === 'OPEN') return item.statusPO === 'OPEN';
    if (kpiFilter.mode === 'LATE') return item.statusOntime === 'TERLAMBAT';

    const hasPo = item.statusPO === 'CLOSE' || (!!item.poNumber && item.poNumber.trim() !== '');
    if (kpiFilter.mode === 'SPEED_LE_3') {
      if (!hasPo) return false;
      const net = item.isUrgentAdvance ? 0 : calculateWorkingDays(item.budgetReceivedDate, item.poDate || undefined, holidays).workingDays;
      return net <= 3;
    }
    if (kpiFilter.mode === 'SPEED_4_7') {
      if (!hasPo) return false;
      const net = item.isUrgentAdvance ? 0 : calculateWorkingDays(item.budgetReceivedDate, item.poDate || undefined, holidays).workingDays;
      return net >= 4 && net <= 7;
    }
    if (kpiFilter.mode === 'SPEED_8_10') {
      if (!hasPo) return false;
      const net = item.isUrgentAdvance ? 0 : calculateWorkingDays(item.budgetReceivedDate, item.poDate || undefined, holidays).workingDays;
      return net >= 8 && net <= 10;
    }
    if (kpiFilter.mode === 'SPEED_GT_10') {
      if (!hasPo) return false;
      const net = item.isUrgentAdvance ? 0 : calculateWorkingDays(item.budgetReceivedDate, item.poDate || undefined, holidays).workingDays;
      return net > 10;
    }

    return true;
  });

  // Hitung jumlah data per area untuk Google Sheet modal
  const itemsByAreaCount: Record<SJAArea, number> = {
    SEPANJANG: items.filter((i) => i.area === 'SEPANJANG').length,
    KARAWANG: items.filter((i) => i.area === 'KARAWANG').length,
    SUKODONO: items.filter((i) => i.area === 'SUKODONO').length,
    SEMARANG: items.filter((i) => i.area === 'SEMARANG').length,
  };

  const currentAreaForSheet = currentUser.role === 'SUPERADMIN' ? activeAreaFilter : currentUser.area;
  const isCurrentAreaSheetConnected = currentAreaForSheet === 'ALL'
    ? Object.values(areaConfigs).some((cfg) => cfg.webAppUrl && cfg.webAppUrl.trim().startsWith('http'))
    : !!(areaConfigs[currentAreaForSheet as SJAArea]?.webAppUrl && areaConfigs[currentAreaForSheet as SJAArea].webAppUrl.trim().startsWith('http'));

  const connectedSheetLabel = currentAreaForSheet === 'ALL'
    ? 'Seluruh Cabang Terhubung'
    : (AREA_METADATA[currentAreaForSheet as SJAArea]?.name || currentAreaForSheet);

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
        selectedPicFilter={selectedPicFilter}
        onSelectPicFilter={setSelectedPicFilter}
        searchPicQuery={searchPicQuery}
        onSearchPicQuery={setSearchPicQuery}
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
          onSyncGoogleSheet={handleSyncGoogleSheet}
          isSyncingSheet={isSyncingSheet}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Tab 0: Dashboard Realisasi SPP */}
          {activeTab === 'dashboard' && (
            <ExecutiveDashboard
              items={areaScopedItems}
              currentUser={currentUser}
              activeAreaFilter={activeAreaFilter}
              holidays={holidays}
              onSelectAreaFilter={setActiveAreaFilter}
              onNavigateToMonitoring={() => setActiveTab('monitoring')}
              onOpenNewSPP={() => {
                setEditItem(null);
                setIsFormOpen(true);
              }}
              onEditItem={(item) => {
                setEditItem(item);
                setIsFormOpen(true);
              }}
              onFilterSpeed={(speedMode, label) => {
                setKpiFilter({ mode: speedMode, label });
                setActiveTab('monitoring');
              }}
              selectedPicFilter={selectedPicFilter}
              onSelectPicFilter={setSelectedPicFilter}
              searchPicQuery={searchPicQuery}
              onSearchPicQuery={setSearchPicQuery}
              onSyncGoogleSheet={handleSyncGoogleSheet}
              isSyncingGoogleSheet={isSyncingSheet}
            />
          )}

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
              isGoogleSheetConnected={isCurrentAreaSheetConnected}
              connectedSheetName={connectedSheetLabel}
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
              activeKpiFilterLabel={kpiFilter.label}
              onResetKpiFilter={() => setKpiFilter({ mode: 'ALL' })}
              selectedPicFilter={selectedPicFilter}
              onSelectPicFilter={setSelectedPicFilter}
              onSyncGoogleSheet={handleSyncGoogleSheet}
              isSyncingGoogleSheet={isSyncingSheet}
            />
          )}

          {/* Tab 2: Analitik Kinerja PIC */}
          {activeTab === 'analytics' && (
            <VendorAnalytics
              items={areaScopedItems}
              currentUser={currentUser}
              selectedPicFilter={selectedPicFilter}
              onSelectPicFilter={setSelectedPicFilter}
              searchQuery={searchPicQuery}
              onSearchQuery={setSearchPicQuery}
              onEditItem={(item) => {
                setEditItem(item);
                setIsFormOpen(true);
              }}
              onSyncGoogleSheet={handleSyncGoogleSheet}
              isSyncingGoogleSheet={isSyncingSheet}
            />
          )}

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
          areaConfigs={areaConfigs}
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

        {/* Floating Toast Notifikasi Sinkronisasi 2 Arah Google Sheet */}
        {syncToast && (
          <aside aria-label="Notifikasi Sinkronisasi" className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-4 duration-300">
            <div
              className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
                syncToast.type === 'success'
                  ? 'bg-slate-900/95 border-emerald-500/80 text-white'
                  : syncToast.type === 'warning'
                  ? 'bg-slate-900/95 border-amber-500/80 text-white'
                  : 'bg-slate-900/95 border-rose-500/80 text-white'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {syncToast.type === 'success' ? (
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : syncToast.type === 'warning' ? (
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white tracking-wide">
                  {syncToast.title}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {syncToast.description}
                </p>
              </div>
              <button
                onClick={() => setSyncToast(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                title="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </aside>
        )}

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
