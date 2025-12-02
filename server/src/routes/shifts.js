const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { sendShiftSignupConfirmation } = require('../email');

// GET /api/shifts - public list of active shifts
router.get('/', (req, res) => {
  // include registered_count per shift to allow clients to show remaining slots
  const knex = db.knex;
  // use raw SQL subquery to preserve registered_count behavior across engines
  knex.raw(`SELECT s.*, (
    SELECT COUNT(*) FROM signups WHERE signups.shift_id = s.id AND status = 'registered'
  ) as registered_count
  FROM shifts s WHERE is_active=1 ORDER BY start_time ASC`).then((result) => {
    // knex.raw result shape differs by client: sqlite returns rows, pg returns { rows }
    const rows = result && (result.rows || result);
    const out = (rows || []).map(r => ({ ...r, registered_count: Number(r.registered_count || 0), capacity: Number(r.capacity) }));
    res.json({ items: out });
  }).catch((err) => res.status(500).json({ error: err.message }));
});

// GET /api/shifts/:id - shift detail with registered_count
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const knex = db.knex;
  (async () => {
    try {
      const row = await knex('shifts').where({ id }).first();
      if (!row) return res.status(404).json({ error: 'not found' });
      const cntRow = await knex('signups').where({ shift_id: id, status: 'registered' }).count({ cnt: 'id' });
      const registered = (cntRow && (cntRow[0] ? Number(cntRow[0].cnt || cntRow[0].count || 0) : Number(cntRow.cnt || 0))) || 0;
      row.registered_count = registered;
      res.json({ shift: row });
    } catch (err) {
      console.error('get shift err', err);
      res.status(500).json({ error: err.message });
    }
  })();
});

// POST /api/shifts/:id/signups - protected endpoint; create signup transactionally
router.post('/:id/signups', authMiddleware, (req, res) => {
  const shiftId = req.params.id;
  const userId = req.user && req.user.userId;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const knex = db.knex;
  (async () => {
    try {
      // Ensure shift exists and is active
      const shift = await knex('shifts').where({ id: shiftId, is_active: 1 }).first();
      if (!shift) return res.status(404).json({ error: 'shift not found' });

      // Perform an atomic insert-if-room using a single SQL statement to avoid transaction/locking issues on sqlite
      if (knex.client.config.client === 'pg') {
        const sql = `INSERT INTO signups (shift_id, user_id)
          SELECT ?, ?
          WHERE (SELECT COUNT(*) FROM signups WHERE shift_id = ? AND status = 'registered') < (SELECT capacity FROM shifts WHERE id = ? AND is_active = 1)
          RETURNING id`;
        const result = await knex.raw(sql, [shiftId, userId, shiftId, shiftId]);
        const rows = result && (result.rows || result);
        if (!rows || rows.length === 0) return res.status(409).json({ error: 'shift full' });
        const insertedId = Array.isArray(rows) ? rows[0].id || rows[0] : rows[0].id || rows[0];
        return res.status(201).json({ id: insertedId, shift_id: shiftId, user_id: userId });
      } else {
        const sql = `INSERT INTO signups (shift_id, user_id)
          SELECT ?, ?
          WHERE (SELECT COUNT(*) FROM signups WHERE shift_id = ? AND status = 'registered') < (SELECT capacity FROM shifts WHERE id = ? AND is_active = 1)`;
        await knex.raw(sql, [shiftId, userId, shiftId, shiftId]);
        // check whether insert happened by reading last_insert_rowid
        const idRes = await knex.raw('SELECT last_insert_rowid() as id');
        const rows = idRes && (idRes.rows || idRes);
        const insertedId = rows && (rows[0] ? rows[0].id : rows.id);
        if (!insertedId) return res.status(409).json({ error: 'shift full or insert failed' });
        
        // Send confirmation email (non-blocking)
        const user = await knex('users').where('id', userId).first();
        const { sendShiftSignupConfirmation } = require('../email');
        sendShiftSignupConfirmation(user, shift).catch(err => console.error('Shift signup email failed:', err));
        
        return res.status(201).json({ id: insertedId, shift_id: shiftId, user_id: userId });
      }
    } catch (err) {
      if (err && (err.code === 'SQLITE_CONSTRAINT' || err.code === '23505')) {
        return res.status(409).json({ error: 'already signed up or constraint violation' });
      }
      console.error('signup err', err);
      return res.status(500).json({ error: err.message || 'internal error' });
    }
  })();
});

module.exports = router;

// --- Admin endpoints ---
// POST /api/shifts - create shift (admin)
const { validateShiftPayload } = require('../validators')
router.post('/', require('../middleware/auth'), require('../middleware/requireRole')('admin'), (req, res) => {
  const v = validateShiftPayload(req.body)
  if (!v.ok) return res.status(400).json({ error: 'validation', details: v.errors })
  const payload = v.data
    const knex = db.knex;
    (async () => {
      try {
        if (knex.client.config.client === 'pg') {
          const rows = await knex('shifts').insert({
            title: payload.title,
            description: payload.description,
            start_time: payload.start_time,
            end_time: payload.end_time,
            location: payload.location,
            capacity: payload.capacity,
            created_by: req.user && req.user.userId || null,
          }).returning('id');
          const insertedId = Array.isArray(rows) ? rows[0] : rows;
          const newShift = await knex('shifts').where({ id: insertedId }).first();
          return res.status(201).json({ shift: newShift });
        } else {
          const ids = await knex('shifts').insert({
            title: payload.title,
            description: payload.description,
            start_time: payload.start_time,
            end_time: payload.end_time,
            location: payload.location,
            capacity: payload.capacity,
            created_by: req.user && req.user.userId || null,
          });
          const insertedId = ids && ids[0];
          const newShift = await knex('shifts').where({ id: insertedId }).first();
          return res.status(201).json({ shift: newShift });
        }
      } catch (err) {
        console.error('create shift err', err);
        return res.status(400).json({ error: err.message || 'failed to create shift' });
      }
    })();
});

