import { useState } from 'react';
import { api, todayISO } from '../api.js';
import Modal from './Modal.jsx';
import { IconArrowRight } from './Icons.jsx';

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
      notify('Retiro registrado. El stock disponible fue actualizado.');
      onSaved();
      onClose();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Registrar nuevo retiro" onClose={onClose}>
      {available.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm font-medium text-muted">No hay elementos con stock disponible para retirar.</p>
          <button type="button" className="btn-ghost mt-4" onClick={onClose}>
            Cerrar
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="w-item">Elemento</label>
            <select
              id="w-item"
              className="field font-medium"
              value={form.item_id}
              onChange={set('item_id')}
            >
              {available.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — {i.available_quantity} disp. ({i.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="w-date">Fecha de retiro</label>
              <input
                id="w-date"
                type="date"
                required
                className="field"
                value={form.withdrawal_date}
                onChange={set('withdrawal_date')}
              />
            </div>
            <div>
              <label className="label" htmlFor="w-qty">
                Cantidad (máx. {selected?.available_quantity || 1})
              </label>
              <input
                id="w-qty"
                type="number"
                min="1"
                max={selected?.available_quantity}
                required
                className="field"
                value={form.quantity}
                onChange={set('quantity')}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="w-dest">Destino / Persona responsable</label>
            <input
              id="w-dest"
              required
              className="field"
              placeholder="Ej.: Sucursal Centro, Juan Pérez, Evento Córdoba"
              value={form.destination}
              onChange={set('destination')}
            />
          </div>

          <div>
            <label className="label" htmlFor="w-reason">Motivo o detalle (opcional)</label>
            <textarea
              id="w-reason"
              rows="2"
              className="field resize-none"
              placeholder="Ej.: Préstamo temporal por guardia, mantenimiento..."
              value={form.reason}
              onChange={set('reason')}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-line">
            <button type="button" className="btn-ghost w-full sm:w-auto" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary w-full sm:w-auto" disabled={saving}>
              <IconArrowRight className="w-4 h-4" />
              {saving ? 'Registrando...' : 'Confirmar retiro'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
