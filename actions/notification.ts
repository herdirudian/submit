"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getNotifications() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return [];

    return await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 10 // Limit to recent 10 notifications
    });
}

export async function getUnreadCount() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return 0;

    return await prisma.notification.count({
        where: { 
            userId: session.user.id,
            read: false
        }
    });
}

export async function markAllAsRead() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return;

    await prisma.notification.updateMany({
        where: { 
            userId: session.user.id,
            read: false
        },
        data: { read: true }
    });
    
    revalidatePath("/dashboard");
}

export async function createNotification(userId: string, title: string, message: string, link?: string) {
    await prisma.notification.create({
        data: {
            userId,
            title,
            message,
            link
        }
    });
}
