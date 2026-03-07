const whatsappService = require('./whatsappService');

// Configuración del bot por defecto
// En el futuro vendrá de la base de datos por cada cliente
const DEFAULT_CONFIG = {
  businessName: 'Mi Negocio',
  schedule: 'Lunes a Viernes: 9:00 - 20:00\nSábados: 10:00 - 14:00',
  address: 'Calle Mayor 123, Madrid',
  phone: '+34 912 345 678',
  faqs: [
    { keywords: ['precio', 'coste', 'cuánto', 'cuesta'], answer: '💰 Escríbenos para un presupuesto personalizado.' },
    { keywords: ['horario', 'hora', 'abierto', 'cerrado'], answer: '🕐 Nuestro horario:\nLunes a Viernes: 9:00 - 20:00\nSábados: 10:00 - 14:00' },
    { keywords: ['dirección', 'donde', 'ubicación'], answer: '📍 Estamos en Calle Mayor 123, Madrid.' },
    { keywords: ['reserva', 'cita'], answer: '📅 Escríbenos el día y hora que prefieres y te confirmamos.' },
  ]
};

// Procesa mensajes de texto
exports.processTextMessage = async (from, text) => {
  const normalized = text.toLowerCase().trim();

  if (isGreeting(normalized)) {
    return sendMainMenu(from);
  }

  const faqAnswer = findFaqAnswer(normalized);
  if (faqAnswer) {
    await whatsappService.sendText(from, faqAnswer);
    return sendMainMenu(from);
  }

  await whatsappService.sendText(from, '🤔 No entendí tu mensaje. Selecciona una opción:');
  return sendMainMenu(from);
};

// Procesa respuestas a botones
exports.processInteractiveMessage = async (from, buttonId) => {
  switch (buttonId) {
    case 'btn_info':
      await whatsappService.sendText(from,
        `ℹ️ *Información*\n\n📍 ${DEFAULT_CONFIG.address}\n📞 ${DEFAULT_CONFIG.phone}\n🕐 ${DEFAULT_CONFIG.schedule}`
      );
      break;
    case 'btn_reservation':
      await whatsappService.sendText(from,
        '📅 Escríbenos el día y hora que prefieres y te confirmamos disponibilidad.'
      );
      break;
    case 'btn_contact':
      await whatsappService.sendText(from,
        `📞 Llámanos al ${DEFAULT_CONFIG.phone} o escríbenos aquí. 😊`
      );
      break;
    default:
      return sendMainMenu(from);
  }
};

// ── Helpers ───────────────────────────────────────────

function isGreeting(text) {
  const greetings = ['hola', 'buenos días', 'buenas', 'buenas tardes', 'buenas noches', 'hey', 'hi'];
  return greetings.some(g => text.includes(g));
}

function findFaqAnswer(text) {
  for (const faq of DEFAULT_CONFIG.faqs) {
    if (faq.keywords.some(k => text.includes(k))) {
      return faq.answer;
    }
  }
  return null;
}

async function sendMainMenu(from) {
  await whatsappService.sendButtons(
    from,
    `¡Hola! 👋 Soy el asistente de *${DEFAULT_CONFIG.businessName}*. ¿En qué puedo ayudarte?`,
    [
      { id: 'btn_info',        title: '📍 Información' },
      { id: 'btn_reservation', title: '📅 Reservar' },
      { id: 'btn_contact',     title: '📞 Contactar' },
    ]
  );
}