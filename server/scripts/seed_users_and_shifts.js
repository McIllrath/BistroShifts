const db = require('../src/db');
const bcrypt = require('bcryptjs');

// Simple idempotent seeding for local dev/testing
// Creates an admin and a user (INSERT OR IGNORE style) and several shifts

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@local.com';
const adminPw = process.env.E2E_ADMIN_PW || 'adminpw';
const userEmail = process.env.E2E_USER_EMAIL || 'user@local.com';
const userPw = process.env.E2E_USER_PW || 'pw1234';

async function run() {
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync(adminPw, salt);
  const userHash = bcrypt.hashSync(userPw, salt);

  // ensure users table exists via knex schema check
  try {
    const hasUsers = await db.knex.schema.hasTable('users');
    if (!hasUsers) {
      console.error('Tables not present. Run `npm run init-db` first.');
      process.exit(1);
    }

    // Upsert admin and user in a cross-db way
    const existingAdmin = await db.knex('users').where({ email: adminEmail }).first();
    if (!existingAdmin) {
      await db.knex('users').insert({ email: adminEmail, password_hash: adminHash, display_name: 'Admin (seed)', role: 'admin', is_active: 1 });
      console.log('Admin ensured:', adminEmail);
    } else {
      console.log('Admin exists:', adminEmail);
    }

    // Skip creating standard user - only admin needed
    console.log('Skipping standard user creation');

    // create sample shifts if not present
    const shifts = [
      { title: 'Seed Shift A', start: new Date(Date.now() + 24*3600*1000).toISOString(), end: new Date(Date.now() + 24*3600*1000 + 2*3600*1000).toISOString(), capacity: 2 },
      { title: 'Seed Shift B', start: new Date(Date.now() + 48*3600*1000).toISOString(), end: new Date(Date.now() + 48*3600*1000 + 2*3600*1000).toISOString(), capacity: 1 },
      { title: 'Seed Shift C', start: new Date(Date.now() + 72*3600*1000).toISOString(), end: new Date(Date.now() + 72*3600*1000 + 3*3600*1000).toISOString(), capacity: 3 }
    ];

    for (const s of shifts) {
      const exists = await db.knex('shifts').where({ title: s.title, start_time: s.start }).first();
      if (!exists) {
        const userRow = await db.knex('users').where({ email: adminEmail }).first();
        const createdBy = userRow ? userRow.id : null;
        await db.knex('shifts').insert({ title: s.title, start_time: s.start, end_time: s.end, capacity: s.capacity, created_by: createdBy, is_active: 1 });
        console.log('Ensured shift:', s.title);
      } else {
        console.log('Shift exists:', s.title);
      }
    }

    await db.close();
  } catch (err) {
    console.error('DB error', err && err.message);
    process.exit(1);
  }
}

run();
