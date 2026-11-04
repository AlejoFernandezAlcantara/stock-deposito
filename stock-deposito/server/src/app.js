import express from 'express';
import cors from 'cors';
import itemsRoutes from './routes/items.routes.js';
import withdrawalsRoutes from './routes/withdrawals.routes.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { injectRole } from './middleware/auth.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(injectRole);

// Ruta principal para verificar que el servidor responde
app.get('/', (req, res) => res.json({ mensaje: 'Servidor de control de stock activo' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Login: valida la clave admin y devuelve el rol.
app.post('/api/login', (req, res) => {
  res.json({ role: req.role });
});

app.use('/api/items', itemsRoutes);
app.use('/api/withdrawals', withdrawalsRoutes);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API lista en http://localhost:${port}`));
