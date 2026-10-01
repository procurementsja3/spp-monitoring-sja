/**
 * Generator Master Prompt & Standalone GitHub Pages HTML
 */

export function getMasterPromptText(): string {
  return `# MASTER PROMPT: SISTEM MONITORING REALISASI SPP & SLA PENGADAAN
# Berbasis Web HTML5/React + Google Sheets Backend + GitHub Pages Ready

Bertindaklah sebagai Senior Full-Stack Enterprise Architect. Buatkan aplikasi web single-page application (SPA) mutakhir dan berkinerja tinggi berjudul:
"SISTEM MONITORING REALISASI SPP (SURAT PERMINTAAN PEMBELIAN) & EFISIENSI PENGADAAN BARANG"

Sistem ini harus mendukung hosting gratis di GITHUB PAGES (atau static web hosting) dan terintegrasi penuh secara 2 arah (Read & Create) dengan GOOGLE SHEETS menggunakan Google Apps Script Web App API tanpa memerlukan backend server berbayar.

====================================================================
1. STRUKTUR DATA UTAMA & FORMULA KALKULASI REAL-TIME
====================================================================
Setiap record pengajuan pengadaan mencakup kolom-kolom berikut:
1. Tanggal Terima dari Team Budget (Format: YYYY-MM-DD)
2. Nomor SPP (Contoh: SPP/2026/03/0014)
3. PIC Pengadaan (Penanggung jawab)
4. Tanggal Pembuatan PO (Purchase Order) (Format: YYYY-MM-DD, opsional bila belum terbit)
5. Nomor PO (Contoh: PO/2026/03/0112)
6. JUMLAH HARI PROSES KERJA (FORMULA OTOMATIS):
   - Rumus: Tanggal Pembuatan PO dikurangi Tanggal Terima dari Team Budget. Jika PO belum terbit, hitung dari Tanggal Terima s/d Hari Ini.
   - PENGECUALIAN MUTLAK: Hari Sabtu, Hari Minggu, dan Hari Libur Nasional / Cuti Bersama resmi SKB 3 Menteri Indonesia TIDAK DIHITUNG!
   - Hanya menghitung hari kerja efektif (Business Days).
7. STATUS PO (OTOMATIS):
   - Jika posisi PO sudah ada 'Nomor PO', maka data otomatis terupdate menjadi "Close".
   - Jika posisi PO belum ada Nomor PO, status adalah "Open".
8. STATUS ONTIME / TIDAK ONTIME:
   - Target SLA = 10 Hari Kerja.
   - Jika Jumlah Hari Proses <= Batas Waktu -> "Ontime".
   - Jika Jumlah Hari Proses > Batas Waktu -> "Tidak Ontime".
9. STATUS ALERT H+3:
   - Jika status masih Open dan sudah memasuki H+3 hari kerja sejak diterima dari team budget, tandai sebagai URGENT ALERT H+3.
10. STATUS KETERLAMBATAN SIGNIFIKAN:
   - Jika proses kerja > 10 hari kerja, aktifkan notifikasi Keterlambatan Signifikan.

====================================================================
2. INTEGRASI GOOGLE SHEETS (READ & CREATE DATA 2 ARAH)
====================================================================
- Aplikasi harus dapat:
  a. Membaca (READ) seluruh baris data SPP langsung dari Google Sheets via GET request.
  b. Menambahkan (CREATE / UPSERT) data SPP baru langsung ke Google Sheet via POST request.
- Sediakan generator kode 'Code.gs' (Google Apps Script) siap pakai yang dapat disalin pengguna dalam 1 klik, lengkap dengan petunjuk Deployment sebagai Web App (Access: Anyone).
- Dukung sinkronisasi otomatis dan manual dengan indikator status koneksi real-time.

====================================================================
3. NOTIFIKASI OTOMATIS & PENGINGAT PESAN INSTAN
====================================================================
- In-App Alert Drawer untuk memantau SPP yang tertunda.
- Notifikasi terhubung ke Email otomatis untuk SPP yang belum dibuatkan PO setelah H+3 hari kerja sejak terima dari team budget.
- Template pengingat otomatis ke WhatsApp / Telegram API (Instant Messaging) yang berisi detail SPP, PIC, hari kerja tertunda, dan tombol follow-up cepat.

====================================================================
4. DASHBOARD ANALITIK REAL-TIME & EFISIENSI PIC
====================================================================
- KPI Metrics Cards: Total SPP Diterima, Status PO Close vs Open, SLA Ontime Rate (%), Rata-rata Hari Proses Kerja (Sabtu/Minggu/Libur tidak dihitung), dan Alert H+3.
- Evaluasi kinerja per personil PIC Pengadaan: Rasio Ketepatan Waktu (Ontime %), Jumlah PO Selesai vs Open, dan rata-rata lead time hari kerja.
- Filter segmented real-time (Open/Close, Ontime/Tidak Ontime, Alert H+3, PIC).

====================================================================
5. EKSPOR LAPORAN BULANAN (EXCEL & PDF)
====================================================================
- Ekspor Excel (.xls / XML Spreadsheet & CSV) lengkap dengan formula kalkulasi hari kerja, header berwarna, dan ringkasan filter bulanan.
- Ekspor PDF Formal: Layout landscape cetak audit yang rapi dengan kop dokumen resmi perusahaan, ringkasan KPI, tabel data terstruktur, dan blok tanda tangan multi-level (PIC, Team Budget, Head of Procurement).

====================================================================
6. KEAMANAN DATA, RBAC, 2FA & AUDIT TRAIL
====================================================================
- Role-Based Access Control (RBAC):
  1. Admin Pengadaan (Akses penuh + Konfigurasi Kalender Libur + API Google Sheets)
  2. Staff PIC / Buyer (Input SPP, Input No PO, monitoring tugas pribadi)
  3. Team Budget (Verifikasi tanggal terima budget, verifikasi SLA)
  4. Auditor Internal (Read-only, akses audit log lengkap, ekspor laporan)
- Otentikasi Dua Faktor (2FA): Simulasi TOTP Authenticator dengan Secret Key & validasi token 6 digit.
- Audit Log System: Riwayat aktivitas tamper-evident mencatat waktu, user, role, aksi, IP address, dan SHA-256 checksum integrity.

====================================================================
7. DUKUNGAN HOSTING GITHUB & RESPONSIVE MOBILE
====================================================================
- Siap di-deploy ke GitHub Pages tanpa Node.js server (Clean client-side execution).
- Desain responsive ultra-modern (Mobile, Tablet, Desktop) mengadopsi standar SaaS enterprise, zero-pill discipline, dan tabular figures font.
`;
}

