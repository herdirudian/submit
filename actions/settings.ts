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
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const brandName = (data.brandName ?? "").trim();
  const brandLogoUrl = (data.brandLogoUrl ?? "").trim();
  const notificationFromName = (data.notificationFromName ?? "").trim();
  const notificationFromEmail = (data.notificationFromEmail ?? "").trim();
  const address = (data.address ?? "").trim();
  const instagramUrl = (data.instagramUrl ?? "").trim();
  const facebookUrl = (data.facebookUrl ?? "").trim();
  const twitterUrl = (data.twitterUrl ?? "").trim();
  const linkedinUrl = (data.linkedinUrl ?? "").trim();
  const websiteUrl = (data.websiteUrl ?? "").trim();

  if (notificationFromEmail && !isValidEmail(notificationFromEmail)) {
    throw new Error("From Email tidak valid");
  }

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      brandName: brandName || null,
      brandLogoUrl: brandLogoUrl || null,
      notificationFromName: notificationFromName || null,
      notificationFromEmail: notificationFromEmail || null,
      address: address || null,
      instagramUrl: instagramUrl || null,
      facebookUrl: facebookUrl || null,
      twitterUrl: twitterUrl || null,
      linkedinUrl: linkedinUrl || null,
      websiteUrl: websiteUrl || null,
    },
    update: {
      brandName: brandName || null,
      brandLogoUrl: brandLogoUrl || null,
      notificationFromName: notificationFromName || null,
      notificationFromEmail: notificationFromEmail || null,
      address: address || null,
      instagramUrl: instagramUrl || null,
      facebookUrl: facebookUrl || null,
      twitterUrl: twitterUrl || null,
      linkedinUrl: linkedinUrl || null,
      websiteUrl: websiteUrl || null,
    },
  });

  revalidatePath("/settings");
}
