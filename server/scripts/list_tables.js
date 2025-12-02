const Knex = require('knex');
const path = require('path');

async function main() {
  const dbFile = path.join(__dirname, '..', '..', 'db', 'database.sqlite');
  const knex = Knex({
    client: 'sqlite3',
    connection: { filename: dbFile },
    useNullAsDefault: true,
  });

  try {
    const res = await knex.raw("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    // knex.raw on sqlite returns an object where the rows are in res
    const rows = res && res.length ? res : res; // tolerate driver shape
    // Normalize printing
    const names = [];
    if (Array.isArray(res)) {
      for (const r of res) {
        if (r.name) names.push(r.name);
      }
    } else if (res && res.length === undefined && res.hasOwnProperty('rows')) {
      for (const r of res.rows) if (r.name) names.push(r.name);
    } else if (res && res[0]) {
      for (const r of res) if (r.name) names.push(r.name);
    }

    console.log('Tables:', names.join(', '));
  } catch (err) {
    console.error('Error listing tables:', err);
    process.exitCode = 2;
  } finally {
    try { await knex.destroy(); } catch (e) {}
  }
}

if (require.main === module) main();
