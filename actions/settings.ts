"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;

export async function getSettingsSnapshot() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const userId = (session.user as typeof session.user & { id: string }).id;

  const [user, appSettings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true },
    }),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const normalizedSettings =
    appSettings ??
    (await prisma.appSettings.create({
      data: { id: "singleton" },
    }));

  return { user, appSettings: normalizedSettings };
}

export async function updateAdminProfile(data: { name?: string; image?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const userId = (session.user as typeof session.user & { id: string }).id;

  const name = (data.name ?? "").trim();
  const image = (data.image ?? "").trim();

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name ? { name } : { name: null }),
      ...(image ? { image } : { image: null }),
    },
  });

  revalidatePath("/settings");
}

export async function updateAppSettings(data: {
  brandName?: string;
  brandLogoUrl?: string;
  notificationFromName?: string;
  notificationFromEmail?: string;
  address?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  tiktokUrl?: string;
  whatsappApiUrl?: string;
  whatsappApiKey?: string;
  whatsappProvider?: string;
  waAutoReplyEnabled?: boolean;
  waAutoReplyMessage?: string;
  waWorkingHoursStart?: string;
  waWorkingHoursEnd?: string;
  waWorkingDays?: string;
  waChatbotEnabled?: boolean;
  waChatbotWelcomeMsg?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const {
    brandName,
    brandLogoUrl,
    notificationFromName,
    notificationFromEmail,
    address,
    instagramUrl,
    facebookUrl,
    twitterUrl,
    linkedinUrl,
    websiteUrl,
    tiktokUrl,
    whatsappApiUrl,
    whatsappApiKey,
    whatsappProvider,
    waAutoReplyEnabled,
    waAutoReplyMessage,
    waWorkingHoursStart,
    waWorkingHoursEnd,
    waWorkingDays,
    waChatbotEnabled,
    waChatbotWelcomeMsg,
  } = data;

  if (notificationFromEmail && !isValidEmail(notificationFromEmail)) {
    throw new Error("Format email tidak valid");
  }

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {
      brandName,
      brandLogoUrl,
      notificationFromName,
      notificationFromEmail,
      address,
      instagramUrl,
      facebookUrl,
      twitterUrl,
      linkedinUrl,
      websiteUrl,
      tiktokUrl,
      whatsappApiUrl,
      whatsappApiKey,
      whatsappProvider,
      waAutoReplyEnabled,
      waAutoReplyMessage,
      waWorkingHoursStart,
      waWorkingHoursEnd,
      waWorkingDays,
      waChatbotEnabled,
      waChatbotWelcomeMsg,
    },
    create: {
      id: "singleton",
      brandName,
      brandLogoUrl,
      notificationFromName,
      notificationFromEmail,
      address,
      instagramUrl,
      facebookUrl,
      twitterUrl,
      linkedinUrl,
      websiteUrl,
      tiktokUrl,
      whatsappApiUrl,
      whatsappApiKey,
      whatsappProvider,
      waAutoReplyEnabled,
      waAutoReplyMessage,
      waWorkingHoursStart,
      waWorkingHoursEnd,
      waWorkingDays,
      waChatbotEnabled,
      waChatbotWelcomeMsg,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/public/forms");
}

export async function testWhatsAppConnection(waNumber: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { sendWaText } = await import('@/lib/whatsapp');
    
    const cleanNumber = waNumber.replace(/\D/g, '');
    if (!cleanNumber) return { success: false, error: "Nomor WA tidak valid" };

    const result = await sendWaText(cleanNumber, "Halo! Ini adalah pesan TEST KONEKSI dari The Lodge System. Jika Anda menerima pesan ini, artinya integrasi WhatsApp Cloud API (Meta) berhasil 🚀");

    if (!result.success) {
      return { success: false, error: result.error?.error?.message || "Gagal mengirim pesan test via Meta API" };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Terjadi kesalahan internal saat test koneksi" };
  }
}
