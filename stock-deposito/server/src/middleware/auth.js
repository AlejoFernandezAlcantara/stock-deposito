// Middleware de autenticación ultra-simple: roles hardcodeados.
// - Admin: envía header "x-admin-key" con la clave definida en ADMIN_KEY.
// - Viewer: cualquier petición sin la clave es "viewer" (solo lectura).
//
// requireAdmin() rechaza peticiones que no tengan la clave correcta.

const ADMIN_KEY = process.env.ADMIN_KEY || 'deposito2024';

// Inyecta req.role ('admin' | 'viewer') en cada petición.
export function injectRole(req, res, next) {
  req.role = req.headers['x-admin-key'] === ADMIN_KEY ? 'admin' : 'viewer';
  next();
}

// Middleware que bloquea si no es admin.
export function requireAdmin(req, res, next) {
  if (req.role !== 'admin') {
    return res.status(403).json({ error: 'Acción restringida al administrador.' });
  }
  next();
}
