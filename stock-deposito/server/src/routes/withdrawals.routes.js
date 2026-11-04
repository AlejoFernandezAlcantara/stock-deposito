import { Router } from 'express';
import { asyncHandler as h } from '../middleware/errors.js';
import { requireAdmin } from '../middleware/auth.js';
import * as c from '../controllers/withdrawals.controller.js';

const r = Router();
r.get('/', h(c.listWithdrawals));
r.post('/', requireAdmin, h(c.createWithdrawal));
r.post('/:id/return', requireAdmin, h(c.returnWithdrawal));
export default r;
