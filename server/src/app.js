require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Security headers
app.use(helmet());

// Basic rate limiting
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 200, // limit each IP to 200 requests per windowMs
	standardHeaders: true,
	legacyHeaders: false
});

app.use(cors());
app.use(bodyParser.json());

// apply to all /api routes
app.use('/api', apiLimiter);

// Simple health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Mount API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/events', require('./routes/events'));

// Serve built client from server/public (production build goes here)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SPA fallback: serve index.html for non-API routes
app.get('*', (req, res, next) => {
	if (req.path.startsWith('/api')) return next();
	res.sendFile(path.join(publicDir, 'index.html'), (err) => {
		if (err) next();
	});
});

module.exports = app;
