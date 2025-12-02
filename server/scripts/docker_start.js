#!/usr/bin/env node
const path = require('path');
const knexLib = require('knex');
const knexfile = require(path.join(__dirname, '..', '..', 'knexfile'));
const env = process.env.NODE_ENV || 'production';
const config = knexfile[env] || knexfile.production;
const knex = knexLib(config);

async function waitForDb(retries = 30, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      // simple query to test connection
      await knex.raw('SELECT 1');
      return;
    } catch (err) {
      console.log('Waiting for DB... attempt', i + 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Timed out waiting for DB');
}

(async () => {
  try {
    console.log('Starting docker entry: waiting for DB');
    await waitForDb(60, 1000);
    console.log('DB reachable, running migrations');
    await knex.migrate.latest();
    console.log('Migrations complete');
    // run seed-all if script exists
    try {
      // Always spawn the seed script so it runs in its own process.
      const { spawnSync } = require('child_process');
      console.log('Running seed script (spawn)');
      spawnSync('node', [path.join(__dirname, 'seed_users_and_shifts.js')], { stdio: 'inherit' });
    } catch (e) {
      console.log('Seed script not run or not present:', e && e.message);
    }

    console.log('Starting server process');
    // start the server (same as `node index.js`)
    require(path.join(__dirname, '..', '..', 'index.js'));
  } catch (err) {
    console.error('docker_start failed', err);
    process.exit(1);
  }
})();
