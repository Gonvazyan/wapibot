const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ status: 'active', version: '1.0.0' });
});

module.exports = router;