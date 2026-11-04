import { createContext, useContext, useState, useCallback } from 'react';
import { api, setAdminKey, getAdminKey } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Si ya hay una clave guardada, arrancamos como admin (se validará al primer request).
  const [role, setRole] = useState(getAdminKey() ? 'admin' : null);

  const loginAsAdmin = useCallback(async (key) => {
    const { role: serverRole } = await api.login(key);
    if (serverRole === 'admin') {
      setAdminKey(key);
      setRole('admin');
      return true;
    }
    return false;
  }, []);

  const loginAsViewer = useCallback(() => {
    setAdminKey('');
    setRole('viewer');
  }, []);

  const logout = useCallback(() => {
    setAdminKey('');
    setRole(null);
  }, []);

  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ role, isAdmin, loginAsAdmin, loginAsViewer, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

