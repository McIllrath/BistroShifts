const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { sendEventStatusNotification, sendNewEventNotificationToAdmins } = require('../email');

// User: Event-Antrag erstellen
router.post('/', auth, async (req, res) => {
  const { title, description, members_only, start_time, end_time } = req.body;
  if (!title || !start_time || !end_time) {
    return res.status(400).json({ error: 'title, start_time und end_time sind erforderlich' });
  }

  try {
    const [id] = await db.knex('events').insert({
      title,
      description,
      members_only: members_only ? 1 : 0,
      start_time: new Date(start_time).toISOString(),
      end_time: new Date(end_time).toISOString(),
      created_by: req.user.id,
      status: 'pending',
      is_active: 1
    });

    await db.knex('audit_logs').insert({
      actor_id: req.user.id,
      action_type: 'event_create',
      entity_type: 'event',
      entity_id: id,
      payload: JSON.stringify({ title })
    });

    // Notify admins about new event proposal (non-blocking)
    const admins = await db.knex('users').where('role', 'admin').select('email');
    const adminEmails = admins.map(a => a.email);
    if (adminEmails.length > 0) {
      const creator = await db.knex('users').where('id', req.user.id).first();
      const eventData = { title, description, members_only, start_time, end_time };
      const { sendNewEventNotificationToAdmins } = require('../email');
      sendNewEventNotificationToAdmins(adminEmails, eventData, creator).catch(err => console.error('Admin notification failed:', err));
    }

    res.json({ event: { id, title, status: 'pending' } });
  } catch (err) {
    console.error('Event create error', err);
    res.status(500).json({ error: 'Event-Erstellung fehlgeschlagen' });
  }
});

// Alle Events auflisten
// Öffentlich: zeigt nur approved events
// Authenticated: User sieht approved + eigene, Admin sieht alle
router.get('/', async (req, res) => {
  try {
    // Check if user is authenticated (optional auth)
    const authHeader = req.headers.authorization;
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await db.knex('users').where({ id: decoded.userId }).first();
      } catch (e) {
        // Invalid token, treat as public access
      }
    }

    let query = db.knex('events')
      .select('events.*', 'users.display_name as creator_name', 'users.email as creator_email')
      .leftJoin('users', 'events.created_by', 'users.id')
      .where('events.is_active', 1);

    if (!user) {
      // Public access: only approved events
      query = query.where('events.status', 'approved');
    } else if (user.role !== 'admin') {
      // User sieht nur genehmigte Events + eigene
      query = query.where(function() {
        this.where('events.status', 'approved').orWhere('events.created_by', user.id);
      });
    }
    // Admin sees all active events

    const events = await query.orderBy('events.start_time', 'asc');
    res.json({ events });
  } catch (err) {
    console.error('List events error', err);
    res.status(500).json({ error: 'Event-Liste konnte nicht geladen werden' });
  }
});

// Event-Details abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    const event = await db.knex('events')
      .select('events.*', 'users.display_name as creator_name', 'users.email as creator_email')
      .leftJoin('users', 'events.created_by', 'users.id')
      .where('events.id', req.params.id)
      .first();

    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

    // Prüfe Berechtigung
    if (req.user.role !== 'admin' && event.created_by !== req.user.id && event.status !== 'approved') {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    res.json({ event });
  } catch (err) {
    console.error('Get event error', err);
    res.status(500).json({ error: 'Event konnte nicht geladen werden' });
  }
});

// Admin: Event genehmigen oder ablehnen
router.patch('/:id/status', auth, requireRole('admin'), async (req, res) => {
  const { status, admin_notes } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status muss "approved" oder "rejected" sein' });
  }

  try {
    const event = await db.knex('events').where('id', req.params.id).first();
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

    await db.knex('events').where('id', req.params.id).update({
      status,
      admin_notes,
      approved_by: req.user.id,
      approved_at: new Date().toISOString()
    });

    await db.knex('audit_logs').insert({
      actor_id: req.user.id,
      action_type: 'event_status_change',
      entity_type: 'event',
      entity_id: parseInt(req.params.id),
      payload: JSON.stringify({ status, admin_notes })
    });

    // Send notification to event creator (non-blocking)
    const creator = await db.knex('users').where('id', event.created_by).first();
    if (creator) {
      const { sendEventStatusNotification } = require('../email');
      sendEventStatusNotification(creator, event, status, admin_notes).catch(err => console.error('Event status email failed:', err));
    }

    res.json({ ok: true, status });
  } catch (err) {
    console.error('Event status change error', err);
    res.status(500).json({ error: 'Status-Änderung fehlgeschlagen' });
  }
});

// Admin: Event bearbeiten
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const { title, description, members_only, start_time, end_time } = req.body;

  try {
    const event = await db.knex('events').where('id', req.params.id).first();
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

    await db.knex('events').where('id', req.params.id).update({
      title: title || event.title,
      description: description !== undefined ? description : event.description,
      members_only: members_only !== undefined ? (members_only ? 1 : 0) : event.members_only,
      start_time: start_time ? new Date(start_time).toISOString() : event.start_time,
      end_time: end_time ? new Date(end_time).toISOString() : event.end_time
    });

    await db.knex('audit_logs').insert({
      actor_id: req.user.id,
      action_type: 'event_update',
      entity_type: 'event',
      entity_id: parseInt(req.params.id),
      payload: JSON.stringify({ title })
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Event update error', err);
    res.status(500).json({ error: 'Event-Update fehlgeschlagen' });
  }
});

// Admin: Event löschen (soft delete)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const event = await db.knex('events').where('id', req.params.id).first();
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

    await db.knex('events').where('id', req.params.id).update({ is_active: 0 });

    await db.knex('audit_logs').insert({
      actor_id: req.user.id,
      action_type: 'event_delete',
      entity_type: 'event',
      entity_id: parseInt(req.params.id),
      payload: JSON.stringify({ title: event.title })
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Event delete error', err);
    res.status(500).json({ error: 'Event-Löschung fehlgeschlagen' });
  }
});

// Schichten für ein Event abrufen
router.get('/:id/shifts', auth, async (req, res) => {
  try {
    const shifts = await db.knex('shifts')
      .where('event_id', req.params.id)
      .where('is_active', 1)
      .orderBy('start_time', 'asc');

    res.json({ shifts });
  } catch (err) {
    console.error('Event shifts error', err);
    res.status(500).json({ error: 'Schichten konnten nicht geladen werden' });
  }
});

module.exports = router;
