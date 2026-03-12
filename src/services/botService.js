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
  id: null,
  businessName: 'Mi Negocio',
  businessType: 'negocio local',
  schedule: 'Lunes a Viernes 9:00-18:00',
  phone: '+34 600 000 000',
  address: 'Calle Principal 123',
  services: 'Consulta nuestra web para más información',
};

// ── Configuración del negocio ─────────────────────────────
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
      id: data.id,
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

// ── Estado de conversación ────────────────────────────────
async function getConversationState(customerPhone, businessId) {
  try {
    const sb = getSupabase();
    const { data } = await sb
      .from('conversation_states')
      .select('*')
      .eq('customer_phone', customerPhone)
      .eq('business_id', businessId)
      .single();
    return data || { step: 'idle', data: {} };
  } catch (e) {
    return { step: 'idle', data: {} };
  }
}

async function setConversationState(customerPhone, businessId, step, data) {
  try {
    const sb = getSupabase();
    const { data: existing } = await sb
      .from('conversation_states')
      .select('id')
      .eq('customer_phone', customerPhone)
      .eq('business_id', businessId)
      .single();

    if (existing) {
      await sb
        .from('conversation_states')
        .update({ step, data, updated_at: new Date().toISOString() })
        .eq('customer_phone', customerPhone)
        .eq('business_id', businessId);
    } else {
      await sb
        .from('conversation_states')
        .insert({ customer_phone: customerPhone, business_id: businessId, step, data });
    }
  } catch (e) {
    console.error('Error guardando estado:', e.message);
  }
}

async function clearConversationState(customerPhone, businessId) {
  await setConversationState(customerPhone, businessId, 'idle', {});
}

// ── Guardar cita ──────────────────────────────────────────
async function saveAppointment(businessId, customerPhone, service, date, time) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('appointments')
      .insert({
        business_id: businessId,
        customer_phone: customerPhone,
        service,
        appointment_date: date,
        appointment_time: time,
        status: 'confirmed',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Error guardando cita:', e.message);
    return null;
  }
}

// ── Guardar conversación ──────────────────────────────────
async function saveConversation(customerPhone, message, response) {
  try {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('conversations').insert({
      customer_phone: customerPhone,
      message,
      response,
    });
  } catch (e) {
    console.error('Error guardando conversación:', e.message);
  }
}

