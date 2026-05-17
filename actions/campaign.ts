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

export async function getEmailLogs(params: {
  page?: number;
  pageSize?: number;
  campaignId?: string;
  status?: string;
} = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, pageSize = 50, campaignId, status } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (campaignId) where.campaignId = campaignId;
  if (status) where.status = status;

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        contact: { select: { email: true, name: true } },
        campaign: { select: { name: true, subject: true } }
      }
    }),
    prisma.emailLog.count({ where })
  ]);

  return { logs, total };
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
  const baseUrl = process.env.NEXTAUTH_URL || "";

  const makeAbsolute = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith('http')) return url;
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const brandLogo = makeAbsolute(settings?.brandLogoUrl || "/logotlm.png");
  const heroImage = makeAbsolute(campaign.headerImageUrl);
  const footerImage = makeAbsolute(campaign.footerImageUrl);

  // Update status to SENDING
  await prisma.campaign.update({
    where: { id },
    data: { status: 'SENDING' }
  });

  let successCount = 0;
  let failCount = 0;

  // Logic for sending
  for (const contact of contacts) {
    try {
      // 1. Personalization & Newline handling
      let bodyContent = campaign.content;
      
      // Convert plain newlines to <br/> if not already HTML
      if (!bodyContent.includes('<p>') && !bodyContent.includes('</div>')) {
        bodyContent = bodyContent.replace(/\n/g, '<br />');
      }

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
            .header { padding: 20px 30px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #eeeeee; }
            .hero-img { width: 100% !important; height: auto !important; display: block; }
            .content { padding: 40px 30px; line-height: 1.6; font-size: 16px; text-align: left; }
            .footer { padding: 40px 30px; text-align: center; font-size: 12px; color: #666666; background-color: #ffffff; border-top: 1px solid #eeeeee; }
            .logo { max-height: 60px; width: auto; display: inline-block; }
            .footer-img { max-width: 100%; height: auto; margin-bottom: 20px; border-radius: 4px; }
            
            h1, h2, h3 { color: #222222; text-align: center; margin-bottom: 20px; line-height: 1.3; }
            p { margin-bottom: 15px; }
            ul { margin-bottom: 15px; padding-left: 20px; }
            li { margin-bottom: 8px; }
            
            .cta-container { text-align: center; padding: 20px 0; }
            .btn { display: inline-block; padding: 14px 30px; background-color: #0f4d39; color: #ffffff !important; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(15, 77, 57, 0.2); }
            
            .social-icons { margin: 20px 0; text-align: center; }
            .social-icons a { margin: 0 8px; text-decoration: none; display: inline-block; }
            .social-icon { width: 24px; height: 24px; }

            .contact-section { margin-top: 30px; padding-top: 20px; border-top: 1px dashed #dddddd; text-align: center; }
            .address { font-size: 11px; color: #999999; margin-top: 20px; line-height: 1.4; text-align: center; }
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
                      <td align="center">
                        <img src="${brandLogo}" alt="${brandName}" class="logo">
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Hero Image (optional header image) -->
              ${heroImage ? `
              <tr>
                <td>
                  <img src="${heroImage}" alt="Hero" class="hero-img">
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

                  <div class="social-icons">
                    ${settings?.instagramUrl ? `<a href="${settings.instagramUrl}"><img src="https://img.icons8.com/material-outlined/24/666666/instagram-new.png" class="social-icon"></a>` : ""}
                    ${settings?.facebookUrl ? `<a href="${settings.facebookUrl}"><img src="https://img.icons8.com/material-outlined/24/666666/facebook-new.png" class="social-icon"></a>` : ""}
                    ${settings?.twitterUrl ? `<a href="${settings.twitterUrl}"><img src="https://img.icons8.com/material-outlined/24/666666/twitter.png" class="social-icon"></a>` : ""}
                    ${settings?.linkedinUrl ? `<a href="${settings.linkedinUrl}"><img src="https://img.icons8.com/material-outlined/24/666666/linkedin.png" class="social-icon"></a>` : ""}
                    ${settings?.tiktokUrl ? `<a href="${settings.tiktokUrl}"><img src="https://img.icons8.com/material-outlined/24/666666/tiktok.png" class="social-icon"></a>` : ""}
                    ${settings?.websiteUrl ? `<a href="${settings.websiteUrl}"><img src="https://img.icons8.com/material-outlined/24/666666/globe.png" class="social-icon"></a>` : ""}
                  </div>

                  <div class="address">
                    <p style="margin-bottom: 5px;"><strong>${brandName}</strong></p>
                    ${settings?.address ? `<p style="margin-bottom: 5px;">${settings.address.replace(/\n/g, '<br/>')}</p>` : ""}
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
      const result = await sendEmail({
        to: contact.email,
        subject: campaign.subject,
        html: html,
        fromName: settings?.notificationFromName || brandName,
        fromEmail: settings?.notificationFromEmail,
      });

      // 5. Log the result
      if (result.success) {
        successCount++;
        await prisma.emailLog.create({
          data: {
            campaignId: id,
            contactId: contact.id,
            status: 'SENT',
          }
        });
      } else {
        failCount++;
        await prisma.emailLog.create({
          data: {
            campaignId: id,
            contactId: contact.id,
            status: 'FAILED',
            errorMessage: typeof result.error === 'string' ? result.error : (result.error as any)?.message || "Unknown error"
          }
        });
      }
    } catch (error: any) {
      failCount++;
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
      status: failCount === contacts.length ? 'FAILED' : 'SENT',
      sentAt: new Date(),
      totalSent: successCount
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
  const baseUrl = process.env.NEXTAUTH_URL || "";

  const makeAbsolute = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith('http')) return url;
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const brandLogo = makeAbsolute(settings?.brandLogoUrl || "/logotlm.png");
  const heroImage = makeAbsolute(data.headerImageUrl);
  const footerImage = makeAbsolute(data.footerImageUrl);
  
  let bodyContent = data.content;

  // Convert plain newlines to <br/> if not already HTML
  if (!bodyContent.includes('<p>') && !bodyContent.includes('</div>')) {
    bodyContent = bodyContent.replace(/\n/g, '<br />');
  }

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
        .header { padding: 20px 30px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #eeeeee; }
        .hero-img { width: 100% !important; height: auto !important; display: block; }
        .content { padding: 40px 30px; line-height: 1.6; font-size: 16px; text-align: left; }
        .footer { padding: 40px 30px; text-align: center; font-size: 12px; color: #666666; background-color: #ffffff; border-top: 1px solid #eeeeee; }
        .logo { max-height: 60px; width: auto; display: inline-block; }
        .footer-img { max-width: 100%; height: auto; margin-bottom: 20px; border-radius: 4px; }
        h1, h2, h3 { color: #222222; text-align: center; margin-bottom: 20px; line-height: 1.3; }
        p { margin-bottom: 15px; }
        .cta-container { text-align: center; padding: 20px 0; }
        .btn { display: inline-block; padding: 14px 30px; background-color: #0f4d39; color: #ffffff !important; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(15, 77, 57, 0.2); }
        .social-icons { margin: 20px 0; text-align: center; }
        .social-icons a { margin: 0 8px; text-decoration: none; display: inline-block; }
        .social-icon { width: 24px; height: 24px; }
        .contact-section { margin-top: 30px; padding-top: 20px; border-top: 1px dashed #dddddd; text-align: center; }
        .address { font-size: 11px; color: #999999; margin-top: 20px; line-height: 1.4; text-align: center; }
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
          ${heroImage ? `
          <tr>
            <td>
              <img src="${heroImage}" alt="Hero" class="hero-img">
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

              <div class="social-icons">
                ${settings?.instagramUrl ? `<a href="${settings.instagramUrl}"><img src="https://img.icons8.com/material-outlined/24/666666/instagram-new.png" class="social-icon"></a>` : ""}
                ${settings?.facebookUrl ? `<a href="${settings.facebookUrl}"><img src="https://img.icons8.com/material-outlined/24/666666/facebook-new.png" class="social-icon"></a>` : ""}
                ${settings?.twitterUrl ? `<a href="${settings.twitterUrl}"><img src="https://img.icons8.com/material-outlined/24/666666/twitter.png" class="social-icon"></a>` : ""}
                ${settings?.linkedinUrl ? `<a href="${settings.linkedinUrl}"><img src="https://img.icons8.com/material-outlined/24/666666/linkedin.png" class="social-icon"></a>` : ""}
                ${settings?.tiktokUrl ? `<a href="${settings.tiktokUrl}"><img src="https://img.icons8.com/material-outlined/24/666666/tiktok.png" class="social-icon"></a>` : ""}
                ${settings?.websiteUrl ? `<a href="${settings.websiteUrl}"><img src="https://img.icons8.com/material-outlined/24/666666/globe.png" class="social-icon"></a>` : ""}
              </div>

              <div class="address">
                <p style="margin-bottom: 5px;"><strong>${brandName}</strong></p>
                ${settings?.address ? `<p style="margin-bottom: 5px;">${settings.address.replace(/\n/g, '<br/>')}</p>` : ""}
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
