"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getWaFaqs() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  return await prisma.waFaq.findMany({
    orderBy: { order: 'asc' }
  });
}

export async function createWaFaq(data: { keyword: string; question: string; answer: string; order?: number }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const faq = await prisma.waFaq.create({
    data: {
      keyword: data.keyword,
      question: data.question,
      answer: data.answer,
      order: data.order || 0,
    }
  });

  revalidatePath("/whatsapp/chatbot");
  return faq;
}

export async function updateWaFaq(id: string, data: { keyword?: string; question?: string; answer?: string; order?: number; isActive?: boolean }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const faq = await prisma.waFaq.update({
    where: { id },
    data
  });

  revalidatePath("/whatsapp/chatbot");
  return faq;
}

export async function deleteWaFaq(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.waFaq.delete({
    where: { id }
  });

  revalidatePath("/whatsapp/chatbot");
  return { success: true };
}
