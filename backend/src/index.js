require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { getRedis } = require('./redisClient');
const { syncStockFromDb } = require('./syncStock');

const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const checkoutRouter = require('./routes/checkout');
const ordersRouter = require('./routes/orders');
const authRouter = require('./routes/auth');

const app = express();

app.use(helmet());
// app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(morgan('tiny'));

// Global rate limit — protects checkout/login from abuse. A tighter,
// per-route limiter could be layered on top of this for /checkout.
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/api/health', async (req, res) => {
  try {
    const redis = await getRedis();
    await redis.ping();
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: err.message });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/orders', ordersRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Something went wrong.' });
});

const PORT = process.env.PORT || 4000;

async function start() {
  await getRedis();
  try {
    await syncStockFromDb();
  } catch (err) {
    console.warn('[sync] skipped — run `npm run migrate` first if this is a fresh database.', err.message);
  }
  app.listen(PORT, () => console.log(`[minimart-backend] listening on :${PORT}`));
}

start();
