import webpush from "web-push";
import prisma from "@/lib/prisma";

// Fallback VAPID keys if not provided in env for seamless out-of-the-box experience
const DEFAULT_VAPID = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa16tW3-M10LIDK2j9wRz1f7e0G4s0vQ2m_X8f0gZ0X0Z0X0Z0X0Z0X0Z0X0Z0",
  privateKey: process.env.VAPID_PRIVATE_KEY || "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
  subject: process.env.VAPID_SUBJECT || "mailto:admin@lodge.co.id",
};

// Generate operational keys if env is not set
let vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
let vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@lodge.co.id";

if (!vapidPublicKey || !vapidPrivateKey) {
  // Use persistent default keys or generate on initial boot
  const generated = webpush.generateVAPIDKeys();
  vapidPublicKey = vapidPublicKey || generated.publicKey;
  vapidPrivateKey = vapidPrivateKey || generated.privateKey;
}

try {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
} catch (err) {
  console.error("[WEB-PUSH] Error configuring VAPID details:", err);
}

export { vapidPublicKey };

export type PushNotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
};

/**
 * Send push notification to all subscribed Admin / CS devices.
 * Automatically cleans up expired/unsubscribed endpoints (HTTP 404 / 410).
 */
export async function sendPushToAllAdmins(payload: PushNotificationPayload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany();

    if (subscriptions.length === 0) {
      console.log("[WEB-PUSH] No active push subscriptions found in DB.");
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/icon-192x192.png",
      url: payload.url || "/whatsapp",
      tag: payload.tag || "wa-crm-msg",
    });

    console.log(`[WEB-PUSH] Sending push notification to ${subscriptions.length} device(s)...`);

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSub, pushPayload);
        console.log(`[WEB-PUSH] Successfully sent to subscription ID: ${sub.id}`);
      } catch (err: any) {
        console.error(`[WEB-PUSH] Error sending to ${sub.id}:`, err?.statusCode || err?.message);
        
        // HTTP 404 Not Found or HTTP 410 Gone means device unsubscribed or subscription expired
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          console.log(`[WEB-PUSH] Removing expired subscription ID: ${sub.id}`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error("[WEB-PUSH] Critical error in sendPushToAllAdmins:", error);
  }
}
