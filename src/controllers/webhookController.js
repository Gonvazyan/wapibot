const botService = require('../services/botService');
const whatsappService = require('../services/whatsappService');

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

exports.handleMessage = async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const value = body.entry?.[0]?.changes?.[0]?.value;

    // Ignorar notificaciones de estado
    if (value?.statuses) return res.sendStatus(200);

    const message = value?.messages?.[0];
    if (!message) return res.sendStatus(200);

    // Ignorar mensajes antiguos
    const messageTime = parseInt(message.timestamp) * 1000;
    if (Date.now() - messageTime > 30000) return res.sendStatus(200);

    const from = message.from;
    const type = message.type;

    console.log(`📩 Mensaje de ${from} | Tipo: ${type}`);

    let messageText;

    if (type === 'text') {
      messageText = message.text.body;
    } else if (type === 'interactive') {
      const reply = message.interactive?.button_reply || message.interactive?.list_reply;
      messageText = reply?.id || reply?.title;
    } else {
      await whatsappService.sendText(from, '👋 Solo proceso texto por ahora. Escríbeme tu consulta.');
      return res.sendStatus(200);
    }

    const response = await botService.processMessage(messageText, from);

    if (response.type === 'buttons') {
      await whatsappService.sendButtons(from, response.body, response.buttons);
    } else {
      await whatsappService.sendText(from, response.body);
    }

    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Error procesando mensaje:', error);
    res.sendStatus(500);
  }
};