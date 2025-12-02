const fs = require('fs');
const path = require('path');
const db = require('./src/db');
const bcrypt = require('bcryptjs');
const request = require('supertest');

process.env.DATABASE_FILE = path.join(__dirname, 'db', 'test.sqlite');
try { fs.unlinkSync(process.env.DATABASE_FILE); } catch (e) {}

const INIT_SQL = fs.readFileSync(path.join(__dirname, 'src', 'models', 'init.sql'), 'utf8');
;(async () => {
  try {
    // run INIT_SQL by splitting into statements for sqlite
    const stmts = INIT_SQL.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
    for (const s of stmts) await db.knex.raw(s);
    const adminPass = 'adminpass';
    const adminHash = bcrypt.hashSync(adminPass, 10);
    const exists = await db.knex('users').where({ email: 'admin@test' }).first();
    if (!exists) await db.knex('users').insert({ email: 'admin@test', password_hash: adminHash, display_name: 'Admin', role: 'admin' });
    const app = require('./src/app');
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test', password: adminPass });
    const adminToken = res.body.token;
    const create = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Test Shift', start_time: '2025-11-29T08:00:00Z', end_time: '2025-11-29T10:00:00Z', capacity: 2 });
    const shiftId = create.body.shift.id;

    // create 5 users
    const users = [];
    for (let i = 0; i < 5; i++) {
      const email = `user${i}@test`;
      await request(app).post('/api/auth/register').send({ email, password: 'pw1234', display_name: `User ${i}` });
      const login = await request(app).post('/api/auth/login').send({ email, password: 'pw1234' });
      users.push({ token: login.body.token });
    }

    // concurrent signup attempts
    const promises = users.map(u => request(app).post(`/api/shifts/${shiftId}/signups`).set('Authorization', `Bearer ${u.token}`).send());
    const results = await Promise.all(promises);
    console.log('statuses:', results.map(r => r.status));
    console.log('bodies:', results.map(r => r.body));

    const success = results.filter(r => r.status === 201).length;
    const conflicts = results.filter(r => r.status === 409).length;
    console.log('success', success, 'conflicts', conflicts);

    const detail = await request(app).get(`/api/shifts/${shiftId}`);
    console.log('registered_count', detail.body.shift.registered_count);
    await db.close();
    process.exit(0);
  } catch (err) {
    console.error('error', err);
    process.exit(1);
  }
})();
