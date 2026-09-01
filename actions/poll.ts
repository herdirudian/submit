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

export async function submitPollResult(pollId: string, optionIds: string[], metadata: { ip?: string; userAgent?: string }) {
    // Public action - allow submission if poll exists
    const poll = await prisma.poll.findUnique({
        where: { id: pollId }
    });

    if (!poll) {
        console.error(`[POLL SUBMIT] Poll not found: ${pollId}`);
        throw new Error("Poll not found");
    }

    try {
        // Create a unique submissionId for grouping answers from the same submission
        const submissionId = crypto.randomUUID();
        
        // Create a result record for each selected option
        const results = await Promise.all(
            optionIds.map(optionId => 
                prisma.pollResult.create({
                    data: {
                        pollId,
                        submissionId,
                        optionId,
                        ip: metadata.ip,
                        userAgent: metadata.userAgent
                    }
                })
            )
        );
        return { success: true, count: results.length, submissionId };
    } catch (error) {
        console.error(`[POLL SUBMIT] Database error:`, error);
        throw new Error("Failed to save results");
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

export async function getPollAnalytics(id: string, fromStr?: string, toStr?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const poll = await prisma.poll.findUnique({
        where: { id, userId: session.user.id },
        include: {
            questions: {
                include: {
                    options: {
                        include: {
                            _count: {
                                select: { results: true }
                            }
                        },
                        orderBy: { order: 'asc' }
                    }
                },
                orderBy: { order: 'asc' }
            }
        }
    });

    if (!poll) throw new Error("Poll not found");

    // Build date filter
    const whereCondition: any = { pollId: id };
    if (fromStr || toStr) {
        whereCondition.createdAt = {};
        if (fromStr) {
            const dFrom = new Date(`${fromStr}T00:00:00`);
            if (!isNaN(dFrom.getTime())) whereCondition.createdAt.gte = dFrom;
        }
        if (toStr) {
            const dTo = new Date(`${toStr}T23:59:59.999`);
            if (!isNaN(dTo.getTime())) whereCondition.createdAt.lte = dTo;
        }
    }

    const allResults = await prisma.pollResult.findMany({
        where: whereCondition,
        include: {
            option: {
                include: {
                    question: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Grouping results into submission sessions
    const submissionsMap = new Map<string, {
        submissionId: string;
        createdAt: Date;
        ip: string | null;
        userAgent: string | null;
        answers: Record<string, {
            optionId: string;
            optionLabel: string;
            optionValue: string;
            questionId: string;
            questionType: string;
            questionLabel: string;
            imageUrl: string | null;
            parentId: string | null;
        }>;
    }>();

    for (const r of allResults) {
        // Fallback key if submissionId is null (legacy data)
        const sessionKey = r.submissionId || `${r.ip || 'ip'}_${r.userAgent || 'ua'}_${Math.floor(new Date(r.createdAt).getTime() / 5000)}`;
        
        if (!submissionsMap.has(sessionKey)) {
            submissionsMap.set(sessionKey, {
                submissionId: sessionKey,
                createdAt: r.createdAt,
                ip: r.ip,
                userAgent: r.userAgent,
                answers: {}
            });
        }

        const sub = submissionsMap.get(sessionKey)!;
        sub.answers[r.option.questionId] = {
            optionId: r.option.id,
            optionLabel: r.option.label,
            optionValue: r.option.value,
            questionId: r.option.questionId,
            questionType: r.option.question.type,
            questionLabel: r.option.question.label,
            imageUrl: r.option.imageUrl,
            parentId: r.option.parentId
        };
    }

    const submissions = Array.from(submissionsMap.values());

    // Questions metadata
    const infoQuestion = poll.questions.find(q => q.type === 'INFO_STEP');
    const categoryQuestion = poll.questions.find(q => q.type === 'CATEGORY_SELECT');
    const productQuestion = poll.questions.find(q => q.type === 'PRODUCT_SELECT');

    const infoOptions = infoQuestion?.options || [];
    const categoryOptions = categoryQuestion?.options || [];
    const productOptions = productQuestion?.options || [];

    // 1. Cross-tabulation: Products by Form Info
    const productByInfoMap: Record<string, {
        optionId: string;
        label: string;
        imageUrl: string | null;
        categoryLabel: string;
        totalVotes: number;
        byInfo: Record<string, number>;
    }> = {};

    for (const opt of productOptions) {
        const parentCategory = categoryOptions.find(c => c.id === opt.parentId);
        const byInfo: Record<string, number> = {};
        for (const infoOpt of infoOptions) {
            byInfo[infoOpt.id] = 0;
        }

        productByInfoMap[opt.id] = {
            optionId: opt.id,
            label: opt.label,
            imageUrl: opt.imageUrl,
            categoryLabel: parentCategory?.label || "-",
            totalVotes: 0,
            byInfo
        };
    }

    // 2. Cross-tabulation: Categories by Form Info
    const categoryByInfoMap: Record<string, {
        optionId: string;
        label: string;
        imageUrl: string | null;
        totalVotes: number;
        byInfo: Record<string, number>;
    }> = {};

    for (const catOpt of categoryOptions) {
        const byInfo: Record<string, number> = {};
        for (const infoOpt of infoOptions) {
            byInfo[infoOpt.id] = 0;
        }

        categoryByInfoMap[catOpt.id] = {
            optionId: catOpt.id,
            label: catOpt.label,
            imageUrl: catOpt.imageUrl,
            totalVotes: 0,
            byInfo
        };
    }

    // 3. Analytics per Tanggal (Daily Breakdown)
    const dailyStatsMap: Record<string, {
        date: string;
        formattedDate: string;
        totalVotes: number;
        byInfo: Record<string, number>;
        byCategory: Record<string, number>;
        byProduct: Record<string, number>;
    }> = {};

    // Populate matrix and daily stats from submissions
    for (const sub of submissions) {
        const infoAns = infoQuestion ? sub.answers[infoQuestion.id] : null;
        const catAns = categoryQuestion ? sub.answers[categoryQuestion.id] : null;
        const prodAns = productQuestion ? sub.answers[productQuestion.id] : null;

        // Populate Category by Info
        if (catAns && categoryByInfoMap[catAns.optionId]) {
            categoryByInfoMap[catAns.optionId].totalVotes++;
            if (infoAns && categoryByInfoMap[catAns.optionId].byInfo[infoAns.optionId] !== undefined) {
                categoryByInfoMap[catAns.optionId].byInfo[infoAns.optionId]++;
            }
        }

        // Populate Product by Info
        if (prodAns && productByInfoMap[prodAns.optionId]) {
            productByInfoMap[prodAns.optionId].totalVotes++;
            if (infoAns && productByInfoMap[prodAns.optionId].byInfo[infoAns.optionId] !== undefined) {
                productByInfoMap[prodAns.optionId].byInfo[infoAns.optionId]++;
            }
        }

        // Daily Stats
        const dateObj = new Date(sub.createdAt);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dateKey = `${yyyy}-${mm}-${dd}`;
        const formattedDate = `${dd}/${mm}/${yyyy}`;

        if (!dailyStatsMap[dateKey]) {
            dailyStatsMap[dateKey] = {
                date: dateKey,
                formattedDate,
                totalVotes: 0,
                byInfo: {},
                byCategory: {},
                byProduct: {}
            };
        }

        const dStat = dailyStatsMap[dateKey];
        dStat.totalVotes++;

        if (infoAns) {
            dStat.byInfo[infoAns.optionLabel] = (dStat.byInfo[infoAns.optionLabel] || 0) + 1;
        }
        if (catAns) {
            dStat.byCategory[catAns.optionLabel] = (dStat.byCategory[catAns.optionLabel] || 0) + 1;
        }
        if (prodAns) {
            dStat.byProduct[prodAns.optionLabel] = (dStat.byProduct[prodAns.optionLabel] || 0) + 1;
        }
    }

    const dailyStats = Object.values(dailyStatsMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
        ...poll,
        totalSubmissions: submissions.length,
        submissions,
        infoQuestion,
        categoryQuestion,
        productQuestion,
        infoOptions,
        categoryOptions,
        productOptions,
        productByInfo: Object.values(productByInfoMap).sort((a, b) => b.totalVotes - a.totalVotes),
        categoryByInfo: Object.values(categoryByInfoMap).sort((a, b) => b.totalVotes - a.totalVotes),
        dailyStats
    };
}
