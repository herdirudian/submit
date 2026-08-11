"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendWaText, sendWaTemplate, getWaMetaTemplates } from "@/lib/whatsapp";
import { revalidatePath } from "next/cache";

export async function getWaChats() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  console.log(`[ACTION] Fetching chats for user: ${session.user.email}`);
  const chats = await prisma.waChat.findMany({
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

export async function getWaTemplates() {
  return await prisma.waTemplate.findMany();
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
    
    // Upsert templates into database
    for (const template of templates) {
      // Extract body content from components
      const bodyComponent = template.components?.find((c: any) => c.type === 'BODY');
      const content = bodyComponent?.text || "";

      await prisma.waTemplate.upsert({
        where: { name: template.name },
        update: {
          category: template.category,
          language: template.language,
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

export async function updateChatContactAction(chatId: string, contactId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.waChat.update({
    where: { id: chatId },
    data: { contactId },
  });

  revalidatePath("/whatsapp");
}
