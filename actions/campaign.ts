"use server";

import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CampaignStatus } from "@prisma/client";

export async function getCampaigns() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      contactList: { select: { name: true } },
      _count: { select: { logs: true } }
    }
  });
}

export async function createCampaign(data: {
  name: string;
  subject: string;
  content: string;
  previewText?: string;
  contactListId?: string;
  templateId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const campaign = await prisma.campaign.create({
    data: {
      ...data,
      status: 'DRAFT'
    }
  });

  revalidatePath("/campaigns");
  return campaign;
}

export async function deleteCampaign(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.campaign.delete({ where: { id } });

  revalidatePath("/campaigns");
}

export async function sendCampaignNow(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { contactList: { include: { members: { include: { contact: true } } } } }
  });

  if (!campaign) throw new Error("Campaign not found");
  if (!campaign.contactList) throw new Error("No contact list selected");

  const contacts = campaign.contactList.members.map(m => m.contact);
  if (contacts.length === 0) throw new Error("Contact list is empty");

  // Update status to SENDING
  await prisma.campaign.update({
    where: { id },
    data: { status: 'SENDING' }
  });

  // In a real app, this would be a background job. 
  // For now, we'll do it synchronously or in a simple loop
  // (Note: This might timeout for very large lists)
  
  // Logic for sending
  for (const contact of contacts) {
    try {
      // 1. Personalization
      let personalizedContent = campaign.content;
      personalizedContent = personalizedContent.replace(/{{name}}/g, contact.name || "Sobat");
      personalizedContent = personalizedContent.replace(/{{email}}/g, contact.email);
      personalizedContent = personalizedContent.replace(/{{company}}/g, contact.company || "");

      // 2. Unsubscribe Link (Simple version for demo)
      const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/api/blast/unsubscribe?id=${contact.id}`;
      personalizedContent += `<br/><br/><hr/><p style="font-size: 12px; color: #94a3b8;">
        Anda menerima email ini karena terdaftar di list kami. 
        <a href="${unsubscribeUrl}">Berhenti berlangganan</a></p>`;

      // 3. Send Email
      await sendEmail({
        to: contact.email,
        subject: campaign.subject,
        html: personalizedContent,
      });

      // 4. Log the success
      await prisma.emailLog.create({
        data: {
          campaignId: id,
          contactId: contact.id,
          status: 'SENT',
        }
      });
    } catch (error: any) {
      await prisma.emailLog.create({
        data: {
          campaignId: id,
          contactId: contact.id,
          status: 'FAILED',
          errorMessage: error.message
        }
      });
    }
  }

  await prisma.campaign.update({
    where: { id },
    data: { 
      status: 'SENT',
      sentAt: new Date(),
      totalSent: contacts.length
    }
  });

  revalidatePath("/campaigns");
  revalidatePath("/blast-email");
}
