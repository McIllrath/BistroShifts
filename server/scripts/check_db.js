const knex = require('knex')(require('../knexfile.js').development);

async function checkDB() {
  try {
    const result = await knex.raw('SELECT name FROM sqlite_master WHERE type="table"');
    console.log('Tables in database:');
    result.forEach(row => console.log('  -', row.name));
    
    // Check migration status
    const migrations = await knex('knex_migrations').select('*').orderBy('id', 'desc');
    console.log('\nMigrations applied:');
    migrations.forEach(m => console.log('  -', m.name));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await knex.destroy();
  }
}

checkDB();
