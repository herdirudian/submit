"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Save, Calculator, DollarSign, UserCheck, Phone } from "lucide-react";
import {
  createForecastItem,
  updateForecastItem,
  getSalesPics,
  ForecastUnitType,
  ForecastStatusType,
  ForecastDpStatusType,
} from "@/actions/forecast";

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

  const [rateType, setRateType] = useState<"PER_PAX" | "TOTAL_DIRECT">("PER_PAX");
  const [salesPics, setSalesPics] = useState<{ name: string; phone: string; email?: string }[]>([]);

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
    dpStatus: "BELUM_DP" as ForecastDpStatusType,
    dpAmount: 0,
    dueDate: "",
    pic: "",
    picPhone: "",
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
    if (isOpen) {
      getSalesPics()
        .then((pics) => setSalesPics(pics))
        .catch((err) => console.warn("Failed to load sales PIC list:", err));
    }

    if (initialData) {
      const initPax = initialData.pax || 0;
      const initRate = initialData.rate || 0;
      const initTotal = initialData.total || 0;

      const isPerPax = initPax > 0 && initRate > 0 && Math.abs(initRate * initPax - initTotal) < 100;

      setRateType(isPerPax ? "PER_PAX" : "TOTAL_DIRECT");
      setFormData({
        company: initialData.company || "",
        reservationDate: formatDateForInput(initialData.reservationDate),
        checkIn: formatDateForInput(initialData.checkIn),
        checkOut: formatDateForInput(initialData.checkOut),
        eventDate: formatDateForInput(initialData.eventDate),
        eventType: initialData.eventType || "",
        venue: initialData.venue || "",
        pax: initPax,
        room: initialData.room || "",
        rate: initRate,
        total: initTotal,
        dpStatus: initialData.dpStatus || "BELUM_DP",
        dpAmount: initialData.dpAmount || 0,
        dueDate: formatDateForInput(initialData.dueDate),
        pic: initialData.pic || "",
        picPhone: initialData.picPhone || "",
        status: initialData.status || "TENTATIVE",
        remarks: initialData.remarks || "",
        segment: initialData.segment || "",
        source: initialData.source || "",
      });
    } else {
      setRateType("PER_PAX");
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
        dpStatus: "BELUM_DP",
        dpAmount: 0,
        dueDate: "",
        pic: "",
        picPhone: "",
        status: "TENTATIVE",
        remarks: "",
        segment: "",
        source: "",
      });
    }
    setError("");
  }, [initialData, isOpen]);

  const handleRateChange = (val: number) => {
    if (rateType === "PER_PAX") {
      setFormData((prev) => ({
        ...prev,
        rate: val,
        total: val * (prev.pax || 0),
      }));
    } else {
      setFormData((prev) => ({ ...prev, rate: val }));
    }
  };

  const handlePaxChange = (val: number) => {
    if (rateType === "PER_PAX") {
      setFormData((prev) => ({
        ...prev,
        pax: val,
        total: (prev.rate || 0) * val,
      }));
    } else {
      setFormData((prev) => ({ ...prev, pax: val }));
    }
  };

  const handleTotalChange = (val: number) => {
    if (rateType === "TOTAL_DIRECT") {
      const calculatedRate = formData.pax > 0 ? Math.round(val / formData.pax) : val;
      setFormData((prev) => ({
        ...prev,
        total: val,
        rate: calculatedRate,
      }));
    } else {
      setFormData((prev) => ({ ...prev, total: val }));
    }
  };

  const handleRateTypeSwitch = (type: "PER_PAX" | "TOTAL_DIRECT") => {
    setRateType(type);
    if (type === "PER_PAX") {
      setFormData((prev) => ({
        ...prev,
        total: (prev.rate || 0) * (prev.pax || 0),
      }));
    } else {
      const calculatedRate = formData.pax > 0 ? Math.round(formData.total / formData.pax) : formData.total;
      setFormData((prev) => ({
        ...prev,
        rate: calculatedRate,
      }));
    }
  };

  const handleSelectPic = (picName: string) => {
    const found = salesPics.find((p) => p.name.toLowerCase() === picName.toLowerCase());
    if (found) {
      setFormData((prev) => ({
        ...prev,
        pic: found.name,
        picPhone: found.phone || prev.picPhone,
      }));
    } else {
      setFormData((prev) => ({ ...prev, pic: picName }));
    }
  };

  const handleDpStatusChange = (status: ForecastDpStatusType) => {
    let suggestedDp = formData.dpAmount;
    if (status === "DP_30") {
      suggestedDp = Math.round(formData.total * 0.3);
    } else if (status === "DP_50") {
      suggestedDp = Math.round(formData.total * 0.5);
    } else if (status === "LUNAS") {
      suggestedDp = formData.total;
    } else if (status === "BELUM_DP") {
      suggestedDp = 0;
    }
    setFormData((prev) => ({
      ...prev,
      dpStatus: status,
      dpAmount: suggestedDp,
    }));
  };

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

      const finalRate = Number(formData.rate) || 0;
      const finalTotal = rateType === "PER_PAX" 
        ? (Number(formData.rate) || 0) * (Number(formData.pax) || 0)
        : Number(formData.total) || 0;

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
        rate: finalRate,
        total: finalTotal,
        dpStatus: formData.dpStatus,
        dpAmount: Number(formData.dpAmount) || 0,
        dueDate: formData.dueDate || null,
        pic: formData.pic || null,
        picPhone: formData.picPhone || null,
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

            {/* Rate Calculation Type Toggle */}
            <div className="md:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Metode Perhitungan Revenue
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRateTypeSwitch("PER_PAX")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    rateType === "PER_PAX"
                      ? "bg-primary-700 text-white border-primary-700 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Calculator size={14} />
                  <span>Hitung Per Pax (Rate x Pax)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRateTypeSwitch("TOTAL_DIRECT")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    rateType === "TOTAL_DIRECT"
                      ? "bg-primary-700 text-white border-primary-700 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <DollarSign size={14} />
                  <span>Total Langsung (Tanpa Perkalian Pax)</span>
                </button>
              </div>
            </div>

            {/* Pax */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Jumlah Pax (Orang)
              </label>
              <input
                type="number"
                min="0"
                value={formData.pax}
                onChange={(e) => handlePaxChange(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Rate / Price per Pax */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {rateType === "PER_PAX"
                  ? "Rate / Price per Pax (Rp)"
                  : "Rate per Pax (Estimasi / Auto)"}
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.rate}
                readOnly={rateType === "TOTAL_DIRECT" && formData.pax > 0}
                onChange={(e) => handleRateChange(parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  rateType === "TOTAL_DIRECT" && formData.pax > 0 ? "bg-slate-100 text-slate-500" : ""
                }`}
              />
            </div>

            {/* Total Revenue Input */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex justify-between">
                <span>TOTAL Revenue / Total Harga (Rp)</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {rateType === "PER_PAX" ? "Otomatis Perkalian (Rate x Pax)" : "Input Langsung"}
                </span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.total}
                readOnly={rateType === "PER_PAX"}
                onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  rateType === "PER_PAX" ? "bg-slate-50 text-slate-700" : "bg-white"
                }`}
              />
            </div>

            {/* Tracking Pembayaran DP & Tanggal Pelunasan */}
            <div className="md:col-span-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Pembayaran DP
                </label>
                <select
                  value={formData.dpStatus}
                  onChange={(e) => handleDpStatusChange(e.target.value as ForecastDpStatusType)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39]"
                >
                  <option value="BELUM_DP">Belum DP</option>
                  <option value="DP_30">DP 30%</option>
                  <option value="DP_50">DP 50%</option>
                  <option value="DP_CUSTOM">Sudah DP (Nominal Custom)</option>
                  <option value="LUNAS">Lunas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal DP (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.dpAmount}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData((prev) => ({
                      ...prev,
                      dpAmount: val,
                      dpStatus: prev.dpStatus === "BELUM_DP" && val > 0 ? "DP_CUSTOM" : prev.dpStatus,
                    }));
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jatuh Tempo Pelunasan
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39]"
                />
              </div>
            </div>

            {/* PIC Sales Dropdown + Text Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                <span>Pilih PIC Sales</span>
                {salesPics.length > 0 && (
                  <span className="text-[10px] text-primary-700 font-medium">Auto-fill No HP</span>
                )}
              </label>
              {salesPics.length > 0 ? (
                <select
                  value={formData.pic}
                  onChange={(e) => handleSelectPic(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="">-- Pilih PIC Sales --</option>
                  {salesPics.map((p, idx) => (
                    <option key={idx} value={p.name}>
                      {p.name} {p.email ? `(${p.email})` : p.phone ? `(${p.phone})` : ""}
                    </option>
                  ))}
                  {formData.pic &&
                    formData.pic !== "CUSTOM" &&
                    !salesPics.some((p) => p.name.toLowerCase() === formData.pic.toLowerCase()) && (
                      <option value={formData.pic}>{formData.pic}</option>
                    )}
                  <option value="CUSTOM">+ Tulis Manual Nama PIC Baru...</option>
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Nama PIC Sales"
                  value={formData.pic}
                  onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              )}
            </div>

            {/* Manual PIC Name input if CUSTOM selected or typed */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                No. HP WhatsApp PIC Sales
              </label>
              <input
                type="text"
                placeholder="Contoh: 08123456789"
                value={formData.picPhone}
                onChange={(e) => setFormData({ ...formData, picPhone: e.target.value })}
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
