import { IndonesianHoliday } from '../types';

// Daftar Hari Libur Nasional & Cuti Bersama Indonesia (2025 - 2027)
export const DEFAULT_INDONESIAN_HOLIDAYS: IndonesianHoliday[] = [
  // 2025
  { date: '2025-01-01', name: 'Tahun Baru 2025 Masehi', type: 'NASIONAL' },
  { date: '2025-01-27', name: 'Isra Mikraj Nabi Muhammad SAW', type: 'NASIONAL' },
  { date: '2025-01-29', name: 'Tahun Baru Imlek 2576 Kongzili', type: 'NASIONAL' },
  { date: '2025-03-29', name: 'Hari Suci Nyepi (Tahun Baru Saka 1947)', type: 'NASIONAL' },
  { date: '2025-03-31', name: 'Idul Fitri 1446 H (Hari 1)', type: 'NASIONAL' },
  { date: '2025-04-01', name: 'Idul Fitri 1446 H (Hari 2)', type: 'NASIONAL' },
  { date: '2025-04-02', name: 'Cuti Bersama Idul Fitri', type: 'CUTI_BERSAMA' },
  { date: '2025-04-03', name: 'Cuti Bersama Idul Fitri', type: 'CUTI_BERSAMA' },
  { date: '2025-04-04', name: 'Cuti Bersama Idul Fitri', type: 'CUTI_BERSAMA' },
  { date: '2025-04-18', name: 'Wafat Yesus Kristus', type: 'NASIONAL' },
  { date: '2025-04-20', name: 'Hari Paskah', type: 'NASIONAL' },
  { date: '2025-05-01', name: 'Hari Buruh Internasional', type: 'NASIONAL' },
  { date: '2025-05-12', name: 'Hari Raya Waisak 2569 BE', type: 'NASIONAL' },
  { date: '2025-05-29', name: 'Kenaikan Yesus Kristus', type: 'NASIONAL' },
  { date: '2025-06-01', name: 'Hari Lahir Pancasila', type: 'NASIONAL' },
  { date: '2025-06-07', name: 'Hari Raya Idul Adha 1446 H', type: 'NASIONAL' },
  { date: '2025-06-27', name: '1 Muharam Tahun Baru Islam 1447 H', type: 'NASIONAL' },
  { date: '2025-08-17', name: 'Proklamasi Kemerdekaan RI', type: 'NASIONAL' },
  { date: '2025-09-05', name: 'Maulid Nabi Muhammad SAW', type: 'NASIONAL' },
  { date: '2025-12-25', name: 'Hari Raya Natal', type: 'NASIONAL' },
  { date: '2025-12-26', name: 'Cuti Bersama Natal', type: 'CUTI_BERSAMA' },

  // 2026
  { date: '2026-01-01', name: 'Tahun Baru 2026 Masehi', type: 'NASIONAL' },
  { date: '2026-01-16', name: 'Isra Mikraj Nabi Muhammad SAW', type: 'NASIONAL' },
  { date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili', type: 'NASIONAL' },
  { date: '2026-03-19', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', type: 'NASIONAL' },
  { date: '2026-03-20', name: 'Idul Fitri 1447 H (Hari 1)', type: 'NASIONAL' },
  { date: '2026-03-21', name: 'Idul Fitri 1447 H (Hari 2)', type: 'NASIONAL' },
  { date: '2026-03-23', name: 'Cuti Bersama Idul Fitri', type: 'CUTI_BERSAMA' },
  { date: '2026-03-24', name: 'Cuti Bersama Idul Fitri', type: 'CUTI_BERSAMA' },
  { date: '2026-04-03', name: 'Wafat Yesus Kristus', type: 'NASIONAL' },
  { date: '2026-05-01', name: 'Hari Buruh Internasional', type: 'NASIONAL' },
  { date: '2026-05-14', name: 'Kenaikan Yesus Kristus', type: 'NASIONAL' },
  { date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE', type: 'NASIONAL' },
  { date: '2026-06-01', name: 'Hari Lahir Pancasila', type: 'NASIONAL' },
  { date: '2026-06-16', name: 'Hari Raya Idul Adha 1447 H', type: 'NASIONAL' },
  { date: '2026-07-16', name: 'Tahun Baru Islam 1448 H', type: 'NASIONAL' },
  { date: '2026-08-17', name: 'Proklamasi Kemerdekaan RI ke-81', type: 'NASIONAL' },
  { date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW', type: 'NASIONAL' },
  { date: '2026-12-25', name: 'Hari Raya Natal', type: 'NASIONAL' },
  { date: '2026-12-26', name: 'Cuti Bersama Natal', type: 'CUTI_BERSAMA' },

  // 2027
  { date: '2027-01-01', name: 'Tahun Baru 2027 Masehi', type: 'NASIONAL' },
  { date: '2027-02-06', name: 'Tahun Baru Imlek 2578', type: 'NASIONAL' },
  { date: '2027-03-09', name: 'Idul Fitri 1448 H', type: 'NASIONAL' },
  { date: '2027-03-10', name: 'Idul Fitri 1448 H', type: 'NASIONAL' },
  { date: '2027-05-01', name: 'Hari Buruh Internasional', type: 'NASIONAL' },
  { date: '2027-08-17', name: 'HUT RI ke-82', type: 'NASIONAL' },
  { date: '2027-12-25', name: 'Hari Raya Natal', type: 'NASIONAL' },
];

/**
 * Format string tanggal YYYY-MM-DD ke Date object lokal tanpa timezone shift
 */
export function parseISODate(dateStr: string): Date {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day, 12, 0, 0); // gunakan tengah hari untuk hindari daylight offset
}

export function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Cek apakah sebuah tanggal adalah Hari Libur Nasional / Cuti Bersama
 */
export function checkIsIndonesianHoliday(
  dateStr: string,
  customHolidays: IndonesianHoliday[] = DEFAULT_INDONESIAN_HOLIDAYS
): { isHoliday: boolean; holidayName?: string; type?: string } {
  const found = customHolidays.find((h) => h.date === dateStr);
  if (found) {
    return { isHoliday: true, holidayName: found.name, type: found.type };
  }
  return { isHoliday: false };
}

/**
 * Cek apakah sebuah tanggal adalah akhir pekan (Sabtu atau Minggu)
 */
export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6; // 0 = Minggu, 6 = Sabtu
}

/**
 * RUMUS UTAMA: Hitung jumlah hari kerja proses
 * Pengurangan dari tanggal terima team budget s/d tanggal pembuatan PO (atau hari ini jika PO belum ada)
 * DIKECUALIKAN: Hari Sabtu, Minggu, dan Hari Libur Nasional / Cuti Bersama.
 */
export function calculateWorkingDays(
  startDateStr: string,
  endDateStr?: string,
  holidays: IndonesianHoliday[] = DEFAULT_INDONESIAN_HOLIDAYS
): {
  workingDays: number;
  totalCalendarDays: number;
  weekendDaysSkipped: number;
  holidayDaysSkipped: number;
  holidaysSkippedList: string[];
} {
  if (!startDateStr) {
    return {
      workingDays: 0,
      totalCalendarDays: 0,
      weekendDaysSkipped: 0,
      holidayDaysSkipped: 0,
      holidaysSkippedList: [],
    };
  }

  const start = parseISODate(startDateStr);
  const end = endDateStr ? parseISODate(endDateStr) : new Date();

  // Jika tanggal mulai lebih besar dari akhir (misal data invalid)
  if (start > end) {
    return {
      workingDays: 0,
      totalCalendarDays: 0,
      weekendDaysSkipped: 0,
      holidayDaysSkipped: 0,
      holidaysSkippedList: [],
    };
  }

  let current = new Date(start);
  let workingDays = 0;
  let totalCalendarDays = 0;
  let weekendDaysSkipped = 0;
  let holidayDaysSkipped = 0;
  const holidaysSkippedList: string[] = [];

  // Hitung hari kerja dari startDate hingga endDate
  // Aturan standar proses pengadaan: jika PO selesai di hari yang sama, dihitung 0 atau 1 hari kerja (disini kita hitung hari kerja transisi: Day 1 - Day 0)
  while (current <= end) {
    totalCalendarDays++;
    const currentISO = formatDateToISO(current);
    const weekend = isWeekend(current);
    const holidayCheck = checkIsIndonesianHoliday(currentISO, holidays);

    if (weekend) {
      weekendDaysSkipped++;
    } else if (holidayCheck.isHoliday) {
      holidayDaysSkipped++;
      if (holidayCheck.holidayName && !holidaysSkippedList.includes(holidayCheck.holidayName)) {
        holidaysSkippedList.push(`${holidayCheck.holidayName} (${currentISO})`);
      }
    } else {
      // Hanya hari kerja efektif
      // Kita hitung hari kerja berjalan. Jika start == end pada hari kerja yang sama = 1 hari kerja
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  // Jika start dan end adalah hari yang sama dan merupakan hari kerja, workingDays = 1
  return {
    workingDays: Math.max(0, workingDays),
    totalCalendarDays,
    weekendDaysSkipped,
    holidayDaysSkipped,
    holidaysSkippedList,
  };
}

/**
 * Tambahkan N hari kerja dari tanggal awal (melewati Sabtu, Minggu & Libur)
 */
export function addWorkingDays(
  startDateStr: string,
  daysToAdd: number,
  holidays: IndonesianHoliday[] = DEFAULT_INDONESIAN_HOLIDAYS
): string {
  const current = parseISODate(startDateStr);
  let added = 0;

  while (added < daysToAdd) {
    current.setDate(current.getDate() + 1);
    const currentISO = formatDateToISO(current);
    const weekend = isWeekend(current);
    const holidayCheck = checkIsIndonesianHoliday(currentISO, holidays);

    if (!weekend && !holidayCheck.isHoliday) {
      added++;
    }
  }

  return formatDateToISO(current);
}

/**
 * Format tanggal Indonesia ramah pengguna: "15 Maret 2026"
 */
export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = parseISODate(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format mata uang Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
