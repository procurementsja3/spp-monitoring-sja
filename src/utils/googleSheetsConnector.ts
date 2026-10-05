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

// ==============================================================================
// 5. RUMUS OTOMATIS KOLOM I s/d M (OTOMATIS DISET SAAT INPUT MANUAL DI SHEET)
// ==============================================================================
function applyFormulasToRow(sheet, r) {
  // Kolom I: Hari Kerja Proses (NETWORKDAYS)
  sheet.getRange(r, 9).setFormula('=IF(B' + r + '="","",NETWORKDAYS(B' + r + ',IF(F' + r + '<>"",F' + r + ',TODAY())))');
  
  // Kolom J: Status PO (CLOSE / OPEN)
  sheet.getRange(r, 10).setFormula('=IF(B' + r + '="","",IF(G' + r + '<>"","CLOSE","OPEN"))');
  
  // Kolom K: Status SLA (ONTIME / TERLAMBAT)
  sheet.getRange(r, 11).setFormula('=IF(I' + r + '="","",IF(I' + r + '<=10,"ONTIME","TERLAMBAT"))');
  
  // Kolom L: Alert H+3 (YA / TIDAK)
  sheet.getRange(r, 12).setFormula('=IF(B' + r + '="","",IF(AND(J' + r + '="OPEN",I' + r + '>=3,H' + r + '=""),"YA","TIDAK"))');
  
  // Kolom M: Catatan / Notes
  sheet.getRange(r, 13).setFormula('=IF(B' + r + '="","",IF(J' + r + '="CLOSE",IF(K' + r + '="ONTIME","PO Selesai On-Time (" & I' + r + ' & " hari)","PO Terlambat (" & I' + r + ' & " hari)"),IF(H' + r + '<>"","Hold: " & H' + r + ',IF(L' + r + '="YA","Peringatan H+3: Segera terbitkan PO","Menunggu PO (" & I' + r + ' & " hari)"))))');
}

// ==============================================================================
// 6. TRIGGER OTOMATIS onEdit: SAAT USER MENGISI / EDIT BARIS DI GOOGLE SHEET
// ==============================================================================
function onEdit(e) {
  try {
    var range = e && e.range;
    if (!range) return;
    var sheet = range.getSheet();
    if (sheet.getName() !== SHEET_NAME) return;
    var row = range.getRow();
    if (row <= 1) return; // Abaikan baris 1 header

    // Ambil Nomor SPP (Kolom 3) dan Tanggal Terima Budget (Kolom 2)
    var sppNumber = String(sheet.getRange(row, 3).getValue() || '').trim();
    var budgetDate = sheet.getRange(row, 2).getValue();
    if (!sppNumber && !budgetDate) return;

    // 1. Otomatis isi Kolom A (ID Dokumen) jika kosong
    var docId = String(sheet.getRange(row, 1).getValue() || '').trim();
    if (!docId && sppNumber) {
      sheet.getRange(row, 1).setValue('SPP-' + sppNumber);
    }

    // 2. Otomatis isi Kolom D (Area Cabang) jika kosong
    var areaVal = String(sheet.getRange(row, 4).getValue() || '').trim();
    if (!areaVal) {
      sheet.getRange(row, 4).setValue(BRANCH_NAME);
    }

    // 3. Pasang / Perbarui Rumus Otomatis Kolom I, J, K, L, M
    applyFormulasToRow(sheet, row);

    // 4. Update Kolom N (Terakhir Diperbarui) dengan timestamp WIB
    var timestampStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
    sheet.getRange(row, 14).setValue(timestampStr);
  } catch(err) {
    // Silent error handler agar pengetikan tidak terganggu
  }
}

// ==============================================================================
// 7. MENU KHUSUS SPREADSHEET (SJA PROCUREMENT)
// ==============================================================================
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('⚡ SJA Procurement')
      .addItem('Terapkan Rumus Otomatis (Kolom I - M) ke Seluruh Baris', 'menuApplyFormulasToAllRows')
      .addItem('Lengkapi ID Dokumen & Area Cabang yang Kosong', 'menuAutoFillMissingIds')
      .addSeparator()
      .addItem('Petunjuk Rumus Kolom I - N', 'menuShowFormulaHelp')
      .addToUi();
  } catch(e) {}
}

function menuApplyFormulasToAllRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('Belum ada baris data SPP untuk diterapkan rumus.');
    return;
  }
  for (var r = 2; r <= lastRow; r++) {
    var spp = sheet.getRange(r, 3).getValue();
    var bDate = sheet.getRange(r, 2).getValue();
    if (spp || bDate) {
      applyFormulasToRow(sheet, r);
    }
  }
  SpreadsheetApp.getUi().alert('Berhasil! Seluruh baris dari baris 2 hingga ' + lastRow + ' telah dipasangi rumus otomatis untuk Kolom I, J, K, L, dan M.');
}

