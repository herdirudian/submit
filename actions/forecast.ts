"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type ForecastUnitType = "CAMP_VILLAGE" | "PARK";
export type ForecastStatusType = "CONFIRM" | "TENTATIVE" | "CANCEL";

export async function getForecastItems(params: {
  unit: ForecastUnitType;
  month?: number; // 1-12
  year?: number;  // e.g. 2026
  search?: string;
  status?: ForecastStatusType | "ALL";
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const { unit, month, year, search, status } = params;

  // Build date filter based on month & year
  const where: any = { unit };

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (search && search.trim()) {
    where.company = {
      contains: search.trim(),
    };
  }

  if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    if (unit === "CAMP_VILLAGE") {
      where.OR = [
        { checkIn: { gte: startDate, lte: endDate } },
        { checkOut: { gte: startDate, lte: endDate } },
        { checkIn: null, checkOut: null },
      ];
    } else {
      where.OR = [
        { eventDate: { gte: startDate, lte: endDate } },
        { eventDate: null },
      ];
    }
  }

  const items = await prisma.forecastItem.findMany({
    where,
    orderBy: [
      unit === "CAMP_VILLAGE" ? { checkIn: "asc" } : { eventDate: "asc" },
      { createdAt: "desc" },
    ],
  });

  return items;
}

export async function getSalesPics() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const users = await prisma.user.findMany({
    select: { id: true, name: true },
  });

  const forecastPics = await prisma.forecastItem.findMany({
    select: { pic: true, picPhone: true },
    where: { pic: { not: null } },
  });

  const map = new Map<string, { name: string; phone: string }>();

  users.forEach((u) => {
    if (u.name) {
      map.set(u.name.toLowerCase(), { name: u.name, phone: "" });
    }
  });

  forecastPics.forEach((f) => {
    if (f.pic) {
      const existing = map.get(f.pic.toLowerCase());
      map.set(f.pic.toLowerCase(), {
        name: f.pic,
        phone: f.picPhone || existing?.phone || "",
      });
    }
  });

  return Array.from(map.values());
}

export async function createForecastItem(data: {
  unit: ForecastUnitType;
  company: string;
  reservationDate?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  eventDate?: string | null;
  eventType?: string | null;
  venue?: string | null;
  pax?: number;
  room?: string | null;
  rate?: number;
  total?: number;
  pic?: string | null;
  picPhone?: string | null;
  status?: ForecastStatusType;
  remarks?: string | null;
  segment?: string | null;
  source?: string | null;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const rate = Number(data.rate || 0);
  const pax = Number(data.pax || 0);
  const total = data.total !== undefined && data.total !== null ? Number(data.total) : rate * pax;

  const item = await prisma.forecastItem.create({
    data: {
      unit: data.unit,
      company: data.company,
      reservationDate: data.reservationDate ? new Date(data.reservationDate) : null,
      checkIn: data.checkIn ? new Date(data.checkIn) : null,
      checkOut: data.checkOut ? new Date(data.checkOut) : null,
      eventDate: data.eventDate ? new Date(data.eventDate) : null,
      eventType: data.eventType || null,
      venue: data.venue || null,
      pax,
      room: data.room || null,
      rate,
      total,
      pic: data.pic || null,
      picPhone: data.picPhone || null,
      status: data.status || "TENTATIVE",
      remarks: data.remarks || null,
      segment: data.segment || null,
      source: data.source || null,
    },
  });

  revalidatePath("/forecast");
  return item;
}

export async function updateForecastItem(
  id: string,
  data: {
    unit?: ForecastUnitType;
    company?: string;
    reservationDate?: string | null;
    checkIn?: string | null;
    checkOut?: string | null;
    eventDate?: string | null;
    eventType?: string | null;
    venue?: string | null;
    pax?: number;
    room?: string | null;
    rate?: number;
    total?: number;
    pic?: string | null;
    picPhone?: string | null;
    status?: ForecastStatusType;
    remarks?: string | null;
    segment?: string | null;
    source?: string | null;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const updateData: any = { ...data };

  if (data.reservationDate !== undefined) {
    updateData.reservationDate = data.reservationDate ? new Date(data.reservationDate) : null;
  }
  if (data.checkIn !== undefined) {
    updateData.checkIn = data.checkIn ? new Date(data.checkIn) : null;
  }
  if (data.checkOut !== undefined) {
    updateData.checkOut = data.checkOut ? new Date(data.checkOut) : null;
  }
  if (data.eventDate !== undefined) {
    updateData.eventDate = data.eventDate ? new Date(data.eventDate) : null;
  }

  if (data.rate !== undefined || data.pax !== undefined || data.total !== undefined) {
    const rate = Number(data.rate ?? 0);
    const pax = Number(data.pax ?? 0);
    updateData.total = data.total !== undefined && data.total !== null ? Number(data.total) : rate * pax;
  }

  const item = await prisma.forecastItem.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/forecast");
  return item;
}

export async function deleteForecastItem(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  await prisma.forecastItem.delete({
    where: { id },
  });

  revalidatePath("/forecast");
}

export async function getForecastStats(params: {
  unit: ForecastUnitType;
  month?: number;
  year?: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const items = await getForecastItems(params);

  let confirmTotal = 0;
  let tentativeTotal = 0;
  let cancelTotal = 0;
  let totalPax = 0;
  let totalRoomCount = 0;

  for (const item of items) {
    totalPax += item.pax || 0;
    
    // Parse room count if numeric
    if (item.room) {
      const roomNum = parseInt(item.room, 10);
      if (!isNaN(roomNum)) totalRoomCount += roomNum;
    }

    if (item.status === "CONFIRM") {
      confirmTotal += item.total || 0;
    } else if (item.status === "TENTATIVE") {
      tentativeTotal += item.total || 0;
    } else if (item.status === "CANCEL") {
      cancelTotal += item.total || 0;
    }
  }

  const grandTotal = confirmTotal + tentativeTotal + cancelTotal;

  return {
    confirmTotal,
    tentativeTotal,
    cancelTotal,
    grandTotal,
    totalPax,
    totalRoomCount,
    totalEntries: items.length,
  };
}

export async function getForecastReminders(unit?: ForecastUnitType) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + 14); // Next 14 days

  const where: any = {
    status: "TENTATIVE",
  };

  if (unit) {
    where.unit = unit;
  }

  const items = await prisma.forecastItem.findMany({
    where,
    orderBy: [
      { checkIn: "asc" },
      { eventDate: "asc" },
    ],
  });

  const reminders = items
    .map((item) => {
      const targetDate = item.unit === "CAMP_VILLAGE" ? item.checkIn : item.eventDate;
      if (!targetDate) return null;

      const dateObj = new Date(targetDate);
      dateObj.setHours(0, 0, 0, 0);

      const diffTime = dateObj.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0 || diffDays > 14) return null;

      const urgency: "URGENT" | "WARNING" | "INFO" =
        diffDays <= 3 ? "URGENT" : diffDays <= 7 ? "WARNING" : "INFO";

      return {
        ...item,
        targetDate: dateObj,
        daysLeft: diffDays,
        urgency,
      };
    })
    .filter(Boolean);

  return reminders.sort((a: any, b: any) => a.daysLeft - b.daysLeft);
}

