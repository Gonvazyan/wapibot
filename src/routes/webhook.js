const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const verifyWebhookSignature = require('../middleware/webhookSignature');

// GET: Verificación del webhook por Meta
router.get('/', webhookController.verify);

// POST: Recibe mensajes entrantes de WhatsApp (firma verificada)
router.post('/', verifyWebhookSignature, webhookController.handleMessage);

module.exports = router;