"use server";

import prisma from "@/lib/prisma";

export async function getSystemStats() {
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

export async function getRecentActivity() {
    // Fetch last 5 responses with form title
    const recentResponses = await prisma.response.findMany({
        take: 5,
        orderBy: { submittedAt: 'desc' },
        include: {
            form: {
                select: { title: true }
            }
        }
    });

    return recentResponses;
}
