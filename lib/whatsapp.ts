const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID; // Manual WABA ID if lookup fails
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v20.0';

async function waRequest(endpoint: string, data: any) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error("=== [WA-CONFIG-ERROR] ===");
    console.error("Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in .env");
    return { success: false, error: "WhatsApp credentials missing" };
  }

  console.log(`[WA-API] Request to ${endpoint} with PhoneID: ${PHONE_NUMBER_ID}`);
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
      console.error(`[WA-API] Error (${endpoint}):`, JSON.stringify(result, null, 2));
      if (result.error?.message === "API access blocked.") {
        return { 
          success: false, 
          error: "Akses API diblokir oleh Meta. Silakan cek status aplikasi Meta Anda dan pastikan Token valid." 
        };
      }
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

export async function sendWaMedia(to: string, type: 'image' | 'video' | 'document' | 'audio', url: string, caption?: string) {
  const mediaObject: any = { link: url };
  if (caption && (type === 'image' || type === 'video' || type === 'document')) {
    mediaObject.caption = caption;
  }
  
  // For documents, we might want to specify filename if we can extract it
  if (type === 'document') {
    const filename = url.split('/').pop();
    if (filename) mediaObject.filename = filename;
  }

  return waRequest('/messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type,
    [type]: mediaObject,
  });
}

export async function getWaMediaUrl(mediaId: string) {
  if (!ACCESS_TOKEN) return { success: false, error: "Access token missing" };
  
  const url = `https://graph.facebook.com/${API_VERSION}/${mediaId}`;
  
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    });
    
    const result = await response.json();
    if (!response.ok) return { success: false, error: result };
    
    return { success: true, url: result.url }; // This is the temporary URL to download the file
  } catch (error) {
    console.error("getWaMediaUrl Exception:", error);
    return { success: false, error: "Error fetching media URL from Meta" };
  }
}

export async function downloadWaMedia(url: string) {
  if (!ACCESS_TOKEN) return null;
  
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    });
    
    if (!response.ok) {
      console.error("[WA-API] Failed to download media content");
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[WA-API] downloadWaMedia Exception:", error);
    return null;
  }
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
    console.error("[WA-API] Access Token is missing");
    return { success: false, error: "WhatsApp Access Token missing" };
  }

  let wabaId = WABA_ID;

  if (wabaId) {
    console.log(`[WA-API] Using manual WABA ID from .env: ${wabaId}`);
  } else {
    console.log("[WA-API] WABA ID not found in .env, attempting automatic lookup...");
    if (!PHONE_NUMBER_ID) {
      console.warn("[WA-API] Phone Number ID missing for lookup, returning empty templates");
      return { success: true, data: [], warning: "Phone Number ID missing. Templates could not be fetched." };
    }

    try {
      const urlInfo = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`;
      const infoRes = await fetch(urlInfo, {
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
      });
      const infoData = await infoRes.json();
      
      console.log("[WA-API] Account Info Response:", JSON.stringify(infoData, null, 2));

      if (infoData.error) {
        console.error("[WA-API] Meta API Error during lookup:", infoData.error.message);
        // If it's a permission error, let the user know
        if (infoData.error.code === 200 || infoData.error.message.includes("permission")) {
          return {
            success: false,
            error: "Token tidak memiliki izin untuk melihat info akun. Pastikan Token memiliki izin 'whatsapp_business_management' dan 'whatsapp_business_messaging'."
          };
        }
        return { 
          success: false, 
          error: `Meta API Error: ${infoData.error.message}` 
        };
      }

      if (!infoData.whatsapp_business_account) {
        console.warn("[WA-API] WABA ID not found in Meta response. Check your App permissions.");
        return { 
          success: false, 
          error: "WABA ID tidak ditemukan. Masukkan WHATSAPP_BUSINESS_ACCOUNT_ID secara manual di .env atau pastikan izin token lengkap." 
        };
      }

      wabaId = infoData.whatsapp_business_account.id;
      console.log(`[WA-API] Automatic WABA ID lookup successful: ${wabaId}`);
    } catch (error: any) {
      console.error("[WA-API] WABA ID lookup exception:", error);
      return { success: false, error: `Gagal mencari WABA ID: ${error.message}` };
    }
  }

  if (!wabaId) {
    return { success: false, error: "WhatsApp Business Account ID (WABA ID) tidak ditemukan." };
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
