"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getBlastDashboardStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const [
    totalContacts,
    totalCampaigns,
    totalSent,
    totalOpened,
    totalClicked,
    totalBounced,
    activeCampaigns
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.campaign.count(),
    prisma.campaign.aggregate({ _sum: { totalSent: true } }),
    prisma.campaign.aggregate({ _sum: { totalOpened: true } }),
    prisma.campaign.aggregate({ _sum: { totalClicked: true } }),
    prisma.campaign.aggregate({ _sum: { totalBounced: true } }),
    prisma.campaign.count({ where: { status: 'SENDING' } }),
  ]);

  const sentCount = totalSent._sum.totalSent || 0;
  const openedCount = totalOpened._sum.totalOpened || 0;
  const clickedCount = totalClicked._sum.totalClicked || 0;
  const bouncedCount = totalBounced._sum.totalBounced || 0;

  const openRate = sentCount > 0 ? (openedCount / sentCount) * 100 : 0;
  const clickRate = sentCount > 0 ? (clickedCount / sentCount) * 100 : 0;
  const bounceRate = sentCount > 0 ? (bouncedCount / sentCount) * 100 : 0;

  // Recent activity (logs)
  const recentLogs = await prisma.emailLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      contact: { select: { email: true, name: true } },
      campaign: { select: { name: true } }
    }
  });

  return {
    totalContacts,
    totalCampaigns,
    totalSent: sentCount,
    openRate,
    clickRate,
    bounceRate,
    activeCampaigns,
    recentLogs
  };
}
