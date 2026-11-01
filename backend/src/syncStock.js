const pool = require('./db');
const { getRedis } = require('./redisClient');

// On startup, mirror Postgres stock into Redis stock:{productId} keys
// ONLY where a Redis key doesn't already exist — so a restart never wipes
// out live counters mid-traffic, but a fresh DB always gets seeded.
async function syncStockFromDb() {
  const redis = await getRedis();
  const { rows } = await pool.query('SELECT id, stock FROM products');
  for (const p of rows) {
    const exists = await redis.exists(`stock:${p.id}`);
    if (!exists) {
      await redis.set(`stock:${p.id}`, p.stock);
    }
  }
  console.log(`[sync] stock mirrored into Redis for ${rows.length} products`);
}

module.exports = { syncStockFromDb };
