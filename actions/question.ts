"use server";

import prisma from "@/lib/prisma";
import { QuestionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function addQuestion(formId: string, type: QuestionType, index: number) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const owned = await prisma.form.findFirst({ where: { id: formId, userId: session.user.id }, select: { id: true } });
    if (!owned) {
        throw new Error("Form tidak ditemukan");
    }

    // 1. Shift existing questions down
    // This is a naive implementation; for production, consider using a float/lexorank for order
    // or a linked list structure, but for small forms, bulk update is fine.
    
    /* 
       Note: Prisma doesn't support incrementing a field based on a condition easily in one query without raw SQL 
       or updating one by one. For simplicity in this demo, we'll append to end or just take the index.
    */
    
    // Get max order
    const maxOrder = await prisma.question.aggregate({
        where: { formId },
        _max: { order: true }
    });
    
    const newOrder = (maxOrder._max.order ?? 0) + 1;

    const question = await prisma.question.create({
        data: {
            formId,
            type,
            label: "New Question",
            order: newOrder,
            options: type === 'DROPDOWN' || type === 'RADIO' || type === 'CHECKBOX' ? {
                create: [
                    { label: "Option 1", value: "option-1", order: 1 },
                    { label: "Option 2", value: "option-2", order: 2 },
                ]
            } : undefined
        },
        include: {
            options: true
        }
    });

    revalidatePath(`/builder/${formId}`);
    return question;
}

export async function updateQuestion(
    id: string,
    data: {
        label?: string;
        required?: boolean;
        description?: string;
        placeholder?: string;
        validation?: string | null;
        logic?: string | null;
    }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const existing = await prisma.question.findFirst({
        where: { id, form: { userId: session.user.id } },
        select: { id: true, formId: true }
    });
    if (!existing) {
        throw new Error("Question tidak ditemukan");
    }

    const question = await prisma.question.update({
        where: { id },
        data,
    });
    revalidatePath(`/builder/${existing.formId}`);
    return question;
}

export async function duplicateQuestion(id: string, formId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const owned = await prisma.form.findFirst({ where: { id: formId, userId: session.user.id }, select: { id: true } });
    if (!owned) {
        throw new Error("Form tidak ditemukan");
    }

    const source = await prisma.question.findFirst({
        where: { id, formId },
        include: { options: { orderBy: { order: "asc" } } }
    });

    if (!source) {
        throw new Error("Question not found");
    }

    const maxOrder = await prisma.question.aggregate({
        where: { formId },
        _max: { order: true }
    });

    const newOrder = (maxOrder._max.order ?? 0) + 1;

    const duplicated = await prisma.question.create({
        data: {
            formId,
            type: source.type,
            label: source.label,
            description: source.description,
            placeholder: source.placeholder,
            required: source.required,
            validation: source.validation,
            logic: source.logic,
            order: newOrder,
            options: source.options.length
                ? {
                      create: source.options.map((o) => ({
                          label: o.label,
                          value: o.value,
                          order: o.order,
                      })),
                  }
                : undefined,
        },
        include: { options: true }
    });

    revalidatePath(`/builder/${formId}`);
    return duplicated;
}

export async function deleteQuestion(id: string, formId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const owned = await prisma.question.findFirst({
        where: { id, formId, form: { userId: session.user.id } },
        select: { id: true }
    });
    if (!owned) {
        throw new Error("Question tidak ditemukan");
    }

    await prisma.question.delete({
        where: { id }
    });
    revalidatePath(`/builder/${formId}`);
}

export async function updateQuestionOrder(formId: string, items: { id: string; order: number }[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const owned = await prisma.form.findFirst({ where: { id: formId, userId: session.user.id }, select: { id: true } });
    if (!owned) {
        throw new Error("Form tidak ditemukan");
    }

    // Using transaction to update all
    const results = await prisma.$transaction(
        items.map((item) =>
            prisma.question.updateMany({
                where: { id: item.id, formId },
                data: { order: item.order }
            })
        )
    );
    if (results.some((r) => r.count === 0)) {
        throw new Error("Ada item yang tidak valid");
    }
    revalidatePath(`/builder/${formId}`);
}
