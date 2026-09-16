"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import {
  LEAD_STATUS_PROBABILITIES,
  type ForecastUnitType,
  type ForecastStatusType,
  type ForecastDpStatusType,
} from "@/lib/forecastConstants";

export type { ForecastUnitType, ForecastStatusType, ForecastDpStatusType };

export async function getForecastItems(params: {
  unit?: ForecastUnitType;
  month?: number; // 1-12
  year?: number;  // e.g. 2026
  search?: string;
  status?: ForecastStatusType | "ALL";
  dpStatus?: ForecastDpStatusType | "ALL";
  leadStatus?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return [];

    const { unit, month, year, search, status, dpStatus, leadStatus } = params;

    // Build query
    const where: any = {};

    if (unit && unit !== "ALL") {
      where.unit = unit;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (dpStatus && dpStatus !== "ALL") {
      where.dpStatus = dpStatus;
    }

    if (leadStatus && leadStatus !== "ALL") {
      where.leadStatus = leadStatus;
    }

    if (search && search.trim()) {
      where.OR = [
        { company: { contains: search.trim() } },
        { contactPerson: { contains: search.trim() } },
        { salesPerson: { contains: search.trim() } },
        { pic: { contains: search.trim() } },
      ];
    }

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      where.OR = [
        { proposedEventDate: { gte: startDate, lte: endDate } },
        { checkIn: { gte: startDate, lte: endDate } },
        { eventDate: { gte: startDate, lte: endDate } },
        { reservationDate: { gte: startDate, lte: endDate } },
        { dateReceived: { gte: startDate, lte: endDate } },
        { proposedEventDate: null, checkIn: null, eventDate: null },
      ];
    }

    const items = await prisma.forecastItem.findMany({
      where,
      orderBy: [
        { dateReceived: "desc" },
        { proposedEventDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return JSON.parse(JSON.stringify(items));
  } catch (err) {
    console.error("Error getForecastItems:", err);
    return [];
  }
}

export async function getSalesPics() {
  const defaultTeam = ["Sri", "Rizki Kiki", "Rizkita", "Riki"];
  const fallbackList = defaultTeam.map((name) => ({ name, phone: "" }));

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return fallbackList;

    const users = await prisma.user.findMany({
      select: { id: true, name: true },
    });

    const forecastPics = await prisma.forecastItem.findMany({
      select: { pic: true, picPhone: true, salesPerson: true },
    });

    const map = new Map<string, { name: string; phone: string }>();

    defaultTeam.forEach((name) => {
      map.set(name.toLowerCase(), { name, phone: "" });
    });

    users.forEach((u) => {
      if (u.name) {
        map.set(u.name.toLowerCase(), { name: u.name, phone: "" });
      }
    });

    forecastPics.forEach((f) => {
      const pName = f.salesPerson || f.pic;
      if (pName) {
        const existing = map.get(pName.toLowerCase());
        map.set(pName.toLowerCase(), {
          name: pName,
          phone: f.picPhone || existing?.phone || "",
        });
      }
    });

    return Array.from(map.values());
  } catch (err) {
    console.error("Error getSalesPics:", err);
    return fallbackList;
  }
}

const safeDate = (d: any): Date | null => {
  if (!d) return null;
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return null;
  return dateObj;
};

export async function createForecastItem(data: {
  unit?: ForecastUnitType;
  company: string;
  // Stage 1
  dateReceived?: string | null;
  contactPerson?: string | null;
  phoneEmail?: string | null;
  leadSource?: string | null;
  segment?: string | null;
  eventType?: string | null;
  proposedEventDate?: string | null;
  pax?: number;
  room?: string | null;
  rate?: number;
  total?: number;
  salesPerson?: string | null;
  // Legacy / extra
  reservationDate?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  eventDate?: string | null;
  venue?: string | null;
  dpStatus?: ForecastDpStatusType;
  dpAmount?: number;
  dueDate?: string | null;
  pic?: string | null;
  picPhone?: string | null;
  status?: ForecastStatusType;
  remarks?: string | null;
  source?: string | null;
  // Stage 2
  firstResponseDate?: string | null;
  lastFollowUpDate?: string | null;
  latestClientResponse?: string | null;
  nextAction?: string | null;
  nextActionDueDate?: string | null;
  leadStatus?: string | null;
  // Stage 3
  closingProbability?: number;
  expectedClosingMonth?: string | null;
  reasonForLossHold?: string | null;
  finalDealValue?: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized: Session login telah berakhir." };
    }

    const rate = Number(data.rate || 0);
    const pax = Number(data.pax || 0);
    const total = data.total !== undefined && data.total !== null ? Number(data.total) : rate * pax;

    // Auto probability based on leadStatus
    const lStatus = data.leadStatus || "New Lead";
    const prob = data.closingProbability !== undefined && data.closingProbability !== null
      ? Number(data.closingProbability)
      : LEAD_STATUS_PROBABILITIES[lStatus] ?? 10;

    // Sync main status (CONFIRM, TENTATIVE, CANCEL) based on leadStatus
    let mainStatus: ForecastStatusType = data.status || "TENTATIVE";
    if (lStatus === "Confirmed / Deal") {
      mainStatus = "CONFIRM";
    } else if (lStatus === "Lost / Cancelled") {
      mainStatus = "CANCEL";
    } else {
      mainStatus = "TENTATIVE";
    }

    const dateReceivedVal = safeDate(data.dateReceived) || new Date();
    const proposedEventDateVal = safeDate(data.proposedEventDate) || safeDate(data.eventDate) || safeDate(data.checkIn);
    const eventDateVal = safeDate(data.eventDate) || proposedEventDateVal;

    const item = await prisma.forecastItem.create({
      data: {
        unit: (data.unit === "PARK" ? "PARK" : "CAMP_VILLAGE") as any,
        company: data.company,
        dateReceived: dateReceivedVal,
        contactPerson: data.contactPerson || null,
        phoneEmail: data.phoneEmail || null,
        leadSource: data.leadSource || data.source || null,
        segment: data.segment || null,
        eventType: data.eventType || null,
        proposedEventDate: proposedEventDateVal,
        pax,
        room: data.room || null,
        rate,
        total,
        salesPerson: data.salesPerson || data.pic || null,
        reservationDate: safeDate(data.reservationDate) || dateReceivedVal,
        checkIn: safeDate(data.checkIn) || proposedEventDateVal,
        checkOut: safeDate(data.checkOut),
        eventDate: eventDateVal,
        venue: data.venue || null,
        dpStatus: data.dpStatus || "BELUM_DP",
        dpAmount: Number(data.dpAmount || 0),
        dueDate: safeDate(data.dueDate),
        pic: data.pic || data.salesPerson || null,
        picPhone: data.picPhone || null,
        status: mainStatus,
        remarks: data.remarks || null,
        source: data.source || data.leadSource || null,
        firstResponseDate: safeDate(data.firstResponseDate),
        lastFollowUpDate: safeDate(data.lastFollowUpDate),
        latestClientResponse: data.latestClientResponse || null,
        nextAction: data.nextAction || null,
        nextActionDueDate: safeDate(data.nextActionDueDate),
        leadStatus: lStatus,
        closingProbability: prob,
        expectedClosingMonth: safeDate(data.expectedClosingMonth),
        reasonForLossHold: data.reasonForLossHold || null,
        finalDealValue: data.finalDealValue !== undefined ? Number(data.finalDealValue) : lStatus === "Confirmed / Deal" ? total : 0,
      },
    });

    revalidatePath("/forecast");
    return { success: true, item: JSON.parse(JSON.stringify(item)) };
  } catch (err: any) {
    console.error("Error createForecastItem:", err);
    return { success: false, error: err?.message || "Gagal menyimpan data forecast." };
  }
}

export async function updateForecastItem(
  id: string,
  data: Partial<Parameters<typeof createForecastItem>[0]> & { unit?: ForecastUnitType }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized: Session login telah berakhir." };
    }

    const updateData: any = {};

    if (data.company !== undefined) updateData.company = data.company;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.phoneEmail !== undefined) updateData.phoneEmail = data.phoneEmail;
    if (data.leadSource !== undefined) updateData.leadSource = data.leadSource;
    if (data.segment !== undefined) updateData.segment = data.segment;
    if (data.eventType !== undefined) updateData.eventType = data.eventType;
    if (data.room !== undefined) updateData.room = data.room;
    if (data.venue !== undefined) updateData.venue = data.venue;
    if (data.salesPerson !== undefined) updateData.salesPerson = data.salesPerson;
    if (data.pic !== undefined) updateData.pic = data.pic;
    if (data.picPhone !== undefined) updateData.picPhone = data.picPhone;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.latestClientResponse !== undefined) updateData.latestClientResponse = data.latestClientResponse;
    if (data.nextAction !== undefined) updateData.nextAction = data.nextAction;
    if (data.reasonForLossHold !== undefined) updateData.reasonForLossHold = data.reasonForLossHold;
    if (data.dpStatus !== undefined) updateData.dpStatus = data.dpStatus;

    if (data.dateReceived !== undefined) updateData.dateReceived = safeDate(data.dateReceived);
    if (data.proposedEventDate !== undefined) updateData.proposedEventDate = safeDate(data.proposedEventDate);
    if (data.reservationDate !== undefined) updateData.reservationDate = safeDate(data.reservationDate);
    if (data.checkIn !== undefined) updateData.checkIn = safeDate(data.checkIn);
    if (data.checkOut !== undefined) updateData.checkOut = safeDate(data.checkOut);
    if (data.eventDate !== undefined) updateData.eventDate = safeDate(data.eventDate);
    if (data.dueDate !== undefined) updateData.dueDate = safeDate(data.dueDate);
    if (data.firstResponseDate !== undefined) updateData.firstResponseDate = safeDate(data.firstResponseDate);
    if (data.lastFollowUpDate !== undefined) updateData.lastFollowUpDate = safeDate(data.lastFollowUpDate);
    if (data.nextActionDueDate !== undefined) updateData.nextActionDueDate = safeDate(data.nextActionDueDate);
    if (data.expectedClosingMonth !== undefined) updateData.expectedClosingMonth = safeDate(data.expectedClosingMonth);

    if (data.dpAmount !== undefined) updateData.dpAmount = Number(data.dpAmount || 0);
    if (data.pax !== undefined) updateData.pax = Number(data.pax || 0);
    if (data.rate !== undefined) updateData.rate = Number(data.rate || 0);

    if (data.rate !== undefined || data.pax !== undefined || data.total !== undefined) {
      const rate = Number(data.rate ?? 0);
      const pax = Number(data.pax ?? 0);
      updateData.total = data.total !== undefined && data.total !== null ? Number(data.total) : rate * pax;
    }

    if (data.leadStatus !== undefined) {
      const lStatus = data.leadStatus;
      updateData.leadStatus = lStatus;
      if (data.closingProbability === undefined) {
        updateData.closingProbability = lStatus ? (LEAD_STATUS_PROBABILITIES[lStatus] ?? 10) : 10;
      }
      if (lStatus === "Confirmed / Deal") {
        updateData.status = "CONFIRM";
      } else if (lStatus === "Lost / Cancelled") {
        updateData.status = "CANCEL";
      } else {
        updateData.status = "TENTATIVE";
      }
    }

    if (data.closingProbability !== undefined) updateData.closingProbability = Number(data.closingProbability);
    if (data.finalDealValue !== undefined) updateData.finalDealValue = Number(data.finalDealValue);

    const item = await prisma.forecastItem.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/forecast");
    return { success: true, item: JSON.parse(JSON.stringify(item)) };
  } catch (err: any) {
    console.error("Error updateForecastItem:", err);
    return { success: false, error: err?.message || "Gagal memperbarui data forecast." };
  }
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
  const fallback = {
    confirmTotal: 0,
    tentativeTotal: 0,
    cancelTotal: 0,
    grandTotal: 0,
    totalPax: 0,
    totalRoomCount: 0,
    totalEntries: 0,
  };

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return fallback;

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
  } catch (err) {
    console.error("Error getForecastStats:", err);
    return fallback;
  }
}

