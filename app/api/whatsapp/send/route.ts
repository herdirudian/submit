import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWaText, sendWaTemplate, sendWaMedia } from "@/lib/whatsapp";

// Default API Key fallback for internal system integration
const INTERNAL_API_KEY = process.env.WHATSAPP_API_KEY || process.env.INTERNAL_API_KEY || "lodge_wa_api_key_2026";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.get("authorization");
    const apiKeyHeader = req.headers.get("x-api-key");
    const { searchParams } = new URL(req.url);
    const queryApiKey = searchParams.get("apiKey");

    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else if (apiKeyHeader) {
      token = apiKeyHeader.trim();
    } else if (queryApiKey) {
      token = queryApiKey.trim();
    }

    if (!token || token !== INTERNAL_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or missing API Key / Bearer Token",
        },
        { status: 401 }
      );
    }

    // 2. Parse Request Body
    const body = await req.json().catch(() => ({}));
    const {
      to,
      type = "text", // "text" | "template" | "image" | "document" | "video" | "audio"
      message,
      text,
      templateName,
      languageCode = "id",
      components = [],
      mediaUrl,
      url,
      caption,
      name,
    } = body;

    const recipientPhone = to || body.phone || body.waNumber;
    const textBody = message || text || body.body || "";
    const targetMediaUrl = mediaUrl || url;

    if (!recipientPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "Parameter 'to' (nomor WhatsApp tujuan) wajib diisi",
        },
        { status: 400 }
      );
    }

    // Clean phone number (format: 628...)
    let cleanWaId = String(recipientPhone).replace(/\D/g, "");
    if (cleanWaId.startsWith("0")) {
      cleanWaId = "62" + cleanWaId.substring(1);
    }
    if (!cleanWaId) {
      return NextResponse.json(
        {
          success: false,
          error: "Format nomor WhatsApp tidak valid",
        },
        { status: 400 }
      );
    }

    // 3. Find or Create Contact & WaChat
    let chat = await prisma.waChat.findUnique({
      where: { waId: cleanWaId },
      include: { contact: true },
    });

    let contact = chat?.contact;
    if (!contact) {
      contact = await prisma.contact.findFirst({
        where: { OR: [{ phone: cleanWaId }, { waNumber: cleanWaId }] },
      });
    }

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          name: name || `WhatsApp ${cleanWaId}`,
          phone: cleanWaId,
          waNumber: cleanWaId,
          customerType: "Pelanggan",
          ticketType: "System API",
        },
      });
    }

    if (!chat) {
      chat = await prisma.waChat.create({
        data: {
          waId: cleanWaId,
          contactId: contact.id,
          status: "OPEN",
        },
        include: { contact: true },
      });
    }

    // 4. Send Message via Meta Cloud API
    let metaResult: any;
    let msgType: "TEXT" | "TEMPLATE" | "IMAGE" | "DOCUMENT" | "VIDEO" | "AUDIO" = "TEXT";
    let messageBody = textBody;

    const lowerType = String(type).toLowerCase();

    if (lowerType === "template") {
      if (!templateName) {
        return NextResponse.json(
          {
            success: false,
            error: "Parameter 'templateName' wajib diisi untuk type 'template'",
          },
          { status: 400 }
        );
      }
      metaResult = await sendWaTemplate(cleanWaId, templateName, languageCode, components);
      msgType = "TEMPLATE";
      messageBody = textBody || `[Template: ${templateName}]`;
    } else if (["image", "document", "video", "audio"].includes(lowerType)) {
      if (!targetMediaUrl) {
        return NextResponse.json(
          {
            success: false,
            error: `Parameter 'mediaUrl' wajib diisi untuk type '${lowerType}'`,
          },
          { status: 400 }
        );
      }
      metaResult = await sendWaMedia(cleanWaId, lowerType as any, targetMediaUrl, caption || textBody);
      msgType = lowerType.toUpperCase() as any;
      messageBody = caption || textBody || `[${msgType}]`;
    } else {
      // Default: TEXT message
      if (!textBody) {
        return NextResponse.json(
          {
            success: false,
            error: "Parameter 'message' / 'text' wajib diisi untuk pesan teks",
          },
          { status: 400 }
        );
      }
      metaResult = await sendWaText(cleanWaId, textBody);
      msgType = "TEXT";
      messageBody = textBody;
    }

    // 5. Check Meta API Response
    if (!metaResult || !metaResult.success) {
      const errorMsg =
        typeof metaResult?.error === "string"
          ? metaResult.error
          : metaResult?.error?.error?.message || metaResult?.error?.message || "Gagal mengirim pesan via WhatsApp Meta API";

      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          metaDetails: metaResult?.error || null,
        },
        { status: 500 }
      );
    }

    // 6. Log Message in Database
    const waMsgId = metaResult.data?.messages?.[0]?.id || null;

    const createdMsg = await prisma.waMessage.create({
      data: {
        chatId: chat.id,
        waMessageId: waMsgId,
        fromMe: true,
        type: msgType,
        body: messageBody,
        mediaUrl: targetMediaUrl || null,
        mediaCaption: caption || null,
        templateName: templateName || null,
        status: "SENT",
      },
    });

    await prisma.waChat.update({
      where: { id: chat.id },
      data: {
        lastMessage: messageBody,
        lastMessageAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pesan WhatsApp berhasil dikirim",
        data: {
          id: createdMsg.id,
          waMessageId: waMsgId,
          chatId: chat.id,
          recipient: cleanWaId,
          type: msgType,
          body: messageBody,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error in /api/whatsapp/send:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

