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

    // Handle questions and options
    if (questions) {
        // Mapping old temporary IDs to new database IDs
        const idMapping: Record<string, string> = {};

        // 1. Delete existing structure
        await prisma.pollQuestion.deleteMany({ where: { pollId: id } });

        // 2. Create questions and options sequentially to build ID mapping
        for (const q of questions) {
            const createdQuestion = await prisma.pollQuestion.create({
                data: {
                    pollId: id,
                    type: q.type as PollQuestionType,
                    label: q.label,
                    order: q.order,
                }
            });

            if (q.options) {
                for (const opt of q.options) {
                    const createdOption = await prisma.pollOption.create({
                        data: {
                            questionId: createdQuestion.id,
                            label: opt.label,
                            value: opt.value || opt.label,
                            imageUrl: opt.imageUrl,
                            order: opt.order,
                            // parentId will be updated in the next pass after all options are created
                        }
                    });
                    // Store mapping: frontendId -> backendId
                    idMapping[opt.id] = createdOption.id;
                }
            }
        }

        // 3. Second pass: Update parentId for products using the mapping
        for (const q of questions) {
            if (q.type === 'PRODUCT_SELECT' && q.options) {
                for (const opt of q.options) {
                    if (opt.parentId && idMapping[opt.parentId]) {
                        await prisma.pollOption.update({
                            where: { id: idMapping[opt.id] },
                            data: { parentId: idMapping[opt.parentId] }
                        });
                    }
                }
            }
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
    // Public action - allow submission if poll exists (even if draft for preview testing)
    const poll = await prisma.poll.findUnique({
        where: { id: pollId }
    });

    if (!poll) {
        console.error(`[POLL SUBMIT] Poll not found: ${pollId}`);
        throw new Error("Poll not found");
    }

    try {
        return await prisma.pollResult.create({
            data: {
                pollId,
                optionId,
                ip: metadata.ip,
                userAgent: metadata.userAgent
            }
        });
    } catch (error) {
        console.error(`[POLL SUBMIT] Database error:`, error);
        throw new Error("Failed to save result");
    }
}

export async function getPollBySlug(slug: string) {
    return await prisma.poll.findUnique({
        where: { slug },
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

export async function publishPoll(id: string, isPublished: boolean) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const poll = await prisma.poll.update({
        where: { id, userId: session.user.id },
        data: {
            status: isPublished ? 'PUBLISHED' : 'DRAFT'
        }
    });

    revalidatePath("/polls");
    revalidatePath(`/polls/${id}`);
    revalidatePath(`/public/polls/${poll.slug}`);
    
    return poll;
}
