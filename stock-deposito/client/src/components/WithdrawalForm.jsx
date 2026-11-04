import { useState } from 'react';
import { api, todayISO } from '../api.js';
import Modal from './Modal.jsx';

// Registro de baja/retiro. Solo se ofrecen ítems con stock disponible.
export default function WithdrawalForm({ items, initialItemId, onClose, onSaved, notify }) {
  const available = items.filter((i) => i.available_quantity > 0);
  const [form, setForm] = useState({
    item_id: initialItemId || available[0]?.id || '',
    quantity: 1,
    withdrawal_date: todayISO(),
    destination: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const selected = items.find((i) => i.id === Number(form.item_id));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createWithdrawal({ ...form, item_id: Number(form.item_id), quantity: Number(form.quantity) });
      notify('Retiro registrado. El stock se actualizó.');
      onSaved();
      onClose();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Registrar retiro" onClose={onClose}>
      {available.length === 0 ? (
        <p className="text-sm text-muted">No hay elementos con stock disponible para retirar.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label" htmlFor="w-item">Elemento</label>
            <select id="w-item" className="field" value={form.item_id} onChange={set('item_id')}>
              {available.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.available_quantity} disponibles)</option>
              ))}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="w-date">Fecha</label>
              <input id="w-date" type="date" required className="field" value={form.withdrawal_date} onChange={set('withdrawal_date')} /></div>
            <div><label className="label" htmlFor="w-qty">Cantidad</label>
              <input id="w-qty" type="number" min="1" max={selected?.available_quantity} required
                     className="field" value={form.quantity} onChange={set('quantity')} /></div>
          </div>
          <div><label className="label" htmlFor="w-dest">Destino o responsable</label>
            <input id="w-dest" required className="field" placeholder="Ej.: Villa Carlos Paz"
                   value={form.destination} onChange={set('destination')} /></div>
          <div><label className="label" htmlFor="w-reason">Motivo o detalle</label>
            <textarea id="w-reason" rows="2" className="field" value={form.reason} onChange={set('reason')} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" disabled={saving}>Registrar retiro</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
