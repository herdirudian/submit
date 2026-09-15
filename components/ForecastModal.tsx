"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Save } from "lucide-react";
import { createForecastItem, updateForecastItem, ForecastUnitType, ForecastStatusType } from "@/actions/forecast";

interface ForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unit: ForecastUnitType;
  initialData?: any | null;
}

export default function ForecastModal({
  isOpen,
  onClose,
  onSuccess,
  unit,
  initialData,
}: ForecastModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    company: "",
    reservationDate: "",
    checkIn: "",
    checkOut: "",
    eventDate: "",
    eventType: "",
    venue: "",
    pax: 0,
    room: "",
    rate: 0,
    total: 0,
    isManualTotal: false,
    pic: "",
    status: "TENTATIVE" as ForecastStatusType,
    remarks: "",
    segment: "",
    source: "",
  });

  const formatDateForInput = (d: any) => {
    if (!d) return "";
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return "";
    return dateObj.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        company: initialData.company || "",
        reservationDate: formatDateForInput(initialData.reservationDate),
        checkIn: formatDateForInput(initialData.checkIn),
        checkOut: formatDateForInput(initialData.checkOut),
        eventDate: formatDateForInput(initialData.eventDate),
        eventType: initialData.eventType || "",
        venue: initialData.venue || "",
        pax: initialData.pax || 0,
        room: initialData.room || "",
        rate: initialData.rate || 0,
        total: initialData.total || 0,
        isManualTotal: true,
        pic: initialData.pic || "",
        status: initialData.status || "TENTATIVE",
        remarks: initialData.remarks || "",
        segment: initialData.segment || "",
        source: initialData.source || "",
      });
    } else {
      setFormData({
        company: "",
        reservationDate: "",
        checkIn: "",
        checkOut: "",
        eventDate: "",
        eventType: "",
        venue: "",
        pax: 0,
        room: "",
        rate: 0,
        total: 0,
        isManualTotal: false,
        pic: "",
        status: "TENTATIVE",
        remarks: "",
        segment: "",
        source: "",
      });
    }
    setError("");
  }, [initialData, isOpen]);

  const calculatedTotal = formData.isManualTotal
    ? formData.total
    : (Number(formData.rate) || 0) * (Number(formData.pax) || 0);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company.trim()) {
      setError("Nama Instansi / Company wajib diisi");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        unit,
        company: formData.company,
        reservationDate: formData.reservationDate || null,
        checkIn: unit === "CAMP_VILLAGE" ? formData.checkIn || null : null,
        checkOut: unit === "CAMP_VILLAGE" ? formData.checkOut || null : null,
        eventDate: unit === "PARK" ? formData.eventDate || null : null,
        eventType: formData.eventType || null,
        venue: unit === "PARK" ? formData.venue || null : null,
        pax: Number(formData.pax) || 0,
        room: unit === "CAMP_VILLAGE" ? formData.room || null : null,
        rate: Number(formData.rate) || 0,
        total: calculatedTotal,
        pic: formData.pic || null,
        status: formData.status,
        remarks: formData.remarks || null,
        segment: unit === "PARK" ? formData.segment || null : null,
        source: formData.source || null,
      };

      if (initialData?.id) {
        await updateForecastItem(initialData.id, payload);
      } else {
        await createForecastItem(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data forecast");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-8 border border-slate-100">
        <div className="px-6 py-4 bg-primary-700 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-judul">
              {initialData ? "Edit Forecast Item" : "Tambah Forecast Item"}
            </h2>
            <p className="text-xs text-primary-100 font-subjudul">
              {unit === "CAMP_VILLAGE"
                ? "The Lodge Camp & Village"
                : "The Lodge Park (Kawasan Wisata)"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-primary-800 rounded-lg transition-colors text-primary-100 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Company / Nama Instansi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: PT Telkom / Sekolah Bina Insani"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Status Booking
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as ForecastStatusType })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="TENTATIVE">Tentative (Kuning)</option>
                <option value="CONFIRM">Confirm (Hijau)</option>
                <option value="CANCEL">Cancel (Merah)</option>
              </select>
            </div>

            {/* Reservation Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tanggal Reservasi
              </label>
              <input
                type="date"
                value={formData.reservationDate}
                onChange={(e) => setFormData({ ...formData, reservationDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Camp & Village specific: Check In & Check Out */}
            {unit === "CAMP_VILLAGE" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Check In
                  </label>
                  <input
                    type="date"
                    value={formData.checkIn}
                    onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Check Out
                  </label>
                  <input
                    type="date"
                    value={formData.checkOut}
                    onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </>
            )}

            {/* Park specific: Event Date */}
            {unit === "PARK" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tanggal Event / Pelaksanaan
                </label>
                <input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}

            {/* Event Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Type of Event
              </label>
              <input
                type="text"
                placeholder="Contoh: Gathering / Outbound / Meeting / Wedding"
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Park specific: Venue */}
            {unit === "PARK" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Venue / Area
                </label>
                <input
                  type="text"
                  placeholder="Contoh: TLM, Dapur Hawu, Omah, Pine Forest"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}

            {/* Camp & Village specific: Room */}
            {unit === "CAMP_VILLAGE" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Jumlah Room / Tenda
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 5, Villa Pine, dsb"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}

            {/* Pax */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Jumlah Pax (Orang)
              </label>
              <input
                type="number"
                min="0"
                value={formData.pax}
                onChange={(e) => setFormData({ ...formData, pax: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Rate */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Rate / Price per Pax (Rp)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Total Calculation */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex justify-between">
                <span>TOTAL Revenue (Rp)</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {formData.isManualTotal ? "Manual Override" : "Otomatis (Rate x Pax)"}
                </span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.isManualTotal ? formData.total : calculatedTotal}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total: parseFloat(e.target.value) || 0,
                    isManualTotal: true,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* PIC */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                PIC Sales / Contact
              </label>
              <input
                type="text"
                placeholder="Nama PIC"
                value={formData.pic}
                onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Park specific: Segment */}
            {unit === "PARK" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Segment
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Corporate, Govt, TA, Direct"
                  value={formData.segment}
                  onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}

            {/* Source */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Source / Sumber Booking
              </label>
              <input
                type="text"
                placeholder="Contoh: WhatsApp / Direct / Agency"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Remarks */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Remarks / Catatan
              </label>
              <textarea
                rows={2}
                placeholder="Catatan tambahan..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Simpan Data</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
