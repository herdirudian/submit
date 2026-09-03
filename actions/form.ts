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
  return form;
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
}) {
    try {
        // TODO: Auth check
        const form = await prisma.form.update({
            where: { id },
            data: {
                ...data
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
    // TODO: Auth check
    await prisma.form.delete({
        where: { id }
    });
    revalidatePath("/dashboard");
}

export async function publishForm(id: string, isPublished: boolean) {
    // TODO: Auth check
    await prisma.form.update({
        where: { id },
        data: {
            status: isPublished ? "PUBLISHED" : "DRAFT"
        }
    });
    revalidatePath("/dashboard");
    revalidatePath(`/builder/${id}`);
}
