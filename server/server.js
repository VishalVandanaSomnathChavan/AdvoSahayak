const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { pool, isDatabaseReady } = require('./db/pool');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random value of at least 32 characters.');
  process.exit(1);
}

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(origin => origin.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  req.body ||= {};
  next();
});

app.get('/api/health', async (req, res) => {
  const connected = await isDatabaseReady();
  return res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'database_unavailable',
    database: connected ? 'connected' : 'disconnected',
    engine: 'mysql',
  });
});

const authRoutes = require('./routes/authRoutes');
const authenticate = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', authenticate);
app.use('/api/cases', require('./routes/caseRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/reminders', require('./routes/reminderRoutes'));
app.use('/api/ai', aiLimiter, require('./routes/aiRoutes'));
app.use('/api/activity', require('./routes/activityRoutes'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));
const clientBuild = path.resolve(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild, { index: false, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.get(/^(?!\/api\/).*/, (req, res, next) => {
  res.sendFile(path.join(clientBuild, 'index.html'), error => {
    if (error) next();
  });
});
app.use(errorHandler);

if (require.main === module) {
  const server = app.listen(PORT, () => console.log(`AdvoSahayak API listening on port ${PORT}`));

  function shutdown() {
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
