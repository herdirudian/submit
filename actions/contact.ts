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
} = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, pageSize = 20, search, status, tag, listId } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { name: { contains: search } },
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

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        lists: {
          include: { list: true }
        }
      }
    }),
    prisma.contact.count({ where }),
  ]);

  return { contacts, total, pages: Math.ceil(total / pageSize) };
}

export async function createContact(data: {
  email: string;
  name?: string;
  company?: string;
  city?: string;
  tags?: string;
  customFields?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const contact = await prisma.contact.create({
    data: {
      ...data,
      email: data.email.toLowerCase().trim(),
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
      email: data.email?.toLowerCase().trim(),
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
      const saved = await prisma.contact.upsert({
        where: { email: contact.email.toLowerCase().trim() },
        update: {
          name: contact.name,
          company: contact.company,
          city: contact.city,
          tags: contact.tags,
          customFields: contact.customFields ? JSON.stringify(contact.customFields) : undefined,
        },
        create: {
          email: contact.email.toLowerCase().trim(),
          name: contact.name,
          company: contact.company,
          city: contact.city,
          tags: contact.tags,
          customFields: contact.customFields ? JSON.stringify(contact.customFields) : undefined,
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
