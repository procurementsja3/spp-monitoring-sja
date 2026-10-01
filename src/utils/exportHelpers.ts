import { SPPItem } from '../types';

/**
 * Export data SPP ke file format Microsoft Excel (.xls/.xlsx compatible XML)
 */
export function exportToExcel(items: SPPItem[], filename = 'Laporan_Realisasi_SPP_Pengadaan.xls'): void {
  const rowsXml = items
    .map((item, index) => {
      return `
      <Row>
        <Cell><Data ss:Type="Number">${index + 1}</Data></Cell>
        <Cell><Data ss:Type="String">${item.budgetReceivedDate}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(item.sppNumber)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(item.pic)}</Data></Cell>
        <Cell><Data ss:Type="String">${item.poDate || '-'}</Data></Cell>
        <Cell><Data ss:Type="String">${item.poNumber || '-'}</Data></Cell>
        <Cell><Data ss:Type="Number">${item.processDays}</Data></Cell>
        <Cell><Data ss:Type="String">${item.statusPO}</Data></Cell>
        <Cell><Data ss:Type="String">${item.statusOntime}</Data></Cell>
        <Cell><Data ss:Type="String">${item.isHPlus3Overdue ? 'H+3 OVERDUE' : '-'}</Data></Cell>
      </Row>`;
    })
    .join('');

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Monitoring SPP">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">No</Data></Cell>
    <Cell><Data ss:Type="String">Tanggal Terima Budget</Data></Cell>
    <Cell><Data ss:Type="String">Nomor SPP</Data></Cell>
    <Cell><Data ss:Type="String">PIC Pengadaan</Data></Cell>
    <Cell><Data ss:Type="String">Tanggal PO</Data></Cell>
    <Cell><Data ss:Type="String">Nomor PO</Data></Cell>
    <Cell><Data ss:Type="String">Jumlah Hari Kerja Proses</Data></Cell>
    <Cell><Data ss:Type="String">Status PO</Data></Cell>
    <Cell><Data ss:Type="String">Status SLA</Data></Cell>
    <Cell><Data ss:Type="String">Status Alert H+3</Data></Cell>
   </Row>
   ${rowsXml}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
  triggerDownload(blob, filename);
}

/**
 * Export data SPP ke file CSV
 */
