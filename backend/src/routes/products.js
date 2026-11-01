const express = require('express');
const pool = require('../db');
const { getRedis } = require('../redisClient');

const router = express.Router();

// GET /api/products — catalog with live stock pulled from Redis.
// Redis holds the "available right now" number; Postgres holds everything else.
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const result = category
      ? await pool.query('SELECT * FROM products WHERE category = $1 ORDER BY name', [category])
      : await pool.query('SELECT * FROM products ORDER BY name');

    const redis = await getRedis();
    const products = await Promise.all(
      result.rows.map(async (p) => {
        const liveStock = await redis.get(`stock:${p.id}`);
        return { ...p, stock: liveStock !== null ? Number(liveStock) : p.stock };
      })
    );
    res.json({ products });
  } catch (err) {
    console.error('[products] list failed', err);
    res.status(500).json({ error: 'Could not load products.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    const product = result.rows[0];
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const redis = await getRedis();
    const liveStock = await redis.get(`stock:${product.id}`);
    res.json({ product: { ...product, stock: liveStock !== null ? Number(liveStock) : product.stock } });
  } catch (err) {
    console.error('[products] get failed', err);
    res.status(500).json({ error: 'Could not load product.' });
  }
});

module.exports = router;
