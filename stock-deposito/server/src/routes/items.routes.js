import { Router } from 'express';
import { asyncHandler as h } from '../middleware/errors.js';
import { requireAdmin } from '../middleware/auth.js';
import * as c from '../controllers/items.controller.js';

const r = Router();
r.get('/', h(c.listItems));
r.post('/', requireAdmin, h(c.createItem));
r.patch('/:id/quantity', requireAdmin, h(c.updateQuantity));
r.delete('/:id', requireAdmin, h(c.deleteItem));
r.delete('/', requireAdmin, h(c.deleteAllItems));
r.post('/:id/observations', requireAdmin, h(c.addObservation));
r.delete('/:id/observations/:obsId', requireAdmin, h(c.deleteObservation));
export default r;
