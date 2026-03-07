const express = require('express');
const router = express.Router();

router.get('/config', (req, res) => {
  res.json({ message: '🔧 Panel de configuración — próximamente' });
});

router.post('/config', (req, res) => {
  res.json({ message: '✅ Configuración actualizada — próximamente' });
});

module.exports = router;