function menuAutoFillMissingIds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  var count = 0;
  for (var r = 2; r <= lastRow; r++) {
    var spp = String(sheet.getRange(r, 3).getValue() || '').trim();
    if (spp) {
      var idVal = sheet.getRange(r, 1).getValue();
      if (!idVal) {
        sheet.getRange(r, 1).setValue('SPP-' + spp);
        count++;
      }
      var areaVal = sheet.getRange(r, 4).getValue();
      if (!areaVal) {
        sheet.getRange(r, 4).setValue(BRANCH_NAME);
      }
    }
  }
  SpreadsheetApp.getUi().alert('Selesai! ' + count + ' baris ID Dokumen & Area Cabang berhasil dilengkapi otomatis.');
}

function menuShowFormulaHelp() {
  var helpText = 
    'PANDUAN RUMUS OTOMATIS SPREADSHEET:\\n\\n' +
    '• Kolom I (Hari Kerja): =IF(B2=\"\",\"\",NETWORKDAYS(B2,IF(F2<>\"\",F2,TODAY())))\\n' +
    '• Kolom J (Status PO): =IF(B2=\"\",\"\",IF(G2<>\"\",\"CLOSE\",\"OPEN\"))\\n' +
    '• Kolom K (Status SLA): =IF(I2=\"\",\"\",IF(I2<=10,\"ONTIME\",\"TERLAMBAT\"))\\n' +
    '• Kolom L (Alert H+3): =IF(B2=\"\",\"\",IF(AND(J2=\"OPEN\",I2>=3,H2=\"\"),\"YA\",\"TIDAK\"))\\n' +
    '• Kolom M (Catatan): =IF(B2=\"\",\"\",IF(J2=\"CLOSE\",IF(K2=\"ONTIME\",\"PO Selesai On-Time (\" & I2 & \" hari)\",\"PO Terlambat (\" & I2 & \" hari)\"),IF(H2<>\"\",\"Hold: \" & H2,IF(L2=\"YA\",\"Peringatan H+3: Segera terbitkan PO\",\"Menunggu PO (\" & I2 & \" hari)\"))))\\n' +
    '• Kolom N (Terakhir Update): Diisi otomatis saat diedit atau gunakan =IF(B2=\"\",\"\",TEXT(NOW(),\"yyyy-mm-dd hh:mm:ss\"))';
  SpreadsheetApp.getUi().alert(helpText);
}
`;
}

// Daftar rumus resmi Google Sheets untuk Kolom I sampai N
export const OFFICIAL_SHEET_FORMULAS = [
  {
    col: 'I',
    name: 'Hari Kerja Proses',
    desc: 'Menghitung hari kerja efektif antara Tanggal Terima Budget (B) dan Tanggal PO (F). Jika PO belum terbit, otomatis menghitung hari kerja berjalan s/d hari ini.',
    formula: '=IF(B2="", "", NETWORKDAYS(B2, IF(F2<>"", F2, TODAY())))',
    example: '1 hari kerja',
  },
  {
    col: 'J',
    name: 'Status PO',
    desc: 'Otomatis CLOSE jika Nomor PO (G) terisi, dan OPEN jika Nomor PO masih kosong.',
    formula: '=IF(B2="", "", IF(G2<>"", "CLOSE", "OPEN"))',
    example: 'CLOSE / OPEN',
  },
  {
    col: 'K',
    name: 'Status SLA',
    desc: 'Otomatis ONTIME jika Hari Kerja (I) <= 10 hari, dan TERLAMBAT jika melebihi batas 10 hari kerja.',
    formula: '=IF(I2="", "", IF(I2<=10, "ONTIME", "TERLAMBAT"))',
    example: 'ONTIME / TERLAMBAT',
  },
  {
    col: 'L',
    name: 'Alert H+3',
    desc: 'Otomatis YA jika Status PO masih OPEN, durasi kerja sudah >= 3 hari, dan tidak ada kondisi khusus hold.',
    formula: '=IF(B2="", "", IF(AND(J2="OPEN", I2>=3, H2=""), "YA", "TIDAK"))',
    example: 'YA / TIDAK',
  },
  {
    col: 'M',
    name: 'Catatan / Notes',
    desc: 'Menghasilkan ringkasan keterangan status operasional pengadaan secara otomatis.',
    formula: '=IF(B2="", "", IF(J2="CLOSE", IF(K2="ONTIME", "PO Selesai On-Time (" & I2 & " hari)", "PO Terlambat (" & I2 & " hari)"), IF(H2<>"", "Hold: " & H2, IF(L2="YA", "Peringatan H+3: Segera terbitkan PO", "Menunggu PO (" & I2 & " hari)"))))',
    example: 'PO Selesai On-Time (1 hari)',
  },
  {
    col: 'N',
    name: 'Terakhir Diperbarui',
    desc: 'Timestamp waktu update otomatis saat baris diedit via Apps Script, atau dapat menggunakan rumus waktu.',
    formula: '=IF(B2="", "", TEXT(NOW(), "yyyy-mm-dd hh:mm:ss"))',
    example: '2026-10-04 19:10:00',
  },
];

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
