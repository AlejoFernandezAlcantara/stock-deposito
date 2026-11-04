import { pool, withTransaction } from '../config/db.js';
import { HttpError, requireText, toPositiveInt } from '../middleware/errors.js';

// GET /api/items -> productos con sus observaciones integradas
export async function listItems(req, res) {
  const [items] = await pool.query('SELECT * FROM items ORDER BY category, name');
  const [observations] = await pool.query(
    'SELECT id, item_id, description, quantity FROM item_observations ORDER BY id'
  );

  const byItem = new Map();
  for (const o of observations) {
    if (!byItem.has(o.item_id)) byItem.set(o.item_id, []);
    byItem.get(o.item_id).push(o);
  }
  res.json(items.map((i) => ({ ...i, observations: byItem.get(i.id) || [] })));
}

// POST /api/items -> { name, category, quantity }
// Una unidad nueva suma al total y al disponible.
export async function createItem(req, res) {
  const name = requireText(req.body.name, 'name', 150);
  const category = requireText(req.body.category, 'category', 100);
  const quantity = Number(req.body.quantity ?? 0);
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new HttpError(400, '"quantity" debe ser un entero mayor o igual a 0.');
  }
  const [result] = await pool.query(
    'INSERT INTO items (name, category, total_quantity, available_quantity) VALUES (?, ?, ?, ?)',
    [name, category, quantity, quantity]
  );
  res.status(201).json({ id: result.insertId, name, category, total_quantity: quantity,
    available_quantity: quantity, observations: [] });
}

// POST /api/items/:id/observations -> { description, quantity }
// La suma de observaciones no puede superar el total del ítem.
export async function addObservation(req, res) {
  const itemId = toPositiveInt(req.params.id, 'id');
  const description = requireText(req.body.description, 'description');
  const quantity = toPositiveInt(req.body.quantity, 'quantity');

  const observation = await withTransaction(async (conn) => {
    const [[item]] = await conn.query('SELECT total_quantity FROM items WHERE id = ? FOR UPDATE', [itemId]);
    if (!item) throw new HttpError(404, 'El elemento no existe.');

    const [[{ used }]] = await conn.query(
      'SELECT COALESCE(SUM(quantity), 0) AS used FROM item_observations WHERE item_id = ?', [itemId]);
    if (Number(used) + quantity > item.total_quantity) {
      throw new HttpError(409,
        `Las observaciones (${Number(used) + quantity}) superarían el total del ítem (${item.total_quantity}).`);
    }
    const [r] = await conn.query(
      'INSERT INTO item_observations (item_id, description, quantity) VALUES (?, ?, ?)',
      [itemId, description, quantity]);
    return { id: r.insertId, item_id: itemId, description, quantity };
  });
  res.status(201).json(observation);
}

// DELETE /api/items/:id/observations/:obsId
export async function deleteObservation(req, res) {
  const [r] = await pool.query('DELETE FROM item_observations WHERE id = ? AND item_id = ?',
    [toPositiveInt(req.params.obsId, 'obsId'), toPositiveInt(req.params.id, 'id')]);
  if (!r.affectedRows) throw new HttpError(404, 'La observación no existe.');
  res.status(204).end();
}


// PATCH /api/items/:id/quantity -> { quantity }
// Permite ajustar el total y disponible (reducir o establecer nueva cantidad).
export async function updateQuantity(req, res) {
  const itemId = toPositiveInt(req.params.id, 'id');
  const newTotal = Number(req.body.quantity);
  if (!Number.isInteger(newTotal) || newTotal < 0) {
    throw new HttpError(400, '"quantity" debe ser un entero mayor o igual a 0.');
  }

  await withTransaction(async (conn) => {
    const [[item]] = await conn.query('SELECT * FROM items WHERE id = ? FOR UPDATE', [itemId]);
    if (!item) throw new HttpError(404, 'El elemento no existe.');

    const out = item.total_quantity - item.available_quantity; // unidades fuera (retiradas)
    if (newTotal < out) {
      throw new HttpError(409,
        `No se puede reducir a ${newTotal}: hay ${out} unidad(es) retiradas que superan esa cantidad.`);
    }
    const newAvailable = newTotal - out;
    await conn.query(
      'UPDATE items SET total_quantity = ?, available_quantity = ? WHERE id = ?',
      [newTotal, newAvailable, itemId]);
  });
  res.json({ ok: true });
}

// DELETE /api/items/:id
// Elimina un elemento y sus observaciones (CASCADE). Falla si tiene retiros activos.
export async function deleteItem(req, res) {
  const itemId = toPositiveInt(req.params.id, 'id');

  await withTransaction(async (conn) => {
    const [[item]] = await conn.query('SELECT * FROM items WHERE id = ? FOR UPDATE', [itemId]);
    if (!item) throw new HttpError(404, 'El elemento no existe.');

    const [[{ active }]] = await conn.query(
      "SELECT COUNT(*) AS active FROM withdrawals WHERE item_id = ? AND status = 'RETIRADO'", [itemId]);
    if (Number(active) > 0) {
      throw new HttpError(409,
        `No se puede eliminar: tiene ${active} retiro(s) activo(s). Devuélvalos primero.`);
    }

    // Eliminar retiros devueltos asociados para no violar la FK
    await conn.query('DELETE FROM withdrawals WHERE item_id = ?', [itemId]);
    // Las observaciones se borran por CASCADE
    await conn.query('DELETE FROM items WHERE id = ?', [itemId]);
  });
  res.status(204).end();
}

// DELETE /api/items
// Elimina TODOS los elementos. Falla si hay retiros activos en cualquier ítem.
export async function deleteAllItems(req, res) {
  await withTransaction(async (conn) => {
    const [[{ active }]] = await conn.query(
      "SELECT COUNT(*) AS active FROM withdrawals WHERE status = 'RETIRADO'");
    if (Number(active) > 0) {
      throw new HttpError(409,
        `No se puede vaciar el inventario: hay ${active} retiro(s) activo(s). Devuélvalos primero.`);
    }

    await conn.query('DELETE FROM withdrawals');
    // Las observaciones se borran por CASCADE al borrar items
    await conn.query('DELETE FROM items');
  });
  res.status(204).end();
}
