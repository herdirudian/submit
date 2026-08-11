import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWaText, getWaMediaUrl, downloadWaMedia } from "@/lib/whatsapp";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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
  const cfRay = req.headers.get("cf-ray") || "none";
  console.log(`=== [WEBHOOK] INCOMING POST REQUEST ===`);
  console.log(`[WEBHOOK] Time: ${new Date().toISOString()}`);
  console.log(`[WEBHOOK] CF-Ray: ${cfRay}`);
  
  try {
    const rawBody = await req.text();
    console.log(`[WEBHOOK] Raw Body Length: ${rawBody.length}`);
    
    if (!rawBody) {
      console.warn("[WEBHOOK] Empty body received");
      return new NextResponse("Empty body", { status: 200 });
    }

    const body = JSON.parse(rawBody);
    console.log("=== [WEBHOOK] PAYLOAD RECEIVED ===");
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
              let mediaId = "";

              // Extract content based on message type
              if (message.type === "text") {
                bodyContent = message.text?.body || "";
              } else if (message.type === "image") {
                bodyContent = message.image?.caption || "[Gambar]";
                type = "IMAGE";
                mediaId = message.image?.id;
              } else if (message.type === "video") {
                bodyContent = message.video?.caption || "[Video]";
                type = "VIDEO";
                mediaId = message.video?.id;
              } else if (message.type === "document") {
                bodyContent = message.document?.caption || message.document?.filename || "[Dokumen]";
                type = "DOCUMENT";
                mediaId = message.document?.id;
              } else if (message.type === "audio") {
                bodyContent = "[Audio]";
                type = "AUDIO";
                mediaId = message.audio?.id;
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

              // Fetch media URL if it's a media message
              let mediaUrl = null;
              if (mediaId) {
                const mediaRes = await getWaMediaUrl(mediaId);
                if (mediaRes.success && mediaRes.url) {
                  // Download and save locally because Meta URLs require Auth headers
                  const buffer = await downloadWaMedia(mediaRes.url);
                  if (buffer) {
                    const ext = type === 'IMAGE' ? '.jpg' : type === 'VIDEO' ? '.mp4' : type === 'AUDIO' ? '.ogg' : '.pdf';
                    const filename = `wa-${mediaId}${ext}`;
                    const uploadDir = path.join(process.cwd(), "public", "uploads");
                    
                    await mkdir(uploadDir, { recursive: true });
                    await writeFile(path.join(uploadDir, filename), buffer);
                    
                    // Use relative URL for local storage
                    mediaUrl = `/uploads/${filename}`;
                  }
                }
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
                      mediaUrl: mediaUrl,
                      mediaCaption: type !== 'TEXT' ? bodyContent : null,
                      fromMe: false,
                      createdAt: timestamp,
                    },
                  });
                  console.log(`[WEBHOOK] Message saved successfully: ${messageId}`);
                } else {
                  console.log(`[WEBHOOK] Skipping duplicate message: ${messageId}`);
                }

                // --- START CHATBOT FAQ LOGIC ---
                try {
                  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
                  
                  if (settings?.waChatbotEnabled) {
                    const faqs = await prisma.waFaq.findMany({
                      where: { isActive: true },
                      orderBy: { order: 'asc' }
                    });

                    const incomingText = bodyContent.trim().toLowerCase();
                    const matchedFaq = faqs.find(f => f.keyword.toLowerCase() === incomingText);

                    if (matchedFaq) {
                      // Send the answer for the matched keyword
                      const sendResult = await sendWaText(cleanWaId, matchedFaq.answer);
                      if (sendResult.success) {
                        await prisma.waMessage.create({
                          data: {
                            chatId: chat.id,
                            body: matchedFaq.answer,
                            fromMe: true,
                            status: 'SENT',
                            waMessageId: sendResult.data?.messages?.[0]?.id,
                          }
                        });
                      }
                    } else if (isNewChat || incomingText === 'menu' || incomingText === 'bantuan') {
                      // Send Welcome Message + Menu List
                      let menuText = settings.waChatbotWelcomeMsg || "Halo! Ada yang bisa kami bantu?\n\nSilakan pilih menu di bawah ini dengan mengetikkan nomornya:\n";
                      
                      faqs.forEach(faq => {
                        menuText += `\n*${faq.keyword}*. ${faq.question}`;
                      });

                      const sendResult = await sendWaText(cleanWaId, menuText);
                      if (sendResult.success) {
                        await prisma.waMessage.create({
                          data: {
                            chatId: chat.id,
                            body: menuText,
                            fromMe: true,
                            status: 'SENT',
                            waMessageId: sendResult.data?.messages?.[0]?.id,
                          }
                        });
                      }
                    }
                  }
                } catch (chatbotErr) {
                  console.error("[WEBHOOK] Chatbot FAQ error:", chatbotErr);
                }
                // --- END CHATBOT FAQ LOGIC ---

                // Dynamic Auto-reply logic (Existing)
                try {
                  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
                  
                  if (settings?.waAutoReplyEnabled && settings.waAutoReplyMessage) {
                    const now = new Date();
                    // Meta sends timestamp, but let's use server time for operational hours check
                    // Adjust to Asia/Bangkok if needed, but new Date() follows server time
                    
                    const day = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon, 7=Sun
                    const timeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
                    
                    const workingDays = settings.waWorkingDays?.split(',') || [];
                    const isWorkingDay = workingDays.includes(day.toString());
                    
                    const isWithinHours = 
                      timeStr >= (settings.waWorkingHoursStart || "08:00") && 
                      timeStr <= (settings.waWorkingHoursEnd || "17:00");

                    // Trigger if it's NOT a working day OR NOT within working hours
                    if (isNewChat && (!isWorkingDay || !isWithinHours)) {
                      console.log(`[WEBHOOK] Triggering dynamic off-hours auto-reply`);
                      const autoMsg = settings.waAutoReplyMessage;
                      
                      const sendResult = await sendWaText(cleanWaId, autoMsg);
                      if (sendResult.success) {
                        await prisma.waMessage.create({
                          data: {
                            chatId: chat.id,
                            body: autoMsg,
                            fromMe: true,
                            status: 'SENT',
                            waMessageId: sendResult.data?.messages?.[0]?.id,
                          }
                        });
                      }
                    }
                  }
                } catch (settingsErr) {
                  console.error("[WEBHOOK] Auto-reply settings error:", settingsErr);
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
