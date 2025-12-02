const fs = require('fs');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');
const http = require('http');
const path = require('path');

const DB_FILE = process.env.DATABASE_FILE || path.join(__dirname, '..', 'db', 'database.sqlite');
const HOST = 'localhost';
const PORT = 3000;

function req(method, path, body, token) {
  const data = body ? JSON.stringify(body) : null;
  const headers = { 'Content-Type': 'application/json' };
  if (data) headers['Content-Length'] = Buffer.byteLength(data);
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const r = http.request({ hostname: HOST, port: PORT, path, method, headers }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (c) => buf += c);
      res.on('end', () => {
        let bodyParsed = null;
        if (buf) {
          try { bodyParsed = JSON.parse(buf); } catch (e) { bodyParsed = buf; }
        }
        const out = { status: res.statusCode, body: bodyParsed, durationMs: Date.now() - start };
        resolve(out);
      });
    });
    r.on('error', (err) => reject(err));
    if (data) r.write(data);
    r.end();
  });
}

const results = [];
function record(name, res) {
  const entry = { name, timestamp: new Date().toISOString(), status: res && res.status, durationMs: res && res.durationMs, body: res && res.body };
  results.push(entry);
  console.log(`\n== ${name} (${entry.status}) [${entry.durationMs}ms] ==`);
  console.log(JSON.stringify(entry.body, null, 2));
}

(async () => {
  console.log('Using DB:', DB_FILE);
  // wait for server to be ready (health) with retries
  async function waitForHealth(retries = 10, delay = 500) {
    for (let i = 0; i < retries; i++) {
      try {
        const h = await req('GET', '/api/health');
        if (h.status === 200) return true;
      } catch (e) {
        // ignore and retry
      }
      await new Promise(r => setTimeout(r, delay));
    }
    throw new Error('server not responding on /api/health');
  }

  await waitForHealth();
  const db = require('./src/db');
  // create unique test identifiers for this run
  const runId = Date.now();
  const adminEmail = `admin+${runId}@local`;
  const userEmail = `user+${runId}@local`;
  const adminPass = 'adminpass';
  const hash = bcrypt.hashSync(adminPass, 10);

  // track created resources for cleanup
  const created = { users: [], shifts: [] };

  // insert admin user for this run using knex
  try {
    const exists = await db.knex('users').where({ email: adminEmail }).first();
    if (!exists) {
      await db.knex('users').insert({ email: adminEmail, password_hash: hash, display_name: 'Admin E2E', role: 'admin' });
      created.users.push(adminEmail);
    }
  } catch (err) {
    console.error('DB insert admin error', err);
    process.exit(1);
  }
  console.log('Admin ensured:', adminEmail);

  // Health
  console.log('\n1) Health check');
  const r1 = await req('GET', '/api/health');
  record('Health check', r1);

  // Admin login
  console.log('\n2) Admin login');
  const login = await req('POST', '/api/auth/login', { email: adminEmail, password: adminPass });
  record('Admin login', login);
  const adminToken = login.body && login.body.token;
  if (!adminToken) return console.error('Admin login failed');

  // Create shift
  console.log('\n3) Create shift');
  const create = await req('POST', '/api/shifts', { title: `E2E Shift ${runId}`, start_time: '2025-12-01T08:00:00Z', end_time: '2025-12-01T10:00:00Z', capacity: 1 }, adminToken);
  record('Create shift', create);
  const shiftId = create.body && create.body.shift && create.body.shift.id;
  if (shiftId) created.shifts.push(shiftId);
  if (!shiftId) return console.error('Shift create failed');

  // Register normal user
  console.log('\n4) Register user');
  const reg = await req('POST', '/api/auth/register', { email: userEmail, password: 'pw1234', display_name: `User E2E ${runId}` });
  // ignore duplicate-user error to make the script idempotent
  if (reg.status === 201) {
    record('Register user', reg);
  } else if (reg.status === 400 && reg.body && typeof reg.body.error === 'string' && reg.body.error.toLowerCase().includes('unique')) {
    record('Register user (already exists)', reg);
  } else {
    record('Register user (other)', reg);
  }

  // Login user
  console.log('\n5) User login');
  const ulogin = await req('POST', '/api/auth/login', { email: userEmail, password: 'pw1234' });
  record('User login', ulogin);
  const userToken = ulogin.body && ulogin.body.token;
  if (!userToken) return console.error('User login failed');

  // Signup for shift
  console.log('\n6) Signup for shift');
  const signup = await req('POST', `/api/shifts/${shiftId}/signups`, null, userToken);
  record('Signup for shift', signup);

  // Check shift
  console.log('\n7) Shift detail');
  const detail = await req('GET', `/api/shifts/${shiftId}`);
  record('Shift detail', detail);
  // 8) List shifts (public)
  console.log('\n8) Public list shifts');
  const list = await req('GET', '/api/shifts');
  record('Public list shifts', list);

  // 9) GET /api/auth/me for user and admin
  console.log('\n9) GET /api/auth/me for admin');
  const meAdmin = await req('GET', '/api/auth/me', null, adminToken);
  record('GET /api/auth/me (admin)', meAdmin);
  console.log('\n9b) GET /api/auth/me for user');
  const meUser = await req('GET', '/api/auth/me', null, userToken);
  record('GET /api/auth/me (user)', meUser);

  // 10) Duplicate signup attempt by same user -> expect 409 or constraint
  console.log('\n10) Duplicate signup attempt');
  const dup = await req('POST', `/api/shifts/${shiftId}/signups`, null, userToken);
  record('Duplicate signup attempt', dup);

  // 11) List participants (admin)
  console.log('\n11) List participants (admin)');
  const parts = await req('GET', `/api/shifts/${shiftId}/participants`, null, adminToken);
  record('List participants', parts);

  // 12) Soft-delete the shift and verify it's removed from public list
  console.log('\n12) Soft-delete shift (admin)');
  const del = await req('DELETE', `/api/shifts/${shiftId}`, null, adminToken);
  record('Soft-delete shift', del);
  console.log('\n12b) Public list shifts after delete');
  const list2 = await req('GET', '/api/shifts');
  record('Public list shifts after delete', list2);

  // write results into file
  const outFile = path.join(__dirname, 'e2e-results.json');
  try {
    fs.writeFileSync(outFile, JSON.stringify({ runAt: new Date().toISOString(), results }, null, 2));
    console.log('\nWrote results to', outFile);
  } catch (e) {
    console.error('Failed to write results file', e);
  }

  // summary
  const successCount = results.filter(r => r.status && r.status < 400).length;
  const failCount = results.filter(r => !r.status || r.status >= 400).length;
  console.log(`\nSummary: ${successCount} successes, ${failCount} failures (total ${results.length})`);
  // cleanup created resources (hard delete) via knex
  try {
    if (created.shifts && created.shifts.length) {
      await db.knex('signups').whereIn('shift_id', created.shifts).del().catch(e => console.error('cleanup signups', e));
      await db.knex('shifts').whereIn('id', created.shifts).del().catch(e => console.error('cleanup shifts', e));
    }
    if (created.users && created.users.length) {
      await db.knex('users').whereIn('email', created.users).del().catch(e => console.error('cleanup users', e));
    }
    console.log('Cleanup completed for run', runId);
    await db.close();
  } catch (e) {
    console.error('Cleanup failed', e);
  }

  process.exit(0);
})();
