import { useState } from 'react';
import { api } from '../api.js';
import Modal from './Modal.jsx';
import { IconPlus } from './Icons.jsx';

export default function ItemForm({ onClose, onSaved, notify }) {
  const [form, setForm] = useState({ name: '', category: '', quantity: 1 });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createItem({ ...form, quantity: Number(form.quantity) });
      notify('Elemento agregado correctamente al inventario.');
      onSaved();
      onClose();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Agregar nuevo elemento" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Nombre del elemento</label>
          <input
            id="name"
            className="field"
            required
            placeholder="Ej.: Teclado USB, Monitor 24'', Destornillador"
            value={form.name}
            onChange={set('name')}
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="cat">Categoría</label>
          <input
            id="cat"
            className="field"
            required
            placeholder="Ej.: Periféricos, Computación, Herramientas"
            value={form.category}
            onChange={set('category')}
          />
        </div>
        <div>
          <label className="label" htmlFor="qty">Cantidad inicial</label>
          <input
            id="qty"
            type="number"
            min="0"
            className="field"
            required
            value={form.quantity}
            onChange={set('quantity')}
          />
          <p className="mt-1 text-xs text-muted">
            Las unidades ingresadas estarán disponibles en el depósito de inmediato.
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-line">
          <button type="button" className="btn-ghost w-full sm:w-auto" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary w-full sm:w-auto" disabled={saving}>
            <IconPlus className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar elemento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
