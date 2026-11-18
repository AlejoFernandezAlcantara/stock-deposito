import * as XLSX from 'xlsx';
import { formatDate } from './api.js';

/**
 * Exporta el reporte como un libro de Excel (.xlsx) nativo y profesional,
 * con pestañas separadas ("Stock" y "Préstamos Pendientes") y fórmulas reactivas.
 */
export function exportInventoryToExcel({ items = [], pendingWithdrawals = [] }) {
  const wb = XLSX.utils.book_new();

  // 1. HOJA 1: INVENTARIO DE STOCK
  const stockRows = [];

  // Título y metadatos
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR');
  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  stockRows.push(['REPORTE DE INVENTARIO - DEPÓSITO']);
  stockRows.push([`Generado el: ${dateStr} ${timeStr}`]);
  stockRows.push([]); // Espacio

  // Encabezados de columnas (Fila 4)
  stockRows.push([
    'Elemento',
    'Categoría',
    'En Depósito (Disponible)',
    'Fuera (Retirado)',
    'Total Stock',
    'Observaciones Puntuales'
  ]);

  // Filas de datos
  // En Excel: Fila 4 son encabezados (índice 4 = fila 5 en Excel 1-based)
  // Las filas de datos van de 5 a (4 + items.length)
  const startRow = 5;
  items.forEach((item, idx) => {
    const rowNum = startRow + idx;
    const obsText = (item.observations && item.observations.length > 0)
      ? item.observations.map((o) => `[${o.quantity} u.] ${o.description}`).join(' | ')
      : 'Sin observaciones';

    // FÓRMULA REACTIVA: "Fuera" = Total - En Depósito (ej: =E5-C5)
    // De este modo, si en Excel editas el disponible o el total, ¡la columna Fuera se recalcula sola!
    const outFormula = { f: `E${rowNum}-C${rowNum}` };

    stockRows.push([
      item.name,
      item.category || 'General',
      Number(item.available_quantity || 0),
      outFormula,
      Number(item.total_quantity || 0),
      obsText
    ]);
  });

  // Fila de TOTALES (Reactiva con fórmula =SUM(...))
  if (items.length > 0) {
    const endRow = startRow + items.length - 1;
    stockRows.push([
      'TOTAL GENERAL',
      '',
      { f: `SUM(C${startRow}:C${endRow})` },
      { f: `SUM(D${startRow}:D${endRow})` },
      { f: `SUM(E${startRow}:E${endRow})` },
      ''
    ]);
  }

  const wsStock = XLSX.utils.aoa_to_sheet(stockRows);

  // Anchos de columna automáticos y cómodos
  wsStock['!cols'] = [
    { wch: 32 }, // Elemento
    { wch: 18 }, // Categoría
    { wch: 24 }, // En Depósito
    { wch: 18 }, // Fuera
    { wch: 16 }, // Total Stock
    { wch: 55 }  // Observaciones
  ];

  XLSX.utils.book_append_sheet(wb, wsStock, 'Stock Depósito');

  // 2. HOJA 2: PRÉSTAMOS / RETIROS PENDIENTES
  const loanRows = [];
  loanRows.push(['REPORTE DE PRÉSTAMOS PENDIENTES DE DEVOLUCIÓN']);
  loanRows.push([`Generado el: ${dateStr} ${timeStr}`]);
  loanRows.push([]);

  if (pendingWithdrawals.length === 0) {
    loanRows.push(['No hay préstamos pendientes de devolución al momento de esta exportación.']);
  } else {
    loanRows.push([
      'Fecha Retiro',
      'Elemento',
      'Cant. Retirada',
      'Cant. Devuelta',
      'Pendiente de Devolución',
      'Destino / Responsable',
      'Motivo'
    ]);

    const loanStartRow = 5;
    pendingWithdrawals.forEach((w, idx) => {
      const rowNum = loanStartRow + idx;
      // FÓRMULA REACTIVA: Pendiente = Retirada - Devuelta (=C5-D5)
      const pendingFormula = { f: `C${rowNum}-D${rowNum}` };

      loanRows.push([
        formatDate(w.withdrawal_date) || w.withdrawal_date || '',
        w.item_name || 'Desconocido',
        Number(w.quantity || 0),
        Number(w.returned_quantity || 0),
        pendingFormula,
        w.destination || '',
        w.reason || ''
      ]);
    });

    // Fila total de pendientes
    const loanEndRow = loanStartRow + pendingWithdrawals.length - 1;
    loanRows.push([
      'TOTAL PENDIENTE',
      '',
      { f: `SUM(C${loanStartRow}:C${loanEndRow})` },
      { f: `SUM(D${loanStartRow}:D${loanEndRow})` },
      { f: `SUM(E${loanStartRow}:E${loanEndRow})` },
      '',
      ''
    ]);
  }

  const wsLoans = XLSX.utils.aoa_to_sheet(loanRows);
  wsLoans['!cols'] = [
    { wch: 14 }, // Fecha Retiro
    { wch: 30 }, // Elemento
    { wch: 16 }, // Cant. Retirada
    { wch: 16 }, // Cant. Devuelta
    { wch: 24 }, // Pendiente
    { wch: 25 }, // Destino
    { wch: 40 }  // Motivo
  ];

  XLSX.utils.book_append_sheet(wb, wsLoans, 'Préstamos Pendientes');

  // Descarga del archivo .xlsx nativo
  const fileDate = now.toISOString().slice(0, 10);
  XLSX.writeFile(wb, `reporte_stock_deposito_${fileDate}.xlsx`);
}

