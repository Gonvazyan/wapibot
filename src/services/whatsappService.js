const axios = require('axios');

const BASE_URL = 'https://graph.facebook.com/v25.0';

const getApi = () => {
  const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
  const TOKEN    = process.env.WHATSAPP_TOKEN;

  return axios.create({
    baseURL: `${BASE_URL}/${PHONE_ID}/messages`,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    }
  });
};

exports.sendText = async (to, text) => {
  try {
    const api = getApi();
    return await api.post('', {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    });
  } catch (error) {
    console.error('❌ Error sendText:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
};

exports.sendButtons = async (to, bodyText, buttons) => {
  try {
    const api = getApi();
    return await api.post('', {
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
  } catch (error) {
    console.error('❌ Error sendButtons:', JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
};