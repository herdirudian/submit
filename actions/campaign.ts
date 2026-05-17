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
  ctaText?: string;
  ctaUrl?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const campaign = await prisma.campaign.create({
    data: {
      name: data.name,
      subject: data.subject,
      content: data.content,
      previewText: data.previewText,
      contactListId: data.contactListId,
      templateId: data.templateId,
      headerImageUrl: data.headerImageUrl,
      footerImageUrl: data.footerImageUrl,
      ctaText: data.ctaText,
      ctaUrl: data.ctaUrl,
      status: 'DRAFT'
    }
  });

  revalidatePath("/campaigns");
  return campaign;
}

export async function getCampaign(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.campaign.findUnique({
    where: { id },
    include: { contactList: true }
  });
}

export async function updateCampaign(id: string, data: {
  name?: string;
  subject?: string;
  content?: string;
  previewText?: string;
  contactListId?: string;
  templateId?: string;
  headerImageUrl?: string;
  footerImageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const campaign = await prisma.campaign.update({
    where: { id },
    data
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
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
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; color: #333333; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f8f9fa; padding: 20px 0; }
            .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: sans-serif; color: #333333; }
            .header { padding: 20px 30px; text-align: left; background-color: #ffffff; border-bottom: 1px solid #eeeeee; }
            .hero-img { width: 100% !important; height: auto !important; display: block; }
            .content { padding: 40px 30px; line-height: 1.6; font-size: 16px; text-align: left; }
            .footer { padding: 40px 30px; text-align: center; font-size: 12px; color: #666666; background-color: #ffffff; border-top: 1px solid #eeeeee; }
            .logo { max-height: 50px; width: auto; }
            .footer-img { max-width: 100%; height: auto; margin-bottom: 20px; border-radius: 4px; }
            
            h1, h2, h3 { color: #222222; text-align: center; margin-bottom: 20px; line-height: 1.3; }
            p { margin-bottom: 15px; }
            ul { margin-bottom: 15px; padding-left: 20px; }
            li { margin-bottom: 8px; }
            
            .cta-container { text-align: center; padding: 20px 0; }
            .btn { display: inline-block; padding: 14px 30px; background-color: #e31937; color: #ffffff !important; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(227, 25, 55, 0.2); }
            
            .contact-section { margin-top: 30px; padding-top: 20px; border-top: 1px dashed #dddddd; text-align: center; }
            .social-icons { margin: 20px 0; }
            .social-icons a { margin: 0 8px; display: inline-block; }
            .address { font-size: 11px; color: #999999; margin-top: 20px; line-height: 1.4; }
            .unsubscribe { color: #999999; text-decoration: underline; font-size: 11px; }
            
            @media screen and (max-width: 600px) {
              .main { width: 100% !important; }
              .content { padding: 30px 20px !important; }
            }
          </style>
        </head>
        <body>
          <center class="wrapper">
            <table class="main" width="100%" cellpadding="0" cellspacing="0">
              <!-- Header -->
              <tr>
                <td class="header">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="left">
                        <img src="${brandLogo}" alt="${brandName}" class="logo">
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Hero Image (optional header image) -->
              ${campaign.headerImageUrl ? `
              <tr>
                <td>
                  <img src="${campaign.headerImageUrl}" alt="Hero" class="hero-img">
                </td>
              </tr>
              ` : ""}

              <!-- Content Body -->
              <tr>
                <td class="content">
                  ${bodyContent}
                  
                  ${campaign.ctaText && campaign.ctaUrl ? `
                  <div class="cta-container">
                    <a href="${campaign.ctaUrl}" class="btn">${campaign.ctaText}</a>
                  </div>
                  ` : ""}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td class="footer">
                  ${footerImage ? `<img src="${footerImage}" alt="Footer Banner" class="footer-img">` : ""}
                  
                  <div class="contact-section">
                    <p style="font-weight: bold; font-size: 14px; margin-bottom: 10px;">Punya Pertanyaan?</p>
                    <p style="font-size: 13px; margin-bottom: 5px;">Hubungi kami di:</p>
                    <p style="font-size: 13px; font-weight: bold; color: #222222;">
                      ${settings?.notificationFromEmail || "cs@thelodgegroup.id"}
                    </p>
                  </div>

                  <div class="address">
                    <p style="margin-bottom: 5px;"><strong>${brandName}</strong></p>
                    <p style="margin: 0;">Email ini dikirimkan secara otomatis oleh sistem ${brandName}.</p>
                    <p style="margin-top: 15px;">
                      <a href="${unsubscribeUrl}" class="unsubscribe">Berhenti berlangganan</a>
                    </p>
                  </div>
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

export async function renderCampaignPreview(data: {
  content: string;
  headerImageUrl?: string;
  footerImageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  
  const brandName = settings?.brandName || "The Lodge Group";
  const brandLogo = data.headerImageUrl || settings?.brandLogoUrl || `${process.env.NEXTAUTH_URL}/logotlm.png`;
  const footerImage = data.footerImageUrl;
  
  let bodyContent = data.content;
  bodyContent = bodyContent.replace(/{{name}}/g, "Sobat");
  bodyContent = bodyContent.replace(/{{email}}/g, "sobat@example.com");
  bodyContent = bodyContent.replace(/{{company}}/g, "Perusahaan Sobat");

  const unsubscribeUrl = "#";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; color: #333333; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f8f9fa; padding: 20px 0; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: sans-serif; color: #333333; }
        .header { padding: 20px 30px; text-align: left; background-color: #ffffff; border-bottom: 1px solid #eeeeee; }
        .hero-img { width: 100% !important; height: auto !important; display: block; }
        .content { padding: 40px 30px; line-height: 1.6; font-size: 16px; text-align: left; }
        .footer { padding: 40px 30px; text-align: center; font-size: 12px; color: #666666; background-color: #ffffff; border-top: 1px solid #eeeeee; }
        .logo { max-height: 50px; width: auto; }
        .footer-img { max-width: 100%; height: auto; margin-bottom: 20px; border-radius: 4px; }
        h1, h2, h3 { color: #222222; text-align: center; margin-bottom: 20px; line-height: 1.3; }
        p { margin-bottom: 15px; }
        .cta-container { text-align: center; padding: 20px 0; }
        .btn { display: inline-block; padding: 14px 30px; background-color: #e31937; color: #ffffff !important; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(227, 25, 55, 0.2); }
        .contact-section { margin-top: 30px; padding-top: 20px; border-top: 1px dashed #dddddd; text-align: center; }
        .address { font-size: 11px; color: #999999; margin-top: 20px; line-height: 1.4; }
        .unsubscribe { color: #999999; text-decoration: underline; font-size: 11px; }
      </style>
    </head>
    <body>
      <center class="wrapper">
        <table class="main" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td class="header">
              <img src="${brandLogo}" alt="${brandName}" class="logo">
            </td>
          </tr>
          ${data.headerImageUrl ? `
          <tr>
            <td>
              <img src="${data.headerImageUrl}" alt="Hero" class="hero-img">
            </td>
          </tr>
          ` : ""}
          <tr>
            <td class="content">
              ${bodyContent}
              ${data.ctaText && data.ctaUrl ? `
              <div class="cta-container">
                <a href="${data.ctaUrl}" class="btn">${data.ctaText}</a>
              </div>
              ` : ""}
            </td>
          </tr>
          <tr>
            <td class="footer">
              ${footerImage ? `<img src="${footerImage}" alt="Footer Banner" class="footer-img">` : ""}
              <div class="contact-section">
                <p style="font-weight: bold; font-size: 14px; margin-bottom: 10px;">Punya Pertanyaan?</p>
                <p style="font-size: 13px; margin-bottom: 5px;">Hubungi kami di:</p>
                <p style="font-size: 13px; font-weight: bold; color: #222222;">
                  ${settings?.notificationFromEmail || "cs@thelodgegroup.id"}
                </p>
              </div>
              <div class="address">
                <p style="margin-bottom: 5px;"><strong>${brandName}</strong></p>
                <p style="margin: 0;">Email ini dikirimkan secara otomatis oleh sistem ${brandName}.</p>
                <p style="margin-top: 15px;">
                  <a href="${unsubscribeUrl}" class="unsubscribe">Berhenti berlangganan</a>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </center>
    </body>
    </html>
  `;

  return html;
}
