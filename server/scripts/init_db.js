const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const DB_FILE = process.env.DATABASE_FILE || path.join(__dirname, '..', '..', 'db', 'database.sqlite');
const INIT_SQL = fs.readFileSync(path.join(__dirname, '..', 'src', 'models', 'init.sql'), 'utf8');

function ensureDbDir() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDbDir();

(async () => {
  try {
    console.log('Initializing DB (via knex) at', DB_FILE);
    const stmts = INIT_SQL.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
    for (const s of stmts) await db.knex.raw(s);
    console.log('DB initialized.');
    await db.close();
  } catch (err) {
    console.error('Error running init SQL', err);
    process.exit(1);
  }
})();
