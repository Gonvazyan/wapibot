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

// ── Notas del negocio ─────────────────────────────────────
async function getBusinessNotes(businessId) {
  try {
    const sb = getSupabase();
    if (!sb || !businessId) return [];
    const { data } = await sb
      .from('business_notes')
      .select('note')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    return data ? data.map(n => n.note) : [];
  } catch (e) {
    return [];
  }
}

// ── Estado de conversación ────────────────────────────────
const CONVERSATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

async function getConversationState(customerPhone, businessId) {
  try {
    const sb = getSupabase();
    const { data } = await sb
      .from('conversation_states')
      .select('*')
      .eq('customer_phone', customerPhone)
      .eq('business_id', businessId)
      .single();

    if (!data) return { step: 'idle', data: {} };

    const lastUpdate = new Date(data.updated_at || data.created_at);
    if (Date.now() - lastUpdate.getTime() > CONVERSATION_TIMEOUT_MS) {
      await setConversationState(customerPhone, businessId, 'idle', {});
      return { step: 'idle', data: {} };
    }

    return data;
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
        .insert({ customer_phone: customerPhone, business_id: businessId, step, data, updated_at: new Date().toISOString() });
    }
  } catch (e) {
    console.error('Error guardando estado:', e.message);
  }
}

async function clearConversationState(customerPhone, businessId) {
  await setConversationState(customerPhone, businessId, 'idle', {});
}

