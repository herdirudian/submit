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
  console.log(`=== [WEBHOOK] POST REQUEST RECEIVED ===`);
  
  try {
    const body = await req.json();
    console.log("[WEBHOOK] Payload:", JSON.stringify(body, null, 2));

    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const value = change.value;
          
          if (change.field !== 'messages') {
             console.log(`[WEBHOOK] Skipping field: ${change.field}`);
             continue;
          }

          // 1. Handle message status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              const waMessageId = status.id;
              const messageStatus = status.status.toUpperCase();
              console.log(`[WEBHOOK] Status Update: ${waMessageId} -> ${messageStatus}`);

              const validStatuses = ["SENT", "DELIVERED", "READ", "FAILED"];
              if (validStatuses.includes(messageStatus)) {
                await prisma.waMessage.updateMany({
                  where: { waMessageId },
                  data: { status: messageStatus as any },
                });
              }
            }
          }

          // 2. Handle incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              const rawWaId = message.from;
              const messageId = message.id;
              const timestamp = new Date(parseInt(message.timestamp) * 1000);
              
              console.log(`[WEBHOOK] Incoming Message from: ${rawWaId}, ID: ${messageId}`);
              
              let bodyContent = "";
              let type: any = "TEXT";

              if (message.type === "text") {
                bodyContent = message.text.body;
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
                bodyContent = message.button.text;
                type = "TEXT";
              } else if (message.type === "interactive") {
                if (message.interactive.type === "button_reply") {
                  bodyContent = message.interactive.button_reply.title;
                } else if (message.interactive.type === "list_reply") {
                  bodyContent = message.interactive.list_reply.title;
                }
                type = "TEXT";
              }

              // Normalisasi waId (Hanya angka)
              const cleanWaId = rawWaId.replace(/\D/g, "");

              let chat = await prisma.waChat.findUnique({
                where: { waId: cleanWaId },
              });

              let isNewChat = false;
              if (!chat) {
                console.log(`[WEBHOOK] Creating new chat for ${cleanWaId}`);
                isNewChat = true;
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
                await prisma.waChat.update({
                  where: { id: chat.id },
                  data: {
                    lastMessage: bodyContent,
                    lastMessageAt: timestamp,
                  },
                });
              }

              // Check if message already exists
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
                console.log(`[WEBHOOK] Message saved: ${messageId}`);
              }

              // Auto-reply for new chats (Off-hours: 17:00 - 08:00)
              const hour = new Date().getHours();
              if (isNewChat && (hour < 8 || hour > 17)) {
                const autoMsg = "Halo! Terima kasih telah menghubungi The Lodge Maribaya. Saat ini kami sedang di luar jam operasional. Kami akan membalas pesan Anda segera setelah kami kembali bertugas (Jam 08:00 - 17:00).";
                try {
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
                } catch (err) {
                  console.error("[WEBHOOK] Auto-reply error:", err);
                }
              }
            }
          }
        }
      }
      return new NextResponse("OK", { status: 200 });
    }
  } catch (error) {
    console.error("=== [WEBHOOK ERROR] ===");
    console.error(error);
    return new NextResponse("Error", { status: 500 });
  }

  return new NextResponse("Not Found", { status: 404 });
}
