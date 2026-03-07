const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// GET: Verificación del webhook por Meta
router.get('/', webhookController.verify);

// POST: Recibe mensajes entrantes de WhatsApp
router.post('/', webhookController.handleMessage);

module.exports = router;