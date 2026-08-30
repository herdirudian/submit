"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { PollQuestionType, FormStatus } from "@prisma/client";

export async function getPolls() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    return await prisma.poll.findMany({
        where: { userId: session.user.id },
        include: {
            _count: {
                select: { results: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function createPoll(data: { title: string; slug: string }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const poll = await prisma.poll.create({
        data: {
            title: data.title,
            slug: data.slug,
            userId: session.user.id,
            status: 'DRAFT'
        }
    });

    revalidatePath("/polls");
    return poll;
}

export async function getPollById(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    return await prisma.poll.findUnique({
        where: { id },
        include: {
            questions: {
                include: {
                    options: {
                        orderBy: { order: 'asc' }
                    }
                },
                orderBy: { order: 'asc' }
            }
        }
    });
}

export async function updatePoll(id: string, data: any) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const { questions, ...pollData } = data;

    // Update poll basic info
    const updatedPoll = await prisma.poll.update({
        where: { id },
        data: pollData
    });

    // Handle questions and options (Simplified: delete and recreate for now, or implement deep update)
    if (questions) {
        // This is a simplified approach. In production, you'd want to track IDs to avoid deleting everything.
        await prisma.pollQuestion.deleteMany({ where: { pollId: id } });

        for (const q of questions) {
            const createdQuestion = await prisma.pollQuestion.create({
                data: {
                    pollId: id,
                    type: q.type as PollQuestionType,
                    label: q.label,
                    order: q.order,
                    options: {
                        create: q.options?.map((opt: any) => ({
                            label: opt.label,
                            value: opt.value || opt.label,
                            imageUrl: opt.imageUrl,
                            parentId: opt.parentId,
                            order: opt.order
                        }))
                    }
                }
            });
        }
    }

    revalidatePath("/polls");
    revalidatePath(`/polls/${id}`);
    revalidatePath(`/public/polls/${updatedPoll.slug}`);
    
    return updatedPoll;
}

export async function deletePoll(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.poll.delete({
        where: { id }
    });

    revalidatePath("/polls");
}

export async function submitPollResult(pollId: string, optionId: string, metadata: { ip?: string; userAgent?: string }) {
    // Public action
    const poll = await prisma.poll.findUnique({
        where: { id: pollId, status: 'PUBLISHED' }
    });

    if (!poll) throw new Error("Poll not found or not published");

    return await prisma.pollResult.create({
        data: {
            pollId,
            optionId,
            ip: metadata.ip,
            userAgent: metadata.userAgent
        }
    });
}

export async function getPollBySlug(slug: string) {
    return await prisma.poll.findUnique({
        where: { slug, status: 'PUBLISHED' },
        include: {
            questions: {
                include: {
                    options: {
                        orderBy: { order: 'asc' }
                    }
                },
                orderBy: { order: 'asc' }
            }
        }
    });
}
