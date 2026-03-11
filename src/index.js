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

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/webhook', webhookRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({ 
    status: '✅ WapiBot corriendo',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Error handler middleware should be placed after all route handlers
app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message });
});
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 WapiBot corriendo en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});

// Exporting app for testing purposes (e.g., with supertest)
module.exports = app;