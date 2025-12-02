const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const expect = require('chai').expect;

// Ensure test DB is used
process.env.DATABASE_FILE = path.join(__dirname, '..', 'db', 'test.sqlite');

// remove old test db if exists
try { fs.unlinkSync(process.env.DATABASE_FILE); } catch (e) {}

const sqlite3 = require('sqlite3');
const app = require('../src/app');

describe('Concurrent signups', function () {
  this.timeout(10000);

  let adminToken;
  let shiftId;

  before(async () => {
    // init DB schema and insert admin user (ensure finished before proceeding)
    const INIT_SQL = fs.readFileSync(path.join(__dirname, '..', 'src', 'models', 'init.sql'), 'utf8');
    const dbConn = new sqlite3.Database(process.env.DATABASE_FILE);
    await new Promise((resolve, reject) => dbConn.exec(INIT_SQL, (err) => err ? reject(err) : resolve()));
    const adminPass = 'adminpass';
    const adminHash = bcrypt.hashSync(adminPass, 10);
    await new Promise((resolve, reject) => dbConn.run('INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)', ['admin@test', adminHash, 'Admin', 'admin'], (e) => e ? reject(e) : resolve()));

    // login admin
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test', password: adminPass });
    adminToken = res.body.token;
    // create a shift with capacity 2
    const create = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Test Shift', start_time: '2025-11-29T08:00:00Z', end_time: '2025-11-29T10:00:00Z', capacity: 2 });
    shiftId = create.body.shift.id;
    dbConn.close();
  });

  it('should allow only up to capacity when concurrent signups occur', async () => {
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

    const success = results.filter(r => r.status === 201).length;
    const conflicts = results.filter(r => r.status === 409).length;

    // expect exactly capacity successes
    expect(success).to.equal(2);
    expect(success + conflicts).to.equal(5);

    // verify registered_count via API
    const detail = await request(app).get(`/api/shifts/${shiftId}`);
    expect(detail.body.shift.registered_count).to.equal(2);
  });
});
