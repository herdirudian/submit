"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

/**
 * Analytics Actions for WhatsApp CRM and System Stats
 */

export async function getSystemStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const [totalForms, totalResponses, totalUsers] = await Promise.all([
    prisma.form.count(),
    prisma.response.count(),
    prisma.user.count(),
  ]);

  return {
    totalForms,
    totalResponses,
    totalUsers,
  };
}

export async function getRecentActivity(limit: number = 10) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.response.findMany({
    take: limit,
    orderBy: { submittedAt: 'desc' },
    include: {
      form: {
        select: { title: true }
      }
    }
  });
}

export async function getWaAnalytics(days: number = 7) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const startDate = startOfDay(subDays(new Date(), days - 1));
  const endDate = endOfDay(new Date());

  // 1. Incoming Chats Per Day
  const chatsPerDay = await prisma.waChat.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      id: true,
    },
  });

  // 2. Most Used Templates
  const templateUsage = await prisma.waMessage.groupBy({
    by: ['templateName'],
    where: {
      fromMe: true,
      templateName: { not: null },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: 5,
  });

  // 3. Agent Response Performance
  const agents = await prisma.user.findMany({
    where: {
      assignedChats: {
        some: {}
      }
    },
    select: {
      id: true,
      name: true,
      assignedChats: {
        select: {
          id: true,
          messages: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  });

  const agentPerformance = agents.map(agent => {
    let totalResponseTime = 0;
    let responseCount = 0;

    agent.assignedChats.forEach(chat => {
      const msgs = chat.messages;
      for (let i = 0; i < msgs.length; i++) {
        // If message is from customer and there's a following message from this agent
        if (!msgs[i].fromMe) {
          const nextAgentMsg = msgs.slice(i + 1).find(m => m.fromMe && m.senderId === agent.id);
          if (nextAgentMsg) {
            const diff = nextAgentMsg.createdAt.getTime() - msgs[i].createdAt.getTime();
            totalResponseTime += diff;
            responseCount++;
            // Skip to the next message after this agent's response to avoid double counting
            i = msgs.indexOf(nextAgentMsg);
          }
        }
      }
    });

    return {
      name: agent.name || "Unknown",
      avgResponseTime: responseCount > 0 ? Math.round(totalResponseTime / responseCount / 1000 / 60) : 0, // in minutes
      totalResponses: responseCount,
    };
  });

  // Format charts data
  const dateLabels = Array.from({ length: days }).map((_, i) => {
    const d = subDays(new Date(), days - 1 - i);
    return format(d, 'yyyy-MM-dd');
  });

  const chatCounts = dateLabels.map(label => {
    const count = chatsPerDay.filter(c => format(c.createdAt, 'yyyy-MM-dd') === label).reduce((acc, curr) => acc + curr._count.id, 0);
    return count;
  });

  return {
    dailyChats: {
      labels: dateLabels,
      data: chatCounts,
    },
    templates: templateUsage.map(t => ({
      name: t.templateName,
      count: t._count.id,
    })),
    agents: agentPerformance.sort((a, b) => a.avgResponseTime - b.avgResponseTime),
  };
}
