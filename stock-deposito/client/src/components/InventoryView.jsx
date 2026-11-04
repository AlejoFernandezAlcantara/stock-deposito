import { Fragment, useState, useMemo } from 'react';
import { api } from '../api.js';
import { IconSearch, IconPlus, IconTrash, IconArrowRight, IconCheck, IconClose } from './Icons.jsx';

// Barra visual de stock
function StockBar({ available, total }) {
  const pct = total ? Math.min(100, Math.round((available / total) * 100)) : 0;
  const isLow = pct > 0 && pct <= 25;
  const isEmpty = available === 0;

  return (
    <div className="w-full space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-line/80">
        <div
          className={`h-full transition-all duration-300 ${
            isEmpty ? 'bg-danger' : isLow ? 'bg-amber' : 'bg-forest'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] font-medium text-muted">
        <span>{pct}% disp.</span>
      </div>
    </div>
  );
}

// Edición de cantidad total para admin
function QuantityEditor({ item, onChanged, notify }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(item.total_quantity);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateQuantity(item.id, Number(qty));
      notify('Cantidad actualizada con éxito.');
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
      <div className="inline-flex items-center gap-1.5">
        <span className="font-bold text-ink">{item.total_quantity}</span>
        <button
          onClick={() => { setQty(item.total_quantity); setEditing(true); }}
          className="text-xs font-semibold text-forest hover:text-forest-dark underline cursor-pointer"
          title="Modificar o reducir cantidad"
        >
          editar
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="number"
        min="0"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        className="field w-16 py-1 px-1.5 text-center font-bold"
        autoFocus
      />
      <button
        onClick={save}
        disabled={saving}
        className="rounded bg-forest p-1 text-white hover:bg-forest-dark transition-colors cursor-pointer"
        title="Guardar"
      >
        <IconCheck className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setEditing(false)}
        className="rounded bg-gray-200 p-1 text-gray-700 hover:bg-gray-300 transition-colors cursor-pointer"
        title="Cancelar"
      >
        <IconClose className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Panel desplegable de observaciones
function Observations({ item, onChanged, notify, isAdmin }) {
  const [form, setForm] = useState({ description: '', quantity: 1 });
  const [saving, setSaving] = useState(false);
  const assigned = item.observations.reduce((s, o) => s + o.quantity, 0);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addObservation(item.id, { ...form, quantity: Number(form.quantity) });
      setForm({ description: '', quantity: 1 });
      notify('Observación añadida.');
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (obsId) => {
    try {
      await api.deleteObservation(item.id, obsId);
      notify('Observación eliminada.');
      onChanged();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-3 rounded-xl bg-paper/70 p-4 border border-line">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
          Observaciones y estados ({assigned} de {item.total_quantity} unid.)
        </h4>
      </div>

      {item.observations.length > 0 ? (
        <ul className="divide-y divide-line rounded-lg border border-line bg-card overflow-hidden">
          {item.observations.map((o) => (
            <li key={o.id} className="flex items-center justify-between p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-md bg-amber-soft px-2 py-0.5 text-xs font-bold text-amber">
                  {o.quantity} u.
                </span>
                <span className="text-ink">{o.description}</span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => remove(o.id)}
                  className="text-xs font-semibold text-danger hover:underline cursor-pointer"
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted italic">No hay notas de estado registradas para este elemento.</p>
      )}

      {isAdmin && (
        <form onSubmit={add} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 pt-2">
          <div className="flex-1">
            <label className="label" htmlFor={`od-${item.id}`}>Nueva observación</label>
            <input
              id={`od-${item.id}`}
              required
              className="field"
              placeholder="Ej.: Sin cables, reparado, caja dañada..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="w-full sm:w-24">
            <label className="label" htmlFor={`oq-${item.id}`}>Cant.</label>
            <input
              id={`oq-${item.id}`}
              type="number"
              min="1"
              required
              className="field"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <button className="btn-ghost whitespace-nowrap self-end" disabled={saving}>
            <IconPlus className="w-4 h-4" />
            {saving ? 'Agregando...' : 'Agregar nota'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function InventoryView({ items, loading, onReload, onWithdraw, notify, isAdmin }) {
  const [openId, setOpenId] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');

  // Categorías únicas
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return ['ALL', ...Array.from(set).sort()];
  }, [items]);

  // Filtrado
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                          item.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat === 'ALL' || item.category === selectedCat;
      return matchSearch && matchCat;
    });
  }, [items, search, selectedCat]);

  const handleDelete = async (item) => {
    if (!confirm(`¿Seguro que querés eliminar el elemento "${item.name}"? Esta acción borrará su historial de retiros devueltos.`)) return;
    try {
      await api.deleteItem(item.id);
      notify(`"${item.name}" eliminado del inventario.`);
      onReload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-forest border-r-transparent" />
        <p className="text-sm font-medium text-muted">Cargando inventario...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            className="field pl-9 pr-4"
            placeholder="Buscar por nombre o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
            <IconSearch className="h-4 w-4" />
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink cursor-pointer"
            >
              <IconClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {categories.length > 2 && (
          <div className="flex overflow-x-auto pb-1 sm:pb-0 gap-1.5 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCat === cat
                    ? 'bg-forest text-white shadow-xs'
                    : 'bg-card border border-line text-muted hover:text-ink hover:bg-paper'
                }`}
              >
                {cat === 'ALL' ? 'Todas' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <div className="card p-10 text-center space-y-2">
          <p className="text-base font-semibold text-ink">No se encontraron elementos</p>
          <p className="text-sm text-muted">
            {items.length === 0
              ? 'El inventario está vacío actualmente.'
              : 'Probá ajustando los términos de búsqueda o filtros.'}
          </p>
        </div>
      ) : (
        <>
          {/* VISTA 1: CARDS RESPONSIVE PARA SMARTPHONES (Hidden en md+) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredItems.map((item) => {
              const out = item.total_quantity - item.available_quantity;
              const open = openId === item.id;
              const isEmpty = item.available_quantity === 0;

              return (
                <div key={item.id} className="card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-ink text-base">{item.name}</h3>
                        {item.observations.length > 0 && (
                          <span className="rounded bg-amber-soft px-1.5 py-0.5 text-[10px] font-bold text-amber">
                            {item.observations.length} obs.
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-muted">{item.category}</span>
                    </div>

                    {/* Stock disponible destacado */}
                    <div className="text-right">
                      <span className={`text-xl font-black ${isEmpty ? 'text-danger' : 'text-forest'}`}>
                        {item.available_quantity}
                      </span>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                        Disponibles
                      </span>
                    </div>
                  </div>

                  {/* Barra visual de disponibilidad */}
                  <StockBar available={item.available_quantity} total={item.total_quantity} />

                  {/* Métricas secundarias */}
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-paper/60 p-2 text-xs">
                    <div>
                      <span className="text-muted block">Fuera / Retirado:</span>
                      <span className="font-bold text-amber">{out} u.</span>
                    </div>
                    <div>
                      <span className="text-muted block">Total registrado:</span>
                      {isAdmin ? (
                        <QuantityEditor item={item} onChanged={onReload} notify={notify} />
                      ) : (
                        <span className="font-bold text-ink">{item.total_quantity} u.</span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => setOpenId(open ? null : item.id)}
                      className="text-xs font-semibold text-muted hover:text-ink cursor-pointer"
                    >
                      {open ? 'Ocultar detalles ▲' : 'Ver detalles ▼'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      {isAdmin && (
                        <>
                          <button
                            className="btn-danger p-2 text-xs"
                            onClick={() => handleDelete(item)}
                            title="Eliminar elemento"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                          <button
                            className="btn-primary text-xs py-1.5 px-3"
                            disabled={item.available_quantity === 0}
                            onClick={() => onWithdraw(item.id)}
                          >
                            <IconArrowRight className="w-3.5 h-3.5" />
                            Retirar
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Detalle desplegable */}
                  {open && (
                    <div className="pt-2">
                      <Observations item={item} onChanged={onReload} notify={notify} isAdmin={isAdmin} />
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
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted">Elemento</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted">Categoría</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted text-right">En Depósito</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted text-right">Fuera</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted text-right">Total</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted w-36">Disponibilidad</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {filteredItems.map((item) => {
                  const out = item.total_quantity - item.available_quantity;
                  const open = openId === item.id;
                  const isEmpty = item.available_quantity === 0;

                  return (
                    <Fragment key={item.id}>
                      <tr className="hover:bg-paper/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-ink">
                          <div className="flex items-center gap-2">
                            <span>{item.name}</span>
                            {item.observations.length > 0 && (
                              <span className="rounded bg-amber-soft px-1.5 py-0.5 text-xs font-semibold text-amber">
                                {item.observations.length} obs.
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted font-medium">{item.category}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`font-black text-base ${isEmpty ? 'text-danger' : 'text-forest'}`}>
                            {item.available_quantity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-amber">{out}</td>
                        <td className="py-3.5 px-4 text-right">
                          {isAdmin ? (
                            <QuantityEditor item={item} onChanged={onReload} notify={notify} />
                          ) : (
                            <span className="font-semibold text-ink">{item.total_quantity}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <StockBar available={item.available_quantity} total={item.total_quantity} />
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            className="btn-ghost mr-1.5 text-xs py-1.5 px-2.5"
                            onClick={() => setOpenId(open ? null : item.id)}
                          >
                            {open ? 'Ocultar' : 'Detalles'}
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                className="btn-primary mr-1.5 text-xs py-1.5 px-3"
                                disabled={item.available_quantity === 0}
                                onClick={() => onWithdraw(item.id)}
                              >
                                Retirar
                              </button>
                              <button
                                className="btn-danger text-xs py-1.5 px-2.5"
                                onClick={() => handleDelete(item)}
                                title="Eliminar elemento"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-paper/30">
                          <td colSpan={7} className="p-4">
                            <Observations item={item} onChanged={onReload} notify={notify} isAdmin={isAdmin} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
