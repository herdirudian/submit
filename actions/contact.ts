"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContactStatus } from "@prisma/client";

export async function getContacts(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ContactStatus;
  tag?: string;
  listId?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, pageSize = 20, search, status, tag, listId, startDate, endDate } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { name: { contains: search } },
      { phone: { contains: search } },
      { waNumber: { contains: search } },
      { company: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (tag) where.tags = { contains: tag };
  if (listId) {
    where.lists = {
      some: {
        contactListId: listId
      }
    };
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.createdAt.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        lists: {
          include: { list: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    }),
    prisma.contact.count({ where }),
  ]);

  return { contacts, total, pages: Math.ceil(total / pageSize) };
}

export async function getAllContactsForExport(params: {
  search?: string;
  status?: ContactStatus;
  tag?: string;
  listId?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const { search, status, tag, listId, startDate, endDate } = params;

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { name: { contains: search } },
      { phone: { contains: search } },
      { waNumber: { contains: search } },
      { company: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (tag) where.tags = { contains: tag };
  if (listId) {
    where.lists = {
      some: {
        contactListId: listId
      }
    };
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.createdAt.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      lists: {
        include: { list: true }
      },
      createdBy: {
        select: { name: true }
      },
      updatedBy: {
        select: { name: true }
      }
    }
  });

  return contacts.map(c => ({
    "Nama": c.name || "-",
    "Email": c.email || "-",
    "Nomor WA": c.waNumber || c.phone || "-",
    "Kota/Negara": c.city || "-",
    "Perusahaan": c.company || "-",
    "Tiket": (c as any).ticketType || "-",
    "Type of Customer": (c as any).customerType || "-",
    "Jumlah Pengunjung": c.visitors || 1,
    "Sumber Info": c.infoSource || "-",
    "Status": c.status,
    "Tags": c.tags || "-",
    "List/Segmen": c.lists.map(l => l.list.name).join(", ") || "-",
    "Dibuat Oleh": c.createdBy?.name || "System",
    "Diupdate Oleh": c.updatedBy?.name || "-",
    "Tanggal Dibuat": c.createdAt.toISOString().split("T")[0]
  }));
}

export async function createContact(data: {
  email?: string;
  name?: string;
  phone?: string;
  waNumber?: string;
  ticketType?: string;
  customerType?: string;
  visitors?: number;
  infoSource?: string;
  company?: string;
  city?: string;
  tags?: string;
  customFields?: string;
  listId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (!data.ticketType?.trim()) throw new Error("Tiket yang dibeli wajib dipilih.");
  if (!data.customerType?.trim()) throw new Error("Type of Customer wajib dipilih.");

  const { listId, ...contactData } = data;

  const contact = await prisma.contact.create({
    data: {
      ...contactData,
      email: contactData.email ? contactData.email.toLowerCase().trim() : null,
      createdById: session.user.id,
      updatedById: session.user.id,
      ...(listId ? {
        lists: {
          create: {
            contactListId: listId
          }
        }
      } : {})
    },
  });

  revalidatePath("/contacts");
  revalidatePath("/campaigns/new");
  revalidatePath("/campaigns");
  return contact;
}

export async function updateContact(id: string, data: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...data,
      email: data.email ? data.email.toLowerCase().trim() : (data.email === "" ? null : undefined),
      updatedById: session.user.id,
    },
  });

  revalidatePath("/contacts");
  revalidatePath("/campaigns/new");
  revalidatePath("/campaigns");
  return contact;
}

export async function deleteContact(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if ((session.user as any).role === 'CASHIER') throw new Error("Akses ditolak: Cashier tidak dapat menghapus kontak.");

  await prisma.contact.delete({ where: { id } });

  revalidatePath("/contacts");
  revalidatePath("/campaigns/new");
  revalidatePath("/campaigns");
}

