const express = require('express');
const pool = require('../db');
const { getRedis } = require('../redisClient');
const { requireAuth } = require('../auth');

const router = express.Router();
const CART_TTL = Number(process.env.CART_TTL_SECONDS || 1800);

function cartKey(userId) {
  return `cart:${userId}`;
}

// The cart lives entirely in Redis as a hash of { productId: quantity },
// with a TTL that resets on every write. No cron job needed to clear
// abandoned carts — Redis expires them on its own.

router.get('/', requireAuth, async (req, res) => {
  const redis = await getRedis();
  const raw = await redis.hGetAll(cartKey(req.userId));
  const items = await hydrateCart(raw);
  res.json({ items, expiresInSeconds: CART_TTL });
});

router.post('/items', requireAuth, async (req, res) => {
  const { productId, quantity } = req.body || {};
  if (!productId || !quantity || quantity < 1) {
    return res.status(400).json({ error: 'productId and a positive quantity are required.' });
  }
  const redis = await getRedis();
  const key = cartKey(req.userId);
  await redis.hIncrBy(key, productId, quantity);
  await redis.expire(key, CART_TTL);

  const raw = await redis.hGetAll(key);
  const items = await hydrateCart(raw);
  res.status(201).json({ items, expiresInSeconds: CART_TTL });
});

router.delete('/items/:productId', requireAuth, async (req, res) => {
  const redis = await getRedis();
  const key = cartKey(req.userId);
  await redis.hDel(key, req.params.productId);
  await redis.expire(key, CART_TTL);

  const raw = await redis.hGetAll(key);
  const items = await hydrateCart(raw);
  res.json({ items, expiresInSeconds: CART_TTL });
});

router.delete('/', requireAuth, async (req, res) => {
  const redis = await getRedis();
  await redis.del(cartKey(req.userId));
  res.json({ items: [] });
});

async function hydrateCart(raw) {
  const productIds = Object.keys(raw);
  if (productIds.length === 0) return [];

  const result = await pool.query('SELECT * FROM products WHERE id = ANY($1)', [productIds]);
  return result.rows.map((p) => ({
    productId: p.id,
    name: p.name,
    priceCents: p.price_cents,
    imageUrl: p.image_url,
    quantity: Number(raw[p.id]),
  }));
}

module.exports = router;
