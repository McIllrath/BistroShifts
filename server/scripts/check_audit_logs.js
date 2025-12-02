const knex = require('knex')(require('../knexfile.js').development);

async function checkAuditLogs() {
  try {
    const info = await knex('audit_logs').columnInfo();
    console.log('Columns in audit_logs table:');
    Object.keys(info).forEach(col => console.log(`  - ${col}: ${info[col].type}`));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await knex.destroy();
  }
}

checkAuditLogs();
