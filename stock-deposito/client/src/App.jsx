import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './components/AuthContext.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import InventoryView from './components/InventoryView.jsx';
import WithdrawalsView from './components/WithdrawalsView.jsx';
import WithdrawalForm from './components/WithdrawalForm.jsx';
import ItemForm from './components/ItemForm.jsx';
import { IconBox, IconPlus, IconArrowRight, IconTrash, IconLogOut, IconUser } from './components/Icons.jsx';

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
    try {
      setItems(await api.getItems());
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (role) loadItems();
  }, [role, loadItems]);

  if (!role) return <LoginScreen />;

  const refreshAll = () => {
    loadItems();
    setWithdrawalsKey((k) => k + 1);
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        '¿ATENCIÓN: Seguro que querés vaciar TODO el inventario? Esta acción borrará todos los elementos registrados permanentemente.'
      )
    )
      return;
    try {
      await api.deleteAllItems();
      notify('Inventario vaciado por completo.');
      refreshAll();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Cálculo de estadísticas rápidas
  const totalItems = items.length;
  const totalUnits = items.reduce((acc, i) => acc + i.total_quantity, 0);
  const availableUnits = items.reduce((acc, i) => acc + i.available_quantity, 0);
  const outUnits = totalUnits - availableUnits;

  return (
    <div className="min-h-screen bg-paper pb-16">
      
      {/* Barra de Navegación Superior */}
      <header className="sticky top-0 z-40 border-b border-line bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-white shadow-xs">
              <IconBox className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold leading-tight text-ink">
                Stock Depósito
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    isAdmin ? 'bg-forest' : 'bg-amber'
                  }`}
                />
                <span>{isAdmin ? 'Administrador' : 'Modo Lector'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-ink hover:bg-paper transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <IconLogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Cambiar modo</span>
            </button>
          </div>

        </div>
      </header>

      {/* Contenido Principal */}
      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 space-y-6">

        {/* Banner de bienvenida y métricas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-3 sm:p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Variedad</span>
            <p className="mt-1 text-xl sm:text-2xl font-black text-ink">{totalItems} <span className="text-xs font-normal text-muted">ítems</span></p>
          </div>
          <div className="card p-3 sm:p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-forest">En Depósito</span>
            <p className="mt-1 text-xl sm:text-2xl font-black text-forest">{availableUnits} <span className="text-xs font-normal text-muted">disp.</span></p>
          </div>
          <div className="card p-3 sm:p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber">Fuera</span>
            <p className="mt-1 text-xl sm:text-2xl font-black text-amber">{outUnits} <span className="text-xs font-normal text-muted">retiradas</span></p>
          </div>
          <div className="card p-3 sm:p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Stock</span>
            <p className="mt-1 text-xl sm:text-2xl font-black text-ink">{totalUnits} <span className="text-xs font-normal text-muted">unid.</span></p>
          </div>
        </div>

        {/* Acciones principales de administrador */}
        {isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                className="btn-primary flex-1 sm:flex-none text-xs sm:text-sm py-2 px-3.5"
                onClick={() => setModal({ type: 'withdrawal' })}
              >
                <IconArrowRight className="w-4 h-4" />
                Registrar Retiro
              </button>
              <button
                className="btn-ghost flex-1 sm:flex-none text-xs sm:text-sm py-2 px-3.5"
                onClick={() => setModal({ type: 'item' })}
              >
                <IconPlus className="w-4 h-4 text-forest" />
                Nuevo Elemento
              </button>
            </div>

            {items.length > 0 && (
              <button
                className="btn-danger text-xs py-2 px-3 ml-auto sm:ml-0"
                onClick={handleDeleteAll}
                title="Vaciar todo el inventario"
              >
                <IconTrash className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vaciar Inventario</span>
              </button>
            )}
          </div>
        )}

        {/* Selector de pestañas */}
        <div className="border-b border-line">
          <nav className="flex gap-4 sm:gap-6 -mb-px">
            <button
              onClick={() => setTab('inventory')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                tab === 'inventory'
                  ? 'border-forest text-forest'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              Inventario de Stock
            </button>
            <button
              onClick={() => setTab('withdrawals')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                tab === 'withdrawals'
                  ? 'border-forest text-forest'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              Retiros y Devoluciones
            </button>
          </nav>
        </div>

        {/* Vista activa */}
        {tab === 'inventory' ? (
          <InventoryView
            items={items}
            loading={loading}
            onReload={loadItems}
            notify={notify}
            isAdmin={isAdmin}
            onWithdraw={(itemId) => setModal({ type: 'withdrawal', itemId })}
          />
        ) : (
          <WithdrawalsView
            reloadKey={withdrawalsKey}
            onChanged={refreshAll}
            notify={notify}
            isAdmin={isAdmin}
          />
        )}

      </main>

      {/* Modales */}
      {isAdmin && modal?.type === 'withdrawal' && (
        <WithdrawalForm
          items={items}
          initialItemId={modal.itemId}
          notify={notify}
          onClose={() => setModal(null)}
          onSaved={refreshAll}
        />
      )}
      {isAdmin && modal?.type === 'item' && (
        <ItemForm notify={notify} onClose={() => setModal(null)} onSaved={loadItems} />
      )}

      {/* Toast Notificaciones */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl animate-in slide-in-from-bottom-3 duration-200 ${
            toast.kind === 'error' ? 'bg-danger' : 'bg-forest'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
