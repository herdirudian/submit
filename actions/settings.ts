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
    },
  });

  revalidatePath("/settings");
  revalidatePath("/public/forms");
}

export async function testWhatsAppConnection(waNumber: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  const apiUrl = settings?.whatsappApiUrl;
  const apiKey = settings?.whatsappApiKey;

  if (!apiUrl) {
    throw new Error("WhatsApp API URL belum dikonfigurasi.");
  }

  let endpoint = apiUrl.trim();
  if (!endpoint.endsWith('/messages/send-text')) {
    endpoint = endpoint.replace(/\/$/, '') + '/messages/send-text';
  }

  const rawNumber = waNumber.replace(/\D/g, '');
  if (!rawNumber) throw new Error("Nomor WA tidak valid");

  let cleanNumber = rawNumber;
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '62' + cleanNumber.substring(1);
  }
  const chatId = `${cleanNumber}@c.us`;

  // Helper for natural delays
  const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 1. Simulate typing indicator BEFORE sending
  const presenceEndpoint = endpoint.replace('/messages/send-text', '/presence');
  try {
    await fetch(presenceEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {})
      },
      body: JSON.stringify({
        chatId,
        presence: "composing"
      })
    });
  } catch (e) {
    // Ignore presence error
  }

  // 2. Random delay between 15 to 25 seconds (Simulating typing duration)
  const typingDelay = getRandomInt(15000, 25000);
  await delay(typingDelay);

  // 3. Send Message
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {})
    },
    body: JSON.stringify({
      chatId,
      text: "Halo! Ini adalah pesan TEST KONEKSI dari The Lodge System. Jika Anda menerima pesan ini, artinya integrasi OpenWA berhasil 🚀"
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal mengirim pesan: ${err}`);
  }

  // Clear typing
  try {
    await fetch(presenceEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {})
      },
      body: JSON.stringify({ chatId, presence: "available" })
    });
  } catch (e) {}

  return { success: true };
}
