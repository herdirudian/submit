import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function recordLoginAttempt(email: string, ip: string) {
  const maxAttempts = 5;
  
  const attempt = await prisma.loginAttempt.findUnique({
    where: { email_ip: { email, ip } }
  });

  if (!attempt) {
    await prisma.loginAttempt.create({
      data: { email, ip, count: 1 }
    });
  } else {
    const newCount = attempt.count + 1;
    const isLocked = newCount >= maxAttempts;
    
    await prisma.loginAttempt.update({
      where: { id: attempt.id },
      data: {
        count: newCount,
        isLocked,
        lockedAt: isLocked ? new Date() : null
      }
    });
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = (credentials?.email ?? "").trim().toLowerCase();
        const password = (credentials?.password ?? "").trim();
        const ip = (req?.headers as any)?.["x-forwarded-for"] || "unknown";

        if (!email || !password) {
          return null;
        }

        // 1. Check for locked account
        const attempt = await prisma.loginAttempt.findUnique({
          where: { email_ip: { email, ip } }
        });

        if (attempt?.isLocked && attempt.lockedAt) {
          const lockTime = 15 * 60 * 1000; // 15 minutes
          const timePassed = Date.now() - attempt.lockedAt.getTime();
          
          if (timePassed < lockTime) {
            throw new Error("Account temporarily locked. Try again in 15 minutes.");
          } else {
            // Unlock after time passed
            await prisma.loginAttempt.delete({ where: { id: attempt.id } });
          }
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          await recordLoginAttempt(email, ip);
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          password,
          user.password,
        );

        if (!isPasswordValid) {
          await recordLoginAttempt(email, ip);
          return null;
        }

        // Success - clear attempts
        if (attempt) {
          await prisma.loginAttempt.delete({ where: { id: attempt.id } });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
      }
      if (session.user && token.sub) {
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { name: true, email: true, image: true, role: true },
        });
        if (user) {
          session.user.name = user.name;
          session.user.email = user.email;
          session.user.image = user.image;
          (session.user as any).role = user.role;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = (user as any).image ?? null;
        token.role = (user as any).role;
      }
      return token;
    },
  },
};
