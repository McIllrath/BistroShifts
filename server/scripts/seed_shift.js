const db = require('../src/db');
const path = require('path');

// Usage: node scripts/seed_shift.js [title] [start_iso] [end_iso] [capacity]
const title = process.argv[2] || 'Local Seed Shift';
const start_time = process.argv[3] || new Date(Date.now() + 24 * 3600 * 1000).toISOString();
const end_time = process.argv[4] || new Date(Date.now() + 24 * 3600 * 1000 + 2 * 3600 * 1000).toISOString();
const capacity = parseInt(process.argv[5] || '1', 10);

async function ensureAndInsert() {
  try {
    const has = await db.knex.schema.hasTable('shifts');
    if (!has) {
      console.error('shifts table not found; run `npm run init-db` first');
      process.exit(1);
    }
    if (db.knex.client.config.client === 'pg') {
      const rows = await db.knex('shifts').insert({ title, start_time, end_time, capacity, created_by: null, is_active: 1 }).returning('id');
      console.log('Inserted shift id', Array.isArray(rows) ? rows[0] : rows);
    } else {
      const ids = await db.knex('shifts').insert({ title, start_time, end_time, capacity, created_by: null, is_active: 1 });
      console.log('Inserted shift id', ids && ids[0]);
    }
    await db.close();
  } catch (err) {
    console.error('Insert failed:', err && err.message);
    process.exit(1);
  }
}

ensureAndInsert();
