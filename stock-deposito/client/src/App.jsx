import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './components/AuthContext.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import InventoryView from './components/InventoryView.jsx';
import WithdrawalsView from './components/WithdrawalsView.jsx';
import WithdrawalForm from './components/WithdrawalForm.jsx';
import ItemForm from './components/ItemForm.jsx';

export default function App() {
  const { role, isAdmin, logout } = useAuth();

  const [tab, setTab] = useState('inventory');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalsKey, setWithdrawalsKey] = useState(0);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, kind = 'ok') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadItems = useCallback(async () => {
    try { setItems(await api.getItems()); }
    catch (err) { notify(err.message, 'error'); }
    finally { setLoading(false); }
  }, [notify]);

  useEffect(() => { if (role) loadItems(); }, [role, loadItems]);

  if (!role) return <LoginScreen />;

  const refreshAll = () => { loadItems(); setWithdrawalsKey((k) => k + 1); };

  const handleDeleteAll = async () => {
    if (!confirm('¿Seguro que querés eliminar TODOS los elementos del inventario? Esta acción no se puede deshacer.')) return;
    try {
      await api.deleteAllItems();
      notify('Inventario vaciado.');
      refreshAll();
    } catch (err) { notify(err.message, 'error'); }
  };

  const tabClass = (t) => `border-b-2 px-1 pb-3 text-sm font-semibold ${tab === t ? 'border-forest text-forest' : 'border-transparent text-muted hover:text-ink'}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock del depósito</h1>
          <p className="text-sm text-muted">
            {isAdmin ? 'Administrador' : 'Modo lectura (Lector)'}
            {' · '}
            <button onClick={logout} className="text-forest underline hover:text-forest-dark">Salir / Cambiar modo</button>
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setModal({ type: 'item' })}>Agregar elemento</button>
            <button className="btn-primary" onClick={() => setModal({ type: 'withdrawal' })}>Registrar retiro</button>
            {items.length > 0 && (
              <button className="btn-danger" onClick={handleDeleteAll}>
                Eliminar todo
              </button>
            )}
          </div>
        )}
      </header>

      <nav className="mb-6 flex gap-6 border-b border-line" aria-label="Secciones">
        <button className={tabClass('inventory')} onClick={() => setTab('inventory')}>Inventario</button>
        <button className={tabClass('withdrawals')} onClick={() => setTab('withdrawals')}>Retiros y devoluciones</button>
      </nav>

      {tab === 'inventory' ? (
        <InventoryView items={items} loading={loading} onReload={loadItems} notify={notify}
                        isAdmin={isAdmin}
                        onWithdraw={(itemId) => setModal({ type: 'withdrawal', itemId })} />
      ) : (
        <WithdrawalsView reloadKey={withdrawalsKey} onChanged={refreshAll} notify={notify} isAdmin={isAdmin} />
      )}

      {isAdmin && modal?.type === 'withdrawal' && (
        <WithdrawalForm items={items} initialItemId={modal.itemId} notify={notify}
                        onClose={() => setModal(null)} onSaved={refreshAll} />
      )}
      {isAdmin && modal?.type === 'item' && (
        <ItemForm notify={notify} onClose={() => setModal(null)} onSaved={loadItems} />
      )}

      {toast && (
        <div role="status" className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-md px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.kind === 'error' ? 'bg-danger' : 'bg-forest'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
