# Control de stock de depósito

React + Tailwind (cliente) · Node.js + Express (API REST) · MySQL 8.

```
stock-deposito/
├── database/schema.sql          # Tablas, claves, índices y datos de ejemplo
├── server/                      # API REST (Express)
│   └── src/{config,controllers,routes,middleware,app.js}
└── client/                      # SPA React (Vite + Tailwind)
    └── src/{api.js,App.jsx,components/}
```

## Requisitos
- Node.js 20.6 o superior (el servidor usa `--env-file`)
- MySQL 8.0.16 o superior

## 1. Base de datos
```bash
mysql -u root -p < database/schema.sql
```
Crea la base `stock_deposito` con sus tablas y dos ítems de ejemplo (Teclado y CPU).

## 2. Backend
```bash
cd server
cp .env.example .env     # editar DB_USER y DB_PASSWORD
npm install
npm run dev              # http://localhost:3001  (prueba: /api/health)
```

## 3. Frontend
```bash
cd client
npm install
npm run dev              # http://localhost:5173
```
En desarrollo, Vite redirige `/api` al puerto 3001. Para producción: `npm run build` y servir `client/dist`
detrás del mismo dominio que la API (o definir `VITE_API_URL` antes del build y ajustar `CORS_ORIGIN` en el servidor).

## Endpoints
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/items` | Productos con sus observaciones |
| POST | `/api/items` | `{name, category, quantity}` |
| POST | `/api/items/:id/observations` | `{description, quantity}` |
| DELETE | `/api/items/:id/observations/:obsId` | Quita una observación |
| POST | `/api/withdrawals` | `{item_id, quantity, withdrawal_date, destination, reason}` (transacción: registra y descuenta) |
| GET | `/api/withdrawals?status=&from=&to=&item_id=` | Historial filtrable |
| POST | `/api/withdrawals/:id/return` | `{quantity?}` devolución total (sin cantidad) o parcial |

## Reglas de negocio
- `total_quantity` = unidades que posee el depósito; `available_quantity` = las que están físicamente adentro.
- Retiro: `available` baja. Devolución: `available` sube. Nunca puede quedar negativo (bloqueo `FOR UPDATE`).
- Un retiro pasa a `DEVUELTO` solo cuando se devolvió la cantidad completa; mientras tanto sigue `RETIRADO`.
- La suma de observaciones de un ítem no puede superar su total.
