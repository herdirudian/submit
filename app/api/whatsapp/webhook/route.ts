import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWaText } from "@/lib/whatsapp";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("=== [WEBHOOK VERIFICATION] ===");
  console.log("Mode:", mode);
  console.log("Token received:", token);
  console.log("Token expected:", VERIFY_TOKEN);
  console.log("Challenge:", challenge);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WEBHOOK] Verification successful!");
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.log("[WEBHOOK] Verification failed!");
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  console.log(`=== [WEBHOOK] INCOMING POST REQUEST ===`);
  console.log(`[WEBHOOK] Path: ${url.pathname}`);
  console.log(`[WEBHOOK] Headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}`);
  
  try {
    const body = await req.json();
    console.log("=== [WEBHOOK] FULL PAYLOAD BODY ===");
    console.log(JSON.stringify(body, null, 2));

    if (body.object === "whatsapp_business_account") {
      if (!body.entry || !Array.isArray(body.entry)) {
        console.warn("[WEBHOOK] No entry found in payload");
        return new NextResponse("No entry", { status: 200 });
      }

      for (const entry of body.entry) {
        if (!entry.changes || !Array.isArray(entry.changes)) continue;

        for (const change of entry.changes) {
          const value = change.value;
          
          console.log(`[WEBHOOK] Processing field: ${change.field}`);

          // 1. Handle message status updates (sent, delivered, read, failed)
          if (value.statuses && Array.isArray(value.statuses)) {
            for (const status of value.statuses) {
              const waMessageId = status.id;
              const messageStatus = status.status.toUpperCase();
              console.log(`[WEBHOOK] Status Update: ${waMessageId} -> ${messageStatus}`);

              try {
                const validStatuses = ["SENT", "DELIVERED", "READ", "FAILED"];
                if (validStatuses.includes(messageStatus)) {
                  await prisma.waMessage.updateMany({
                    where: { waMessageId },
                    data: { status: messageStatus as any },
                  });
                }
              } catch (dbErr) {
                console.error("[WEBHOOK] DB Status Update Error:", dbErr);
              }
            }
          }

          // 2. Handle incoming messages
          if (value.messages && Array.isArray(value.messages)) {
            for (const message of value.messages) {
              const rawWaId = message.from; // Sender's phone number
              const messageId = message.id;
              const timestamp = new Date(parseInt(message.timestamp) * 1000);
              
              console.log(`[WEBHOOK] New Message from: ${rawWaId}, ID: ${messageId}, Type: ${message.type}`);
              
              let bodyContent = "";
              let type: any = "TEXT";

              // Extract content based on message type
              if (message.type === "text") {
                bodyContent = message.text?.body || "";
              } else if (message.type === "image") {
                bodyContent = "[Gambar]";
                type = "IMAGE";
              } else if (message.type === "video") {
                bodyContent = "[Video]";
                type = "VIDEO";
              } else if (message.type === "document") {
                bodyContent = "[Dokumen]";
                type = "DOCUMENT";
              } else if (message.type === "audio") {
                bodyContent = "[Audio]";
                type = "AUDIO";
              } else if (message.type === "button") {
                bodyContent = message.button?.text || "[Tombol]";
                type = "TEXT";
              } else if (message.type === "interactive") {
                const interactive = message.interactive;
                if (interactive.type === "button_reply") {
                  bodyContent = interactive.button_reply?.title || "";
                } else if (interactive.type === "list_reply") {
                  bodyContent = interactive.list_reply?.title || "";
                }
                type = "TEXT";
              } else if (message.type === "reaction") {
                bodyContent = `[Reaksi: ${message.reaction?.emoji || ""}]`;
                type = "TEXT";
              } else {
                bodyContent = `[Pesan ${message.type}]`;
              }

              // Normalisasi waId (Hanya angka, biasanya 628...)
              const cleanWaId = rawWaId.replace(/\D/g, "");

              try {
                // Find or create chat
                let chat = await prisma.waChat.findUnique({
                  where: { waId: cleanWaId },
                });

                let isNewChat = false;
                if (!chat) {
                  console.log(`[WEBHOOK] Creating new chat record for ${cleanWaId}`);
                  isNewChat = true;
                  // Try to link with existing contact
                  const contact = await prisma.contact.findFirst({
                    where: { OR: [{ phone: cleanWaId }, { waNumber: cleanWaId }] },
                  });

                  chat = await prisma.waChat.create({
                    data: {
                      waId: cleanWaId,
                      contactId: contact?.id,
                      lastMessage: bodyContent,
                      lastMessageAt: timestamp,
                    },
                  });
                } else {
                  // Update existing chat
                  await prisma.waChat.update({
                    where: { id: chat.id },
                    data: {
                      lastMessage: bodyContent,
                      lastMessageAt: timestamp,
                    },
                  });
                }

                // Check if message already exists to prevent duplicates (Meta sometimes retries)
                const existingMsg = await prisma.waMessage.findUnique({
                  where: { waMessageId: messageId }
                });

                if (!existingMsg) {
                  await prisma.waMessage.create({
                    data: {
                      chatId: chat.id,
                      waMessageId: messageId,
                      body: bodyContent,
                      type,
                      fromMe: false,
                      createdAt: timestamp,
                    },
                  });
                  console.log(`[WEBHOOK] Message saved successfully: ${messageId}`);
                } else {
                  console.log(`[WEBHOOK] Skipping duplicate message: ${messageId}`);
                }

                // Auto-reply logic (Jam Operasional: 17:00 - 08:00)
                const hour = new Date().getHours();
                if (isNewChat && (hour < 8 || hour > 17)) {
                  console.log(`[WEBHOOK] Triggering off-hours auto-reply`);
                  const autoMsg = "Halo! Terima kasih telah menghubungi The Lodge Maribaya. Saat ini kami sedang di luar jam operasional. Kami akan membalas pesan Anda segera setelah kami kembali bertugas (Jam 08:00 - 17:00).";
                  
                  const sendResult = await sendWaText(cleanWaId, autoMsg);
                  if (sendResult.success) {
                    await prisma.waMessage.create({
                      data: {
                        chatId: chat.id,
                        body: autoMsg,
                        fromMe: true,
                        status: 'SENT',
                      }
                    });
                  }
                }
              } catch (dbErr) {
                console.error("[WEBHOOK] Database Operation Error:", dbErr);
              }
            }
          }
        }
      }
      return new NextResponse("OK", { status: 200 });
    }
  } catch (error) {
    console.error("=== [WEBHOOK CRITICAL ERROR] ===");
    console.error(error);
    return new NextResponse("Internal Error", { status: 500 });
  }

  return new NextResponse("Not Found", { status: 404 });
}