export function exportToCSV(items: SPPItem[], filename = 'Laporan_SPP.csv'): void {
  const headers = [
    'No',
    'Tanggal Terima Budget',
    'Nomor SPP',
    'PIC',
    'Tanggal PO',
    'Nomor PO',
    'Jumlah Hari Proses (Hari Kerja)',
    'Status PO',
    'Status SLA',
    'Alert H+3',
  ];

  const rows = items.map((item, idx) => [
    idx + 1,
    `"${item.budgetReceivedDate}"`,
    `"${item.sppNumber}"`,
    `"${item.pic}"`,
    `"${item.poDate || '-'}"`,
    `"${item.poNumber || '-'}"`,
    item.processDays,
    `"${item.statusPO}"`,
    `"${item.statusOntime}"`,
    `"${item.isHPlus3Overdue ? 'ALERT H+3' : 'NORMAL'}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

/**
 * Mencetak / Membuka jendela print preview laporan PDF formal
 */
export function triggerPrintPDF(
  items: SPPItem[],
  reportTitle = 'Laporan Realisasi SPP & Pemantauan SLA Pengadaan',
  period = 'Semua Periode'
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Harap izinkan popup browser untuk membuka cetak laporan PDF.');
    return;
  }

  const total = items.length;
  const ontime = items.filter((i) => i.statusOntime === 'ONTIME').length;
  const ontimeRate = total > 0 ? ((ontime / total) * 100).toFixed(1) : '0';
  const closedCount = items.filter((i) => i.statusPO === 'CLOSE').length;
  const openCount = total - closedCount;

  const tableRows = items
    .map(
      (item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
      <td style="padding: 8px 10px; text-align: center;">${idx + 1}</td>
      <td style="padding: 8px 10px; font-family: monospace;">${item.budgetReceivedDate}</td>
      <td style="padding: 8px 10px; font-weight: 600; font-family: monospace;">${escapeXml(item.sppNumber)}</td>
      <td style="padding: 8px 10px;">${escapeXml(item.pic)}</td>
      <td style="padding: 8px 10px; font-family: monospace;">${item.poDate || '-'}</td>
      <td style="padding: 8px 10px; font-weight: 600; font-family: monospace;">${item.poNumber || '<span style="color:#e11d48">BELUM TERBIT</span>'}</td>
      <td style="padding: 8px 10px; text-align: center; font-weight: 700; font-family: monospace;">${item.processDays} hr kerja</td>
      <td style="padding: 8px 10px; text-align: center;">
        <span style="font-size: 10px; font-weight: 700; color: ${item.statusPO === 'CLOSE' ? '#166534' : '#991b1b'};">
          ${item.statusPO}
        </span>
      </td>
      <td style="padding: 8px 10px; text-align: center;">
        <span style="font-size: 10px; font-weight: 700; color: ${item.statusOntime === 'ONTIME' ? '#15803d' : '#b91c1c'};">
          ${item.statusOntime}
        </span>
      </td>
    </tr>
  `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${reportTitle}</title>
  <style>
    @page { size: landscape; margin: 12mm; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 10px; background: #fff; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0 0 4px 0; }
    .subtitle { font-size: 12px; color: #64748b; margin: 0; }
    .kpi-grid { display: flex; gap: 12px; margin-bottom: 16px; }
    .kpi-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; background: #f8fafc; }
    .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 18px; font-weight: 700; color: #0f172a; font-family: monospace; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #1e293b; color: #ffffff; font-size: 11px; text-align: left; padding: 10px; font-weight: 600; text-transform: uppercase; }
    .footer-signatures { display: flex; justify-content: space-between; margin-top: 40px; page-break-inside: avoid; }
    .sig-box { width: 28%; text-align: center; font-size: 11px; }
    .sig-line { margin-top: 55px; border-top: 1px solid #000; padding-top: 4px; font-weight: 700; }
    @media print {
      .no-print-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar" style="background: #0f172a; color: white; padding: 8px 16px; margin: -10px -10px 16px -10px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 12px;">Pratinjau Cetak PDF Dokumen Realisasi SPP</span>
    <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-weight: 600;">Cetak / Simpan PDF</button>
  </div>

  <div class="header">
    <div>
      <h1 class="title">Sistem Monitoring Realisasi SPP & Pengadaan Barang</h1>
      <p class="subtitle">Laporan Audit Efisiensi & SLA Realisasi Purchase Request | Periode: ${period}</p>
    </div>
    <div style="text-align: right; font-size: 11px; color: #475569;">
      <div>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div>Klasifikasi: <strong>Internal Confidential</strong></div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">Total Pengajuan SPP</div>
      <div class="kpi-value">${total} Dokumen</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">SLA Ontime Rate</div>
      <div class="kpi-value">${ontimeRate}% (${ontime} SPP)</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Status PO Close / Open</div>
      <div class="kpi-value">${closedCount} Close / ${openCount} Open</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Aturan Hari Kerja</div>
      <div class="kpi-value" style="font-size: 13px; font-weight: 600;">Sabtu, Minggu & Libur Nasional Dikecualikan</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">No</th>
        <th>Tgl Terima Budget</th>
        <th>Nomor SPP</th>
        <th>PIC</th>
        <th>Tanggal PO</th>
        <th>Nomor PO</th>
        <th style="text-align: center;">Jumlah Hari Proses</th>
        <th style="text-align: center;">Status PO</th>
        <th style="text-align: center;">Status SLA</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="footer-signatures">
    <div class="sig-box">
      <div>Disiapkan Oleh (Staff PIC / Buyer)</div>
      <div class="sig-line">Staff Pengadaan</div>
      <div style="color: #64748b; font-size: 10px;">Divisi Procurement</div>
    </div>
    <div class="sig-box">
      <div>Diverifikasi Oleh (Budget & Planning)</div>
      <div class="sig-line">Supervisor Team Budget</div>
      <div style="color: #64748b; font-size: 10px;">Divisi Finance & Budget</div>
    </div>
    <div class="sig-box">
      <div>Disetujui Oleh (Head of Division)</div>
      <div class="sig-line">Head of Procurement</div>
      <div style="color: #64748b; font-size: 10px;">General Procurement Dept.</div>
    </div>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