export async function sendForecastWaReminderAction(data: {
  forecastId: string;
  phone: string;
  message: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const { sendWaText } = await import("@/lib/whatsapp");
  
  let cleanPhone = data.phone.replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.substring(1);
  }

  if (!cleanPhone) {
    throw new Error("Nomor WhatsApp/HP tidak valid");
  }

  const res = await sendWaText(cleanPhone, data.message);

  if (res.success) {
    await prisma.forecastItem.update({
      where: { id: data.forecastId },
      data: {
        lastReminderSentAt: new Date(),
        reminderCount: { increment: 1 },
      },
    });
  }

  return {
    success: res.success,
    error: res.error,
    phone: cleanPhone,
    waWebUrl: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(data.message)}`,
  };
}

export async function autoProcessForecastReminders(unit?: ForecastUnitType) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);

  const where: any = {
    status: "TENTATIVE",
    OR: [
      { lastReminderSentAt: null },
      { lastReminderSentAt: { lte: twentyHoursAgo } },
    ],
  };

  if (unit) where.unit = unit;

  const items = await prisma.forecastItem.findMany({ where });

  const eligibleItems = items.filter((item) => {
    const targetDate = item.unit === "CAMP_VILLAGE" ? item.checkIn : item.eventDate;
    if (!targetDate) return false;

    const dateObj = new Date(targetDate);
    dateObj.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7; // H-7 or H-3 window
  });

  const { sendWaText } = await import("@/lib/whatsapp");
  let sentCount = 0;

  for (const item of eligibleItems) {
    // Target Internal Sales PIC Phone Number
    const rawPhone = item.picPhone || item.source || item.remarks || "";
    const cleanPhoneMatch = rawPhone.match(/(?:08|628|\+628)\d{8,12}/);
    if (!cleanPhoneMatch) continue;

    let phone = cleanPhoneMatch[0].replace(/\D/g, "");
    if (phone.startsWith("0")) phone = "62" + phone.substring(1);

    const targetDate = item.unit === "CAMP_VILLAGE" ? item.checkIn : item.eventDate;
    const dateStr = targetDate
      ? new Date(targetDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "";

    const unitName = item.unit === "CAMP_VILLAGE" ? "The Lodge Camp & Village" : "The Lodge Park";
    const message = `Halo Kak ${item.pic || "Sales"},\n\n*Peringatan Reservasi Tentative (Internal Sales)* 📌\n\nReservasi grup *${item.company}* (${item.pax} Pax) untuk tanggal *${dateStr}* di *${unitName}* statusnya masih *TENTATIVE*.\n\nMohon segera difollow-up kelanjutan atau pelunasannya ya Kak. Terima kasih! 🙏✨`;

    try {
      const waRes = await sendWaText(phone, message);
      if (waRes.success) {
        sentCount++;
        await prisma.forecastItem.update({
          where: { id: item.id },
          data: {
            lastReminderSentAt: new Date(),
            reminderCount: { increment: 1 },
          },
        });
      }
    } catch (e) {
      console.error("[AUTO-REMINDER-ERROR]:", e);
    }
  }

  return { autoSentCount: sentCount };
}




