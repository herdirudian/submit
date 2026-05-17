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
  headerImageUrl?: string;
  footerImageUrl?: string;
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

  const [campaign, settings] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id },
      include: { contactList: { include: { members: { include: { contact: true } } } } }
    }),
    prisma.appSettings.findUnique({ where: { id: "singleton" } })
  ]);

  if (!campaign) throw new Error("Campaign not found");
  if (!campaign.contactList) throw new Error("No contact list selected");

  const contacts = campaign.contactList.members.map(m => m.contact);
  if (contacts.length === 0) throw new Error("Contact list is empty");

  const brandName = settings?.brandName || "The Lodge Group";
  const brandLogo = campaign.headerImageUrl || settings?.brandLogoUrl || `${process.env.NEXTAUTH_URL}/logotlm.png`;
  const footerImage = campaign.footerImageUrl;

  // Update status to SENDING
  await prisma.campaign.update({
    where: { id },
    data: { status: 'SENDING' }
  });

  // Logic for sending
  for (const contact of contacts) {
    try {
      // 1. Personalization
      let bodyContent = campaign.content;
      bodyContent = bodyContent.replace(/{{name}}/g, contact.name || "Sobat");
      bodyContent = bodyContent.replace(/{{email}}/g, contact.email);
      bodyContent = bodyContent.replace(/{{company}}/g, contact.company || "");

      // 2. Unsubscribe Link
      const unsubscribeUrl = `${process.env.NEXTAUTH_URL}/api/blast/unsubscribe?id=${contact.id}`;
      
      // 3. Wrap with Template
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa; color: #334155; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7fa; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: sans-serif; color: #334155; border-radius: 8px; overflow: hidden; margin-top: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .header { padding: 30px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #f1f5f9; }
            .content { padding: 40px; line-height: 1.6; font-size: 16px; }
            .footer { padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }
            .logo { max-height: 100px; width: auto; max-width: 100%; }
            .footer-img { max-height: 150px; width: auto; max-width: 100%; margin: 0 auto 20px; border-radius: 4px; }
            img { max-width: 100%; height: auto; display: block; margin: 20px 0; border-radius: 8px; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            a { color: #2563eb; text-decoration: underline; }
            .unsubscribe { color: #94a3b8; text-decoration: underline; }
          </style>
        </head>
        <body>
          <center class="wrapper">
            <table class="main" width="100%">
              <tr>
                <td class="header">
                  <img src="${brandLogo}" alt="${brandName}" class="logo" style="margin: 0 auto;">
                </td>
              </tr>
              <tr>
                <td class="content">
                  ${bodyContent}
                </td>
              </tr>
              <tr>
                <td class="footer">
                  ${footerImage ? `<img src="${footerImage}" alt="Footer" class="footer-img" style="margin: 0 auto 20px;">` : ""}
                  <p style="margin: 0 0 10px 0;"><strong>${brandName}</strong></p>
                  <p style="margin: 0 0 20px 0;">Email ini dikirimkan secara otomatis oleh sistem ${brandName}.</p>
                  <p style="margin: 0;">
                    <a href="${unsubscribeUrl}" class="unsubscribe">Berhenti berlangganan</a>
                  </p>
                </td>
              </tr>
            </table>
          </center>
        </body>
        </html>
      `;

      // 4. Send Email
      await sendEmail({
        to: contact.email,
        subject: campaign.subject,
        html: html,
      });

      // 5. Log the success
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