export async function importContacts(
  contacts: any[],
  options?: { listId?: string; listName?: string; listDescription?: string },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  let successCount = 0;
  let errorCount = 0;
  const importedIds: string[] = [];

  let listId = (options?.listId ?? "").trim();
  const listName = (options?.listName ?? "").trim();
  const listDescription = (options?.listDescription ?? "").trim();

  if (!listId && listName) {
    const list = await prisma.contactList.create({
      data: {
        name: listName,
        ...(listDescription ? { description: listDescription } : {}),
      },
      select: { id: true },
    });
    listId = list.id;
  }

  for (const contact of contacts) {
    try {
      let whereClause: any = { id: 'placeholder-to-force-create' };
      
      if (contact.email) {
        whereClause = { email: contact.email.toLowerCase().trim() };
      } else if (contact.waNumber) {
        // Find existing contact by waNumber
        const existing = await prisma.contact.findFirst({ where: { waNumber: contact.waNumber } });
        if (existing) whereClause = { id: existing.id };
      } else if (contact.phone) {
        // Find existing contact by phone
        const existing = await prisma.contact.findFirst({ where: { phone: contact.phone } });
        if (existing) whereClause = { id: existing.id };
      }

      const saved = await prisma.contact.upsert({
        where: whereClause,
        update: {
          name: contact.name,
          phone: contact.phone,
          waNumber: contact.waNumber,
          ticketType: contact.ticketType,
          customerType: contact.customerType,
          visitors: contact.visitors,
          infoSource: contact.infoSource,
          company: contact.company,
          city: contact.city,
          tags: contact.tags,
          customFields: contact.customFields ? JSON.stringify(contact.customFields) : undefined,
          updatedById: session.user.id,
        },
        create: {
          email: contact.email ? contact.email.toLowerCase().trim() : null,
          name: contact.name,
          phone: contact.phone,
          waNumber: contact.waNumber,
          ticketType: contact.ticketType,
          customerType: contact.customerType,
          visitors: contact.visitors,
          infoSource: contact.infoSource,
          company: contact.company,
          city: contact.city,
          tags: contact.tags,
          customFields: contact.customFields ? JSON.stringify(contact.customFields) : undefined,
          createdById: session.user.id,
          updatedById: session.user.id,
        },
        select: { id: true },
      });
      importedIds.push(saved.id);
      successCount++;
    } catch (error) {
      console.error("Import error for contact:", contact.email, error);
      errorCount++;
    }
  }

  if (listId && importedIds.length > 0) {
    await prisma.contactListMember.createMany({
      data: importedIds.map((contactId) => ({ contactId, contactListId: listId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/contacts");
  revalidatePath("/campaigns/new");
  revalidatePath("/campaigns");
  return { successCount, errorCount };
}

export async function getContactLists() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.contactList.findMany({
    include: {
      _count: {
        select: { members: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createContactList(data: { name: string; description?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const list = await prisma.contactList.create({ data });

  revalidatePath("/contacts");
  return list;
}

export async function deleteContactList(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if ((session.user as any).role === 'CASHIER') throw new Error("Akses ditolak: Cashier tidak dapat menghapus list.");

  await prisma.contactList.delete({ where: { id } });

  revalidatePath("/contacts");
}

export async function addContactsToList(listId: string, contactIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = contactIds.map(contactId => ({
    contactId,
    contactListId: listId
  }));

  await prisma.contactListMember.createMany({
    data,
    skipDuplicates: true
  });

  revalidatePath("/contacts");
  revalidatePath("/campaigns/new");
  revalidatePath("/campaigns");
}

export async function removeContactFromList(listId: string, contactId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if ((session.user as any).role === 'CASHIER') throw new Error("Akses ditolak: Cashier tidak dapat mengeluarkan kontak dari list.");

  await prisma.contactListMember.delete({
    where: {
      contactId_contactListId: {
        contactId,
        contactListId: listId
      }
    }
  });

  revalidatePath("/contacts");
  revalidatePath("/campaigns/new");
  revalidatePath("/campaigns");
}
