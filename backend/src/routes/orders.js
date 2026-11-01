const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const orders = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    const withItems = await Promise.all(
      orders.rows.map(async (order) => {
        const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
        return { ...order, items: items.rows };
      })
    );
    res.json({ orders: withItems });
  } catch (err) {
    console.error('[orders] list failed', err);
    res.status(500).json({ error: 'Could not load order history.' });
  }
});

module.exports = router;