// ── Parsear fecha en español ──────────────────────────────
function parseDate(text) {
  const t = text.toLowerCase().trim();
  const today = new Date();

  if (t === 'hoy') return formatDate(today);
  if (t === 'mañana') {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return formatDate(tomorrow);
  }

  // Formato DD/MM o DD-MM
  const shortMatch = t.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (shortMatch) {
    const day = parseInt(shortMatch[1]);
    const month = parseInt(shortMatch[2]) - 1;
    const year = today.getFullYear();
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return formatDate(date);
  }

  // Formato DD/MM/YYYY
  const fullMatch = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (fullMatch) {
    const date = new Date(parseInt(fullMatch[3]), parseInt(fullMatch[2]) - 1, parseInt(fullMatch[1]));
    if (!isNaN(date.getTime())) return formatDate(date);
  }

  return null;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatDateSpanish(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${parseInt(day)} de ${months[parseInt(month)-1]} de ${year}`;
}

// ── Parsear hora ──────────────────────────────────────────
function parseTime(text) {
  const t = text.toLowerCase().trim();
  // Formatos: 10:00, 10h, 10, 10:30
  const match = t.match(/^(\d{1,2})(?:[:\.](\d{2}))?(?:h)?$/);
  if (match) {
    const hour = parseInt(match[1]);
    const min = match[2] ? match[2] : '00';
    if (hour >= 7 && hour <= 21) return `${String(hour).padStart(2,'0')}:${min}`;
  }
  return null;
}

// ── Menú principal ────────────────────────────────────────
function mainMenu(config) {
  return {
    type: 'buttons',
    body: `¡Hola! 👋 Soy el asistente virtual de *${config.businessName}*.\n\n¿En qué puedo ayudarte?`,
    buttons: [
      { id: 'info', title: '📍 Información' },
      { id: 'reservar', title: '📅 Reservar cita' },
      { id: 'contactar', title: '📞 Contactar' },
    ]
  };
}

// ── Procesar mensaje principal ────────────────────────────
async function processMessage(messageText, from, phoneNumberId) {
  const config = await getBusinessConfig(phoneNumberId);
  const text = messageText.toLowerCase().trim();

  // Obtener estado actual de la conversación
  const state = config.id
    ? await getConversationState(from, config.id)
    : { step: 'idle', data: {} };

  console.log(`📊 Estado: ${state.step} | Mensaje: ${messageText}`);

  // ── Comando cancelar siempre disponible ──
  if (text === 'cancelar' || text === 'cancel' || text === 'menu' || text === 'menú') {
    if (config.id) await clearConversationState(from, config.id);
    return mainMenu(config);
  }

  // ── Flujo de reserva activo ───────────────────────────
  if (state.step === 'awaiting_service') {
    return await handleServiceStep(messageText, from, config, state);
  }

  if (state.step === 'awaiting_date') {
    return await handleDateStep(messageText, from, config, state);
  }

  if (state.step === 'awaiting_time') {
    return await handleTimeStep(messageText, from, config, state);
  }

  // ── Comandos del menú principal ───────────────────────
  if (text === 'hola' || text === 'inicio' || text === 'start' || text === 'buenas') {
    return mainMenu(config);
  }

  if (text === 'info' || text === 'información' || text === 'informacion') {
    return {
      type: 'text',
      body: `📍 *${config.businessName}*\n\n🕐 Horario: ${config.schedule}\n📍 Dirección: ${config.address}\n📞 Teléfono: ${config.phone}\n\n💈 Servicios: ${config.services}`
    };
  }

  if (text === 'reservar') {
    if (config.id) {
      await setConversationState(from, config.id, 'awaiting_service', {});
    }
    return {
      type: 'text',
      body: `📅 *Reservar cita*\n\n¿Qué servicio necesitas?\n\n${config.services}\n\nEscribe el servicio que quieres o escribe *cancelar* para volver al menú.`
    };
  }

  if (text === 'contactar') {
    return {
      type: 'text',
      body: `📞 *Contacto*\n\nTeléfono: ${config.phone}\nHorario: ${config.schedule}\n\nTambién puedes escribirnos aquí y te responderemos lo antes posible.`
    };
  }

  // ── Respuesta con GPT para todo lo demás ─────────────
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
Si te preguntan por reservas, diles que escriban "reservar".
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

// ── Pasos del flujo de reserva ────────────────────────────
async function handleServiceStep(messageText, from, config, state) {
  const service = messageText.trim();
  if (service.length < 2) {
    return { type: 'text', body: '✏️ Por favor escribe el servicio que necesitas. Ej: *Corte de pelo*' };
  }

  if (config.id) {
    await setConversationState(from, config.id, 'awaiting_date', { service });
  }

  return {
    type: 'text',
    body: `✅ Servicio: *${service}*\n\n📅 ¿Para qué día quieres la cita?\n\nPuedes escribir:\n• *Hoy*\n• *Mañana*\n• *15/03* (día/mes)\n\nO escribe *cancelar* para volver al menú.`
  };
}

async function handleDateStep(messageText, from, config, state) {
  const date = parseDate(messageText);

  if (!date) {
    return {
      type: 'text',
      body: '📅 No entendí la fecha. Prueba con:\n• *Hoy*\n• *Mañana*\n• *15/03* (día/mes)\n\nO escribe *cancelar* para salir.'
    };
  }

  const newData = { ...state.data, date };
  if (config.id) {
    await setConversationState(from, config.id, 'awaiting_time', newData);
  }

  return {
    type: 'text',
    body: `✅ Fecha: *${formatDateSpanish(date)}*\n\n🕐 ¿A qué hora? Horario disponible: ${config.schedule}\n\nEscribe la hora. Ej: *10:00*, *11h*, *16:30*\n\nO escribe *cancelar* para salir.`
  };
}

async function handleTimeStep(messageText, from, config, state) {
  const time = parseTime(messageText);

  if (!time) {
    return {
      type: 'text',
      body: '🕐 No entendí la hora. Prueba con: *10:00*, *11h*, *16:30*\n\nO escribe *cancelar* para salir.'
    };
  }

  const { service, date } = state.data;

  // Guardar la cita
  if (config.id) {
    await saveAppointment(config.id, from, service, date, time);
    await clearConversationState(from, config.id);
  }

  return {
    type: 'text',
    body: `🎉 *¡Cita confirmada!*\n\n💈 Servicio: ${service}\n📅 Día: ${formatDateSpanish(date)}\n🕐 Hora: ${time}\n📍 ${config.address}\n\nTe esperamos. Si necesitas cancelar o cambiar la cita, llámanos al ${config.phone}.\n\n¡Hasta pronto! 👋`
  };
}

module.exports = { processMessage };