import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { endpoint, keys } = body || {};

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
    }

    const userAgent = req.headers.get("user-agent") || undefined;

    // Save or update subscription endpoint for this user
    const existing = await prisma.pushSubscription.findFirst({
      where: { endpoint },
    });

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent,
        },
      });
    } else {
      await prisma.pushSubscription.create({
        data: {
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Subscription saved" });
  } catch (error: any) {
    console.error("[PUSH SUBSCRIBE API ERROR]", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body || {};

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint },
      });
    }

    return NextResponse.json({ success: true, message: "Unsubscribed" });
  } catch (error: any) {
    console.error("[PUSH UNSUBSCRIBE API ERROR]", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
