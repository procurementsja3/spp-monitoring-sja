/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  upsertCloudSPPItemsToServer,
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

  let specialCondition = item.specialCondition;
  let specialConditionReason = item.specialConditionReason;
  let notes = item.notes;

  // Track record kondisi khusus: saat No PO diisikan, kondisi khusus tetap dipertahankan & ditampilkan sebagai histori faktor kendala
  if (item.sppNumber && String(item.sppNumber).trim() === 'SPP/173/MTC-III/IX/2026') {
    specialCondition = item.specialCondition || 'Kendala Khusus Lainnya';
    specialConditionReason = item.specialConditionReason || 'Menunggu kelengkapan spp';
    notes = item.notes || 'Kondisi Khusus: Kendala Khusus Lainnya - Menunggu kelengkapan spp';
  } else if (!specialConditionReason && notes && typeof notes === 'string' && notes.startsWith('Kondisi Khusus:')) {
    const content = notes.replace('Kondisi Khusus:', '').trim();
    const splitIdx = content.indexOf(' - ');
    if (splitIdx !== -1) {
      if (!specialCondition) {
        specialCondition = content.substring(0, splitIdx).trim();
      }
      specialConditionReason = content.substring(splitIdx + 3).trim();
    } else {
      if (!specialCondition) specialCondition = content;
    }
  }

  return {
    ...item,
    area: item.area || 'SEPANJANG',
    processDays,
    statusPO,
    statusOntime,
    isHPlus3Overdue,
    isSignificantDelay,
    slaLimit,
    specialCondition,
    specialConditionReason,
    notes,
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

  // Refs sinkron agar timer & listener background selalu membaca state terbaru (anti stale-closure)
  const itemsRef = useRef<SPPItem[]>(items);
  itemsRef.current = items;
  const areaConfigsRef = useRef<AreaSheetConfigMap>(areaConfigs);
  areaConfigsRef.current = areaConfigs;
  const holidaysRef = useRef<IndonesianHoliday[]>(holidays);

  // Guard konkurensi: mencegah polling cloud / auto-sync menimpa perubahan lokal yang baru disimpan
  const isSavingRef = useRef<boolean>(false);
  const isSyncingSheetRef = useRef<boolean>(false);
  const mutationEpochRef = useRef<number>(0);
  const lastLocalMutationAtRef = useRef<number>(0);
  const pendingSheetSyncKeysRef = useRef<Set<string>>((() => {
    try {
      const saved = localStorage.getItem('sja_pending_sheet_sync_keys');
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set<string>();
  })());

  const persistPendingSheetKeys = () => {
    try {
      localStorage.setItem(
        'sja_pending_sheet_sync_keys',
        JSON.stringify(Array.from(pendingSheetSyncKeysRef.current))
      );
    } catch {}
  };

  const getItemSyncKey = (item: Pick<SPPItem, 'area' | 'sppNumber' | 'id'>) =>
    `${item.area}::${(item.sppNumber || item.id || '').trim().toLowerCase()}`;

  const isItemClosed = (item?: Pick<SPPItem, 'statusPO' | 'poNumber'> | null) =>
    !!(item && (item.statusPO === 'CLOSE' || (item.poNumber && String(item.poNumber).trim() !== '')));

  const toEpochMs = (iso?: string) => {
    if (!iso) return 0;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : 0;
  };

  const commitItemsLocally = (nextItems: SPPItem[]) => {
    mutationEpochRef.current += 1;
    lastLocalMutationAtRef.current = Date.now();
    itemsRef.current = nextItems;
    try {
      localStorage.setItem('spp_monitoring_data', JSON.stringify(nextItems));
    } catch {}
    setItems(nextItems);
  };

  // Sinkronisasi dua arah dengan Cloud Server Backend (Multi-PC & Multi-Browser Support)
  useEffect(() => {
    let isMounted = true;
    const syncFromCloud = async () => {
      // Jangan timpa state jika sedang menyimpan atau baru saja terjadi mutasi lokal (< 5 detik)
      if (isSavingRef.current || isSyncingSheetRef.current) return;
      if (Date.now() - lastLocalMutationAtRef.current < 5000) return;

      const epochAtStart = mutationEpochRef.current;
      try {
        const cloudConfigs = await fetchCloudAreaConfigs();
        if (isMounted && cloudConfigs) {
          setAreaConfigs(cloudConfigs);
        }

        // Sinkronisasi data SPP dari cloud jika tersedia
        const cloudItems = await fetchCloudSPPItems();
        if (
          isMounted &&
          cloudItems &&
          cloudItems.length > 0 &&
          !isSavingRef.current &&
          !isSyncingSheetRef.current &&
          mutationEpochRef.current === epochAtStart &&
          Date.now() - lastLocalMutationAtRef.current >= 5000
        ) {
          const localByKey = new Map<string, SPPItem>();
          itemsRef.current.forEach((loc) => {
            localByKey.set(getItemSyncKey(loc), loc);
            if (loc.id) localByKey.set(loc.id, loc);
          });

          const mergedCloudItems = cloudItems.map((rawCloudItem) => {
            const normalizedCloud = recalculateSPPFields(rawCloudItem, holidaysRef.current);
            const syncKey = getItemSyncKey(normalizedCloud);
            const localMatch = localByKey.get(syncKey) || (normalizedCloud.id ? localByKey.get(normalizedCloud.id) : undefined);

            if (
              localMatch &&
              (localMatch.pendingSheetSync === true || pendingSheetSyncKeysRef.current.has(syncKey)) &&
              toEpochMs(localMatch.updatedAt) >= toEpochMs(normalizedCloud.updatedAt)
            ) {
              return localMatch;
            }
            return normalizedCloud;
          });

          // Pastikan item pending lokal yang belum ada di server ikut dipertahankan
          const cloudKeySet = new Set(mergedCloudItems.map((i) => getItemSyncKey(i)));
          const extraPendingLocals = itemsRef.current.filter(
            (loc) =>
              (loc.pendingSheetSync === true || pendingSheetSyncKeysRef.current.has(getItemSyncKey(loc))) &&
              !cloudKeySet.has(getItemSyncKey(loc))
          );
          const finalCloudList = [...extraPendingLocals, ...mergedCloudItems];

          itemsRef.current = finalCloudList;
          try {
            localStorage.setItem('spp_monitoring_data', JSON.stringify(finalCloudList));
          } catch {}
          setItems(finalCloudList);
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

  // Status & notifikasi toast sinkronisasi data Google Sheet
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [syncToast, setSyncToast] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    description: string;
  } | null>(null);

  // SISTEM AUTO LIVE SINKRONISASI DATA (Real-Time Auto Refresh Background)
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sja_auto_live_sync_active');
      return saved !== null ? saved === 'true' : true; // Default AKTIF (Otomatis)
    } catch {
      return true;
    }
  });

  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sja_auto_sync_interval');
      return saved ? Number(saved) : 30; // Default 30 detik
    } catch {
      return 30;
    }
  });

  const [autoSyncCountdown, setAutoSyncCountdown] = useState<number>(30);
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<string | null>(null);

  // Kontrol visibilitas tombol/badge hitung mundur live (Default FALSE / Disembunyikan sesuai permintaan pengguna)
  const [showLiveBadge, setShowLiveBadge] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sja_show_live_badge');
      return saved === 'true'; // Default FALSE (sembunyi rapi)
    } catch {
      return false;
    }
  });

  const handleToggleShowLiveBadge = (show?: boolean) => {
    const nextVal = show !== undefined ? show : !showLiveBadge;
    setShowLiveBadge(nextVal);
    try {
      localStorage.setItem('sja_show_live_badge', String(nextVal));
    } catch {}
  };
  
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

  // Sinkronkan perubahan holidays ref & localStorage
  holidaysRef.current = holidays;

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

  // Helper sinkronisasi Google Sheet di background setelah simpan lokal & server sukses
  const pushItemsToGoogleSheetInBackground = async (
    area: SJAArea,
    itemsToPush: SPPItem[],
    toastLabel?: string
  ) => {
    if (itemsToPush.length === 0) return;
    const cfg = areaConfigsRef.current[area] || getFallbackAreaConfigs()[area];
    const targetUrl = cfg?.webAppUrl?.trim() || '';
    const areaName = AREA_METADATA[area]?.name || area;
    if (!targetUrl.startsWith('http')) return;

    try {
      await pushToGoogleSheet(targetUrl, itemsToPush, 'UPSERT_BATCH', area);
      const syncedKeys = new Set(itemsToPush.map((p) => getItemSyncKey(p)));
      itemsToPush.forEach((p) => pendingSheetSyncKeysRef.current.delete(getItemSyncKey(p)));
      persistPendingSheetKeys();

      // Tandai pendingSheetSync = false di state lokal & server tanpa memicu overwrite mutasi baru
      const clearedItems: SPPItem[] = [];
      const nextList = itemsRef.current.map((cur) => {
        if (syncedKeys.has(getItemSyncKey(cur)) && cur.pendingSheetSync) {
          const cleanItem = { ...cur, pendingSheetSync: false };
          clearedItems.push(cleanItem);
          return cleanItem;
        }
        return cur;
      });
      if (clearedItems.length > 0) {
        commitItemsLocally(nextList);
        upsertCloudSPPItemsToServer(clearedItems).catch(() => {});
      }

      setSyncToast({
        type: 'success',
        title: `✓ Otomatis Masuk ke Google Sheet ${areaName}`,
        description:
          toastLabel ||
          `${itemsToPush.length} data SPP (${itemsToPush.map((i: SPPItem) => i.sppNumber).join(', ')}) berhasil disimpan permanen dan disinkronkan ke Google Sheet ${areaName}.`,
      });
      setTimeout(() => setSyncToast(null), 6000);
    } catch (err: any) {
      console.error(`Gagal auto sync push ke Google Sheet (${area}):`, err);
      setSyncToast({
        type: 'warning',
        title: 'Tersimpan di Sistem (Google Sheet Tertunda)',
        description: `Data sudah tersimpan permanen di server aplikasi, namun sinkronisasi ke Google Sheet ${areaName} sedang antre/tertunda: ${err?.message || err}. Sistem akan otomatis mencoba ulang.`,
      });
      setTimeout(() => setSyncToast(null), 7000);
    }
  };

  // Simpan SPP Baru atau Update (Langsung tersimpan di Server, lalu Sinkron ke Google Sheet Cabang)
  const handleSaveSPP = async (itemsData: Partial<SPPItem>[]) => {
    if (!itemsData || itemsData.length === 0 || !currentUser) return;

    isSavingRef.current = true;
    const editedSnapshot = editItem;
    let updatedList: SPPItem[] = [];
    const affectedAreas = new Set<SJAArea>();
    let newCreatedItems: SPPItem[] = [];
    let changedItemsToPersist: SPPItem[] = [];
    const currentItemsSnapshot = itemsRef.current;

    try {
      const nowIso = new Date().toISOString();

      if (editedSnapshot) {
        const formData = itemsData[0];
        const isUrgent = !!formData.isUrgentAdvance;
        const calc = calculateWorkingDays(formData.budgetReceivedDate!, formData.poDate, holidaysRef.current);
        const hasPo = !!(formData.poNumber && formData.poNumber.trim() !== '');
        const statusPO = hasPo ? 'CLOSE' : 'OPEN';
        const slaLimit = formData.slaLimit || 10;
        // Jika dispensasi darurat & PO terbit: respon cepat = 0 hari kerja, selalu ONTIME
        const processDays = isUrgent && hasPo ? 0 : calc.workingDays;
        const statusOntime = isUrgent ? 'ONTIME' : (processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT');
        const isHPlus3Overdue = !isUrgent && statusPO === 'OPEN' && processDays >= 3;
        const isSignificantDelay = !isUrgent && processDays > slaLimit;

        const targetArea: SJAArea = (formData.area || editedSnapshot.area) as SJAArea;
        affectedAreas.add(targetArea);

        const editedSppNorm = (editedSnapshot.sppNumber || '').trim().toLowerCase();
        let matchedAny = false;

        updatedList = currentItemsSnapshot.map((i) => {
          const isMatch =
            i.id === editedSnapshot.id ||
            (editedSppNorm !== '' &&
              (i.sppNumber || '').trim().toLowerCase() === editedSppNorm &&
              i.area === editedSnapshot.area);

          if (isMatch) {
            matchedAny = true;
            // Sistem track record: kondisi khusus tetap disimpan sebagai rekam jejak faktor penyebab
            const effectiveSpecialCondition = formData.specialCondition !== undefined
              ? (formData.specialCondition ? formData.specialCondition.trim() : undefined)
              : i.specialCondition;
            const effectiveSpecialConditionReason = formData.specialConditionReason !== undefined
              ? (formData.specialConditionReason ? formData.specialConditionReason.trim() : undefined)
              : i.specialConditionReason;
            const effectiveNotes = formData.notes !== undefined ? formData.notes : i.notes;

            const updatedItem: SPPItem = {
              ...i,
              ...formData,
              area: targetArea,
              poDate: formData.poDate || undefined,
              poNumber: formData.poNumber?.trim() || undefined,
              processDays,
              statusPO,
              statusOntime,
              isHPlus3Overdue,
              isSignificantDelay,
              isUrgentAdvance: isUrgent,
              urgentReason: formData.urgentReason || i.urgentReason,
              urgentApprovedBy: formData.urgentApprovedBy || i.urgentApprovedBy,
              budgetStatus: formData.budgetStatus || i.budgetStatus || (isUrgent ? 'PENDING_ACC' : 'APPROVED'),
              specialCondition: effectiveSpecialCondition,
              specialConditionReason: effectiveSpecialConditionReason,
              notes: effectiveNotes,
              pendingSheetSync: true,
              updatedAt: nowIso,
            };
            changedItemsToPersist.push(updatedItem);
            return updatedItem;
          }
          return i;
        });

        // Fallback jika item belum ada di snapshot terbaru
        if (!matchedAny) {
          const fallbackUpdated: SPPItem = {
            ...editedSnapshot,
            ...formData,
            area: targetArea,
            poDate: formData.poDate || undefined,
            poNumber: formData.poNumber?.trim() || undefined,
            processDays,
            statusPO,
            statusOntime,
            isHPlus3Overdue,
            isSignificantDelay,
            isUrgentAdvance: isUrgent,
            budgetStatus: formData.budgetStatus || editedSnapshot.budgetStatus || (isUrgent ? 'PENDING_ACC' : 'APPROVED'),
            pendingSheetSync: true,
            updatedAt: nowIso,
          } as SPPItem;
          changedItemsToPersist.push(fallbackUpdated);
          updatedList = [fallbackUpdated, ...currentItemsSnapshot];
        }
      } else {
        newCreatedItems = itemsData.map((formData, index) => {
          const isUrgent = !!formData.isUrgentAdvance;
          const calc = calculateWorkingDays(formData.budgetReceivedDate!, formData.poDate, holidaysRef.current);
          const hasPo = !!(formData.poNumber && formData.poNumber.trim() !== '');
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
            pic: (formData.pic && formData.pic.trim() !== '' && formData.pic.trim() !== '-') ? formData.pic.trim() : '-',
            area: assignedArea,
            poDate: formData.poDate || undefined,
            poNumber: formData.poNumber?.trim() || undefined,
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
            pendingSheetSync: true,
            createdAt: nowIso,
            updatedAt: nowIso,
          };
        });

        changedItemsToPersist = [...newCreatedItems];
        updatedList = [...newCreatedItems, ...currentItemsSnapshot];
      }

      // Tandai pendingSheetSyncKeys SEBELUM async call agar refresh/auto-pull tidak menimpa data baru
      changedItemsToPersist.forEach((p) => pendingSheetSyncKeysRef.current.add(getItemSyncKey(p)));
      persistPendingSheetKeys();

      // Update UI lokal seketika (OPEN langsung berubah jadi CLOSE -> 0 OPEN)
      commitItemsLocally(updatedList);

      // Simpan atomik ke server backend (upsert atomik + full snapshot backup)
      const [upsertOk, batchOk] = await Promise.all([
        upsertCloudSPPItemsToServer(changedItemsToPersist),
        saveCloudSPPItemsToServer(updatedList, { source: 'USER_SAVE' }),
      ]);

      if (!upsertOk && !batchOk) {
        console.warn('[SaveSPP] Backend server tidak merespons, data tersimpan sementara di localStorage browser.');
      }

      await addAuditLog(
        editedSnapshot ? 'UPDATE_SPP' : 'CREATE_SPP_BATCH',
        editedSnapshot
          ? `Memperbarui dokumen SPP ${changedItemsToPersist[0]?.sppNumber || editedSnapshot.sppNumber}`
          : `Menyimpan batch ${newCreatedItems.length} dokumen SPP baru`,
        editedSnapshot?.id
      );

      // Tampilkan notifikasi langsung tersimpan, lalu kirim ke Google Sheet di background (non-blocking)
      setSyncToast({
        type: 'info',
        title: '✓ Data SPP Tersimpan Permanen',
        description: `Perubahan status & nomor PO telah tersimpan di sistem. Menyinkronkan ke Google Sheet...`,
      });
      setTimeout(() => setSyncToast((cur) => (cur?.type === 'info' ? null : cur)), 5000);

      for (const area of Array.from(affectedAreas)) {
        const itemsToPush = changedItemsToPersist.filter((i) => i.area === area);
        if (itemsToPush.length > 0) {
          void pushItemsToGoogleSheetInBackground(area, itemsToPush);
        }
      }
    } finally {
      lastLocalMutationAtRef.current = Date.now();
      isSavingRef.current = false;
    }
  };

  // Quick Update No PO (Otomatis Close & Auto Sync Google Sheet)
  const handleQuickUpdatePO = async (id: string, poNumber: string, poDate: string) => {
    isSavingRef.current = true;
    try {
      const nowIso = new Date().toISOString();
      const currentSnapshot = itemsRef.current;
      let updatedTarget: SPPItem | null = null;
      const updated = currentSnapshot.map((i) => {
        if (i.id === id) {
          const calc = calculateWorkingDays(i.budgetReceivedDate, poDate, holidaysRef.current);
          const processDays = calc.workingDays;
          const slaLimit = i.slaLimit || 10;
          const nextItem: SPPItem = {
            ...i,
            poNumber: poNumber.trim(),
            poDate,
            statusPO: 'CLOSE',
            processDays,
            statusOntime: processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT',
            isHPlus3Overdue: false,
            isSignificantDelay: processDays > slaLimit,
            // Track record kondisi khusus: saat No PO diisikan, kondisi khusus tetap dipertahankan & ditampilkan sebagai histori faktor kendala
            specialCondition: i.specialCondition,
            specialConditionReason: i.specialConditionReason,
            notes: i.notes,
            pendingSheetSync: true,
            updatedAt: nowIso,
          };
          updatedTarget = nextItem;
          return nextItem;
        }
        return i;
      });

      if (updatedTarget) {
        pendingSheetSyncKeysRef.current.add(getItemSyncKey(updatedTarget));
        persistPendingSheetKeys();
      }

      commitItemsLocally(updated);
      await Promise.all([
        updatedTarget ? upsertCloudSPPItemsToServer([updatedTarget]) : Promise.resolve(true),
        saveCloudSPPItemsToServer(updated, { source: 'USER_SAVE' }),
      ]);
      await addAuditLog(
        'QUICK_UPDATE_PO_CLOSE',
        `Memperbarui No. PO ${poNumber} tanggal ${poDate} untuk SPP ID ${id} -> Status otomatis CLOSE`,
        id
      );

      // Sinkronkan update nomor PO ke Google Sheet di background
      if (updatedTarget && (updatedTarget as SPPItem).area) {
        const target = updatedTarget as SPPItem;
        void pushItemsToGoogleSheetInBackground(target.area, [target]);
      }
    } finally {
      lastLocalMutationAtRef.current = Date.now();
      isSavingRef.current = false;
    }
  };

  // Hapus Single SPP
  const handleDeleteSPP = async (id: string) => {
    isSavingRef.current = true;
    try {
      const currentSnapshot = itemsRef.current;
      const target = currentSnapshot.find((i) => i.id === id);
      const updated = currentSnapshot.filter((i) => i.id !== id);
      commitItemsLocally(updated);
      await saveCloudSPPItemsToServer(updated);
      await addAuditLog('DELETE_SPP', `Menghapus dokumen SPP ${target?.sppNumber || id} (Area: ${target?.area})`, id);

      // Otomatis sinkronkan penghapusan ke Google Sheet jika cabang terhubung (Komunikasi 2 Arah)
      if (target?.area) {
        const cfg = areaConfigsRef.current[target.area];
        if (cfg?.webAppUrl && cfg.webAppUrl.trim().startsWith('http')) {
          try {
            const remainingAreaItems = updated.filter((i) => i.area === target.area);
            await pushToGoogleSheet(cfg.webAppUrl, remainingAreaItems, 'SYNC_FULL', target.area);
          } catch (err) {
            console.error(`Auto sync delete ke Google Sheet (${target.area}) gagal:`, err);
          }
        }
      }
    } finally {
      isSavingRef.current = false;
    }
  };

  // Hapus Banyak SPP Sekaligus (Batch Delete)
  const handleDeleteBatchSPP = async (ids: string[]) => {
    isSavingRef.current = true;
    try {
      const currentSnapshot = itemsRef.current;
      const targets = currentSnapshot.filter((i) => ids.includes(i.id));
      const count = ids.length;
      const updated = currentSnapshot.filter((i) => !ids.includes(i.id));
      commitItemsLocally(updated);
      await saveCloudSPPItemsToServer(updated);
      await addAuditLog('DELETE_SPP_BATCH', `Menghapus ${count} dokumen SPP sekaligus`);

      // Otomatis sinkronkan penghapusan batch ke Google Sheet (Komunikasi 2 Arah)
      const affectedAreas = Array.from(new Set(targets.map((t) => t.area)));
      for (const area of affectedAreas) {
        const cfg = areaConfigsRef.current[area];
        if (cfg?.webAppUrl && cfg.webAppUrl.trim().startsWith('http')) {
          try {
            const remainingAreaItems = updated.filter((i) => i.area === area);
            await pushToGoogleSheet(cfg.webAppUrl, remainingAreaItems, 'SYNC_FULL', area);
          } catch (err) {
            console.error(`Auto sync batch delete ke Google Sheet (${area}) gagal:`, err);
          }
        }
      }
    } finally {
      isSavingRef.current = false;
    }
  };

  // Kosongkan Seluruh Data SPP (dengan opsi sinkronisasi ke Google Sheet yang terhubung)
  const handleClearAllSPP = async (syncWithGoogleSheet: boolean = true) => {
    if (!currentUser) return;
    isSavingRef.current = true;
    try {
      const currentSnapshot = itemsRef.current;
      const isSuperadminAll = currentUser.role === 'SUPERADMIN' && activeAreaFilter === 'ALL';
      const targetArea = currentUser.role === 'SUPERADMIN' ? activeAreaFilter : currentUser.area;

      let updated: SPPItem[];
      let countCleared = 0;
      if (isSuperadminAll) {
        countCleared = currentSnapshot.length;
        updated = [];
      } else {
        const itemsToClear = currentSnapshot.filter((i) => i.area === targetArea);
        countCleared = itemsToClear.length;
        updated = currentSnapshot.filter((i) => i.area !== targetArea);
      }

      commitItemsLocally(updated);
      await saveCloudSPPItemsToServer(updated);

      // Sinkronkan pengosongan ke Google Sheet jika opsi dicentang
      const clearedSheetNames: string[] = [];
      if (syncWithGoogleSheet) {
        const areasToSync: SJAArea[] = isSuperadminAll
          ? (['SEPANJANG', 'KARAWANG', 'SUKODONO', 'SEMARANG'] as SJAArea[])
          : ([targetArea as SJAArea]);

        for (const a of areasToSync) {
          const cfg = areaConfigsRef.current[a];
          if (cfg?.webAppUrl && cfg.webAppUrl.trim().startsWith('http')) {
            try {
              await clearGoogleSheet(cfg.webAppUrl, a);
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
    } finally {
      isSavingRef.current = false;
    }
  };

  // Muat Contoh Data Demo
  const handleLoadSampleData = async () => {
    const sampleItems = buildProcessedSPP(SAMPLE_DEMO_ITEMS);
    commitItemsLocally(sampleItems);
    await saveCloudSPPItemsToServer(sampleItems);
    await addAuditLog('LOAD_SAMPLE_DATA', `Memuat kembali ${sampleItems.length} contoh data demo SPP`);
  };

  // Tambah / Hapus Libur Nasional
  const handleAddHoliday = async (newH: IndonesianHoliday) => {
    const nextHolidays = [...holidays, newH];
    setHolidays(nextHolidays);

    const reprocessed = itemsRef.current.map((item) => {
      const calc = calculateWorkingDays(item.budgetReceivedDate, item.poDate, nextHolidays);
      return {
        ...item,
        processDays: calc.workingDays,
        statusOntime: calc.workingDays <= item.slaLimit ? 'ONTIME' : 'TERLAMBAT',
        isHPlus3Overdue: item.statusPO === 'OPEN' && calc.workingDays >= 3,
        isSignificantDelay: calc.workingDays > 10,
      } as SPPItem;
    });
    commitItemsLocally(reprocessed);
    await saveCloudSPPItemsToServer(reprocessed);

    await addAuditLog('ADD_HOLIDAY', `Menambahkan tanggal libur kustom: ${newH.name} (${newH.date})`);
  };

  const handleDeleteHoliday = async (date: string) => {
    const nextHolidays = holidays.filter((h) => h.date !== date);
    setHolidays(nextHolidays);
    await addAuditLog('DELETE_HOLIDAY', `Menghapus tanggal libur: ${date}`);
  };

  // Sinkronisasi Google Sheets Per-Area (2 Arah Penuh: Tarik data baru, update data, dan hapus data yang telah dihapus di Google Sheet)
  const handlePullFromSheet = async (area: SJAArea) => {
    const cfg = areaConfigsRef.current[area] || getFallbackAreaConfigs()[area];
    if (!cfg?.webAppUrl) throw new Error(`Web App URL belum diisi untuk ${AREA_METADATA[area]?.name}`);

    const epochAtStart = mutationEpochRef.current;
    const rawFromSheet = await fetchFromGoogleSheet(cfg.webAppUrl, area);
    if (!Array.isArray(rawFromSheet)) {
      throw new Error(`Format data tidak valid dari Google Sheet ${AREA_METADATA[area]?.name}`);
    }

    // Jika selama fetch ada aksi simpan/hapus lokal yang baru saja terjadi, batalkan overwrite agar editan tidak hilang
    if (isSavingRef.current || mutationEpochRef.current !== epochAtStart) {
      return {
        area,
        areaName: AREA_METADATA[area]?.name || area,
        totalInSheet: rawFromSheet.length,
        addedCount: 0,
        updatedCount: 0,
        deletedCount: 0,
        deletedItemNumbers: [],
      };
    }

    // Ambil data terbaru yang saat ini ada di aplikasi untuk area ini
    const currentSnapshot = itemsRef.current;
    const existingAreaItems = currentSnapshot.filter((i) => i.area === area);
    const itemsNeedingPushBack: SPPItem[] = [];

    // Proses data yang ditarik dari Google Sheet
    const tagged: SPPItem[] = rawFromSheet.map((i, idx) => {
      const existing = existingAreaItems.find(
        (cur) => cur.sppNumber.trim().toLowerCase() === (i.sppNumber || '').trim().toLowerCase()
      );

      const cleanBudget = normalizeDateString(i.budgetReceivedDate) || new Date().toISOString().split('T')[0];
      const cleanPo = normalizeDateString(i.poDate);

      const calc = calculateWorkingDays(cleanBudget, cleanPo, holidaysRef.current);
      const processDays = calc.workingDays;
      const hasPo = !!(i.poNumber && i.poNumber.trim() !== '');
      const statusPO = hasPo ? 'CLOSE' : 'OPEN';
      const slaLimit = i.slaLimit || 10;
      const statusOntime = processDays <= slaLimit ? 'ONTIME' : 'TERLAMBAT';
      const isHPlus3Overdue = statusPO === 'OPEN' && processDays >= 3;
      const isSignificantDelay = processDays > slaLimit;

      // Proteksi perubahan lokal/server yang belum tersinkron ke Google Sheet agar TIDAK tertimpa data OPEN lama dari Sheet
      const syncKey = existing ? getItemSyncKey(existing) : '';
      const hasPendingSync = !!(
        existing &&
        (existing.pendingSheetSync === true || pendingSheetSyncKeysRef.current.has(syncKey))
      );
      const localClosedWhileSheetOpen = !!(
        existing &&
        isItemClosed(existing) &&
        !hasPo &&
        (hasPendingSync || toEpochMs(existing.updatedAt) >= toEpochMs(i.updatedAt) || toEpochMs(i.updatedAt) === 0)
      );

      if (existing && (hasPendingSync || localClosedWhileSheetOpen)) {
        // Apabila Google Sheet ternyata sudah memiliki PO yang identik dengan editan lokal, selesaikan pending sync
        if (hasPo && isItemClosed(existing) && (i.poNumber || '').trim() === (existing.poNumber || '').trim()) {
          pendingSheetSyncKeysRef.current.delete(syncKey);
          persistPendingSheetKeys();
          return { ...existing, pendingSheetSync: false };
        }
        itemsNeedingPushBack.push(existing);
        return existing;
      }

      const normalizedPulledItem: SPPItem = {
        ...i,
        id: existing?.id || i.id || `SPP-${Date.now()}-${idx}`,
        budgetReceivedDate: cleanBudget,
        sppNumber: i.sppNumber.trim(),
        area: area,
        pic: i.pic?.trim() || existing?.pic || '-',
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
        pendingSheetSync: false,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: existing?.updatedAt || i.updatedAt || new Date().toISOString(),
      };

      // Hanya push balik ke Google Sheet bila status PO di Sheet belum selaras (misal baru diisi No PO di Sheet tapi statusPO masih OPEN)
      // atau dokumen sudah CLOSE namun kolom Hari Kerja berbeda (hindari push berulang tiap 30 detik untuk dokumen OPEN)
      if (
        i.statusPO !== statusPO ||
        (statusPO === 'CLOSE' && (Number(i.processDays) !== processDays || i.statusOntime !== statusOntime))
      ) {
        itemsNeedingPushBack.push({
          ...normalizedPulledItem,
          updatedAt: new Date().toISOString(),
        });
      }

      return normalizedPulledItem;
    });

    // Pastikan item baru yang dibuat di lokal/server & masih pendingSheetSync tidak ikut terhapus oleh pull sebelum berhasil terpush
    const pulledSppSet = new Set(tagged.map((t) => t.sppNumber.toLowerCase()));
    const pendingCreatedLocals = existingAreaItems.filter((e) => {
      const syncKey = getItemSyncKey(e);
      return (
        !pulledSppSet.has(e.sppNumber.toLowerCase()) &&
        (e.pendingSheetSync === true || pendingSheetSyncKeysRef.current.has(syncKey))
      );
    });
    pendingCreatedLocals.forEach((p) => itemsNeedingPushBack.push(p));

    const finalTagged = [...pendingCreatedLocals, ...tagged];

    // 1. Deteksi data yang dihapus di Google Sheet: ada di aplikasi tapi TIDAK ADA lagi di Google Sheet
    const newSheetSppSet = new Set(finalTagged.map((t) => t.sppNumber.toLowerCase()));
    const deletedFromSheet = existingAreaItems.filter((e) => !newSheetSppSet.has(e.sppNumber.toLowerCase()));
    const deletedCount = deletedFromSheet.length;

    // 2. Deteksi data baru yang ditambahkan di Google Sheet
    const existingSppSet = new Set(existingAreaItems.map((e) => e.sppNumber.toLowerCase()));
    const addedCount = finalTagged.filter((t) => !existingSppSet.has(t.sppNumber.toLowerCase())).length;
    const updatedCount = finalTagged.length - addedCount;

    // Cek ulang race condition tepat sebelum commit agar mutasi terbaru user tidak pernah tertimpa
    if (isSavingRef.current || mutationEpochRef.current !== epochAtStart) {
      return {
        area,
        areaName: AREA_METADATA[area]?.name || area,
        totalInSheet: finalTagged.length,
        addedCount: 0,
        updatedCount: 0,
        deletedCount: 0,
        deletedItemNumbers: [],
      };
    }

    // Deteksi apakah benar-benar ada perubahan dibanding state saat ini agar tidak spam disk setiap 30 detik
    const toAreaSignature = (list: SPPItem[]) =>
      list
        .map((x) => `${x.id}|${x.sppNumber}|${x.pic}|${x.poDate || ''}|${x.poNumber || ''}|${x.statusPO}|${x.processDays}|${x.notes || ''}|${x.specialCondition || ''}|${x.specialConditionReason || ''}|${Boolean(x.pendingSheetSync)}`)
        .sort()
        .join(';;');

    const hasAreaChanges = toAreaSignature(existingAreaItems) !== toAreaSignature(finalTagged);

    // UPDATE STATE APLIKASI & SERVER CLOUD
    const mergedAllItems = [
      ...finalTagged,
      ...itemsRef.current.filter((i) => i.area !== area),
    ];
    if (hasAreaChanges) {
      commitItemsLocally(mergedAllItems);
      await saveCloudSPPItemsToServer(mergedAllItems, { source: 'AUTO_PULL' });
    }

    // 3. SINKRONISASI 2 ARAH BALIK KE GOOGLE SHEET HANYA UNTUK ITEM YANG PERLU REKALKULASI / PENDING RETRY
    if (itemsNeedingPushBack.length > 0 && cfg?.webAppUrl) {
      try {
        await pushToGoogleSheet(cfg.webAppUrl, itemsNeedingPushBack, 'UPSERT_BATCH', area);
        const pushedKeys = new Set(itemsNeedingPushBack.map((p) => getItemSyncKey(p)));
        itemsNeedingPushBack.forEach((p) => pendingSheetSyncKeysRef.current.delete(getItemSyncKey(p)));
        persistPendingSheetKeys();

        const clearedItems: SPPItem[] = [];
        const syncedList = itemsRef.current.map((cur) => {
          if (pushedKeys.has(getItemSyncKey(cur)) && cur.pendingSheetSync) {
            const cleanItem = { ...cur, pendingSheetSync: false };
            clearedItems.push(cleanItem);
            return cleanItem;
          }
          return cur;
        });
        if (clearedItems.length > 0) {
          commitItemsLocally(syncedList);
          await upsertCloudSPPItemsToServer(clearedItems);
        }
      } catch (pushBackErr) {
        console.warn(`[2-Way Sync Push-Back Notice] Gagal memperbarui Google Sheet (${area}):`, pushBackErr);
      }
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
    let logText = `Sinkronisasi 2 arah ${areaName}: ${tagged.length} data aktif diselaraskan (${addedCount} baru, ${updatedCount} diperbarui)`;
    if (deletedCount > 0) {
      logText += `, serta ${deletedCount} data yang dihapus di Google Sheet telah dihapus dari aplikasi (${deletedFromSheet.map((d) => d.sppNumber).slice(0, 3).join(', ')}${deletedCount > 3 ? '...' : ''})`;
    }

    await addAuditLog('GOOGLE_SHEET_2WAY_SYNC', logText);

    return {
      area,
      areaName,
      totalInSheet: finalTagged.length,
      addedCount,
      updatedCount,
      deletedCount,
      deletedItemNumbers: deletedFromSheet.map((d) => d.sppNumber),
    };
  };

  // Handler Sinkronisasi Data Google Sheet (Manual maupun Auto Live Background)
  const handleSyncGoogleSheet = async (isSilent: boolean = false) => {
    if (!currentUser) return;
    if (isSyncingSheetRef.current || isSavingRef.current) return; // hindari duplicate / race dengan proses simpan

    isSyncingSheetRef.current = true;
    setIsSyncingSheet(true);
    try {
      const isSuperadminAll = currentUser.role === 'SUPERADMIN' && activeAreaFilter === 'ALL';
      const areasToSync: SJAArea[] = isSuperadminAll
        ? (['SEPANJANG', 'KARAWANG', 'SUKODONO', 'SEMARANG'] as SJAArea[])
        : ([((currentUser.role === 'SUPERADMIN' ? activeAreaFilter : currentUser.area) as SJAArea)]);

      const latestConfigs = areaConfigsRef.current;
      const configuredAreas = areasToSync.filter(
        (a) => latestConfigs[a]?.webAppUrl && latestConfigs[a].webAppUrl.trim().startsWith('http')
      );

      if (configuredAreas.length === 0) {
        if (!isSilent) {
          setSyncToast({
            type: 'warning',
            title: 'Google Sheet Belum Terhubung',
            description: `Web App URL Google Apps Script belum diisi untuk ${
              areasToSync.map((a) => AREA_METADATA[a]?.name).join(', ')
            }. Silakan buka tab 'Integrasi Google Sheet' untuk mengatur link.`,
          });
          setTimeout(() => setSyncToast(null), 6000);
        }
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

      const nowIso = new Date().toISOString();
      setLastAutoSyncTime(nowIso);

      if (!isSilent) {
        let desc = `Total ${totalInSheet} data aktif tersinkronisasi (${totalAdded} baru, ${totalUpdated} diperbarui).`;
        if (totalDeleted > 0) {
          desc += ` ${totalDeleted} data yang telah dihapus di Google Sheet berhasil ikut dihapus dari aplikasi.`;
        } else {
          desc += ` Tidak ada data yang dihapus di Google Sheet. Data 100% selaras.`;
        }

        setSyncToast({
          type: 'success',
          title: '✓ Sinkronkan Data Berhasil!',
          description: desc,
        });
        setTimeout(() => setSyncToast(null), 7000);
      }
    } catch (err: any) {
      if (!isSilent) {
        setSyncToast({
          type: 'error',
          title: 'Gagal Sinkronkan Data',
          description: err.message || 'Terjadi gangguan koneksi saat menarik data dari Google Apps Script.',
        });
        setTimeout(() => setSyncToast(null), 6000);
      }
    } finally {
      isSyncingSheetRef.current = false;
      setIsSyncingSheet(false);
      setAutoSyncCountdown(autoSyncInterval);
    }
  };

  // Simpan referensi handler terbaru agar timer/event listener tidak memakai stale closure
  const handleSyncGoogleSheetRef = useRef(handleSyncGoogleSheet);
  handleSyncGoogleSheetRef.current = handleSyncGoogleSheet;

  // Toggle & Interval Handler untuk Auto Live Sync
  const handleToggleAutoSync = (enabled?: boolean) => {
    const nextVal = enabled !== undefined ? enabled : !isAutoSyncEnabled;
    setIsAutoSyncEnabled(nextVal);
    try {
      localStorage.setItem('sja_auto_live_sync_active', String(nextVal));
    } catch {}
    if (nextVal) {
      setAutoSyncCountdown(autoSyncInterval);
    }
  };

  const handleChangeAutoSyncInterval = (newInterval: number) => {
    setAutoSyncInterval(newInterval);
    setAutoSyncCountdown(newInterval);
    try {
      localStorage.setItem('sja_auto_sync_interval', String(newInterval));
    } catch {}
  };

  // Auto Live Timer Effect: Menjalankan sync otomatis di background secara berkala
  useEffect(() => {
    if (!currentUser || !isAutoSyncEnabled) return;

    const timer = setInterval(() => {
      setAutoSyncCountdown((prev) => {
        if (prev <= 1) {
          // Trigger sync live background jika tidak sedang sync manual atau menyimpan
          if (!isSyncingSheetRef.current && !isSavingRef.current) {
            handleSyncGoogleSheetRef.current(true);
          }
          return autoSyncInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser, isAutoSyncEnabled, autoSyncInterval, activeAreaFilter]);

  // Auto Sync saat tab browser kembali aktif (Focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        isAutoSyncEnabled &&
        currentUser &&
        !isSyncingSheetRef.current &&
        !isSavingRef.current
      ) {
        handleSyncGoogleSheetRef.current(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAutoSyncEnabled, currentUser, activeAreaFilter]);

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
          isAutoSyncEnabled={isAutoSyncEnabled}
          onToggleAutoSync={handleToggleAutoSync}
          autoSyncInterval={autoSyncInterval}
          onChangeAutoSyncInterval={handleChangeAutoSyncInterval}
          autoSyncCountdown={autoSyncCountdown}
          lastSyncTime={lastAutoSyncTime}
          showLiveBadge={showLiveBadge}
          onToggleShowLiveBadge={handleToggleShowLiveBadge}
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
              isAutoSyncEnabled={isAutoSyncEnabled}
              onToggleAutoSync={handleToggleAutoSync}
              autoSyncInterval={autoSyncInterval}
              onChangeAutoSyncInterval={handleChangeAutoSyncInterval}
              autoSyncCountdown={autoSyncCountdown}
              lastSyncTime={lastAutoSyncTime}
              showLiveBadge={showLiveBadge}
              onToggleShowLiveBadge={handleToggleShowLiveBadge}
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
              items={items}
              onNavigateToTable={(area) => {
                setActiveAreaFilter(area);
                setActiveTab('dashboard');
              }}
            />
          )}
        </main>

        {/* Modals & Drawers */}
        <SPPFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditItem(null);
          }}
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
                  : syncToast.type === 'info'
                  ? 'bg-slate-900/95 border-blue-500/80 text-white'
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
                ) : syncToast.type === 'info' ? (
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
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
