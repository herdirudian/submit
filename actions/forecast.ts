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

