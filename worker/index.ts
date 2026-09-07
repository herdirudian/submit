// Custom PWA Service Worker push notification listener
export {};

const sw = self as any;

sw.addEventListener("push", (event: any) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Pesan WhatsApp Baru";
    const options = {
      body: data.body || "Anda memiliki pesan baru.",
      icon: data.icon || "/icons/icon-192x192.png",
      badge: data.badge || "/icons/icon-192x192.png",
      data: {
        url: data.url || "/whatsapp",
      },
      tag: data.tag || "wa-crm-msg",
      renotify: true,
    };

    event.waitUntil(sw.registration.showNotification(title, options));
  } catch (err) {
    console.error("[SERVICE WORKER PUSH ERROR]", err);
  }
});

sw.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/whatsapp";

  event.waitUntil(
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList: any) => {
      for (const client of clientList) {
        if (client.url && client.url.includes("/whatsapp") && "focus" in client) {
          return client.focus();
        }
      }
      if (sw.clients && sw.clients.openWindow) {
        return sw.clients.openWindow(targetUrl);
      }
    })
  );
});
