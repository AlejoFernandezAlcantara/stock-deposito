import { useCallback, useEffect, useState } from 'react';
import { api, formatDate } from '../api.js';
import { IconArrowLeft, IconBox } from './Icons.jsx';

const FILTERS = [
  { value: 'RETIRADO', label: 'Retirados activos' },
  { value: 'DEVUELTO', label: 'Devueltos' },
  { value: '', label: 'Todos' },
];

function ReturnControl({ w, onReturn }) {
  const [qty, setQty] = useState(w.pending_quantity);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <input
        type="number"
        min="1"
        max={w.pending_quantity}
        value={qty}
        aria-label="Cantidad a devolver"
        onChange={(e) => setQty(e.target.value)}
        className="field w-16 py-1 px-1.5 text-center text-xs font-bold"
      />
      <button
        className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onReturn(w.id, Number(qty));
          setBusy(false);
        }}
      >
        <IconArrowLeft className="w-3.5 h-3.5" />
        Devolver
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
    try {
      setRows(await api.getWithdrawals({ status, ...range }));
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [status, range, notify]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const handleReturn = async (id, quantity) => {
    try {
      await api.returnWithdrawal(id, quantity);
      notify('Devolución registrada. El stock disponible fue repuesto.');
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros de estado y fechas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
        <div className="flex overflow-x-auto rounded-xl border border-line bg-card p-1 shadow-xs">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatus(f.value)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                status === f.value
                  ? 'bg-forest text-white shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 sm:w-36">
            <label className="label" htmlFor="f-from">Desde</label>
            <input
              id="f-from"
              type="date"
              className="field py-1.5 text-xs"
              value={range.from}
              onChange={(e) => setRange({ ...range, from: e.target.value })}
            />
          </div>
          <div className="flex-1 sm:w-36">
            <label className="label" htmlFor="f-to">Hasta</label>
            <input
              id="f-to"
              type="date"
              className="field py-1.5 text-xs"
              value={range.to}
              onChange={(e) => setRange({ ...range, to: e.target.value })}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-forest border-r-transparent" />
          <p className="text-sm font-medium text-muted">Cargando registros de retiros...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center space-y-2">
          <p className="text-base font-semibold text-ink">No hay retiros registrados</p>
          <p className="text-sm text-muted">
            {status === 'RETIRADO'
              ? 'No hay retiros pendientes de devolución en este momento.'
              : 'No se encontraron resultados con los filtros aplicados.'}
          </p>
        </div>
      ) : (
        <>
          {/* VISTA 1: CARDS RESPONSIVE PARA SMARTPHONES (Hidden en md+) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {rows.map((w) => {
              const isRetirado = w.status === 'RETIRADO';
              return (
                <div key={w.id} className="card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted">{formatDate(w.withdrawal_date)}</span>
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                            isRetirado
                              ? 'bg-amber-soft text-amber'
                              : 'bg-forest-light text-forest'
                          }`}
                        >
                          {isRetirado ? 'Retirado' : 'Devuelto'}
                        </span>
                      </div>
                      <h3 className="font-bold text-ink text-base mt-1">{w.item_name}</h3>
                      <p className="text-xs text-muted font-medium">{w.item_category}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-ink">{w.quantity} u.</span>
                      <span className="block text-[10px] text-muted">
                        {w.returned_quantity > 0 ? `(${w.returned_quantity} devueltas)` : 'retiradas'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-paper/60 p-2.5 text-xs space-y-1">
                    <div>
                      <span className="text-muted">Destino: </span>
                      <strong className="text-ink">{w.destination}</strong>
                    </div>
                    {w.reason && (
                      <div>
                        <span className="text-muted">Motivo: </span>
                        <span className="text-ink">{w.reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  {isAdmin && isRetirado && (
                    <div className="pt-2 border-t border-line flex items-center justify-between">
                      <span className="text-xs font-medium text-amber">
                        Pendiente: {w.pending_quantity} u.
                      </span>
                      <ReturnControl w={w} onReturn={handleReturn} />
                    </div>
                  )}

                  {!isRetirado && (
                    <div className="text-right text-xs text-muted pt-1">
                      Devuelto el {formatDate(w.returned_at)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* VISTA 2: TABLA EXPANDIDA PARA TABLETS Y COMPUTADORAS (Hidden en mobile) */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-line bg-card shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-paper/50">
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted">Fecha</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted">Elemento</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted text-right">Retirado</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted text-right">Devuelto</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted">Destino</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted">Motivo</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted">Estado</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {rows.map((w) => {
                  const isRetirado = w.status === 'RETIRADO';
                  return (
                    <tr key={w.id} className="hover:bg-paper/40 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-muted whitespace-nowrap">
                        {formatDate(w.withdrawal_date)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-ink">{w.item_name}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-ink">{w.quantity}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-muted">{w.returned_quantity}</td>
                      <td className="py-3.5 px-4 font-medium text-ink">{w.destination}</td>
                      <td className="py-3.5 px-4 text-muted text-xs max-w-xs truncate" title={w.reason}>
                        {w.reason || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`rounded px-2.5 py-0.5 text-xs font-bold inline-block ${
                            isRetirado
                              ? 'bg-amber-soft text-amber'
                              : 'bg-forest-light text-forest'
                          }`}
                        >
                          {isRetirado ? 'Retirado' : 'Devuelto'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isAdmin && isRetirado && <ReturnControl w={w} onReturn={handleReturn} />}
                        {(!isAdmin || !isRetirado) && (
                          <span className="text-xs text-muted font-medium">
                            {w.returned_at ? formatDate(w.returned_at) : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
