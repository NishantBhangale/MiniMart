# MiniMart

A small 3-tier e-commerce demo built for a Docker Compose challenge: **React frontend**, **Node/Express backend**, **Postgres** (source of truth), and **Redis** (live stock counters, cart TTL, sessions).

## Why Redis is here (not just "because Redis")

| Use | Redis structure | Why not just Postgres |
|---|---|---|
| Stock-safe checkout | `stock:{productId}` + Lua `EVAL` for atomic check-and-decrement | Prevents overselling when two people buy the last unit at the same time, without locking a DB row |
| Shopping cart | `cart:{userId}` hash with a TTL | Abandoned carts expire on their own — no cleanup cron job |
| Sessions | `session:{token}` with TTL | Fast auth checks, and logout/expiry is just a key deletion |

Postgres remains the durable system of record for `products`, `orders`, `order_items`, and `users`. On checkout, Redis is only used to *reserve* stock atomically; the order is then written to Postgres inside a transaction, and if that write fails, the Redis reservation is rolled back.

## Project structure

```
minimart/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express app entrypoint
│   │   ├── db.js             # Postgres pool
│   │   ├── redisClient.js    # Redis client singleton
│   │   ├── auth.js           # Session creation + auth middleware
│   │   ├── syncStock.js      # Mirrors Postgres stock -> Redis on boot
│   │   ├── migrate.js        # Runs migrations/init.sql
│   │   ├── migrations/init.sql
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── products.js
│   │       ├── cart.js
│   │       ├── checkout.js
│   │       └── orders.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── main.jsx, App.jsx, api.js, store.jsx, styles.css
    │   ├── components/ (Header, Toast)
    │   └── pages/ (Shop, Cart, Login, Signup, Orders)
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── .env.example
```

## Environment variables

Copy the example files before running anything:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**backend/.env**
```
PORT=4000
NODE_ENV=production
CORS_ORIGIN=http://localhost:5173
PGHOST=postgres
PGPORT=5432
PGUSER=minimart
PGPASSWORD=change_me_strong_password
PGDATABASE=minimart
REDIS_URL=redis://redis:6379
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=7d
CART_TTL_SECONDS=1800
```
If you're running Postgres/Redis directly on your host instead of in containers, change `PGHOST` and the host part of `REDIS_URL` to `localhost`.

**frontend/.env**
```
VITE_API_URL=http://localhost:4000/api
```

## Running without Docker (local dev)

You'll need Postgres 14+ and Redis 6+ running locally.

```bash
# 1. Create the database
createdb minimart

# 2. Backend
cd backend
npm install
npm run migrate      # creates tables + seeds 8 products
npm run dev           # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev           # http://localhost:5173
```

Visit `http://localhost:5173`, create an account, and start shopping.

## What each service needs, for your docker-compose.yml

Since you're writing the Compose file yourself, here's what each service expects:

- **frontend** — build context `./frontend`, exposes `5173`, needs `VITE_API_URL` baked in at build time (Vite env vars are compile-time, not runtime — set this as a build arg or rebuild per environment).
- **backend** — build context `./backend`, exposes `4000`, needs all vars in `backend/.env.example`, depends on `postgres` and `redis` being reachable. Run `node src/migrate.js` once after Postgres is up (either as a one-off `docker compose run backend npm run migrate`, or an init container).
- **postgres** — official `postgres:16-alpine` image works fine; mount a named volume at `/var/lib/postgresql/data` so data survives restarts; set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` to match `backend/.env`.
- **redis** — official `redis:7-alpine` image; a named volume at `/data` if you want cart/stock state to survive a restart (optional — stock resyncs from Postgres on backend boot if a key is missing).

Suggested startup order: `postgres` + `redis` → run the migration once → `backend` → `frontend`. A `depends_on` with `condition: service_healthy` (plus healthchecks on postgres/redis) will save you from race conditions on first boot.

## API summary

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | – | Create account, returns session token |
| POST | `/api/auth/login` | – | Returns session token |
| GET | `/api/products` | – | Catalog with live Redis stock |
| GET | `/api/cart` | ✓ | Current cart |
| POST | `/api/cart/items` | ✓ | Add `{ productId, quantity }` |
| DELETE | `/api/cart/items/:productId` | ✓ | Remove line item |
| POST | `/api/checkout` | ✓ | Atomic stock-safe checkout |
| GET | `/api/orders` | ✓ | Order history |
| GET | `/api/health` | – | Pings Redis, used for healthchecks |

## Testing the race condition (the fun part)

Set a product's stock to 1, then fire two simultaneous checkout requests from two accounts with that item in their cart. One will succeed; the other gets a `409` with a "someone grabbed the rest" message — the Lua script in `checkout.js` guarantees only one wins, even under concurrency.
