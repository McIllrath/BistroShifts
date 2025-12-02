exports.up = function(knex) {
  return knex.schema
    .createTableIfNotExists('users', function(table) {
      table.increments('id').primary();
      table.string('email').notNullable().unique();
      table.string('password_hash');
      table.string('display_name');
      table.string('role').defaultTo('user');
      table.integer('is_active').defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTableIfNotExists('shifts', function(table) {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description');
      table.timestamp('start_time').notNullable();
      table.timestamp('end_time').notNullable();
      table.string('location');
      table.integer('capacity').notNullable().defaultTo(1);
      table.integer('created_by').nullable();
      table.integer('is_active').defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.foreign('created_by').references('users.id').onDelete('SET NULL');
    })
    .createTableIfNotExists('signups', function(table) {
      table.increments('id').primary();
      table.integer('shift_id').notNullable();
      table.integer('user_id').notNullable();
      table.string('status').defaultTo('registered');
      table.text('note');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.foreign('shift_id').references('shifts.id').onDelete('CASCADE');
      table.foreign('user_id').references('users.id').onDelete('CASCADE');
      table.unique(['shift_id','user_id']);
    })
    .createTableIfNotExists('audit_logs', function(table) {
      table.increments('id').primary();
      table.integer('actor_id');
      table.string('action_type');
      table.string('entity_type');
      table.integer('entity_id');
      table.text('payload');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('audit_logs')
    .dropTableIfExists('signups')
    .dropTableIfExists('shifts')
    .dropTableIfExists('users');
};
