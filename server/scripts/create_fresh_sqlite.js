const fs = require('fs');
const path = require('path');
const Knex = require('knex');

async function main() {
  const defaultPath = path.join(__dirname, '..', '..', 'db', 'database.sqlite');
  const target = process.argv[2] || process.env.TARGET_DB || defaultPath;

  console.log(`Creating fresh SQLite DB at: ${target}`);

  // remove existing file if present
  try {
    if (fs.existsSync(target)) {
      console.log('Existing DB file found — removing it.');
      fs.unlinkSync(target);
    }
  } catch (err) {
    console.error('Failed to remove existing DB file:', err);
    process.exit(2);
  }

  // ensure directory exists
  const dir = path.dirname(target);
  fs.mkdirSync(dir, { recursive: true });

  // create knex instance pointing to target
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const knex = Knex({
    client: 'sqlite3',
    connection: { filename: target },
    useNullAsDefault: true,
    migrations: { directory: migrationsDir }
  });

  try {
    console.log('Running migrations...');
    const [batchNo, log] = await knex.migrate.latest({ directory: migrationsDir });
    console.log(`Migrations applied. Batch: ${batchNo}, Files: ${log.length}`);
    console.log(log.join('\n'));
  } catch (err) {
    console.error('Error running migrations:', err);
    process.exitCode = 2;
  } finally {
    try { await knex.destroy(); } catch (e) { /* ignore */ }
  }

  console.log('Fresh DB created successfully.');
}

if (require.main === module) main();
