require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const webhookRoutes = require('./routes/webhook');
const botRoutes = require('./routes/bot');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ──────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas ────────────────────────────────────────────
app.use('/webhook', webhookRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/admin', adminRoutes);

// ── Health check ─────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ 
    status: '✅ WapiBot corriendo',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ── Error handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 WapiBot corriendo en http://localhost:${PORT}`);
});

module.exports = app;