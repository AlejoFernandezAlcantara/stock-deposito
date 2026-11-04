import { useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { IconBox, IconLock, IconEye, IconArrowRight } from './Icons.jsx';

export default function LoginScreen() {
  const { loginAsAdmin, loginAsViewer } = useAuth();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await loginAsAdmin(key);
      if (!ok) setError('Clave incorrecta. Probá nuevamente.');
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        
        {/* Encabezado con logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest text-white shadow-md shadow-forest/20">
            <IconBox className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
            Stock de Depósito
          </h1>
          <p className="text-sm text-muted">
            Consulta el stock disponible y los retiros activos en tiempo real.
          </p>
        </div>

        {/* Tarjeta de Acceso */}
        <div className="rounded-2xl border border-line bg-card p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Botón Lector destacado */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-2">Acceso rápido</span>
            <button
              onClick={loginAsViewer}
              type="button"
              className="w-full flex items-center justify-between rounded-xl border-2 border-forest/25 bg-forest-light/60 p-4 text-left transition-all hover:border-forest hover:bg-forest-light hover:shadow-xs group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest text-white">
                  <IconEye className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-forest-dark text-base">Entrar como Lector</h3>
                  <p className="text-xs text-muted">Solo consulta de stock y retiros activos</p>
                </div>
              </div>
              <IconArrowRight className="h-5 w-5 text-forest transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs font-medium uppercase tracking-wider text-muted">
                o administración
              </span>
            </div>
          </div>

          {/* Formulario Administrador */}
          <form onSubmit={handleAdmin} className="space-y-4">
            <div>
              <label className="label" htmlFor="admin-key">
                Clave de Administrador
              </label>
              <div className="relative">
                <input
                  id="admin-key"
                  type="password"
                  className="field py-2.5 pr-10"
                  placeholder="Ingresá la clave de admin"
                  value={key}
                  onChange={(e) => { setKey(e.target.value); setError(''); }}
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted">
                  <IconLock className="h-4 w-4" />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-danger-soft p-3 text-xs font-semibold text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-2.5 text-sm"
              disabled={loading || !key.trim()}
            >
              {loading ? 'Verificando...' : 'Acceder como Administrador'}
            </button>
          </form>

        </div>

        <p className="text-center text-xs text-muted">
          Gestión de inventario para depósitos y retiros internos.
        </p>

      </div>
    </div>
  );
}
