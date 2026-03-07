const botService = require('../services/botService');
const whatsappService = require('../services/whatsappService');

// Verificación del webhook por Meta
exports.verify = (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado correctamente');
    return res.status(200).send(challenge);
  }

  console.warn('❌ Verificación fallida - token incorrecto');
  return res.sendStatus(403);
};

// Recibe y procesa mensajes entrantes
exports.handleMessage = async (req, res) => {
  try {
    const body    = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from;
    const type = message.type;

    console.log(`📩 Mensaje de ${from} | Tipo: ${type}`);

    if (type === 'text') {
      await botService.processTextMessage(from, message.text.body);
    } else if (type === 'interactive') {
      const reply = message.interactive?.button_reply || message.interactive?.list_reply;
      await botService.processInteractiveMessage(from, reply?.id, reply?.title);
    } else {
      await whatsappService.sendText(from, '👋 Solo proceso texto por ahora. Escríbeme tu consulta.');
    }

    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Error procesando mensaje:', error);
    res.sendStatus(500);
  }
};