// PUT /api/shifts/:id - update shift (admin)
router.put('/:id', require('../middleware/auth'), require('../middleware/requireRole')('admin'), (req, res) => {
  const id = req.params.id;
  const knex = db.knex;
  (async () => {
    try {
      const shift = await knex('shifts').where({ id }).first();
      if (!shift) return res.status(404).json({ error: 'not found' });

      // Merge existing values with provided ones for validation
      const merged = {
        title: req.body.title !== undefined ? req.body.title : shift.title,
        description: req.body.description !== undefined ? req.body.description : shift.description,
        start_time: req.body.start_time !== undefined ? req.body.start_time : shift.start_time,
        end_time: req.body.end_time !== undefined ? req.body.end_time : shift.end_time,
        location: req.body.location !== undefined ? req.body.location : shift.location,
        capacity: req.body.capacity !== undefined ? req.body.capacity : shift.capacity
      }

      const v = validateShiftPayload(merged)
      if (!v.ok) return res.status(400).json({ error: 'validation', details: v.errors })
      const payload = v.data

      const is_active = req.body.is_active !== undefined ? (Number(req.body.is_active) ? 1 : 0) : shift.is_active

      if (knex.client.config.client === 'pg') {
        await knex('shifts').where({ id }).update({
          title: payload.title,
          description: payload.description,
          start_time: payload.start_time,
          end_time: payload.end_time,
          location: payload.location,
          capacity: payload.capacity,
          is_active: is_active,
        }).returning('id');
      } else {
        await knex('shifts').where({ id }).update({
          title: payload.title,
          description: payload.description,
          start_time: payload.start_time,
          end_time: payload.end_time,
          location: payload.location,
          capacity: payload.capacity,
          is_active: is_active,
        });
      }

      const newShift = await knex('shifts').where({ id }).first();
      return res.json({ shift: newShift });
    } catch (err) {
      console.error('update shift err', err);
      return res.status(400).json({ error: err.message || 'failed to update shift' });
    }
  })();
});

// DELETE /api/shifts/:id - soft-delete shift (admin)
router.delete('/:id', require('../middleware/auth'), require('../middleware/requireRole')('admin'), (req, res) => {
  const id = req.params.id;
  const knex = db.knex;
  (async () => {
    try {
      const shift = await knex('shifts').where({ id }).first();
      if (!shift) return res.status(404).json({ error: 'not found' });
      await knex('shifts').where({ id }).update({ is_active: 0 });
      return res.status(204).end();
    } catch (err) {
      console.error('delete shift err', err);
      return res.status(500).json({ error: err.message || 'failed to delete shift' });
    }
  })();
});

// GET /api/shifts/:id/participants - list participants (admin)
router.get('/:id/participants', require('../middleware/auth'), require('../middleware/requireRole')('admin'), (req, res) => {
  const id = req.params.id;
  const knex = db.knex;
  knex('signups as s')
    .join('users as u', 's.user_id', 'u.id')
    .select('s.id as signup_id', 's.shift_id', 'u.id as user_id', 'u.email', 'u.display_name', 's.status', 's.created_at')
    .where('s.shift_id', id)
    .orderBy('s.created_at', 'asc')
    .then((rows) => res.json({ participants: rows }))
    .catch((err) => res.status(500).json({ error: err.message }));
});

// DELETE /api/shifts/:id/participants/:signupId - admin removes a participant (mark cancelled)
router.delete('/:id/participants/:signupId', require('../middleware/auth'), require('../middleware/requireRole')('admin'), (req, res) => {
  const id = req.params.id;
  const signupId = req.params.signupId;
  const knex = db.knex;
  (async () => {
    try {
      const signup = await knex('signups').where({ id: signupId, shift_id: id }).first();
      if (!signup) return res.status(404).json({ error: 'signup not found' });

      // mark as cancelled to keep an audit trail
      await knex('signups').where({ id: signupId }).update({ status: 'cancelled' });

      // record audit log
      try {
        await knex('audit_logs').insert({
          actor_id: req.user && req.user.userId || null,
          action_type: 'remove_signup',
          entity_type: 'signup',
          entity_id: signupId,
          payload: JSON.stringify({ shift_id: id, user_id: signup.user_id })
        });
      } catch (e) {
        console.warn('failed to write audit log', e && e.message);
      }

      return res.status(204).end();
    } catch (err) {
      console.error('remove participant err', err);
      return res.status(500).json({ error: err.message || 'failed to remove participant' });
    }
  })();
});
