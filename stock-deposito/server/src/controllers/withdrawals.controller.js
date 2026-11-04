import { pool, withTransaction } from '../config/db.js';
import { HttpError, requireText, toPositiveInt } from '../middleware/errors.js';

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// POST /api/withdrawals -> { item_id, quantity, withdrawal_date, destination, reason }
// Inserta el retiro y descuenta stock en UNA transacción (con bloqueo de fila
// para evitar que dos retiros simultáneos dejen el stock en negativo).
export async function createWithdrawal(req, res) {
  const itemId = toPositiveInt(req.body.item_id, 'item_id');
  const quantity = toPositiveInt(req.body.quantity, 'quantity');
  const destination = requireText(req.body.destination, 'destination', 200);
  const reason = (req.body.reason || '').trim().slice(0, 500) || null;
  const date = req.body.withdrawal_date;
  if (!isDate(date)) throw new HttpError(400, '"withdrawal_date" debe tener formato YYYY-MM-DD.');

  const id = await withTransaction(async (conn) => {
    const [[item]] = await conn.query('SELECT available_quantity FROM items WHERE id = ? FOR UPDATE', [itemId]);
    if (!item) throw new HttpError(404, 'El elemento no existe.');
    if (quantity > item.available_quantity) {
      throw new HttpError(409, `Stock insuficiente: disponibles ${item.available_quantity}, solicitados ${quantity}.`);
    }
    const [r] = await conn.query(
      `INSERT INTO withdrawals (item_id, quantity, withdrawal_date, destination, reason)
       VALUES (?, ?, ?, ?, ?)`, [itemId, quantity, date, destination, reason]);
    await conn.query('UPDATE items SET available_quantity = available_quantity - ? WHERE id = ?', [quantity, itemId]);
    return r.insertId;
  });
  res.status(201).json({ id });
}

// GET /api/withdrawals?status=RETIRADO|DEVUELTO&from=YYYY-MM-DD&to=YYYY-MM-DD&item_id=
export async function listWithdrawals(req, res) {
  const { status, from, to, item_id } = req.query;
  const where = [];
  const params = [];

  if (status) {
    if (!['RETIRADO', 'DEVUELTO'].includes(status)) throw new HttpError(400, 'Estado inválido.');
    where.push('w.status = ?'); params.push(status);
  }
  if (from) { if (!isDate(from)) throw new HttpError(400, '"from" inválido.'); where.push('w.withdrawal_date >= ?'); params.push(from); }
  if (to)   { if (!isDate(to))   throw new HttpError(400, '"to" inválido.');   where.push('w.withdrawal_date <= ?'); params.push(to); }
  if (item_id) { where.push('w.item_id = ?'); params.push(toPositiveInt(item_id, 'item_id')); }

  const [rows] = await pool.query(
    `SELECT w.*, i.name AS item_name, i.category AS item_category,
            (w.quantity - w.returned_quantity) AS pending_quantity
       FROM withdrawals w JOIN items i ON i.id = w.item_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY w.withdrawal_date DESC, w.id DESC`, params);
  res.json(rows);
}

// POST /api/withdrawals/:id/return -> { quantity? }  (sin quantity = devolución total del pendiente)
export async function returnWithdrawal(req, res) {
  const id = toPositiveInt(req.params.id, 'id');

  await withTransaction(async (conn) => {
    const [[w]] = await conn.query('SELECT * FROM withdrawals WHERE id = ? FOR UPDATE', [id]);
    if (!w) throw new HttpError(404, 'El retiro no existe.');

    const pending = w.quantity - w.returned_quantity;
    if (pending <= 0) throw new HttpError(409, 'Este retiro ya fue devuelto por completo.');

    const qty = req.body?.quantity === undefined ? pending : toPositiveInt(req.body.quantity, 'quantity');
    if (qty > pending) throw new HttpError(409, `Solo quedan ${pending} unidad(es) por devolver.`);

    const done = qty === pending;
    await conn.query(
      `UPDATE withdrawals
          SET returned_quantity = returned_quantity + ?,
              status = ?, returned_at = NOW()
        WHERE id = ?`, [qty, done ? 'DEVUELTO' : 'RETIRADO', id]);
    await conn.query('UPDATE items SET available_quantity = available_quantity + ? WHERE id = ?', [qty, w.item_id]);
  });
  res.json({ ok: true });
}
