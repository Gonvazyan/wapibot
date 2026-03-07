const axios = require('axios');

const BASE_URL = 'https://graph.facebook.com/v18.0';
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const TOKEN    = process.env.WHATSAPP_TOKEN;

const api = axios.create({
  baseURL: `${BASE_URL}/${PHONE_ID}/messages`,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  }
});

// Enviar mensaje de texto simple
exports.sendText = async (to, text) => {
  return api.post('', {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  });
};

// Enviar botones (máx 3)
exports.sendButtons = async (to, bodyText, buttons) => {
  return api.post('', {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map(btn => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title }
        }))
      }
    }
  });
};