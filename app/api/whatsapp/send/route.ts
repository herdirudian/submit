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

    // Accept both configured env key and default fallback key for seamless integration
    if (!token || (token !== INTERNAL_API_KEY && token !== "lodge_wa_api_key_2026")) {
      return NextResponse.json(
        {
          statusCode: 401,
          success: false,
          error: "Unauthorized: Invalid or missing API Key / Bearer Token",
        },
        { status: 401 }
      );
    }

    // 2. Parse Request Body safely
    const body = await req.json().catch(() => ({}));

    // Extract recipient phone number flexible options
    const rawPhone =
      body.to ||
      body.phone ||
      body.waNumber ||
      body.recipient ||
      body.recipient_id ||
      "";

    if (!rawPhone) {
      return NextResponse.json(
        {
          statusCode: 400,
          success: false,
          error: "Parameter 'to' (nomor WhatsApp tujuan) wajib diisi",
        },
        { status: 400 }
      );
    }

    // Clean phone number (format: 628...)
    let cleanWaId = String(rawPhone).replace(/\D/g, "");
    if (cleanWaId.startsWith("0")) {
      cleanWaId = "62" + cleanWaId.substring(1);
    }
    if (!cleanWaId) {
      return NextResponse.json(
        {
          statusCode: 400,
          success: false,
          error: "Format nomor WhatsApp tidak valid",
        },
        { status: 400 }
      );
    }

    // Extract text content flexibly (string or object text.body)
    let textBody = "";
    if (typeof body.message === "string") {
      textBody = body.message;
    } else if (typeof body.text === "string") {
      textBody = body.text;
    } else if (typeof body.text === "object" && body.text?.body) {
      textBody = String(body.text.body);
    } else if (typeof body.body === "string") {
      textBody = body.body;
    } else if (typeof body.content === "string") {
      textBody = body.content;
    }

    // Extract type
    const rawType = String(body.type || "text").toLowerCase();

    // Extract template fields
    const templateName = body.templateName || body.template?.name || "";
    const languageCode = body.languageCode || body.template?.language?.code || "id";
    const components = body.components || body.template?.components || [];

    // Extract media URL & caption
    const targetMediaUrl = body.mediaUrl || body.url || body[rawType]?.link || body[rawType]?.url || "";
    const caption = body.caption || body[rawType]?.caption || textBody || "";

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
          name: body.name || `WhatsApp ${cleanWaId}`,
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
    let finalMessageBody = textBody;

    if (rawType === "template") {
      if (!templateName) {
        return NextResponse.json(
          {
            statusCode: 400,
            success: false,
            error: "Parameter 'templateName' wajib diisi untuk type 'template'",
          },
          { status: 400 }
        );
      }
      metaResult = await sendWaTemplate(cleanWaId, templateName, languageCode, components);
      msgType = "TEMPLATE";
      finalMessageBody = textBody || `[Template: ${templateName}]`;
    } else if (["image", "document", "video", "audio"].includes(rawType)) {
      if (!targetMediaUrl) {
        return NextResponse.json(
          {
            statusCode: 400,
            success: false,
            error: `Parameter 'mediaUrl' wajib diisi untuk type '${rawType}'`,
          },
          { status: 400 }
        );
      }
      metaResult = await sendWaMedia(cleanWaId, rawType as any, targetMediaUrl, caption);
      msgType = rawType.toUpperCase() as any;
      finalMessageBody = caption || `[${msgType}]`;
    } else {
      // Default: TEXT message
      if (!textBody) {
        return NextResponse.json(
          {
            statusCode: 400,
            success: false,
            error: "Parameter 'message' / 'text' / 'text.body' wajib diisi untuk pesan teks",
          },
          { status: 400 }
        );
      }
      metaResult = await sendWaText(cleanWaId, textBody);
      msgType = "TEXT";
      finalMessageBody = textBody;
    }

    // 5. Check Meta API Response
    if (!metaResult || !metaResult.success) {
      const errorMsg =
        typeof metaResult?.error === "string"
          ? metaResult.error
          : metaResult?.error?.error?.message || metaResult?.error?.message || "Gagal mengirim pesan via WhatsApp Meta API";

      console.error("[WA-SEND-API-ERROR]", metaResult?.error);

      return NextResponse.json(
        {
          statusCode: 500,
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
        body: String(finalMessageBody),
        mediaUrl: targetMediaUrl || null,
        mediaCaption: caption || null,
        templateName: templateName || null,
        status: "SENT",
      },
    });

    await prisma.waChat.update({
      where: { id: chat.id },
      data: {
        lastMessage: String(finalMessageBody),
        lastMessageAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        statusCode: 200,
        success: true,
        message: "Pesan WhatsApp berhasil dikirim",
        data: {
          id: createdMsg.id,
          waMessageId: waMsgId,
          chatId: chat.id,
          recipient: cleanWaId,
          type: msgType,
          body: finalMessageBody,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error in /api/whatsapp/send:", err);
    return NextResponse.json(
      {
        statusCode: 500,
        success: false,
        error: err?.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
