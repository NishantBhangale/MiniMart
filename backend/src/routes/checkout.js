const express = require('express');
const { v4: uuid } = require('uuid');
const pool = require('../db');
const { getRedis } = require('../redisClient');
const { requireAuth } = require('../auth');

const router = express.Router();

// Atomic "check and decrement" — this is the whole point of putting stock
// in Redis. Two people can hit checkout on the last unit at the same
// millisecond; only one is allowed to win. A plain Postgres
// UPDATE ... WHERE stock > 0 could work too, but under real concurrency
// you want this off the DB's connection pool entirely.
const DECREMENT_IF_AVAILABLE = `
  local stock = tonumber(redis.call('GET', KEYS[1]))
  local qty = tonumber(ARGV[1])
  if stock == nil then
    return -2
  end
  if stock < qty then
    return -1
  end
  redis.call('DECRBY', KEYS[1], qty)
  return stock - qty
`;

router.post('/', requireAuth, async (req, res) => {
  const redis = await getRedis();
  const cartKey = `cart:${req.userId}`;
  const raw = await redis.hGetAll(cartKey);
  const productIds = Object.keys(raw);

  if (productIds.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  const catalog = await pool.query('SELECT * FROM products WHERE id = ANY($1)', [productIds]);
  const productsById = Object.fromEntries(catalog.rows.map((p) => [p.id, p]));

  const decremented = []; // for rollback if a later item in the same order fails
  const orderItems = [];

  for (const productId of productIds) {
    const quantity = Number(raw[productId]);
    const product = productsById[productId];
    if (!product) continue;

    const result = await redis.eval(DECREMENT_IF_AVAILABLE, {
      keys: [`stock:${productId}`],
      arguments: [String(quantity)],
    });

    if (result === -1) {
      // Not enough stock — roll back everything we already decremented
      // in this same checkout so a partial failure never oversells.
      for (const d of decremented) {
        await redis.incrBy(`stock:${d.productId}`, d.quantity);
      }
      return res.status(409).json({
        error: `Only a few "${product.name}" left — someone grabbed the rest. Update your cart and try again.`,
        productId,
      });
    }

    decremented.push({ productId, quantity });
    orderItems.push({
      productId,
      name: product.name,
      unitPriceCents: product.price_cents,
      quantity,
    });
  }

  const totalCents = orderItems.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      'INSERT INTO orders (id, user_id, status, total_cents) VALUES ($1, $2, $3, $4) RETURNING *',
      [uuid(), req.userId, 'confirmed', totalCents]
    );
    const order = orderResult.rows[0];

    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (id, order_id, product_id, product_name, unit_price_cents, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuid(), order.id, item.productId, item.name, item.unitPriceCents, item.quantity]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.productId]);
    }

    await client.query('COMMIT');
    await redis.del(cartKey);

    res.status(201).json({ order, items: orderItems });
  } catch (err) {
    await client.query('ROLLBACK');
    // Stock was already reserved in Redis — give it back since the
    // durable order write failed.
    for (const d of decremented) {
      await redis.incrBy(`stock:${d.productId}`, d.quantity);
    }
    console.error('[checkout] order write failed', err);
    res.status(500).json({ error: 'Checkout failed. Nothing was charged — try again.' });
  } finally {
    client.release();
  }
});

module.exports = router;
