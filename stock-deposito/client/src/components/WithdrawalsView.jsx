import { useCallback, useEffect, useState } from 'react';
import { api, formatDate } from '../api.js';

const FILTERS = [
  { value: 'RETIRADO', label: 'Retirados' },
  { value: 'DEVUELTO', label: 'Devueltos' },
  { value: '', label: 'Todos' },
];

function ReturnControl({ w, onReturn }) {
  const [qty, setQty] = useState(w.pending_quantity);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center justify-end gap-2">
      <input type="number" min="1" max={w.pending_quantity} value={qty} aria-label="Cantidad a devolver"
             onChange={(e) => setQty(e.target.value)} className="field w-20!" />
      <button className="btn-primary whitespace-nowrap" disabled={busy}
              onClick={async () => { setBusy(true); await onReturn(w.id, Number(qty)); setBusy(false); }}>
        Devolver a stock
      </button>
    </div>
  );
}

export default function WithdrawalsView({ reloadKey, onChanged, notify, isAdmin }) {
  const [status, setStatus] = useState('RETIRADO');
  const [range, setRange] = useState({ from: '', to: '' });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await api.getWithdrawals({ status, ...range })); }
    catch (err) { notify(err.message, 'error'); }
    finally { setLoading(false); }
  }, [status, range, notify]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const handleReturn = async (id, quantity) => {
    try {
      await api.returnWithdrawal(id, quantity);
      notify('Devolución registrada. El stock se repuso.');
      onChanged();
    } catch (err) { notify(err.message, 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div role="group" aria-label="Filtrar por estado" className="flex overflow-hidden rounded-md border border-line">
          {FILTERS.map((f) => (
            <button key={f.label} onClick={() => setStatus(f.value)} aria-pressed={status === f.value}
                    className={`px-4 py-2 text-sm font-semibold ${status === f.value ? 'bg-forest text-white' : 'bg-card hover:bg-paper'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div><label className="label" htmlFor="f-from">Desde</label>
          <input id="f-from" type="date" className="field" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
        <div><label className="label" htmlFor="f-to">Hasta</label>
          <input id="f-to" type="date" className="field" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
      </div>

      {loading ? <p className="text-muted">Cargando retiros…</p>
        : rows.length === 0 ? <p className="text-muted">No hay retiros con estos filtros.</p>
        : (
        <div className="overflow-x-auto rounded-lg border border-line bg-card">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-line">
              <tr><th className="th">Fecha</th><th className="th">Elemento</th><th className="th text-right">Retirado</th>
                <th className="th text-right">Devuelto</th><th className="th">Destino</th><th className="th">Motivo</th>
                <th className="th">Estado</th><th className="th"><span className="sr-only">Acciones</span></th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((w) => (
                <tr key={w.id}>
                  <td className="td whitespace-nowrap">{formatDate(w.withdrawal_date)}</td>
                  <td className="td font-semibold">{w.item_name}</td>
                  <td className="td text-right">{w.quantity}</td>
                  <td className="td text-right">{w.returned_quantity}</td>
                  <td className="td">{w.destination}</td>
                  <td className="td text-muted">{w.reason || '—'}</td>
                  <td className="td">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${w.status === 'RETIRADO' ? 'bg-amber-soft text-amber' : 'bg-forest/10 text-forest'}`}>
                      {w.status === 'RETIRADO' ? 'Retirado' : 'Devuelto'}
                    </span>
                  </td>
                  <td className="td">
                    {isAdmin && w.status === 'RETIRADO' && <ReturnControl w={w} onReturn={handleReturn} />}
                    {(!isAdmin || w.status === 'DEVUELTO') && <span className="block text-right text-xs text-muted">{formatDate(w.returned_at)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
