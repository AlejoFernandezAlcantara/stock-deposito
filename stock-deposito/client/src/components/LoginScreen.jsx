import { useState } from 'react';
import { useAuth } from './AuthContext.jsx';

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
      if (!ok) setError('Clave incorrecta.');
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Stock del depósito</h1>
          <p className="mt-1 text-sm text-muted">Ingresá como administrador o entrá como lector.</p>
        </div>

        <div className="rounded-lg border border-line bg-card p-6 shadow-sm">
          <form onSubmit={handleAdmin} className="space-y-4">
            <div>
              <label className="label" htmlFor="admin-key">Clave de administrador</label>
              <input id="admin-key" type="password" className="field" placeholder="Ingresá la clave"
                     value={key} onChange={(e) => { setKey(e.target.value); setError(''); }} />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading || !key.trim()}>
              {loading ? 'Verificando…' : 'Entrar como administrador'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-line" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted">o</span></div>
          </div>

          <button onClick={loginAsViewer} className="btn-ghost w-full">
            Entrar como lector (solo consulta)
          </button>
        </div>
      </div>
    </div>
  );
}

