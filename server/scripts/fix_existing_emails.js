const db = require('../src/db');

console.log('Updating existing admin/user emails to use .com addresses (idempotent)');

(async () => {
  try {
    const a = await db.knex('users').where({ email: 'admin@local' }).update({ email: 'admin@local.com' });
    console.log('admin rows updated:', a);
    const b = await db.knex('users').where({ email: 'user@local' }).update({ email: 'user@local.com' });
    console.log('user rows updated:', b);
    // set created_by to admin id where null
    const sub = db.knex.select('id').from('users').where('email', 'admin@local.com').limit(1);
    const c = await db.knex('shifts').whereNull('created_by').update({ created_by: sub });
    console.log('shifts updated (created_by NULL -> admin id):', c);
    await db.close();
    console.log('Done');
  } catch (err) {
    console.error('fix emails error', err);
    process.exit(1);
  }
})();
