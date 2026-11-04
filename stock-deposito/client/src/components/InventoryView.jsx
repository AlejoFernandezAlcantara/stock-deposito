import { Fragment, useState } from 'react';
import { api } from '../api.js';

function StockBar({ available, total }) {
  const pct = total ? Math.round((available / total) * 100) : 0;
  return (
    <div className="h-2 w-28 overflow-hidden rounded-full bg-amber-soft" title={`${available} de ${total} en depósito`}>
      <div className="h-full bg-forest" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Control inline para editar o reducir la cantidad total de un ítem.
function QuantityEditor({ item, onChanged, notify }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(item.total_quantity);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateQuantity(item.id, Number(qty));
      notify('Cantidad actualizada.');
      onChanged();
      setEditing(false);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <span>{item.total_quantity}</span>
        <button
          onClick={() => { setQty(item.total_quantity); setEditing(true); }}
          className="ml-1 text-xs text-forest underline hover:text-forest-dark"
          title="Editar/reducir cantidad total"
        >
          (cambiar)
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <input
        type="number"
        min="0"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        className="field w-16! py-0.5 px-1 text-center"
      />
      <button onClick={save} disabled={saving} className="text-forest text-sm font-bold hover:underline" title="Guardar">✓</button>
      <button onClick={() => setEditing(false)} className="text-muted text-sm hover:underline" title="Cancelar">✗</button>
    </div>
  );
}

function Observations({ item, onChanged, notify, isAdmin }) {
  const [form, setForm] = useState({ description: '', quantity: 1 });
  const assigned = item.observations.reduce((s, o) => s + o.quantity, 0);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.addObservation(item.id, { ...form, quantity: Number(form.quantity) });
      setForm({ description: '', quantity: 1 });
      onChanged();
    } catch (err) { notify(err.message, 'error'); }
  };
  const remove = async (obsId) => {
    try { await api.deleteObservation(item.id, obsId); onChanged(); }
    catch (err) { notify(err.message, 'error'); }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {item.observations.length
          ? `${assigned} de ${item.total_quantity} unidades tienen alguna observación.`
          : 'Este elemento no tiene observaciones de estado.'}
      </p>
      {item.observations.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line bg-white">
          {item.observations.map((o) => (
            <li key={o.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span><strong className="mr-2">{o.quantity}</strong>{o.description}</span>
              {isAdmin && <button onClick={() => remove(o.id)} className="text-danger hover:underline">Quitar</button>}
            </li>
          ))}
        </ul>
      )}
      {isAdmin && (
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <label className="label" htmlFor={`od-${item.id}`}>Nueva observación</label>
            <input id={`od-${item.id}`} required className="field" placeholder="Ej.: Sin cable"
                   value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="w-24">
            <label className="label" htmlFor={`oq-${item.id}`}>Cantidad</label>
            <input id={`oq-${item.id}`} type="number" min="1" required className="field"
                   value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <button className="btn-ghost">Agregar observación</button>
        </form>
      )}
    </div>
  );
}

export default function InventoryView({ items, loading, onReload, onWithdraw, notify, isAdmin }) {
  const [openId, setOpenId] = useState(null);

  const handleDelete = async (item) => {
    if (!confirm(`¿Seguro que querés eliminar el elemento "${item.name}"?`)) return;
    try {
      await api.deleteItem(item.id);
      notify(`"${item.name}" eliminado.`);
      onReload();
    } catch (err) { notify(err.message, 'error'); }
  };

  if (loading) return <p className="text-muted">Cargando inventario…</p>;
  if (items.length === 0) return <p className="text-muted">Todavía no hay elementos.{isAdmin ? ' Agrega el primero con "Agregar elemento".' : ''}</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-card">
      <table className="w-full min-w-[720px]">
        <thead className="border-b border-line">
          <tr>
            <th className="th">Elemento</th><th className="th">Categoría</th>
            <th className="th text-right">En depósito</th><th className="th text-right">Fuera</th>
            <th className="th text-right">Total</th><th className="th">Disponibilidad</th>
            <th className="th"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((item) => {
            const out = item.total_quantity - item.available_quantity;
            const open = openId === item.id;
            return (
              <Fragment key={item.id}>
                <tr>
                  <td className="td font-semibold">{item.name}
                    {item.observations.length > 0 &&
                      <span className="ml-2 rounded bg-amber-soft px-1.5 py-0.5 text-xs font-medium text-amber">
                        {item.observations.length} obs.
                      </span>}
                  </td>
                  <td className="td text-muted">{item.category}</td>
                  <td className="td text-right font-semibold">{item.available_quantity}</td>
                  <td className="td text-right text-amber">{out}</td>
                  <td className="td text-right">
                    {isAdmin ? (
                      <QuantityEditor item={item} onChanged={onReload} notify={notify} />
                    ) : (
                      item.total_quantity
                    )}
                  </td>
                  <td className="td"><StockBar available={item.available_quantity} total={item.total_quantity} /></td>
                  <td className="td whitespace-nowrap text-right">
                    <button className="btn-ghost mr-2" aria-expanded={open}
                            onClick={() => setOpenId(open ? null : item.id)}>
                      {open ? 'Ocultar detalle' : 'Ver detalle'}
                    </button>
                    {isAdmin && (
                      <>
                        <button className="btn-primary mr-2" disabled={item.available_quantity === 0}
                                onClick={() => onWithdraw(item.id)}>Retirar</button>
                        <button className="btn-danger" onClick={() => handleDelete(item)}>
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
                {open && (
                  <tr className="bg-paper/60">
                    <td colSpan={7} className="px-4 py-4"><Observations item={item} onChanged={onReload} notify={notify} isAdmin={isAdmin} /></td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