export async function getForecastReminders(unit?: ForecastUnitType) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + 14); // Next 14 days

    const where: any = {
      status: "TENTATIVE",
    };

    if (unit && unit !== "ALL") {
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

    return JSON.parse(JSON.stringify(reminders.sort((a: any, b: any) => a.daysLeft - b.daysLeft)));
  } catch (err) {
    console.error("Error getForecastReminders:", err);
    return [];
  }
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
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { autoSentCount: 0 };

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

    if (unit && unit !== "ALL") where.unit = unit;

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
  } catch (err) {
    console.error("Error autoProcessForecastReminders:", err);
    return { autoSentCount: 0 };
  }
}

export async function saveForecastTarget(data: {
  unit: ForecastUnitType;
  year: number;
  month: number;
  target: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const targetUnit = (data.unit === "ALL" ? "CAMP_VILLAGE" : data.unit) as any;

  const target = await prisma.forecastTarget.upsert({
    where: {
      unit_year_month: {
        unit: targetUnit,
        year: data.year,
        month: data.month,
      },
    },
    update: {
      target: Number(data.target) || 0,
    },
    create: {
      unit: targetUnit,
      year: data.year,
      month: data.month,
      target: Number(data.target) || 0,
    },
  });

  revalidatePath("/forecast");
  return JSON.parse(JSON.stringify(target));
}

export async function getForecastYearlyTrend(params: {
  unit: ForecastUnitType;
  year: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const { unit, year } = params;

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

  const where: any = {};
  if (unit && unit !== "ALL") {
    where.unit = unit;
  }

  where.OR = [
    { dateReceived: { gte: startDate, lte: endDate } },
    { proposedEventDate: { gte: startDate, lte: endDate } },
    { checkIn: { gte: startDate, lte: endDate } },
    { eventDate: { gte: startDate, lte: endDate } },
    { reservationDate: { gte: startDate, lte: endDate } },
  ];

  const targetWhere: any = { year };
  if (unit && unit !== "ALL") {
    targetWhere.unit = unit;
  }

  const [items, targets] = await Promise.all([
    prisma.forecastItem.findMany({ where }),
    prisma.forecastTarget.findMany({ where: targetWhere }),
  ]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  const trendData = monthNames.map((name, index) => {
    const monthNum = index + 1;
    const monthItems = items.filter((item) => {
      const d = item.unit === "CAMP_VILLAGE" ? item.checkIn : item.eventDate;
      if (!d) return false;
      return new Date(d).getMonth() === index;
    });

    let confirmRevenue = 0;
    let tentativeRevenue = 0;
    let cancelRevenue = 0;
    let paxCount = 0;
    let confirmCount = 0;
    let tentativeCount = 0;
    let cancelCount = 0;

    monthItems.forEach((item) => {
      paxCount += item.pax || 0;
      if (item.status === "CONFIRM") {
        confirmRevenue += item.total || 0;
        confirmCount++;
      } else if (item.status === "TENTATIVE") {
        tentativeRevenue += item.total || 0;
        tentativeCount++;
      } else if (item.status === "CANCEL") {
        cancelRevenue += item.total || 0;
        cancelCount++;
      }
    });

    const targetObj = targets.find((t) => t.month === monthNum);
    const targetRevenue = targetObj ? targetObj.target : 0;

    const totalEntries = confirmCount + tentativeCount + cancelCount;
    const closingRate = totalEntries > 0 ? Math.round((confirmCount / totalEntries) * 100) : 0;

    return {
      month: monthNum,
      monthName: name,
      confirmRevenue,
      tentativeRevenue,
      cancelRevenue,
      totalRevenue: confirmRevenue + tentativeRevenue,
      targetRevenue,
      paxCount,
      confirmCount,
      tentativeCount,
      cancelCount,
      closingRate,
    };
  });

  return JSON.parse(JSON.stringify(trendData));
}

export async function getForecastAnalyticsSummary(params: {
  unit: ForecastUnitType;
  year: number;
  month: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const trend: any[] = await getForecastYearlyTrend({ unit: params.unit, year: params.year });
  const monthData = trend.find((t: any) => t.month === params.month) || {
    confirmRevenue: 0,
    tentativeRevenue: 0,
    cancelRevenue: 0,
    targetRevenue: 0,
    paxCount: 0,
    confirmCount: 0,
    tentativeCount: 0,
    cancelCount: 0,
    closingRate: 0,
  };

  const targetProgress = monthData.targetRevenue > 0
    ? Math.round((monthData.confirmRevenue / monthData.targetRevenue) * 100)
    : 0;

  return JSON.parse(JSON.stringify({
    ...monthData,
    targetProgress,
  }));
}





