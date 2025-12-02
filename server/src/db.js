const path = require('path');
require('dotenv').config();
const knexLib = require('knex');

// Always use SQLite - single database for all environments
const dbFile = path.join(__dirname, '..', '..', 'db', 'database.sqlite');
const knexConfig = {
  client: 'sqlite3',
  connection: { filename: dbFile },
  useNullAsDefault: true,
    pool: {
      min: 1,
      max: 5,
      acquireTimeoutMillis: 60000,
      afterCreate: (conn, cb) => {
        // set busy timeout to reduce SQLITE_BUSY during concurrent writes
        try {
          conn.run('PRAGMA busy_timeout = 5000', (err) => cb(err, conn));
        } catch (e) {
          // fallback: still callback
          cb(null, conn);
        }
      }
    }
};

const knex = knexLib(knexConfig);
const isSqlite = true; // Always SQLite

function extractRows(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.rows) return res.rows;
  if (res[0]) return res[0];
  return [];
}

const db = {
  knex,
  // emulate sqlite3#get
  get(sql, params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    knex.raw(sql, params).then((res) => {
      const rows = extractRows(res);
      cb && cb(null, rows && rows[0]);
    }).catch(err => cb && cb(err));
  },

  // emulate sqlite3#all
  all(sql, params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    knex.raw(sql, params).then((res) => {
      const rows = extractRows(res);
      cb && cb(null, rows);
    }).catch(err => cb && cb(err));
  },

  // emulate sqlite3#run - no this.lastID/chages by default
  run(sql, params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    knex.raw(sql, params).then((res) => {
      // For sqlite, try to expose lastID for inserts
      if (isSqlite && /^\s*insert/i.test(sql)) {
        return knex.raw('SELECT last_insert_rowid() as id').then(r => {
          const rows = extractRows(r);
          const id = rows && rows[0] && rows[0].id;
          if (cb) cb.call({ lastID: id }, null);
        }).catch(e => cb && cb(e));
      }
      if (cb) cb(null);
    }).catch(err => cb && cb(err));
  },

  // emulate sqlite3#prepare(stmt)
  prepare(sql) {
    return {
      run: function() {
        const args = Array.from(arguments);
        const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        const params = args;
        knex.raw(sql, params).then((res) => {
          if (isSqlite && /^\s*insert/i.test(sql)) {
            return knex.raw('SELECT last_insert_rowid() as id').then(r => {
              const rows = extractRows(r);
              const id = rows && rows[0] && rows[0].id;
              if (cb) cb.call({ lastID: id }, null);
            }).catch(e => cb && cb(e));
          }
          if (cb) cb(null);
        }).catch(err => cb && cb(err));
      }
    };
  },

  serialize(fn) { if (fn) fn(); },

  close(cb) { knex.destroy().then(() => cb && cb()).catch(e => cb && cb(e)); }
};

module.exports = db;
