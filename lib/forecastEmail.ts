import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export interface ForecastEmailReminderParams {
  forecastId: string;
  company: string;
  unit: string;
  targetDateStr: string;
  daysLeft: number;
  pax: number;
  total: number;
  salesPerson?: string | null;
  pic?: string | null;
  contactPerson?: string | null;
  phoneEmail?: string | null;
  remarks?: string | null;
  recipientEmail?: string | null;
}

/**
 * Finds recipient emails for Sales team members matching salesPerson/pic or all sales team users
 */
export async function getSalesTeamEmails(salesPersonName?: string | null, picName?: string | null): Promise<string[]> {
  try {
    const salesUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: "SALES" },
          { role: "ADMIN" }
        ]
      },
      select: { name: true, email: true }
    });

    const emailsSet = new Set<string>();

    const searchName = (salesPersonName || picName || "").toLowerCase().trim();
    if (searchName) {
      // Find direct match first
      for (const u of salesUsers) {
        if (u.name && u.email && u.name.toLowerCase().includes(searchName)) {
          emailsSet.add(u.email);
        }
      }
    }

    // If no specific match, add all sales team emails
    if (emailsSet.size === 0) {
      for (const u of salesUsers) {
        if (u.email) emailsSet.add(u.email);
      }
    }

    return Array.from(emailsSet);
  } catch (err) {
    console.error("Error fetching sales team emails:", err);
    return [];
  }
}

/**
 * Generates rich HTML template for Forecast Reminder Email to Sales Team
 */
export function generateForecastReminderEmailHtml(params: ForecastEmailReminderParams): string {
  const {
    company,
    unit,
    targetDateStr,
    daysLeft,
    pax,
    total,
    salesPerson,
    pic,
    contactPerson,
    phoneEmail,
    remarks,
  } = params;

  const unitName = unit === "CAMP_VILLAGE" ? "The Lodge Camp & Village" : "The Lodge Park";
  const formattedTotal = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(total || 0);

  const picDisplay = salesPerson || pic || "Tim Sales";
  const baseUrl = process.env.NEXTAUTH_URL || "https://form.thelodgegroup.id";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reminder Forecast Tentative</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01); border: 1px solid #e2e8f0;">
    
    <!-- Top Branding Accent -->
    <div style="background: linear-gradient(135deg, #0f4d39 0%, #15634b 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
        Follow-up Reminder (H-${daysLeft})
      </div>
      <h2 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
        📌 Reminder Reservasi Tentative
      </h2>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">${unitName}</p>
    </div>

    <!-- Body Content -->
    <div style="padding: 28px 24px;">
      <p style="font-size: 15px; margin-top: 0; color: #334155; line-height: 1.6;">
        Halo <strong>${picDisplay}</strong> & Tim Sales 👋,
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
        Berikut adalah pengingat untuk reservasi berstatus <strong style="color: #d97706; background: #fef3c7; padding: 3px 8px; border-radius: 6px; font-size: 12px;">TENTATIVE</strong> yang mendekati tanggal pelaksanaan:
      </p>

      <!-- Detailed Card Table -->
      <div style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #cbd5e1; padding: 18px 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 42%;">Nama Client / Group:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 700; font-size: 14px;">${company}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Tanggal Pelaksanaan:</td>
            <td style="padding: 8px 0; color: #0f4d39; font-weight: 700;">${targetDateStr} <span style="color: #e11d48; font-size: 12px;">(H-${daysLeft})</span></td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Jumlah Pax / Unit:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${pax} Pax</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Estimasi Deal Value:</td>
            <td style="padding: 8px 0; color: #059669; font-weight: 700; font-size: 14px;">${formattedTotal}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Sales PIC:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${picDisplay}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Kontak Client:</td>
            <td style="padding: 8px 0; color: #0f172a;">${contactPerson || "-"} ${phoneEmail ? `(${phoneEmail})` : ''}</td>
          </tr>
          ${remarks ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Catatan / Remarks:</td>
            <td style="padding: 8px 0; color: #475569; font-style: italic;">${remarks}</td>
          </tr>` : ''}
        </table>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 24px;">
        Mohon tim Sales segera menghubungi klien untuk konfirmasi kelanjutan atau instruksi pembayaran DP / Pelunasan.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 28px 0 10px 0;">
        <a href="${baseUrl}/forecast" 
           style="background-color: #0f4d39; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; shadow: 0 4px 6px -1px rgba(15, 77, 57, 0.3);">
          Buka Dashboard Forecast
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
      Official Automated Email Notification • <strong>The Lodge Group</strong>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Sends Email reminder for a ForecastItem to Sales team emails
 */
export async function sendSalesForecastEmailReminder(params: ForecastEmailReminderParams): Promise<{ success: boolean; sentTo: string[]; error?: any }> {
  try {
    let targetEmails: string[] = [];

    if (params.recipientEmail && params.recipientEmail.trim()) {
      targetEmails = [params.recipientEmail.trim()];
    } else {
      targetEmails = await getSalesTeamEmails(params.salesPerson, params.pic);
    }

    if (targetEmails.length === 0) {
      console.warn(`[FORECAST-EMAIL-REMINDER] No sales team email found for ${params.company}`);
      return { success: false, sentTo: [], error: "Email sales team tidak ditemukan" };
    }

    const html = generateForecastReminderEmailHtml(params);
    const unitName = params.unit === "CAMP_VILLAGE" ? "The Lodge Camp & Village" : "The Lodge Park";
    const subject = `[REMINDER FORECAST] Follow-up ${params.company} (${params.pax} Pax) - ${unitName}`;

    const sentTo: string[] = [];
    for (const email of targetEmails) {
      const res = await sendEmail({
        to: email,
        subject,
        html,
        fromName: "The Lodge Forecast System",
      });
      if (res.success) {
        sentTo.push(email);
      }
    }

    return {
      success: sentTo.length > 0,
      sentTo,
    };
  } catch (err: any) {
    console.error("[FORECAST-EMAIL-REMINDER-ERROR]:", err);
    return { success: false, sentTo: [], error: err.message };
  }
}
