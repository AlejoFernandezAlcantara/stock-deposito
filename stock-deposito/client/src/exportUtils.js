import { formatDate } from './api.js';

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportInventoryToCsv({ items = [], pendingWithdrawals = [] }) {
  const lines = [];

  // 1. Encabezado principal del reporte
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR');
  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  lines.push(`REPORTE DE STOCK Y PRÉSTAMOS - DEPÓSITO`);
  lines.push(`Fecha de exportación:;${dateStr} ${timeStr}`);
  lines.push('');

  // 2. Sección: Inventario de Stock
  lines.push('--- INVENTARIO DE STOCK ---');
  lines.push([
    'Elemento',
    'Categoría',
    'En Depósito (Disp.)',
    'Fuera (Retirado)',
    'Total Stock',
    'Observaciones Puntuales'
  ].map(escapeCsvField).join(';'));

  for (const item of items) {
    const total = Number(item.total_quantity || 0);
    const available = Number(item.available_quantity || 0);
    const out = total - available;

    const obsText = (item.observations && item.observations.length > 0)
      ? item.observations.map((o) => `[${o.quantity} u.] ${o.description}`).join(' | ')
      : 'Sin observaciones';

    lines.push([
      item.name,
      item.category || 'General',
      available,
      out,
      total,
      obsText
    ].map(escapeCsvField).join(';'));
  }

  lines.push('');

  // 3. Sección: Préstamos / Retiros con estado pendiente
  lines.push('--- PRÉSTAMOS / RETIROS PENDIENTES DE DEVOLUCIÓN ---');

  if (pendingWithdrawals.length === 0) {
    lines.push('No hay préstamos pendientes de devolución al momento de esta exportación.;;;;;');
  } else {
    lines.push([
      'Fecha Retiro',
      'Elemento',
      'Cant. Retirada',
      'Cant. Devuelta',
      'Pendiente de Devolución',
      'Destino / Responsable',
      'Motivo'
    ].map(escapeCsvField).join(';'));

    for (const w of pendingWithdrawals) {
      const pendingQty = Number(w.pending_quantity ?? (w.quantity - (w.returned_quantity || 0)));
      lines.push([
        formatDate(w.withdrawal_date) || w.withdrawal_date || '',
        w.item_name || 'Desconocido',
        Number(w.quantity || 0),
        Number(w.returned_quantity || 0),
        pendingQty,
        w.destination || '',
        w.reason || ''
      ].map(escapeCsvField).join(';'));
    }
  }

  // BOM UTF-8 (\uFEFF) para que Excel abra con tildes y caracteres en español correctamente
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const fileDate = now.toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `reporte_stock_deposito_${fileDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}