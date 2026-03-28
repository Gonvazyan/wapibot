const crypto = require('crypto');

function verifyWebhookSignature(req, res, next) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // Si no hay APP_SECRET configurado, se omite la verificación (dev mode)
  if (!appSecret) {
    console.warn('⚠️  WHATSAPP_APP_SECRET no configurado — verificación de firma desactivada');
    return next();
  }

  const sig = req.headers['x-hub-signature-256'];
  if (!sig) {
    console.warn('❌ Webhook sin firma X-Hub-Signature-256');
    return res.sendStatus(403);
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody)
    .digest('hex');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      console.warn('❌ Firma de webhook inválida');
      return res.sendStatus(403);
    }
  } catch {
    return res.sendStatus(403);
  }

  next();
}

module.exports = verifyWebhookSignature;
