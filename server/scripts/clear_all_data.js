const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Knex = require('knex');
// Force a local sqlite connection for this maintenance script so it works
// even if an external DATABASE_URL (e.g. a docker-compose host) is present.
const dbFile = path.join(__dirname, '..', 'db', 'database.sqlite');
const knex = Knex({
  client: 'sqlite3',
  connection: { filename: dbFile },
  useNullAsDefault: true,
});

async function main() {
  console.log('Starting clear-all-data script (will DELETE rows from all tables)...');

  try {
    // Ensure we delete in an order that respects foreign keys
    // signups -> audit_logs -> shifts -> users
    await knex.transaction(async (trx) => {
      if (await trx.schema.hasTable('signups')) {
        const deletedSignups = await trx('signups').del();
        console.log(`deleted from signups: ${deletedSignups}`);
      } else {
        console.log('table signups not found, skipping');
      }

      if (await trx.schema.hasTable('audit_logs')) {
        const deletedAudit = await trx('audit_logs').del();
        console.log(`deleted from audit_logs: ${deletedAudit}`);
      } else {
        console.log('table audit_logs not found, skipping');
      }

      if (await trx.schema.hasTable('shifts')) {
        const deletedShifts = await trx('shifts').del();
        console.log(`deleted from shifts: ${deletedShifts}`);
      } else {
        console.log('table shifts not found, skipping');
      }

      if (await trx.schema.hasTable('users')) {
        const deletedUsers = await trx('users').del();
        console.log(`deleted from users: ${deletedUsers}`);
      } else {
        console.log('table users not found, skipping');
      }
    });

    console.log('All tables cleared successfully.');
    process.exitCode = 0;
  } catch (err) {
    console.error('Error clearing database:', err);
    process.exitCode = 2;
  } finally {
    try { await knex.destroy(); } catch (e) { /* ignore */ }
  }
}

if (require.main === module) main();
