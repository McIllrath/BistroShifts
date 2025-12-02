const path = require('path');

// Single SQLite database for all environments
const config = {
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, '..', 'db', 'database.sqlite')
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'migrations')
  }
};

module.exports = {
  development: config,
  production: config
};
