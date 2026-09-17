import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWaText } from "@/lib/whatsapp";
import { sendSalesForecastEmailReminder } from "@/lib/forecastEmail";

const CRON_SECRET = process.env.CRON_SECRET || "lodge_forecast_cron_2026";

export async function GET(req: NextRequest) {
  return handleCronReminders(req);
}

export async function POST(req: NextRequest) {
  return handleCronReminders(req);
}

async function handleCronReminders(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    // Verify secret for security
    if (secret !== CRON_SECRET && process.env.NODE_ENV === "production") {
      return NextResponse.json({ success: false, error: "Unauthorized Secret Key" }, { status: 401 });
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 20 hours ago cutoff to prevent duplicate auto-reminders on same day
    const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);

    // Fetch tentative forecast items needing reminders
    const items = await prisma.forecastItem.findMany({
      where: {
        status: "TENTATIVE",
        OR: [
          { lastReminderSentAt: null },
          { lastReminderSentAt: { lte: twentyHoursAgo } },
        ],
      },
    });

    const eligibleItems = items
      .map((item) => {
        const targetDate = item.unit === "CAMP_VILLAGE" ? item.checkIn : item.eventDate;
        if (!targetDate) return null;

        const dateObj = new Date(targetDate);
        dateObj.setHours(0, 0, 0, 0);

        const diffTime = dateObj.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Eligible if event is in 0 to 14 days (especially H-7 and H-3)
        if (diffDays < 0 || diffDays > 14) return null;

        return {
          ...item,
          targetDate: dateObj,
          daysLeft: diffDays,
        };
      })
      .filter(Boolean);

    // Fetch all sales & admin users for in-app notifications
    const salesUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: "SALES" },
          { role: "ADMIN" }
        ]
      },
      select: { id: true, name: true, email: true }
    });

    let sentEmailCount = 0;
    let sentWaCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    for (const item of eligibleItems) {
      if (!item) continue;

      const dateStr = item.targetDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const unitName = item.unit === "CAMP_VILLAGE" ? "The Lodge Camp & Village" : "The Lodge Park";

      // 1. Send Email Reminder to Sales Team Email
      const emailResult = await sendSalesForecastEmailReminder({
        forecastId: item.id,
        company: item.company,
        unit: item.unit,
        targetDateStr: dateStr,
        daysLeft: item.daysLeft,
        pax: item.pax,
        total: item.total,
        salesPerson: item.salesPerson,
        pic: item.pic,
        contactPerson: item.contactPerson,
        phoneEmail: item.phoneEmail,
        remarks: item.remarks,
      });

      if (emailResult.success) {
        sentEmailCount++;
      }

      // 2. Send WA Reminder (if phone exists)
      let waStatus = "SKIPPED_NO_PHONE";
      const rawPhone = item.picPhone || item.source || item.remarks || "";
      const cleanPhoneMatch = rawPhone.match(/(?:08|628|\+628)\d{8,12}/);
      if (cleanPhoneMatch) {
        let phoneFormatted = cleanPhoneMatch[0].replace(/\D/g, "");
        if (phoneFormatted.startsWith("0")) phoneFormatted = "62" + phoneFormatted.substring(1);

        const waMessage = `Halo Kak ${item.salesPerson || item.pic || "Sales"},\n\n*Peringatan Forecast Tentative (Sales Reminder)* 📌\n\nReservasi grup *${item.company}* (${item.pax} Pax) untuk tanggal *${dateStr}* di *${unitName}* statusnya masih *TENTATIVE* (H-${item.daysLeft}).\n\nMohon segera difollow-up kelanjutan atau pelunasannya ya Kak. Terima kasih! 🙏✨`;

        try {
          const waRes = await sendWaText(phoneFormatted, waMessage);
          if (waRes.success) {
            sentWaCount++;
            waStatus = "SUCCESS_SENT";
          } else {
            waStatus = "FAILED_WA_API";
          }
        } catch (e: any) {
          waStatus = "ERROR_WA_EXCEPTION";
        }
      }

      // 3. Create In-App Notification for Sales Team Users
      try {
        const notifTitle = `📌 Reminder Tentative H-${item.daysLeft}: ${item.company}`;
        const notifMsg = `Reservasi ${item.company} (${item.pax} Pax, ${dateStr}) di ${unitName} masih TENTATIVE. Segera follow up!`;

        await Promise.all(
          salesUsers.map((u) =>
            prisma.notification.create({
              data: {
                userId: u.id,
                title: notifTitle,
                message: notifMsg,
                link: "/forecast",
              },
            })
          )
        );
      } catch (notifErr) {
        console.error("Error creating in-app notification:", notifErr);
      }

      // Update forecast item reminder timestamp & count
      if (emailResult.success || waStatus === "SUCCESS_SENT") {
        await prisma.forecastItem.update({
          where: { id: item.id },
          data: {
            lastReminderSentAt: new Date(),
            reminderCount: { increment: 1 },
          },
        });
      }

      results.push({
        id: item.id,
        company: item.company,
        emailStatus: emailResult.success ? "SUCCESS" : "FAILED",
        sentEmails: emailResult.sentTo,
        waStatus,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalEligible: eligibleItems.length,
        sentEmailCount,
        sentWaCount,
        failedCount,
      },
      results,
    });
  } catch (err: any) {
    console.error("[CRON-REMINDERS-ERROR]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
