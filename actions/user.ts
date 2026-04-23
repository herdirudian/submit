"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getUsers() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    return await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
    });
}

export async function createUser(data: { name: string; email: string; password: string }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
    });

    if (existingUser) {
        throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: hashedPassword
        }
    });

    revalidatePath("/users");
    return user;
}

export async function deleteUser(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    // Prevent deleting the last user or self? For now just simple delete.
    // Ideally we should check if it's the current user, but we don't have session here easily without passing it.
    
    await prisma.user.delete({
        where: { id }
    });
    
    revalidatePath("/users");
}
