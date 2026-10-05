import { SPPItem, SJAArea } from '../types';

export const AREA_CONFIG_SPECS: Record<
  SJAArea,
  { name: string; username: string; code: string; defaultSheetName: string }
> = {
  SEPANJANG: {
    name: 'SJA Sepanjang',
    username: 'sepanjang',
    code: 'SPJ',
    defaultSheetName: 'SPP_Sepanjang',
  },
  KARAWANG: {
    name: 'SJA Karawang',
    username: 'karawang',
    code: 'KRW',
    defaultSheetName: 'SPP_Karawang',
  },
  SUKODONO: {
    name: 'SJA Sukodono',
    username: 'sukodono',
    code: 'SKD',
    defaultSheetName: 'SPP_Sukodono',
  },
  SEMARANG: {
    name: 'SJA Semarang',
    username: 'semarang',
    code: 'SMG',
    defaultSheetName: 'SPP_Semarang',
  },
};

/**
 * Generator Kode Google Apps Script (Code.gs) khusus per masing-masing area.
 * Otomatis terhubung sesuai username dan nama cabang saat login.
 */
export function generateGoogleAppsScriptCode(area: SJAArea = 'SEPANJANG'): string {
  const spec = AREA_CONFIG_SPECS[area] || AREA_CONFIG_SPECS.SEPANJANG;

  return `/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT (Code.gs) - SISTEM MONITORING REALISASI SPP
 * PT SJA PROCUREMENT MANAGEMENT
 * 
 * CABANG RESMI       : ${spec.name}
 * AKUN USERNAME LOGIN : ${spec.username}
 * KODE AREA          : ${spec.code}
 * NAMA TAB SHEET     : ${spec.defaultSheetName}
 * ==============================================================================
 * 
 * CARA PEMASANGAN (HANYA 1 KALI):
 * 1. Buka Google Sheet cabang ${spec.name}.
 * 2. Klik menu 'Extensions' (Ekstensi) -> 'Apps Script'.
 * 3. Hapus seluruh isi default pada Code.gs, lalu PASTE SELURUH KODE INI.
 * 4. Klik ikon 'Save' (Simpan project).
 * 5. Klik tombol biru 'Deploy' (di kanan atas) -> pilih 'New deployment' (Penerapan baru).
 * 6. Pilih tipe: 'Web app' (ikon bola dunia):
 *    - Description : API SPP ${spec.name} (${spec.username})
 *    - Execute as  : Me (email Google Anda)
 *    - Who has access : Anyone (Siapa saja)  <-- WAJIB PILIH INI AGAR SISTEM DAPAT MENGAKSES
 * 7. Klik 'Deploy', lalu klik 'Authorize access' (Izinkan akses akun Google Anda).
 *    (Jika muncul 'Google hasn't verified this app' -> klik Advanced -> Go to ... (unsafe) -> Allow).
 * 8. Salin 'Web App URL' (akhiran /exec) dan tempelkan ke form pengaturan di Web App SJA!
 */

// KONFIGURASI OTOMATIS CABANG ${spec.name.toUpperCase()}
const TARGET_AREA = '${area}';
const BRANCH_NAME = '${spec.name}';
const TARGET_USERNAME = '${spec.username}';
const SHEET_NAME = '${spec.defaultSheetName}';

// Dapatkan atau buat otomatis sheet target cabang
function getTargetSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // Jika belum ada sheet bernama ${spec.defaultSheetName}, gunakan sheet aktif atau buat baru
    var active = ss.getActiveSheet();
    if (active && active.getLastRow() <= 1 && active.getName() !== SHEET_NAME) {
      try {
        active.setName(SHEET_NAME);
        sheet = active;
      } catch (e) {
        sheet = ss.insertSheet(SHEET_NAME);
      }
    } else {
      sheet = ss.insertSheet(SHEET_NAME);
    }
  }
  setupHeaders(sheet);
  return sheet;
}

// Inisialisasi Header Otomatis jika Baris 1 Masih Kosong
function setupHeaders(sheet) {
  var headers = [
    'ID Dokumen',
    'Tanggal Terima Budget',
    'Nomor SPP',
    'Area Cabang',
    'PIC Pengadaan',
    'Tanggal PO',
    'Nomor PO',
    'Kondisi Khusus',
    'Hari Kerja Proses',
    'Status PO',
    'Status SLA',
    'Alert H+3',
    'Catatan / Notes',
    'Terakhir Diperbarui'
  ];
  
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#1e293b');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    try {
      sheet.autoResizeColumns(1, headers.length);
    } catch(e) {}
  }
}

// Endpoint GET: Membaca seluruh data SPP cabang ini atau melakukan Tes Ping
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getTargetSheet(ss);

    // Fitur Ping Test untuk memverifikasi koneksi langsung dari web app
    if (e && e.parameter && (e.parameter.action === 'PING' || e.parameter.action === 'TEST')) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        area: TARGET_AREA,
        branch: BRANCH_NAME,
        username: TARGET_USERNAME,
        sheetName: sheet.getName(),
        totalRows: Math.max(0, sheet.getLastRow() - 1),
        message: 'Koneksi ke Google Sheet ' + BRANCH_NAME + ' berhasil terverifikasi!'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        area: TARGET_AREA,
        branch: BRANCH_NAME,
        username: TARGET_USERNAME,
        total: 0,
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
    var result = data.map(function(row) {
      var specialCond = String(row[7] || '');
      return {
        id: String(row[0] || ('SPP-' + row[2])),
        budgetReceivedDate: formatDate(row[1]),
        sppNumber: String(row[2] || ''),
        area: TARGET_AREA,
        pic: String(row[4] || ''),
        poDate: formatDate(row[5]),
        poNumber: String(row[6] || ''),
        specialCondition: specialCond,
        isSpecialConditionHold: !row[6] && specialCond !== '',
        processDays: Number(row[8] || 0),
        statusPO: String(row[9] || (row[6] ? 'CLOSE' : 'OPEN')),
        statusOntime: String(row[10] || 'ONTIME'),
        isHPlus3Overdue: String(row[11] || '').toUpperCase() === 'YA',
        notes: String(row[12] || ''),
        updatedAt: String(row[13] || new Date().toISOString())
      };
    }).filter(function(item) {
      return item.sppNumber && item.sppNumber.trim() !== '';
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      area: TARGET_AREA,
      branch: BRANCH_NAME,
      username: TARGET_USERNAME,
      total: result.length,
      data: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      area: TARGET_AREA,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Endpoint POST: Simpan atau Update data SPP ke Google Sheet
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getTargetSheet(ss);
    
    var body = JSON.parse(e.postData.contents);
    var action = body.action || 'UPSERT_BATCH';
    var count = 0;

    if (action === 'UPSERT_SINGLE' && body.item) {
      upsertRow(sheet, body.item);
      count = 1;
    } else if (action === 'UPSERT_BATCH' && Array.isArray(body.items)) {
      body.items.forEach(function(item) {
        upsertRow(sheet, item);
      });
      count = body.items.length;
    } else if (action === 'CLEAR_ALL') {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        // Kosongkan seluruh baris isi data (baris 2 ke bawah), baris 1 header tetap aman!
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
        count = lastRow - 1;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      area: TARGET_AREA,
      branch: BRANCH_NAME,
      username: TARGET_USERNAME,
      count: count,
      message: action === 'CLEAR_ALL'
        ? 'Berhasil mengosongkan seluruh baris data di Google Sheet ' + BRANCH_NAME + ' (Header tetap aman).'
        : 'Berhasil menyinkronkan ' + count + ' data SPP ke Google Sheet ' + BRANCH_NAME,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      area: TARGET_AREA,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function upsertRow(sheet, item) {
  var lastRow = sheet.getLastRow();
  var rowIndex = -1;

  if (lastRow > 1) {
    var existingIds = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (var i = 0; i < existingIds.length; i++) {
      var rowId = String(existingIds[i][0]);
      var rowSpp = String(existingIds[i][2]);
      if (rowId === String(item.id) || (rowSpp && rowSpp === String(item.sppNumber))) {
        rowIndex = i + 2;
        break;
      }
    }
  }

  var rowData = [
    item.id || ('SPP-' + item.sppNumber),
    item.budgetReceivedDate || '',
    item.sppNumber || '',
    BRANCH_NAME,
    item.pic || '',
    item.poDate || '',
    item.poNumber || '',
    item.specialCondition || '',
    item.processDays || 0,
    item.statusPO || (item.poNumber ? 'CLOSE' : 'OPEN'),
    item.statusOntime || 'ONTIME',
    item.isHPlus3Overdue ? 'YA' : 'TIDAK',
    item.notes || '',
    new Date().toISOString()
  ];

  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1).padStart(2, '0');
    var d = String(val.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  return String(val);
}
`;
}

