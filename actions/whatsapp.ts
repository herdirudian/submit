"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendWaText, sendWaTemplate, getWaMetaTemplates, sendWaMedia } from "@/lib/whatsapp";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { ChatStatus } from "@prisma/client";

export async function getWaChats(params: { status?: ChatStatus; tag?: string } = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const { status, tag } = params;
  const where: any = {};
  
  if (status) where.status = status;
  if (tag) {
    where.contact = {
      tags: { contains: tag }
    };
  }

  console.log(`[ACTION] Fetching chats for user: ${session.user.email} with params:`, params);
  const chats = await prisma.waChat.findMany({
    where,
    orderBy: { lastMessageAt: 'desc' },
    include: {
      contact: true,
      assignedTo: { select: { id: true, name: true } },
      _count: {
        select: {
          messages: {
            where: { fromMe: false, status: { not: 'READ' } }
          }
        }
      }
    }
  });
  console.log(`[ACTION] Found ${chats.length} chats.`);
  return chats;
}

export async function updateChatStatusAction(chatId: string, status: ChatStatus) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.waChat.update({
    where: { id: chatId },
    data: { status },
  });

  revalidatePath("/whatsapp");
}

export async function getWaChatMessages(chatId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  console.log(`[ACTION] Fetching messages for chatId: ${chatId}`);
  const messages = await prisma.waMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`[ACTION] Found ${messages.length} messages for chatId: ${chatId}`);
  return messages;
}

export async function sendWaMessageAction(chatId: string, body: string, isInternal: boolean = false) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const chat = await prisma.waChat.findUnique({
    where: { id: chatId },
  });

  if (!chat) throw new Error("Chat not found");

  if (isInternal) {
    const msg = await prisma.waMessage.create({
      data: {
        chatId,
        body,
        fromMe: true,
        isInternal: true,
        senderId: (session.user as any).id,
      },
    });
    revalidatePath("/whatsapp");
    return msg;
  }

  // External WhatsApp message
  const result = await sendWaText(chat.waId, body);
  
  if (result.success) {
    const msg = await prisma.waMessage.create({
      data: {
        chatId,
        waMessageId: result.data.messages[0].id,
        body,
        fromMe: true,
        senderId: (session.user as any).id,
      },
    });

    await prisma.waChat.update({
      where: { id: chatId },
      data: {
        lastMessage: body,
        lastMessageAt: new Date(),
      },
    });

    revalidatePath("/whatsapp");
    return msg;
  } else {
    throw new Error(result.error?.error?.message || "Gagal mengirim pesan");
  }
}

export async function getWaTemplates() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.waTemplate.findMany({
    where: { status: "APPROVED" },
    orderBy: { name: "asc" },
  });
}

export async function sendWaMediaAction(chatId: string, type: any, url: string, caption?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const chat = await prisma.waChat.findUnique({
    where: { id: chatId },
  });

  if (!chat) throw new Error("Chat not found");
  
  // Convert relative URL to absolute for Meta API (they need to download it)
  let absoluteUrl = url;
  if (url.startsWith("/")) {
    const host = headers().get("host");
    const protocol = headers().get("x-forwarded-proto") || "http";
    absoluteUrl = `${protocol}://${host}${url}`;
  }
  
  const result = await sendWaMedia(chat.waId, type.toLowerCase(), absoluteUrl, caption);
  
  if (result.success) {
    const msg = await prisma.waMessage.create({
      data: {
        chatId,
        waMessageId: result.data.messages[0].id,
        body: caption || `[${type}]`,
        type: type,
        mediaUrl: url,
        mediaCaption: caption,
        fromMe: true,
        senderId: (session.user as any).id,
      },
    });

    await prisma.waChat.update({
      where: { id: chatId },
      data: {
        lastMessage: caption || `[${type}]`,
        lastMessageAt: new Date(),
      },
    });

    revalidatePath("/whatsapp");
    return msg;
  } else {
    throw new Error(result.error?.error?.message || "Gagal mengirim media");
  }
}

export async function assignChatAction(chatId: string, userId: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.waChat.update({
    where: { id: chatId },
    data: { assignedToId: userId },
  });

  revalidatePath("/whatsapp");
}

export async function getAgents() {
  return await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });
}

export async function getWaQuickReplies() {
  return await prisma.waQuickReply.findMany({
    orderBy: { shortcut: 'asc' }
  });
}