/**
 * Exporta el reporte a un PDF profesional con diseño limpio, tablas estilizadas
 * y soporte nativo de impresión / guardar como PDF del navegador.
 */
export function exportInventoryToPdf({ items = [], pendingWithdrawals = [] }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR');
  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const totalItems = items.length;
  const totalUnits = items.reduce((acc, i) => acc + Number(i.total_quantity || 0), 0);
  const availableUnits = items.reduce((acc, i) => acc + Number(i.available_quantity || 0), 0);
  const outUnits = totalUnits - availableUnits;

  const totalPendingUnits = pendingWithdrawals.reduce(
    (acc, w) => acc + Number(w.pending_quantity ?? (w.quantity - (w.returned_quantity || 0))),
    0
  );

  const stockRowsHtml = items.map((item, idx) => {
    const total = Number(item.total_quantity || 0);
    const available = Number(item.available_quantity || 0);
    const out = total - available;
    const obsText = (item.observations && item.observations.length > 0)
      ? item.observations.map((o) => `<span class="tag">${o.quantity} u.</span> ${escapeHtml(o.description)}`).join('<br/>')
      : '<span class="text-muted">Sin observaciones</span>';

    return `
      <tr class="${idx % 2 === 0 ? 'even' : ''}">
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td><span class="badge">${escapeHtml(item.category || 'General')}</span></td>
        <td class="num text-forest"><strong>${available}</strong></td>
        <td class="num text-amber font-semibold">${out}</td>
        <td class="num font-bold">${total}</td>
        <td class="obs-cell">${obsText}</td>
      </tr>
    `;
  }).join('');

  const loansRowsHtml = pendingWithdrawals.length === 0
    ? `<tr><td colspan="6" class="empty">No hay préstamos pendientes de devolución al momento de este reporte.</td></tr>`
    : pendingWithdrawals.map((w, idx) => {
      const pendingQty = Number(w.pending_quantity ?? (w.quantity - (w.returned_quantity || 0)));
      return `
        <tr class="${idx % 2 === 0 ? 'even' : ''}">
          <td>${formatDate(w.withdrawal_date) || w.withdrawal_date || '-'}</td>
          <td><strong>${escapeHtml(w.item_name || 'Desconocido')}</strong></td>
          <td class="num">${w.quantity}</td>
          <td class="num">${w.returned_quantity || 0}</td>
          <td class="num text-amber font-bold">${pendingQty}</td>
          <td>${escapeHtml(w.destination || '-')}</td>
          <td>${escapeHtml(w.reason || '-')}</td>
        </tr>
      `;
    }).join('');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Reporte de Stock y Préstamos - ${dateStr}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      color: #111a15;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1b5e43;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .header h1 {
      margin: 0;
      font-size: 18px;
      color: #1b5e43;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header .subtitle {
      margin-top: 3px;
      font-size: 10px;
      color: #5d6e64;
    }
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .stat-box {
      border: 1px solid #e2e8e0;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8faf7;
    }
    .stat-box .label {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      color: #5d6e64;
      display: block;
    }
    .stat-box .val {
      font-size: 16px;
      font-weight: 800;
      margin-top: 2px;
      color: #111a15;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #1b5e43;
      margin: 16px 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 10px;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th {
      background-color: #1b5e43;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #1b5e43;
      font-size: 9px;
      text-transform: uppercase;
    }
    td {
      padding: 5px 8px;
      border: 1px solid #e2e8e0;
      vertical-align: middle;
    }
    tr.even {
      background-color: #fbfcfb;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .text-forest { color: #1b5e43; }
    .text-amber { color: #b45309; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .tag {
      display: inline-block;
      background: #fef3c7;
      color: #b45309;
      font-weight: 700;
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 3px;
      margin-right: 3px;
    }
    .badge {
      display: inline-block;
      background: #e8f5ef;
      color: #1b5e43;
      font-weight: 600;
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .obs-cell {
      line-height: 1.4;
      font-size: 9.5px;
    }
    .text-muted { color: #88998f; font-style: italic; }
    .empty {
      text-align: center;
      padding: 14px;
      color: #5d6e64;
      font-style: italic;
    }
    tfoot td {
      background-color: #f4f6f3;
      font-weight: 800;
      border-top: 2px solid #1b5e43;
    }
    .footer {
      margin-top: 20px;
      border-top: 1px solid #e2e8e0;
      padding-top: 6px;
      font-size: 9px;
      color: #88998f;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Stock Depósito</h1>
      <div class="subtitle">Reporte general de existencias y préstamos activos</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 700; color: #111a15; font-size: 11px;">EMISIÓN</div>
      <div class="subtitle">${dateStr} - ${timeStr}</div>
    </div>
  </div>

  <div class="stats-bar">
    <div class="stat-box">
      <span class="label">Variedad de Ítems</span>
      <div class="val">${totalItems}</div>
    </div>
    <div class="stat-box">
      <span class="label">Unidades en Depósito</span>
      <div class="val" style="color: #1b5e43;">${availableUnits}</div>
    </div>
    <div class="stat-box">
      <span class="label">Unidades Fuera / Prestadas</span>
      <div class="val" style="color: #b45309;">${outUnits}</div>
    </div>
    <div class="stat-box">
      <span class="label">Total Existencias</span>
      <div class="val">${totalUnits}</div>
    </div>
  </div>

  <div class="section-title">
    <span>1. Inventario de Stock</span>
    <span style="font-size: 9px; font-weight: normal; color: #5d6e64;">${items.length} elementos registrados</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Elemento</th>
        <th style="width: 14%;">Categoría</th>
        <th style="width: 10%; text-align: right;">En Depósito</th>
        <th style="width: 9%; text-align: right;">Fuera</th>
        <th style="width: 9%; text-align: right;">Total</th>
        <th style="width: 33%;">Observaciones y Estado</th>
      </tr>
    </thead>
    <tbody>
      ${stockRowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2">TOTAL GENERAL</td>
        <td class="num text-forest">${availableUnits}</td>
        <td class="num text-amber">${outUnits}</td>
        <td class="num">${totalUnits}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="section-title" style="margin-top: 22px;">
    <span>2. Préstamos / Retiros Pendientes de Devolución</span>
    <span style="font-size: 9px; font-weight: normal; color: #5d6e64;">${totalPendingUnits} u. por devolver</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 12%;">Fecha</th>
        <th style="width: 22%;">Elemento</th>
        <th style="width: 10%; text-align: right;">Retirado</th>
        <th style="width: 10%; text-align: right;">Devuelto</th>
        <th style="width: 12%; text-align: right;">Pendiente</th>
        <th style="width: 16%;">Destino / Responsable</th>
        <th style="width: 18%;">Motivo</th>
      </tr>
    </thead>
    <tbody>
      ${loansRowsHtml}
    </tbody>
    ${pendingWithdrawals.length > 0 ? `
      <tfoot>
        <tr>
          <td colspan="4">TOTAL PENDIENTE DE REINGRESO</td>
          <td class="num text-amber">${totalPendingUnits}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    ` : ''}
  </table>

  <div class="footer">
    <span>Sistema de Gestión de Stock - Depósito</span>
    <span>Documento generado digitalmente</span>
  </div>

  <script>
    window.addEventListener('load', () => {
      window.print();
    });
  </script>
</body>
</html>
  `;

  // Abrir en ventana emergente o iframe para imprimir / Guardar como PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Si el bloqueador de popups intercepta, usar iframe oculto
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 300);
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}