// Error HTTP con código de estado, y middlewares de manejo de errores.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Evita try/catch repetido en cada controlador async.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (req, res) =>
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Ya existe un elemento con ese nombre y categoría.' });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Error interno del servidor.' : err.message });
};

// Helpers de validación -------------------------------------------------
export const toPositiveInt = (value, field) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `"${field}" debe ser un entero mayor a 0.`);
  return n;
};

export const requireText = (value, field, max = 255) => {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) throw new HttpError(400, `"${field}" es obligatorio.`);
  if (s.length > max) throw new HttpError(400, `"${field}" supera los ${max} caracteres.`);
  return s;
};
