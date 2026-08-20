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
  let toWaId = chat.waId;
  if (toWaId.startsWith('0')) {
    toWaId = '62' + toWaId.substring(1);
  }
  
  const result = await sendWaText(toWaId, body);
  
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

  const templates = await prisma.waTemplate.findMany({
    where: { status: "APPROVED" },
    orderBy: { name: "asc" },
  });

  return templates.map(t => ({
    ...t,
    components: t.components ? (typeof t.components === 'string' ? JSON.parse(t.components) : t.components) : []
  }));
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
  
  let toWaId = chat.waId;
  if (toWaId.startsWith('0')) {
    toWaId = '62' + toWaId.substring(1);
  }

  const result = await sendWaMedia(toWaId, type.toLowerCase(), absoluteUrl, caption);
  
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

export async function sendWaTemplateAction(chatId: string, templateName: string, languageCode: string, components: any[], bodyPreview: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const chat = await prisma.waChat.findUnique({
    where: { id: chatId },
  });

  if (!chat) throw new Error("Chat not found");

  let toWaId = chat.waId;
  if (toWaId.startsWith('0')) {
    toWaId = '62' + toWaId.substring(1);
  }

  const result = await sendWaTemplate(toWaId, templateName, languageCode, components);
  
  if (result.success) {
    const msg = await prisma.waMessage.create({
      data: {
        chatId,
        waMessageId: result.data.messages[0].id,
        body: bodyPreview,
        fromMe: true,
        senderId: (session.user as any).id,
      },
    });

    await prisma.waChat.update({
      where: { id: chatId },
      data: {
        lastMessage: bodyPreview,
        lastMessageAt: new Date(),
      },
    });

    revalidatePath("/whatsapp");
    return msg;
  } else {
    throw new Error(result.error?.error?.message || "Gagal mengirim template");
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

export async function startNewChatAction(waId: string, name?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    // Clean waId (remove +, spaces, etc)
    const cleanWaId = waId.replace(/\D/g, "");
    if (!cleanWaId) throw new Error("Nomor WhatsApp tidak valid");

    console.log(`[CRM] Starting new chat for: ${cleanWaId} (Name: ${name || 'N/A'})`);

    // 1. Find existing chat
    let chat = await prisma.waChat.findUnique({
      where: { waId: cleanWaId },
      include: { contact: true }
    });

    // 2. Find or Create Contact
    let contact = chat?.contact;
    if (!contact) {
      contact = await prisma.contact.findFirst({
        where: { OR: [{ phone: cleanWaId }, { waNumber: cleanWaId }] },
      });
    }

    if (!contact && name) {
      contact = await prisma.contact.create({
        data: {
          name,
          phone: cleanWaId,
          waNumber: cleanWaId,
          customerType: "Pelanggan",
          ticketType: "Umum"
        }
      });
    } else if (contact && name && !contact.name) {
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: { name }
      });
    }

    // 3. Create or Update Chat
    if (!chat) {
      chat = await prisma.waChat.create({
        data: {
          waId: cleanWaId,
          contactId: contact?.id,
        },
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
    } else if (contact && chat.contactId !== contact.id) {
      chat = await prisma.waChat.update({
        where: { id: chat.id },
        data: { contactId: contact.id },
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
    } else {
      // Always ensure we include the _count even for existing chats
      chat = await prisma.waChat.findUnique({
        where: { id: chat.id },
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
    }

    revalidatePath("/whatsapp");
    
    // Return a clean object to avoid serialization issues
    return JSON.parse(JSON.stringify(chat));
  } catch (error: any) {
    console.error("[CRM-ERROR] startNewChatAction:", error);
    throw new Error(error.message || "Gagal memulai chat");
  }
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

    // Hapus template lokal yang sudah tidak ada di Meta (dihapus/di-archive di Meta dan tidak direturn oleh API)
    if (templates.length > 0) {
      await prisma.waTemplate.deleteMany({
        where: {
          NOT: {
            OR: templates.map((t: any) => ({
              name: t.name,
              language: t.language
            }))
          }
        }
      });
    } else {
      // Jika tidak ada template sama sekali dari Meta, hapus semua template lokal
      await prisma.waTemplate.deleteMany({});
    }

    revalidatePath("/whatsapp");
    return { success: true, count: templates.length };
  } catch (error: any) {
    console.error("syncWaTemplatesAction Error:", error);
    return { success: false, error: error.message || "Terjadi kesalahan sistem saat sinkronisasi." };
  }
}
