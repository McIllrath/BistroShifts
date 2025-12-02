const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail } = require('../email');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, display_name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const password_hash = bcrypt.hashSync(password, 10);
  const knex = db.knex;
  const payload = { email, password_hash, display_name: display_name || null };
  // Use returning on Postgres, fallback to selecting the created row for sqlite
  if (knex.client.config.client === 'pg') {
    knex('users').insert(payload).returning(['id', 'email', 'display_name']).then((rows) => {
      const user = Array.isArray(rows) ? rows[0] : rows;
      res.status(201).json({ user });
    }).catch((err) => {
      res.status(400).json({ error: err.message });
    });
  } else {
    knex('users').insert(payload).then((ids) => {
      const id = ids && ids[0];
      knex('users').where({ id }).first().then((user) => {
        // Send welcome email (non-blocking)
        sendWelcomeEmail(user).catch(err => console.error('Welcome email failed:', err));
        res.status(201).json({ user });
      }).catch((e) => res.status(500).json({ error: e.message }));
    }).catch((err) => {
      res.status(400).json({ error: err.message });
    });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const knex = db.knex;
  (async () => {
    try {
      const user = await knex('users').where({ email }).first();
      if (!user) return res.status(401).json({ error: 'invalid credentials' });
      if (!user.password_hash) return res.status(400).json({ error: 'no password set for user' });
      const ok = bcrypt.compareSync(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'invalid credentials' });
      const token = jwt.sign({ userId: user.id, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role } });
    } catch (err) {
      console.error('login err', err);
      res.status(500).json({ error: err.message });
    }
  })();
});

// GET /api/auth/me
const authMiddleware = require('../middleware/auth');
router.get('/me', authMiddleware, (req, res) => {
  const userId = req.user && req.user.userId;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const knex = db.knex;
  (async () => {
    try {
      const user = await knex('users').where({ id: userId }).first();
      if (!user) return res.status(404).json({ error: 'user not found' });
      res.json({ user });
    } catch (err) {
      console.error('me err', err);
      res.status(500).json({ error: err.message });
    }
  })();
});

module.exports = router;
