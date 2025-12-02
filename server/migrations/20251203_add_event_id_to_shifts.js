exports.up = function(knex) {
  return knex.schema.table('shifts', table => {
    table.integer('event_id').unsigned().references('id').inTable('events').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.table('shifts', table => {
    table.dropColumn('event_id');
  });
};
