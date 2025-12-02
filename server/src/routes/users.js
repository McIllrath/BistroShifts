const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const bcrypt = require('bcryptjs');

// GET /api/users - admin only
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const users = await db.knex.select('id', 'email', 'display_name', 'role', 'is_active').from('users').orderBy('id', 'asc');
    res.json({ users });
  } catch (err) {
    console.error('list users err', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - create a new user (admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const { email, password, display_name, role } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  if (role && !['user', 'admin'].includes(role)) return res.status(400).json({ error: 'invalid role' });
  const knex = db.knex;
  try {
    const existing = await knex('users').where({ email }).first();
    if (existing) return res.status(400).json({ error: 'email already exists' });
    const password_hash = password ? bcrypt.hashSync(password, 10) : null;
    let created;
    await knex.transaction(async (trx) => {
      const payload = { email, password_hash, display_name: display_name || null, role: role || 'user', is_active: 1 };
      const ids = await trx('users').insert(payload);
      const id = Array.isArray(ids) ? ids[0] : ids;
      created = await trx('users').where({ id }).first();
      await trx('audit_logs').insert({
        actor_id: req.user && req.user.userId ? req.user.userId : null,
        action_type: 'create_user',
        entity_type: 'user',
        entity_id: created.id,
        payload: JSON.stringify({ email: created.email, display_name: created.display_name, role: created.role })
      });
    });
    res.status(201).json({ user: { id: created.id, email: created.email, display_name: created.display_name, role: created.role } });
  } catch (err) {
    console.error('create user err', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - delete a user (admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  const knex = db.knex;
  try {
    const existing = await knex('users').where({ id }).first();
    if (!existing) return res.status(404).json({ error: 'user not found' });
    // Prevent admins from deleting themselves accidentally
    if (req.user && req.user.userId === id) return res.status(400).json({ error: 'cannot delete yourself' });
    await knex.transaction(async (trx) => {
      await trx('users').where({ id }).del();
      await trx('audit_logs').insert({
        actor_id: req.user && req.user.userId ? req.user.userId : null,
        action_type: 'delete_user',
        entity_type: 'user',
        entity_id: id,
        payload: JSON.stringify({ email: existing.email, display_name: existing.display_name, role: existing.role })
      });
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('delete user err', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id/role - admin only
router.patch('/:id/role', authMiddleware, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body || {};
  if (!id || !['user', 'admin'].includes(role)) return res.status(400).json({ error: 'invalid request' });
  const knex = db.knex;
  try {
    const existing = await knex('users').where({ id }).first();
    if (!existing) return res.status(404).json({ error: 'user not found' });
    await knex.transaction(async (trx) => {
      await trx('users').where({ id }).update({ role });
      await trx('audit_logs').insert({
        actor_id: req.user && req.user.userId ? req.user.userId : null,
        action_type: 'update_role',
        entity_type: 'user',
        entity_id: id,
        payload: JSON.stringify({ before: existing.role || null, after: role })
      });
    });
    const updated = await knex('users').where({ id }).first();
    res.json({ user: { id: updated.id, email: updated.email, display_name: updated.display_name, role: updated.role } });
  } catch (err) {
    console.error('update role err', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
