const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

let _openai;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

let _supabase;
function getSupabase() {
  if (!_supabase && process.env.SUPABASE_URL) {
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  }
  return _supabase;
}

const DEFAULT_CONFIG = {
  businessName: "Mi Negocio",
  businessType: "negocio local",
  schedule: "Lunes a Viernes 9:00-18:00",
  phone: "+34 600 000 000",
  address: "Calle Principal 123",
  services: "Consulta nuestra web para más información",
};

async function getBusinessConfig(phoneNumberId) {
  try {
    const sb = getSupabase();
    if (!sb) return DEFAULT_CONFIG;

    const { data, error } = await sb
      .from('businesses')
      .select('*')
      .eq('phone_number_id', phoneNumberId)
      .eq('active', true)
      .single();

    if (error || !data) return DEFAULT_CONFIG;

    return {
      businessName: data.business_name,
      businessType: data.business_type,
      schedule: data.schedule,
      phone: data.phone,
      address: data.address,
      services: data.services,
    };
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

async function saveConversation(customerPhone, message, response) {
  try {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('conversations').insert({
      customer_phone: customerPhone,
      message: message,
      response: response,
    });
  } catch (e) {
    console.error('Error guardando conversación:', e.message);
  }
}

async function processMessage(messageText, from, phoneNumberId) {
  const config = await getBusinessConfig(phoneNumberId);
  const text = messageText.toLowerCase().trim();

  if (text === 'hola' || text === 'inicio' || text === 'menu' || text === 'menú') {
    return {
      type: 'buttons',
      body: `¡Hola! 👋 Soy el asistente virtual de *${config.businessName}*.\n\n¿En qué puedo ayudarte?`,
      buttons: [
        { id: 'info', title: '📍 Información' },
        { id: 'reservar', title: '📅 Reservar' },
        { id: 'contactar', title: '📞 Contactar' },
      ]
    };
  }

  if (text === 'info' || text === 'información') {
    return {
      type: 'text',
      body: `📍 *${config.businessName}*\n\n🕐 Horario: ${config.schedule}\n📍 Dirección: ${config.address}\n📞 Teléfono: ${config.phone}`
    };
  }

  if (text === 'reservar') {
    return {
      type: 'text',
      body: `📅 Para hacer una reserva, escríbeme qué servicio necesitas y te digo disponibilidad.`
    };
  }

  if (text === 'contactar') {
    return {
      type: 'text',
      body: `📞 Puedes contactarnos en:\n\nTeléfono: ${config.phone}\nHorario: ${config.schedule}`
    };
  }

  try {
    const aiResponse = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres el asistente virtual de "${config.businessName}", un ${config.businessType}.
Responde de forma amable, concisa y profesional en español.
Horario: ${config.schedule}
Dirección: ${config.address}
Teléfono: ${config.phone}
Servicios: ${config.services}
Si no sabes algo, di que lo consulten directamente con el negocio.
Máximo 3 párrafos cortos.`
        },
        { role: 'user', content: messageText }
      ],
      max_tokens: 300,
    });

    const responseText = aiResponse.choices[0].message.content;
    await saveConversation(from, messageText, responseText);

    return { type: 'text', body: responseText };

  } catch (error) {
    console.error('Error OpenAI:', error.message);
    return {
      type: 'text',
      body: '⚠️ Ahora mismo no puedo responder. Por favor contáctanos directamente.'
    };
  }
}

module.exports = { processMessage };