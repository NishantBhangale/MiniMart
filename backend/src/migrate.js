require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', 'init.sql'), 'utf8');
  console.log('[migrate] applying init.sql ...');
  await pool.query(sql);
  console.log('[migrate] done — schema created and catalog seeded.');
  await pool.end();
}

run().catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
