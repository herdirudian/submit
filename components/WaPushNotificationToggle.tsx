"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function WaPushNotificationToggle() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      checkExistingSubscription();
    } else {
      setIsSupported(false);
      setLoading(false);
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error("Error checking push subscription:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!isSupported) {
      toast.error("Browser ini belum mendukung Web Push Notifications.");
      return;
    }

    setLoading(true);

    try {
      if (isSubscribed) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setIsSubscribed(false);
        toast.success("Notifikasi HP Nonaktif");
      } else {
        // Subscribe
        const perm = await Notification.requestPermission();
        setPermission(perm);

        if (perm !== "granted") {
          toast.error("Izin notifikasi ditolak oleh browser.");
          setLoading(false);
          return;
        }

        // Fetch VAPID key
        const keyRes = await fetch("/api/push/vapid-key");
        const keyData = await keyRes.json();

        if (!keyData.publicKey) {
          throw new Error("Gagal mengambil kunci VAPID server.");
        }

        const convertedKey = urlBase64ToUint8Array(keyData.publicKey);
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });

        // Send subscription to server
        const saveRes = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });

        if (!saveRes.ok) {
          throw new Error("Gagal menyimpan langganan notifikasi ke server.");
        }

        setIsSubscribed(true);
        toast.success("🚀 Notifikasi HP Berhasil Diaktifkan!");
      }
    } catch (err: any) {
      console.error("Failed to toggle push notification:", err);
      toast.error(err?.message || "Gagal mengubah status notifikasi.");
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <span className="text-xs text-slate-400 flex items-center gap-1">
        <AlertCircle size={14} /> Push Notif tidak didukung
      </span>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border shadow-sm ${
        isSubscribed
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          : permission === "denied"
          ? "bg-rose-50 text-rose-600 border-rose-200"
          : "bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100"
      }`}
      title={
        isSubscribed
          ? "Notifikasi HP Aktif (Klik untuk menonaktifkan)"
          : "Klik untuk mengaktifkan notifikasi HP secara real-time"
      }
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isSubscribed ? (
        <>
          <CheckCircle2 size={14} className="text-emerald-600" />
          <span>Notifikasi HP Aktif</span>
        </>
      ) : (
        <>
          <Bell size={14} />
          <span>Aktifkan Notifikasi HP</span>
        </>
      )}
    </button>
  );
}
