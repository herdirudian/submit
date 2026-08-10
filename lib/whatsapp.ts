const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID; // Manual WABA ID if lookup fails
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v20.0';

async function waRequest(endpoint: string, data: any) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error("WhatsApp API credentials missing in .env");
    return { success: false, error: "WhatsApp credentials missing" };
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}${endpoint}`;
  
  try {
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
  } catch (error) {
    console.error(`WhatsApp Request Exception (${endpoint}):`, error);
    return { success: false, error: "Network or Server Error" };
  }
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

export async function getWaMetaTemplates() {
  if (!ACCESS_TOKEN) {
    return { success: false, error: "WhatsApp Access Token missing" };
  }

  let wabaId = WABA_ID;

  // 1. If WABA_ID not provided, look it up using Phone Number ID
  if (!wabaId) {
    if (!PHONE_NUMBER_ID) {
      return { success: false, error: "Phone Number ID missing" };
    }

    try {
      const urlInfo = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`;
      const infoRes = await fetch(urlInfo, {
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
      });
      const infoData = await infoRes.json();
      
      if (!infoData.whatsapp_business_account) {
        console.error("Failed to get WABA ID automatically. infoData:", JSON.stringify(infoData));
        return { 
          success: false, 
          error: "Could not find WhatsApp Business Account ID. Please set WHATSAPP_BUSINESS_ACCOUNT_ID in .env manually." 
        };
      }

      wabaId = infoData.whatsapp_business_account.id;
    } catch (error) {
      console.error("WABA ID lookup exception:", error);
      return { success: false, error: "Error looking up WABA ID" };
    }
  }

  // 2. Fetch templates using WABA ID
  try {
    const urlTemplates = `https://graph.facebook.com/${API_VERSION}/${wabaId}/message_templates`;
    const templatesRes = await fetch(urlTemplates, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
    });
    const templatesData = await templatesRes.json();

    if (!templatesRes.ok) {
      console.error("Failed to fetch templates:", templatesData);
      return { success: false, error: templatesData };
    }

    return { success: true, data: templatesData.data };
  } catch (error) {
    console.error("Fetch templates exception:", error);
    return { success: false, error: "Error fetching templates from Meta" };
  }
}
