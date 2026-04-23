"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- Form Actions ---

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getForms() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return [];
  
  return await prisma.form.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDashboardStats() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { totalForms: 0, totalResponses: 0 };

  const userId = session.user.id;
  const [totalForms, totalResponses] = await Promise.all([
    prisma.form.count({ where: { userId } }),
    prisma.response.count({ where: { form: { userId } } }),
  ]);

  return { totalForms, totalResponses };
}

export async function getFormById(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return null;

  return await prisma.form.findFirst({
    where: { 
        id,
        userId: session.user.id
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

export async function createForm(data: { title: string; description?: string }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
      throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    throw new Error("User tidak ditemukan. Silakan logout lalu login ulang.");
  }

  const title = (data.title ?? "").trim();
  const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "form";

  let form;
  try {
    form = await prisma.form.create({
      data: {
        userId,
        title,
        description: data.description,
        slug: `${baseSlug}-${Date.now()}`,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      form = await prisma.form.create({
        data: {
          userId,
          title,
          description: data.description,
          slug: `${baseSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        },
      });
    } else {
      throw error;
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/forms");
  return form;
}

const normalizeSlug = (raw: string) =>
  raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const isValidSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80;

const sanitizeRedirectUrl = (raw?: string) => {
  if (raw === undefined) return undefined;
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
};

export async function checkSlugAvailability(rawSlug: string, excludeFormId?: string) {
  const slug = normalizeSlug(rawSlug);
  if (!slug) return { ok: false, slug, available: false, message: "Slug wajib diisi" };
  if (!isValidSlug(slug)) return { ok: false, slug, available: false, message: "Slug tidak valid" };

  const existing = await prisma.form.findFirst({
    where: {
      slug,
      ...(excludeFormId ? { NOT: { id: excludeFormId } } : {}),
    },
    select: { id: true },
  });

  if (existing) return { ok: true, slug, available: false, message: "Slug sudah dipakai" };
  return { ok: true, slug, available: true, message: "Slug tersedia" };
}

export async function updateFormSlug(id: string, rawSlug: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const owned = await prisma.form.findFirst({ where: { id, userId: session.user.id }, select: { slug: true } });
  if (!owned) {
    throw new Error("Form tidak ditemukan");
  }

  const check = await checkSlugAvailability(rawSlug, id);
  if (!check.ok || !check.available) {
    throw new Error(check.message);
  }

  try {
    await prisma.form.update({
      where: { id },
      data: { slug: check.slug },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new Error("Slug sudah dipakai");
    }
    throw error;
  }

  revalidatePath(`/builder/${id}`);
  revalidatePath(`/public/forms/${owned.slug}`);
  revalidatePath(`/public/forms/${check.slug}`);
}

export async function updateForm(id: string, data: { 
    title?: string; 
    description?: string; 
    logo?: string; 
    logoWidth?: number; 
    titleFontSize?: number; 
    descriptionFontSize?: number;
    sidebarTitle?: string;
    sidebarSubtitle?: string;
    sidebarDescription?: string;
    contactAddress?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactWorkingHours?: string;
    socialInstagram?: string;
    socialTiktok?: string;
    socialWebsite?: string;
    showSidebar?: boolean;
    primaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    emailSubject?: string;
    emailBody?: string;
    thankYouTitle?: string;
    thankYouMessage?: string;
    redirectUrl?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            throw new Error("Unauthorized");
        }

        const owned = await prisma.form.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
        if (!owned) {
            throw new Error("Form tidak ditemukan");
        }

        const redirectUrl = sanitizeRedirectUrl(data.redirectUrl);
        if (data.redirectUrl !== undefined && redirectUrl === null) {
            throw new Error("Redirect URL tidak valid");
        }

        const form = await prisma.form.update({
            where: { id },
            data: {
                ...data,
                ...(data.redirectUrl !== undefined ? { redirectUrl } : {}),
            }
        });
        revalidatePath(`/builder/${id}`);
        return form;
    } catch (error) {
        console.error("Failed to update form:", error);
        throw new Error("Failed to update form");
    }
}

export async function incrementFormViews(slug: string) {
    try {
        await prisma.form.update({
            where: { slug },
            data: {
                views: {
                    increment: 1
                }
            }
        });
    } catch (error) {
        console.error("Failed to increment views:", error);
    }
}


export async function deleteForm(id: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    const owned = await prisma.form.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
    if (!owned) {
        throw new Error("Form tidak ditemukan");
    }

    await prisma.form.delete({
        where: { id }
    });
    revalidatePath("/dashboard");
    revalidatePath("/forms");
}

export async function publishForm(id: string, isPublished: boolean) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    const owned = await prisma.form.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
    if (!owned) {
        throw new Error("Form tidak ditemukan");
    }

    await prisma.form.update({
        where: { id },
        data: {
            status: isPublished ? "PUBLISHED" : "DRAFT"
        }
    });
    revalidatePath("/dashboard");
    revalidatePath("/forms");
    revalidatePath(`/builder/${id}`);
}

export async function duplicateForm(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const source = await prisma.form.findFirst({
    where: { id, userId: session.user.id },
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

  if (!source) {
    throw new Error("Form tidak ditemukan");
  }

  const title = `${source.title} (Copy)`;
  const baseSlug =
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "form";
  const slug = `${baseSlug}-${Date.now()}`;

  const duplicated = await prisma.form.create({
    data: {
      userId: session.user.id,
      title,
      description: source.description,
      logo: source.logo,
      logoWidth: source.logoWidth,
      titleFontSize: source.titleFontSize,
      descriptionFontSize: source.descriptionFontSize,
      primaryColor: source.primaryColor,
      backgroundColor: source.backgroundColor,
      fontFamily: source.fontFamily,
      sidebarTitle: source.sidebarTitle,
      sidebarSubtitle: source.sidebarSubtitle,
      sidebarDescription: source.sidebarDescription,
      contactAddress: source.contactAddress,
      contactPhone: source.contactPhone,
      contactEmail: source.contactEmail,
      contactWorkingHours: source.contactWorkingHours,
      socialInstagram: source.socialInstagram,
      socialTiktok: source.socialTiktok,
      socialWebsite: source.socialWebsite,
      showSidebar: source.showSidebar,
      emailSubject: source.emailSubject,
      emailBody: source.emailBody,
      thankYouTitle: source.thankYouTitle,
      thankYouMessage: source.thankYouMessage,
      slug,
      status: "DRAFT",
      questions: {
        create: source.questions.map((q) => ({
          type: q.type,
          label: q.label,
          description: q.description,
          placeholder: q.placeholder,
          required: q.required,
          validation: q.validation,
          logic: q.logic,
          order: q.order,
          options: q.options.length
            ? {
                create: q.options.map((o) => ({
                  label: o.label,
                  value: o.value,
                  order: o.order,
                })),
              }
            : undefined,
        })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/dashboard");
  revalidatePath("/forms");
  return duplicated;
}
