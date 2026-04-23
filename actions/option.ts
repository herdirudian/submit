"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function addOption(questionId: string, formId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const owned = await prisma.question.findFirst({
        where: { id: questionId, formId, form: { userId: session.user.id } },
        select: { id: true }
    });
    if (!owned) {
        throw new Error("Question tidak ditemukan");
    }

    // Get max order
    const maxOrder = await prisma.questionOption.aggregate({
        where: { questionId },
        _max: { order: true }
    });

    const newOrder = (maxOrder._max.order ?? 0) + 1;

    const option = await prisma.questionOption.create({
        data: {
            questionId,
            label: `Option ${newOrder}`,
            value: `option-${newOrder}`, // Simple value generation
            order: newOrder
        }
    });

    revalidatePath(`/builder/${formId}`);
    return option;
}

export async function updateOption(id: string, formId: string, data: { label: string }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const owned = await prisma.questionOption.findFirst({
        where: { id, question: { formId, form: { userId: session.user.id } } },
        select: { id: true }
    });
    if (!owned) {
        throw new Error("Option tidak ditemukan");
    }

    const option = await prisma.questionOption.update({
        where: { id },
        data: {
            label: data.label,
            value: data.label // Keep value same as label for simplicity in this MVP
        }
    });
    revalidatePath(`/builder/${formId}`);
    return option;
}

export async function deleteOption(id: string, formId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const owned = await prisma.questionOption.findFirst({
        where: { id, question: { formId, form: { userId: session.user.id } } },
        select: { id: true }
    });
    if (!owned) {
        throw new Error("Option tidak ditemukan");
    }

    await prisma.questionOption.delete({
        where: { id }
    });
    revalidatePath(`/builder/${formId}`);
}
