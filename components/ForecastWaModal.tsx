"use client";

import React, { useState, useEffect } from "react";
import { X, Send, Loader2, MessageSquare, ExternalLink, CheckCircle, UserCheck } from "lucide-react";
import { sendForecastWaReminderAction } from "@/actions/forecast";

interface ForecastWaModalProps {
  isOpen: boolean;
  onClose: () => void;
  forecastItem: any | null;
}

export default function ForecastWaModal({
  isOpen,
  onClose,
  forecastItem,
}: ForecastWaModalProps) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string; waUrl?: string } | null>(null);

  useEffect(() => {
    if (forecastItem) {
      const picName = forecastItem.pic || "Sales PIC";
      const company = forecastItem.company || "Instansi";
      const eventType = forecastItem.eventType || "Event Reservasi";
      const pax = forecastItem.pax || 0;
      const dateStr = forecastItem.checkIn
        ? new Date(forecastItem.checkIn).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : forecastItem.eventDate
        ? new Date(forecastItem.eventDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : "waktu dekat";

      const unitName = forecastItem.unit === "CAMP_VILLAGE" ? "The Lodge Camp & Village" : "The Lodge Park";

      const defaultText = `Halo Kak ${picName},\n\n📌 *Peringatan Reservasi Tentative (Internal Sales)*\n\nReservasi grup *${company}* (${pax} Pax) untuk kegiatan *${eventType}* pada tanggal *${dateStr}* di *${unitName}* statusnya saat ini masih *TENTATIVE*.\n\nMohon segera difollow-up ke customer/instansi terkait untuk kepastian konfirmasi atau pelunasannya ya Kak.\n\nTerima kasih banyak! 🙏✨`;

      setMessage(defaultText);
      setPhone(forecastItem.picPhone || forecastItem.source || forecastItem.remarks || "");
      setStatusMsg(null);
    }
  }, [forecastItem, isOpen]);

  if (!isOpen || !forecastItem) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setStatusMsg({ type: "error", text: "Silakan masukkan nomor WhatsApp / HP PIC Sales" });
      return;
    }

    try {
      setLoading(true);
      setStatusMsg(null);

      const res = await sendForecastWaReminderAction({
        forecastId: forecastItem.id,
        phone,
        message,
      });

      if (res.success) {
        setStatusMsg({
          type: "success",
          text: "Pesan pengingat internal ke PIC Sales berhasil dikirim via WA Meta API!",
          waUrl: res.waWebUrl,
        });
      } else {
        setStatusMsg({
          type: "error",
          text: "API Meta tidak aktif/salah nomor. Klik tombol di bawah untuk membuka WhatsApp Web ke PIC Sales langsung:",
          waUrl: res.waWebUrl,
        });
      }
    } catch (err: any) {
      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.substring(1) : cleanPhone;
      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

      setStatusMsg({
        type: "error",
        text: err.message || "Gagal mengirim via API. Gunakan tombol Buka WhatsApp Web di bawah:",
        waUrl,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-primary-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck size={20} />
            <div>
              <h2 className="text-base font-bold font-judul">Pengingat Internal PIC Sales (WA)</h2>
              <p className="text-xs text-primary-100 font-subjudul">
                PIC: {forecastItem.pic || "Belum ditentukan"} | Instansi: {forecastItem.company}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-primary-800 rounded-lg transition-colors text-primary-100 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs space-y-2 border ${
                statusMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-900 border-amber-200"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {statusMsg.type === "success" ? (
                  <CheckCircle size={16} className="text-emerald-600" />
                ) : (
                  <MessageSquare size={16} className="text-amber-600" />
                )}
                <span>{statusMsg.text}</span>
              </div>

              {statusMsg.waUrl && (
                <div className="pt-1">
                  <a
                    href={statusMsg.waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <ExternalLink size={14} />
                    <span>Buka WhatsApp Web ke PIC Sales</span>
                  </a>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              No. WhatsApp / HP PIC Sales <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 081234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Nomor WhatsApp internal PIC Sales ({forecastItem.pic || "Internal Sales"}).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pesan WhatsApp Internal Sales (Dapat Disesuaikan)
            </label>
            <textarea
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Kirim Pesan ke PIC Sales</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
