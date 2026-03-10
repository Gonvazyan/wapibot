const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Genera una respuesta inteligente basada en la configuración del negocio
 */
exports.generateResponse = async (userMessage, businessConfig) => {
  const systemPrompt = `
Eres el asistente virtual de *${businessConfig.businessName}*.
Eres amable, conciso y profesional. Respondes siempre en español.
Tus respuestas son cortas (máximo 3 líneas) y directas.

Información del negocio:
- Nombre: ${businessConfig.businessName}
- Dirección: ${businessConfig.address}
- Teléfono: ${businessConfig.phone}
- Horario: ${businessConfig.schedule}
- Servicios: ${businessConfig.services}

Tu objetivo:
- Responder preguntas sobre el negocio
- Ayudar a hacer reservas
- Ser amable y cercano
- Si no sabes algo, pide que contacten directamente

IMPORTANTE: Nunca inventes información que no esté en los datos del negocio.
`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  });

  return response.choices[0].message.content;
};