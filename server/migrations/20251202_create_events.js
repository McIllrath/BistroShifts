exports.up = function(knex) {
  return knex.schema.createTable('events', table => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.boolean('members_only').notNullable().defaultTo(false);
    table.datetime('start_time').notNullable();
    table.datetime('end_time').notNullable();
    table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.string('status').notNullable().defaultTo('pending'); // pending, approved, rejected
    table.text('admin_notes'); // Notizen vom Admin
    table.integer('approved_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.datetime('approved_at');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true); // created_at, updated_at
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('events');
};