// ── Guardar cita ──────────────────────────────────────────
async function saveAppointment(businessId, customerPhone, people, date, time, notes) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('appointments')
      .insert({
        business_id: businessId,
        customer_phone: customerPhone,
        service: `${people} personas`,
        appointment_date: date,
        appointment_time: time,
        notes: notes || null,
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

  const todayStr = formatDate(today);

  // Formato DD/MM, DD-MM o DD.MM
  const shortMatch = t.match(/^(\d{1,2})[\/\-\.](\d{1,2})$/);
  if (shortMatch) {
    const day = parseInt(shortMatch[1]);
    const month = parseInt(shortMatch[2]) - 1;
    const year = today.getFullYear();
    const date = new Date(year, month, day);
    const str = formatDate(date);
    if (!isNaN(date.getTime()) && str >= todayStr) return str;
  }

  // Formato DD/MM/YYYY, DD-MM-YYYY o DD.MM.YYYY
  const fullMatch = t.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (fullMatch) {
    const date = new Date(parseInt(fullMatch[3]), parseInt(fullMatch[2]) - 1, parseInt(fullMatch[1]));
    const str = formatDate(date);
    if (!isNaN(date.getTime()) && str >= todayStr) return str;
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
  // Eliminar prefijos naturales: "a las", "las", "sobre las"
  const t = text.toLowerCase().trim().replace(/^(a\s+las?|las?|sobre\s+las?)\s+/, '');
  // Formatos: 10:00, 10h, 10, 10:30, 22h
  const match = t.match(/^(\d{1,2})(?:[:\.](\d{2}))?h?$/);
  if (match) {
    const hour = parseInt(match[1]);
    const min = match[2] ? match[2] : '00';
    if (hour >= 7 && hour <= 23) return `${String(hour).padStart(2,'0')}:${min}`;
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
  if (state.step === 'awaiting_people') {
    return await handlePeopleStep(messageText, from, config, state);
  }

  if (state.step === 'awaiting_date') {
    return await handleDateStep(messageText, from, config, state);
  }

  if (state.step === 'awaiting_time') {
    return await handleTimeStep(messageText, from, config, state);
  }

  if (state.step === 'awaiting_notes') {
    return await handleNotesStep(messageText, from, config, state);
  }

  // ── Comandos del menú principal ───────────────────────
  if (text === 'hola' || text === 'inicio' || text === 'start' || text === 'buenas') {
    return mainMenu(config);
  }

  if (text === 'info' || text === 'información' || text === 'informacion') {
    return {
      type: 'text',
      body: `📍 *${config.businessName}*\n\n🕐 Horario: ${config.schedule}\n📍 Dirección: ${config.address}\n📞 Teléfono: ${config.phone}${config.services ? '\n\n' + config.services : ''}`
    };
  }

  const bookingIntent = ['reservar', 'reserva', 'quiero reservar', 'hacer una reserva', 'una mesa', 'quiero una mesa', 'pedir mesa'];
  if (text === 'reservar' || bookingIntent.some(kw => text.includes(kw))) {
    if (config.id) {
      await setConversationState(from, config.id, 'awaiting_people', {});
    }
    return {
      type: 'text',
      body: `📅 *Reservar mesa*\n\n¿Para cuántas personas? Ej: *2*, *4*\n\nO escribe *cancelar* para volver al menú.`
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
    const notes = await getBusinessNotes(config.id);
    const notesSection = notes.length
      ? '\n\nAVISOS IMPORTANTES DE HOY:\n' + notes.map(n => '- ' + n).join('\n')
      : '';

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
${config.services}${notesSection}
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
async function handlePeopleStep(messageText, from, config, state) {
  const num = parseInt(messageText.trim());
  if (isNaN(num) || num < 1 || num > 50) {
    return { type: 'text', body: '👥 Por favor indica el número de personas. Ej: *2*\n\nO escribe *cancelar* para salir.' };
  }

  if (config.id) {
    await setConversationState(from, config.id, 'awaiting_date', { people: num });
  }

  return {
    type: 'text',
    body: `✅ *${num} persona${num !== 1 ? 's' : ''}*\n\n📅 ¿Para qué día?\n\n• *Hoy*\n• *Mañana*\n• *15/03* (día/mes)\n\nO escribe *cancelar* para salir.`
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
    body: `✅ Fecha: *${formatDateSpanish(date)}*\n\n🕐 ¿A qué hora? Horario: ${config.schedule}\n\nEj: *14:00*, *21h*, *20:30*\n\nO escribe *cancelar* para salir.`
  };
}

async function handleTimeStep(messageText, from, config, state) {
  const time = parseTime(messageText);

  if (!time) {
    return {
      type: 'text',
      body: '🕐 No entendí la hora. Prueba con: *14:00*, *21h*, *20:30*\n\nO escribe *cancelar* para salir.'
    };
  }

  const newData = { ...state.data, time };
  if (config.id) {
    await setConversationState(from, config.id, 'awaiting_notes', newData);
  }

  return {
    type: 'text',
    body: `✅ Hora: *${time}*\n\n📝 ¿Alguna petición especial? (alergias, ocasión especial, zona preferida...)\n\nEscribe tu petición o *ninguna* si no tienes.\nO escribe *cancelar* para salir.`
  };
}

async function handleNotesStep(messageText, from, config, state) {
  const trimmed = messageText.trim();

  // Si es una pregunta, respóndela y vuelve a pedir la petición especial
  if (trimmed.endsWith('?')) {
    try {
      const businessNotes = await getBusinessNotes(config.id);
      const notesSection = businessNotes.length
        ? '\n\nAVISOS IMPORTANTES DE HOY:\n' + businessNotes.map(n => '- ' + n).join('\n')
        : '';
      const aiResponse = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres el asistente de "${config.businessName}". Responde de forma breve y directa en español.
Horario: ${config.schedule}
${config.services || ''}${notesSection}
Máximo 2 frases.`
          },
          { role: 'user', content: trimmed }
        ],
        max_tokens: 120,
      });
      const answer = aiResponse.choices[0].message.content;
      return {
        type: 'text',
        body: `${answer}\n\n📝 ¿Alguna petición especial para la reserva? (alergias, zona preferida...)\n\nEscribe tu petición o *ninguna*. O escribe *cancelar* para salir.`
      };
    } catch (e) {
      return {
        type: 'text',
        body: `📝 ¿Alguna petición especial? Escribe tu petición o *ninguna* si no tienes.\nO escribe *cancelar* para salir.`
      };
    }
  }

  const notes = trimmed.toLowerCase() === 'ninguna' ? '' : trimmed;
  const { people, date, time } = state.data || {};

  if (!people || !date || !time) {
    if (config.id) await clearConversationState(from, config.id);
    return mainMenu(config);
  }

  if (config.id) {
    await saveAppointment(config.id, from, people, date, time, notes);
    await clearConversationState(from, config.id);
  }

  const notesLine = notes ? `\n📝 Petición: ${notes}` : '';

  return {
    type: 'text',
    body: `🎉 *¡Reserva confirmada!*\n\n👥 Personas: ${people}\n📅 Día: ${formatDateSpanish(date)}\n🕐 Hora: ${time}${notesLine}\n📍 ${config.address}\n\nTe esperamos. Para cancelar o cambiar la reserva llámanos al ${config.phone}.\n\n¡Hasta pronto! 👋`
  };
}

module.exports = { processMessage };