export async function createWaQuickReply(data: { shortcut: string, content: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  // Ensure shortcut starts with /
  if (!data.shortcut.startsWith("/")) {
    data.shortcut = "/" + data.shortcut;
  }

  const result = await prisma.waQuickReply.create({ data });
  revalidatePath("/whatsapp/quick-replies");
  return result;
}

export async function updateWaQuickReply(id: string, data: { shortcut: string, content: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  if (!data.shortcut.startsWith("/")) {
    data.shortcut = "/" + data.shortcut;
  }

  const result = await prisma.waQuickReply.update({
    where: { id },
    data
  });
  revalidatePath("/whatsapp/quick-replies");
  return result;
}

export async function deleteWaQuickReply(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.waQuickReply.delete({ where: { id } });
  revalidatePath("/whatsapp/quick-replies");
}

export async function startNewChatAction(waId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  // Clean waId (remove +, spaces, etc)
  const cleanWaId = waId.replace(/\D/g, "");

  let chat = await prisma.waChat.findUnique({
    where: { waId: cleanWaId },
  });

  if (!chat) {
    const contact = await prisma.contact.findFirst({
      where: { OR: [{ phone: cleanWaId }, { waNumber: cleanWaId }] },
    });

    chat = await prisma.waChat.create({
      data: {
        waId: cleanWaId,
        contactId: contact?.id,
      },
    });
  }

  revalidatePath("/whatsapp");
  return chat;
}

export async function markMessagesAsReadAction(chatId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const unreadMessages = await prisma.waMessage.findMany({
    where: {
      chatId,
      fromMe: false,
      status: { not: 'READ' },
      waMessageId: { not: null }
    },
    select: { waMessageId: true }
  });

  if (unreadMessages.length > 0) {
    // Notify Meta Cloud API
    const { markWaAsRead } = await import("@/lib/whatsapp");
    for (const msg of unreadMessages) {
      if (msg.waMessageId) {
        await markWaAsRead(msg.waMessageId);
      }
    }

    // Update local database
    await prisma.waMessage.updateMany({
      where: {
        chatId,
        fromMe: false,
        status: { not: 'READ' }
      },
      data: {
        status: 'READ'
      }
    });

    revalidatePath("/whatsapp");
  }
}

export async function updateChatContactAction(chatId: string, contactId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.waChat.update({
    where: { id: chatId },
    data: { contactId },
  });

  revalidatePath("/whatsapp");
}

export async function syncWaTemplatesAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  try {
    const result = await getWaMetaTemplates();
    if (!result.success) {
      // Jangan throw error yang bikin crash, kembalikan pesan error yang ramah
      return { 
        success: false, 
        error: typeof result.error === 'string' ? result.error : "Gagal mengambil template dari Meta. Pastikan WABA ID dan Token benar." 
      };
    }

    const templates = result.data;
    console.log(`[SYNC-WA] Received ${templates.length} templates from Meta.`);
    
    // Upsert templates into database
    for (const template of templates) {
      console.log(`[SYNC-WA] Processing template: ${template.name} (${template.language})`);
      
      // Extract body content from components
      const bodyComponent = template.components?.find((c: any) => c.type === 'BODY');
      const content = bodyComponent?.text || "";

      // Debugging: check if media header has example
      const headerComponent = template.components?.find((c: any) => c.type === 'HEADER');
      if (headerComponent && headerComponent.example) {
        console.log(`[SYNC-WA] Template ${template.name} has HEADER example:`, JSON.stringify(headerComponent.example, null, 2));
      } else if (headerComponent) {
        console.warn(`[SYNC-WA] Template ${template.name} has HEADER but NO example data!`);
      }

      await prisma.waTemplate.upsert({
        where: { 
          name_language: {
            name: template.name,
            language: template.language
          }
        },
        update: {
          category: template.category,
          content: content,
          components: JSON.stringify(template.components),
          status: template.status,
        },
        create: {
          name: template.name,
          category: template.category,
          language: template.language,
          content: content,
          components: JSON.stringify(template.components),
          status: template.status,
        },
      });
    }

    revalidatePath("/whatsapp");
    return { success: true, count: templates.length };
  } catch (error: any) {
    console.error("syncWaTemplatesAction Error:", error);
    return { success: false, error: error.message || "Terjadi kesalahan sistem saat sinkronisasi." };
  }
}
