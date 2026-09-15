import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWaText } from "@/lib/whatsapp";

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

    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + 14);

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

    let sentCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    for (const item of eligibleItems) {
      if (!item) continue;

      // Extract phone number from source or remarks if available
      const rawPhone = item.source || item.remarks || "";
      const cleanPhoneMatch = rawPhone.match(/(?:08|628|\+628)\d{8,12}/);
      const targetPhone = cleanPhoneMatch ? cleanPhoneMatch[0].replace(/\D/g, "") : null;

      if (!targetPhone) {
        results.push({
          id: item.id,
          company: item.company,
          status: "SKIPPED_NO_PHONE",
          reason: "Tidak ada nomor WA pada field source/remarks",
        });
        continue;
      }

      let phoneFormatted = targetPhone;
      if (phoneFormatted.startsWith("0")) {
        phoneFormatted = "62" + phoneFormatted.substring(1);
      }

      const dateStr = item.targetDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const unitName = item.unit === "CAMP_VILLAGE" ? "The Lodge Camp & Village" : "The Lodge Park";
      const message = `Halo Kak ${item.pic || item.company},\n\nPesan Otomatis dari *${unitName}* 👋\n\nKami mengonfirmasi reservasi grup *${item.company}* (${item.pax} Pax) untuk tanggal *${dateStr}* yang saat ini statusnya masih *Tentative* (H-${item.daysLeft}).\n\nMohon konfirmasi atau informasi kelanjutan reservasinya ya Kak. Terima kasih banyak! 🙏✨`;

      try {
        const waRes = await sendWaText(phoneFormatted, message);

        if (waRes.success) {
          sentCount++;
          await prisma.forecastItem.update({
            where: { id: item.id },
            data: {
              lastReminderSentAt: new Date(),
              reminderCount: { increment: 1 },
            },
          });

          results.push({
            id: item.id,
            company: item.company,
            phone: phoneFormatted,
            status: "SUCCESS_SENT",
          });
        } else {
          failedCount++;
          results.push({
            id: item.id,
            company: item.company,
            phone: phoneFormatted,
            status: "FAILED_WA_API",
            error: waRes.error,
          });
        }
      } catch (err: any) {
        failedCount++;
        results.push({
          id: item.id,
          company: item.company,
          status: "ERROR_EXCEPTION",
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalEligible: eligibleItems.length,
        sentCount,
        failedCount,
        skippedCount: eligibleItems.length - (sentCount + failedCount),
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

