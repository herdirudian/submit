// Custom PWA Service Worker push notification listener
declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event: any) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Pesan WhatsApp Baru";
    const options: NotificationOptions = {
      body: data.body || "Anda memiliki pesan baru.",
      icon: data.icon || "/icons/icon-192x192.png",
      badge: data.badge || "/icons/icon-192x192.png",
      data: {
        url: data.url || "/whatsapp",
      },
      tag: data.tag || "wa-crm-msg",
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("[SERVICE WORKER PUSH ERROR]", err);
  }
});

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/whatsapp";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList: any) => {
      for (const client of clientList) {
        if (client.url && client.url.includes("/whatsapp") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients && self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
