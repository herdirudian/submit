const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v20.0';

async function waRequest(endpoint: string, data: any) {
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  
  if (!response.ok) {
    console.error(`WhatsApp API Error (${endpoint}):`, result);
    return { success: false, error: result };
  }

  return { success: true, data: result };
}

export async function sendWaText(to: string, text: string) {
  return waRequest('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text },
  });
}

export async function sendWaTemplate(to: string, templateName: string, languageCode: string = 'id', components: any[] = []) {
  return waRequest('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
}

export async function markWaAsRead(messageId: string) {
  return waRequest('/messages', {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  });
}
