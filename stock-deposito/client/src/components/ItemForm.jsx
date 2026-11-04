import { useState } from 'react';
import { api } from '../api.js';
import Modal from './Modal.jsx';

// Alta de un nuevo producto/elemento.
export default function ItemForm({ onClose, onSaved, notify }) {
  const [form, setForm] = useState({ name: '', category: '', quantity: 1 });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createItem({ ...form, quantity: Number(form.quantity) });
      notify('Elemento agregado al inventario.');
      onSaved();
      onClose();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Agregar elemento" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="name">Nombre</label>
          <input id="name" className="field" required value={form.name} onChange={set('name')} /></div>
        <div><label className="label" htmlFor="cat">Categoría</label>
          <input id="cat" className="field" required value={form.category} onChange={set('category')} /></div>
        <div><label className="label" htmlFor="qty">Cantidad inicial</label>
          <input id="qty" type="number" min="0" className="field" required value={form.quantity} onChange={set('quantity')} /></div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={saving}>Guardar elemento</button>
        </div>
      </form>
    </Modal>
  );
}
