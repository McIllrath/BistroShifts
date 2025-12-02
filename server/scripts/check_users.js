const knex = require('knex')(require('../knexfile.js').development);

async function checkUsers() {
  try {
    const users = await knex('users').select('id', 'email', 'display_name', 'role', 'is_active');
    console.log(`\nUsers in database: ${users.length}`);
    users.forEach(u => {
      console.log(`  - ${u.email} | ${u.display_name || '(no name)'} | Role: ${u.role} | Active: ${u.is_active ? 'Yes' : 'No'}`);
    });
    
    const events = await knex('events').count('* as count').first();
    console.log(`\nEvents in database: ${events.count}`);
    
    const shifts = await knex('shifts').count('* as count').first();
    console.log(`Shifts in database: ${shifts.count}`);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await knex.destroy();
  }
}

checkUsers();
