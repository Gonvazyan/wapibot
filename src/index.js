require('express-async-errors');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const webhookRoutes = require('./routes/webhook');
const botRoutes = require('./routes/bot');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas ────────────────────────────────────────────
app.use('/webhook', webhookRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/admin', adminRoutes);

// ── Comprobación de salud ─────────────────────────────
app.get('/', (req, res) => {
  res.json({ 
    estado: '✅ WapiBot corriendo',
    version: '1.0.0',
    marcaDeTiempo: new Date().toISOString()
  });
});

// ── Manejador de errores ─────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message });
});
app.listen(PORT, () => {
  console.log(`🚀 WapiBot corriendo en http://localhost:${PORT}`);
});

// Exporting app for testing purposes (e.g., with supertest)
module.exports = app;