/**
 * Menghasilkan file index.html mandiri (Single-File Standalone HTML)
 * yang dapat langsung diunduh dan diunggah ke GitHub Pages oleh pengguna.
 */
export function generateStandaloneGitHubHtml(): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sistem Monitoring Realisasi SPP & Pengadaan (GitHub Pages Edition)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0f172a; color: #f8fafc; }
    .font-mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-sm">SPP</div>
      <div>
        <h1 class="text-base font-bold text-white tracking-tight">Sistem Monitoring Realisasi SPP</h1>
        <p class="text-xs text-slate-400">GitHub Pages Edition · Terhubung Google Sheets & Kalkulasi Hari Kerja</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-xs text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800 px-2 py-1 rounded">Live GitHub Ready</span>
      <button onclick="window.print()" class="text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700">Cetak Laporan</button>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
    <!-- Stat Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 bg-slate-900 border border-slate-800 rounded-lg">
        <p class="text-xs text-slate-400">Total Pengajuan SPP</p>
        <p id="stat-total" class="text-2xl font-bold font-mono text-white mt-1">8</p>
      </div>
      <div class="p-4 bg-slate-900 border border-slate-800 rounded-lg">
        <p class="text-xs text-slate-400">SLA Ontime Rate</p>
        <p id="stat-ontime" class="text-2xl font-bold font-mono text-emerald-400 mt-1">75.0%</p>
      </div>
      <div class="p-4 bg-slate-900 border border-slate-800 rounded-lg">
        <p class="text-xs text-slate-400">Status PO (Close / Open)</p>
        <p id="stat-po-status" class="text-2xl font-bold font-mono text-cyan-400 mt-1">5 / 3</p>
      </div>
      <div class="p-4 bg-slate-900 border border-slate-800 rounded-lg">
        <p class="text-xs text-slate-400">Alert Terlambat H+3</p>
        <p id="stat-h3" class="text-2xl font-bold font-mono text-rose-400 mt-1">2 SPP</p>
      </div>
    </div>

    <!-- Google Sheet Configuration Box -->
    <div class="p-4 bg-slate-900/90 border border-slate-800 rounded-lg">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-semibold text-white">Integrasi Google Sheets (2-Arah via Apps Script)</h2>
          <p class="text-xs text-slate-400 mt-0.5">Masukkan URL Google Apps Script Web App untuk membaca atau menyimpan data secara langsung.</p>
        </div>
        <div class="flex items-center gap-2">
          <input type="text" id="scriptUrl" placeholder="https://script.google.com/macros/s/.../exec" class="text-xs bg-slate-950 border border-slate-700 px-3 py-1.5 rounded text-white w-64 md:w-80">
          <button onclick="syncGoogleSheet()" class="text-xs font-semibold px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded">Sync Sekarang</button>
        </div>
      </div>
    </div>

    <!-- Table of SPP -->
    <div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div class="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-white">Daftar Realisasi SPP & Pemantauan SLA</h3>
        <span class="text-xs text-slate-400 font-mono">*Sabtu, Minggu & Libur Nasional tidak dihitung</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left text-slate-300">
          <thead class="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
            <tr>
              <th class="p-3">Tanggal Terima Budget</th>
              <th class="p-3">Nomor SPP</th>
              <th class="p-3">PIC</th>
              <th class="p-3">Tanggal PO</th>
              <th class="p-3">Nomor PO</th>
              <th class="p-3 text-center">Jumlah Hari Proses</th>
              <th class="p-3 text-center">Status PO</th>
              <th class="p-3 text-center">Status SLA</th>
            </tr>
          </thead>
          <tbody id="sppTableBody" class="divide-y divide-slate-800/60 font-mono">
            <!-- Data dynamically populated via JS -->
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <script>
    // Kalender Libur Nasional Indonesia
    const HOLIDAYS = ['2026-01-01', '2026-01-16', '2026-02-17', '2026-03-19', '2026-03-20', '2026-03-21', '2026-03-23', '2026-03-24', '2026-04-03', '2026-05-01', '2026-05-14', '2026-08-17'];

    let sppData = [
      { tglBudget: '2026-03-02', noSpp: 'SPP/2026/03/0014', pic: 'Budi Santoso', tglPo: '2026-03-05', noPo: 'PO/2026/03/0112' },
      { tglBudget: '2026-03-04', noSpp: 'SPP/2026/03/0029', pic: 'Siti Rahmawati', tglPo: '2026-03-06', noPo: 'PO/2026/03/0118' },
      { tglBudget: '2026-03-10', noSpp: 'SPP/2026/03/0045', pic: 'Denny Wijaya', tglPo: '2026-03-17', noPo: 'PO/2026/03/0145' },
      { tglBudget: '2026-03-23', noSpp: 'SPP/2026/03/0072', pic: 'Denny Wijaya', tglPo: '', noPo: '' },
      { tglBudget: '2026-03-25', noSpp: 'SPP/2026/03/0063', pic: 'Siti Rahmawati', tglPo: '', noPo: '' }
    ];

    function calculateBusinessDays(startDateStr, endDateStr) {
      if (!startDateStr) return 0;
      const start = new Date(startDateStr);
      const end = endDateStr ? new Date(endDateStr) : new Date();
      let count = 0;
      let cur = new Date(start);
      while (cur <= end) {
        const day = cur.getDay();
        const iso = cur.toISOString().split('T')[0];
        if (day !== 0 && day !== 6 && !HOLIDAYS.includes(iso)) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      return Math.max(0, count);
    }

    function renderTable() {
      const tbody = document.getElementById('sppTableBody');
      tbody.innerHTML = '';
      let closed = 0;
      let ontime = 0;
      let h3 = 0;

      sppData.forEach(item => {
        const days = calculateBusinessDays(item.tglBudget, item.tglPo);
        const statusPo = item.noPo && item.noPo.trim() !== '' ? 'CLOSE' : 'OPEN';
        const statusSla = days <= 3 ? 'ONTIME' : 'TIDAK ONTIME';
        const isH3 = statusPo === 'OPEN' && days >= 3;

        if (statusPo === 'CLOSE') closed++;
        if (statusSla === 'ONTIME') ontime++;
        if (isH3) h3++;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/40 transition-colors';
        tr.innerHTML = \`
          <td class="p-3">\${item.tglBudget}</td>
          <td class="p-3 font-semibold text-white">\${item.noSpp}</td>
          <td class="p-3">\${item.pic}</td>
          <td class="p-3">\${item.tglPo || '-'}</td>
          <td class="p-3 \${item.noPo ? 'text-white' : 'text-rose-400 font-sans'}">\${item.noPo || 'Belum Terbit'}</td>
          <td class="p-3 text-center font-bold \${days > 3 ? 'text-rose-400' : 'text-emerald-400'}">\${days} Hari</td>
          <td class="p-3 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-semibold \${statusPo === 'CLOSE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}">\${statusPo}</span></td>
          <td class="p-3 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-semibold \${statusSla === 'ONTIME' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}">\${statusSla}</span></td>
        \`;
        tbody.appendChild(tr);
      });

      document.getElementById('stat-total').textContent = sppData.length;
      document.getElementById('stat-ontime').textContent = ((ontime / sppData.length) * 100).toFixed(1) + '%';
      document.getElementById('stat-po-status').textContent = \`\${closed} / \${sppData.length - closed}\`;
      document.getElementById('stat-h3').textContent = \`\${h3} SPP\`;
    }

    async function syncGoogleSheet() {
      const url = document.getElementById('scriptUrl').value.trim();
      if (!url) return alert('Silakan masukkan Google Apps Script Web App URL.');
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          sppData = json.data;
          renderTable();
          alert('Sinkronisasi Google Sheet Berhasil! Total: ' + json.data.length + ' data.');
        }
      } catch (e) {
        alert('Gagal menyambung ke Google Sheet: ' + e.message);
      }
    }

    renderTable();
  </script>
</body>
</html>`;
}