/**
 * Tes koneksi real-time ke Google Sheet Apps Script Web App URL
 */
export async function testGoogleSheetConnection(
  webAppUrl: string
): Promise<{
  success: boolean;
  message: string;
  area?: string;
  branch?: string;
  username?: string;
  totalRows?: number;
}> {
  if (!webAppUrl || !webAppUrl.startsWith('http')) {
    throw new Error('URL Google Apps Script tidak valid. Pastikan diawali https://script.google.com/macros/s/.../exec');
  }

  const pingUrl = webAppUrl.includes('?') ? `${webAppUrl}&action=PING` : `${webAppUrl}?action=PING`;

  const response = await fetch(pingUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Koneksi HTTP Gagal: ${response.status} ${response.statusText}`);
  }

  const resJson = await response.json();
  if (resJson.status === 'success') {
    return {
      success: true,
      message: resJson.message || 'Koneksi berhasil!',
      area: resJson.area,
      branch: resJson.branch,
      username: resJson.username,
      totalRows: resJson.totalRows,
    };
  }

  throw new Error(resJson.message || 'Respons tidak valid dari Apps Script.');
}

/**
 * Fetch data SPP dari Google Sheets Apps Script Web App URL
 */
export async function fetchFromGoogleSheet(webAppUrl: string): Promise<SPPItem[]> {
  if (!webAppUrl || !webAppUrl.startsWith('http')) {
    throw new Error('URL Google Apps Script tidak valid. Harap periksa format URL.');
  }

  const response = await fetch(webAppUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Koneksi Google Sheet gagal: ${response.status} ${response.statusText}`);
  }

  const resJson = await response.json();
  if (resJson.status !== 'success' || !Array.isArray(resJson.data)) {
    throw new Error(resJson.message || 'Respons dari Google Sheet tidak sesuai skema.');
  }

  return resJson.data;
}

/**
 * Push data SPP ke Google Sheets
 */
export async function pushToGoogleSheet(webAppUrl: string, items: SPPItem[]): Promise<boolean> {
  if (!webAppUrl || !webAppUrl.startsWith('http')) {
    throw new Error('URL Google Apps Script tidak valid.');
  }

  await fetch(webAppUrl, {
    method: 'POST',
    mode: 'no-cors', // Apps script redirect mode
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'UPSERT_BATCH',
      items: items,
    }),
  });

  return true;
}

/**
 * Kosongkan seluruh baris data di Google Sheet (Header baris 1 dipertahankan aman)
 */
export async function clearGoogleSheet(webAppUrl: string): Promise<boolean> {
  if (!webAppUrl || !webAppUrl.startsWith('http')) {
    throw new Error('URL Google Apps Script tidak valid.');
  }

  await fetch(webAppUrl, {
    method: 'POST',
    mode: 'no-cors', // Apps script redirect mode
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'CLEAR_ALL',
    }),
  });

  return true;
}
