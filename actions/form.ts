"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// --- Form Actions ---

export async function getForms() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return [];

  return await prisma.form.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFormById(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return null;

  return await prisma.form.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });
}

export async function getFormBySlug(slug: string) {
  return await prisma.form.findUnique({
    where: { slug },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });
}

export async function createForm(data: { title: string; description?: string; slug?: string }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const title = (data.title ?? "").trim();
  const baseSlug = data.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "form";
  const slug = `${baseSlug}-${Date.now()}`;

  const form = await prisma.form.create({
    data: {
      title,
      description: data.description,
      slug,
      userId: session.user.id,
      status: "DRAFT",
    },
  });

  revalidatePath("/dashboard");
  return form;
}

export async function updateForm(id: string, data: any) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const form = await prisma.form.update({
    where: { id, userId: session.user.id },
    data,
  });

  revalidatePath(`/builder/${id}`);
  revalidatePath(`/forms/${id}`);
  revalidatePath(`/public/forms/${form.slug}`);
  return form;
}

export async function updateFormSettings(id: string, data: any) {
  return updateForm(id, data);
}

export async function checkSlugAvailability(slug: string, currentFormId?: string) {
  const existing = await prisma.form.findFirst({
    where: {
      slug,
      ...(currentFormId ? { NOT: { id: currentFormId } } : {}),
    },
  });
  if (existing) {
    return { ok: false, message: "Slug sudah digunakan oleh form lain." };
  }
  return { ok: true, message: "Slug dapat digunakan." };
}

export async function updateFormSlug(id: string, newSlug: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const isAvailable = await checkSlugAvailability(newSlug, id);
  if (!isAvailable) throw new Error("Slug sudah digunakan");

  const form = await prisma.form.update({
    where: { id, userId: session.user.id },
    data: { slug: newSlug },
  });

  revalidatePath(`/builder/${id}`);
  revalidatePath("/dashboard");
  return form;
}

export async function duplicateForm(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const existingForm = await prisma.form.findFirst({
    where: { id, userId: session.user.id },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
    },
  });

  if (!existingForm) throw new Error("Form tidak ditemukan");

  const newSlug = `${existingForm.slug}-copy-${Date.now()}`;
  const duplicatedForm = await prisma.form.create({
    data: {
      userId: session.user.id,
      title: `${existingForm.title} (Copy)`,
      description: existingForm.description,
      logo: existingForm.logo,
      logoWidth: existingForm.logoWidth,
      titleFontSize: existingForm.titleFontSize,
      descriptionFontSize: existingForm.descriptionFontSize,
      primaryColor: existingForm.primaryColor,
      backgroundColor: existingForm.backgroundColor,
      fontFamily: existingForm.fontFamily,
      sidebarTitle: existingForm.sidebarTitle,
      sidebarSubtitle: existingForm.sidebarSubtitle,
      sidebarDescription: existingForm.sidebarDescription,
      contactAddress: existingForm.contactAddress,
      contactPhone: existingForm.contactPhone,
      contactEmail: existingForm.contactEmail,
      contactWorkingHours: existingForm.contactWorkingHours,
      socialInstagram: existingForm.socialInstagram,
      socialTiktok: existingForm.socialTiktok,
      socialWebsite: existingForm.socialWebsite,
      showSidebar: existingForm.showSidebar,
      sendEmailConfirmation: existingForm.sendEmailConfirmation,
      emailSubject: existingForm.emailSubject,
      emailBody: existingForm.emailBody,
      thankYouTitle: existingForm.thankYouTitle,
      thankYouMessage: existingForm.thankYouMessage,
      whatsappEnabled: existingForm.whatsappEnabled,
      whatsappTemplateName: existingForm.whatsappTemplateName,
      slug: newSlug,
      status: "DRAFT",
    },
  });

  for (const q of existingForm.questions) {
    const newQuestion = await prisma.question.create({
      data: {
        formId: duplicatedForm.id,
        type: q.type,
        label: q.label,
        description: q.description,
        placeholder: q.placeholder,
        required: q.required,
        validation: q.validation,
        logic: q.logic,
        order: q.order,
      },
    });

    if (q.options && q.options.length > 0) {
      await prisma.questionOption.createMany({
        data: q.options.map((opt) => ({
          questionId: newQuestion.id,
          label: opt.label,
          value: opt.value,
          order: opt.order,
        })),
      });
    }
  }

  revalidatePath("/dashboard");
  return duplicatedForm;
}

export async function incrementFormViews(slug: string) {
  try {
    await prisma.form.update({
      where: { slug },
      data: {
        views: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error("Failed to increment views:", error);
  }
}

export async function deleteForm(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  await prisma.form.delete({
    where: { id, userId: session.user.id },
  });
  revalidatePath("/dashboard");
}

export async function publishForm(id: string, isPublished: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  await prisma.form.update({
    where: { id, userId: session.user.id },
    data: {
      status: isPublished ? "PUBLISHED" : "DRAFT",
    },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/builder/${id}`);
}

export async function getDashboardStats() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { totalForms: 0, totalResponses: 0, totalViews: 0 };

  const forms = await prisma.form.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      views: true,
      _count: {
        select: { responses: true },
      },
    },
  });

  const totalForms = forms.length;
  const totalViews = forms.reduce((acc, f) => acc + (f.views || 0), 0);
  const totalResponses = forms.reduce((acc, f) => acc + f._count.responses, 0);

  return { totalForms, totalResponses, totalViews };
}
