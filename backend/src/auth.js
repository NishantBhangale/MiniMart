const jwt = require('jsonwebtoken');
const { getRedis } = require('./redisClient');

// Sessions live in Redis, not Postgres: fast to check, and they expire
// automatically instead of needing a cleanup job.
async function createSession(userId) {
  const redis = await getRedis();
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  await redis.set(`session:${token}`, userId, { EX: 7 * 24 * 60 * 60 });
  return token;
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });

  try {
    const redis = await getRedis();
    const userId = await redis.get(`session:${token}`);
    if (!userId) return res.status(401).json({ error: 'Session expired. Sign in again.' });

    jwt.verify(token, process.env.JWT_SECRET);
    req.userId = userId;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Sign in again.' });
  }
}

module.exports = { createSession, requireAuth };
