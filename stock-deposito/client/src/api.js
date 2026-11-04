// Cliente HTTP único para toda la app. Lanza Error con el mensaje del backend.
const BASE = import.meta.env.VITE_API_URL || '/api';

// La clave admin se guarda en localStorage cuando el usuario inicia sesión.
let adminKey = localStorage.getItem('adminKey') || '';

export function setAdminKey(key) {
  adminKey = key;
  if (key) localStorage.setItem('adminKey', key);
  else localStorage.removeItem('adminKey');
}

export function getAdminKey() {
  return adminKey;
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (adminKey) headers['x-admin-key'] = adminKey;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de comunicación con el servidor.');
  return data;
}

export const api = {
  // Auth
  login: (key) => {
    const headers = {};
    if (key) headers['x-admin-key'] = key;
    return fetch(`${BASE}/login`, { method: 'POST', headers }).then((r) => r.json());
  },

  // Items
  getItems: () => request('/items'),
  createItem: (data) => request('/items', { method: 'POST', body: data }),
  updateQuantity: (itemId, quantity) => request(`/items/${itemId}/quantity`, { method: 'PATCH', body: { quantity } }),
  deleteItem: (itemId) => request(`/items/${itemId}`, { method: 'DELETE' }),
  deleteAllItems: () => request('/items', { method: 'DELETE' }),
  addObservation: (itemId, data) => request(`/items/${itemId}/observations`, { method: 'POST', body: data }),
  deleteObservation: (itemId, obsId) => request(`/items/${itemId}/observations/${obsId}`, { method: 'DELETE' }),

  // Withdrawals
  createWithdrawal: (data) => request('/withdrawals', { method: 'POST', body: data }),
  getWithdrawals: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/withdrawals${qs ? `?${qs}` : ''}`);
  },
  returnWithdrawal: (id, quantity) => request(`/withdrawals/${id}/return`, { method: 'POST', body: { quantity } }),
};

// Utilidades de fecha ---------------------------------------------------
export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const formatDate = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
