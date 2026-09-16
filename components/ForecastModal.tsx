"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Save, Calculator, DollarSign, UserCheck, Calendar, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import {
  createForecastItem,
  updateForecastItem,
  getSalesPics,
  ForecastUnitType,
  ForecastStatusType,
  ForecastDpStatusType,
  LEAD_STATUS_PROBABILITIES,
} from "@/actions/forecast";

interface ForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unit?: ForecastUnitType;
  initialData?: any | null;
}

const LEAD_SOURCES = [
  "Instagram",
  "Tiktok",
  "Website",
  "Whatsapp TLM",
  "Sales Call",
  "Table Top",
  "Database Existing",
  "Walk-in",
  "Referral",
  "Sales Prospecting",
  "Travel Agent",
  "Other",
];

const SEGMENTS = [
  "Corporate",
  "Government",
  "School",
  "Travel Agent",
  "Social Event",
  "Individual / Family",
  "Community",
  "Other",
];

const EVENT_TYPES = [
  "Corporate Gathering",
  "Meeting",
  "Team Building",
  "School Trip",
  "Wedding",
  "Birthday",
  "Social Gathering",
  "Room Booking",
  "Camping",
  "Day Visit / Attractions",
  "F&B Group Booking",
  "Other",
];

const LEAD_STATUSES = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Verbal Agreement",
  "Confirmed / Deal",
  "On Hold",
  "Lost / Cancelled",
];

const REASONS_LOSS_HOLD = [
  "Awaiting Client Decision",
  "Awaiting Internal Approval",
  "Budget Not Available",
  "Price Not Suitable",
  "Date Not Available",
  "Package Not Suitable",
  "Client Chose Competitor",
  "No Response from Client",
  "Event Postponed",
  "Event Cancelled",
  "Other",
];

export default function ForecastModal({
  isOpen,
  onClose,
  onSuccess,
  unit = "CAMP_VILLAGE",
  initialData,
}: ForecastModalProps) {
  const [activeTab, setActiveTab] = useState<"STAGE1" | "STAGE2" | "STAGE3">("STAGE1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [rateType, setRateType] = useState<"PER_PAX" | "TOTAL_DIRECT">("PER_PAX");
  const [salesPics, setSalesPics] = useState<{ name: string; phone: string }[]>([]);

  const [formData, setFormData] = useState({
    // Stage 1
    dateReceived: "",
    company: "",
    contactPerson: "",
    phoneEmail: "",
    leadSource: "Whatsapp TLM",
    segment: "Corporate",
    eventType: "Corporate Gathering",
    proposedEventDate: "",
    pax: 0,
    room: "",
    rate: 0,
    total: 0,
    salesPerson: "",
    
    // Stage 2
    firstResponseDate: "",
    lastFollowUpDate: "",
    latestClientResponse: "",
    nextAction: "",
    nextActionDueDate: "",
    leadStatus: "New Lead",

    // Stage 3
    closingProbability: 10,
    expectedClosingMonth: "",
    reasonForLossHold: "",
    finalDealValue: 0,

    // Legacy / Extra DP
    dpStatus: "BELUM_DP" as ForecastDpStatusType,
    dpAmount: 0,
    dueDate: "",
    status: "TENTATIVE" as ForecastStatusType,
    remarks: "",
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
        // Stage 1
        dateReceived: formatDateForInput(initialData.dateReceived) || formatDateForInput(initialData.reservationDate) || new Date().toISOString().split("T")[0],
        company: initialData.company || "",
        contactPerson: initialData.contactPerson || "",
        phoneEmail: initialData.phoneEmail || initialData.picPhone || "",
        leadSource: initialData.leadSource || initialData.source || "Whatsapp TLM",
        segment: initialData.segment || "Corporate",
        eventType: initialData.eventType || "Corporate Gathering",
        proposedEventDate: formatDateForInput(initialData.proposedEventDate) || formatDateForInput(initialData.eventDate) || formatDateForInput(initialData.checkIn),
        pax: initPax,
        room: initialData.room || initialData.venue || "",
        rate: initRate,
        total: initTotal,
        salesPerson: initialData.salesPerson || initialData.pic || "",

        // Stage 2
        firstResponseDate: formatDateForInput(initialData.firstResponseDate),
        lastFollowUpDate: formatDateForInput(initialData.lastFollowUpDate),
        latestClientResponse: initialData.latestClientResponse || "",
        nextAction: initialData.nextAction || "",
        nextActionDueDate: formatDateForInput(initialData.nextActionDueDate),
        leadStatus: initialData.leadStatus || "New Lead",

        // Stage 3
        closingProbability: initialData.closingProbability !== undefined ? initialData.closingProbability : (LEAD_STATUS_PROBABILITIES[initialData.leadStatus || "New Lead"] ?? 10),
        expectedClosingMonth: formatDateForInput(initialData.expectedClosingMonth),
        reasonForLossHold: initialData.reasonForLossHold || "",
        finalDealValue: initialData.finalDealValue !== undefined ? initialData.finalDealValue : initTotal,

        // Legacy / DP
        dpStatus: initialData.dpStatus || "BELUM_DP",
        dpAmount: initialData.dpAmount || 0,
        dueDate: formatDateForInput(initialData.dueDate),
        status: initialData.status || "TENTATIVE",
        remarks: initialData.remarks || "",
      });
    } else {
      setRateType("PER_PAX");
      const today = new Date().toISOString().split("T")[0];
      setFormData({
        dateReceived: today,
        company: "",
        contactPerson: "",
        phoneEmail: "",
        leadSource: "Whatsapp TLM",
        segment: "Corporate",
        eventType: "Corporate Gathering",
        proposedEventDate: "",
        pax: 0,
        room: "",
        rate: 0,
        total: 0,
        salesPerson: "",
        firstResponseDate: "",
        lastFollowUpDate: "",
        latestClientResponse: "",
        nextAction: "",
        nextActionDueDate: "",
        leadStatus: "New Lead",
        closingProbability: 10,
        expectedClosingMonth: "",
        reasonForLossHold: "",
        finalDealValue: 0,
        dpStatus: "BELUM_DP",
        dpAmount: 0,
        dueDate: "",
        status: "TENTATIVE",
        remarks: "",
      });
    }
    setError("");
    setActiveTab("STAGE1");
  }, [initialData, isOpen]);

  const handleLeadStatusChange = (statusStr: string) => {
    const prob = LEAD_STATUS_PROBABILITIES[statusStr] ?? 10;
    let mainStatus: ForecastStatusType = "TENTATIVE";
    let dealValue = formData.finalDealValue;

    if (statusStr === "Confirmed / Deal") {
      mainStatus = "CONFIRM";
      dealValue = formData.total > 0 ? formData.total : dealValue;
    } else if (statusStr === "Lost / Cancelled") {
      mainStatus = "CANCEL";
      dealValue = 0;
    }

    setFormData((prev) => ({
      ...prev,
      leadStatus: statusStr,
      closingProbability: prob,
      status: mainStatus,
      finalDealValue: dealValue,
    }));
  };

  const handleRateChange = (val: number) => {
    if (rateType === "PER_PAX") {
      const tot = val * (formData.pax || 0);
      setFormData((prev) => ({
        ...prev,
        rate: val,
        total: tot,
        finalDealValue: prev.leadStatus === "Confirmed / Deal" ? tot : prev.finalDealValue,
      }));
    } else {
      setFormData((prev) => ({ ...prev, rate: val }));
    }
  };

  const handlePaxChange = (val: number) => {
    if (rateType === "PER_PAX") {
      const tot = (formData.rate || 0) * val;
      setFormData((prev) => ({
        ...prev,
        pax: val,
        total: tot,
        finalDealValue: prev.leadStatus === "Confirmed / Deal" ? tot : prev.finalDealValue,
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
        finalDealValue: prev.leadStatus === "Confirmed / Deal" ? val : prev.finalDealValue,
      }));
    } else {
      setFormData((prev) => ({ ...prev, total: val }));
    }
  };

  const handleRateTypeSwitch = (type: "PER_PAX" | "TOTAL_DIRECT") => {
    setRateType(type);
    if (type === "PER_PAX") {
      const tot = (formData.rate || 0) * (formData.pax || 0);
      setFormData((prev) => ({
        ...prev,
        total: tot,
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
        salesPerson: found.name,
        phoneEmail: prev.phoneEmail || found.phone,
      }));
    } else {
      setFormData((prev) => ({ ...prev, salesPerson: picName }));
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
      setActiveTab("STAGE1");
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
        dateReceived: formData.dateReceived || null,
        contactPerson: formData.contactPerson || null,
        phoneEmail: formData.phoneEmail || null,
        leadSource: formData.leadSource || null,
        segment: formData.segment || null,
        eventType: formData.eventType || null,
        proposedEventDate: formData.proposedEventDate || null,
        pax: Number(formData.pax) || 0,
        room: formData.room || null,
        rate: finalRate,
        total: finalTotal,
        salesPerson: formData.salesPerson || null,

        // Legacy dates mapping for backward compatibility
        reservationDate: formData.dateReceived || null,
        eventDate: formData.proposedEventDate || null,
        checkIn: formData.proposedEventDate || null,
        pic: formData.salesPerson || null,
        picPhone: formData.phoneEmail || null,

        // Stage 2
        firstResponseDate: formData.firstResponseDate || null,
        lastFollowUpDate: formData.lastFollowUpDate || null,
        latestClientResponse: formData.latestClientResponse || null,
        nextAction: formData.nextAction || null,
        nextActionDueDate: formData.nextActionDueDate || null,
        leadStatus: formData.leadStatus,

        // Stage 3
        closingProbability: Number(formData.closingProbability) || 0,
        expectedClosingMonth: formData.expectedClosingMonth || null,
        reasonForLossHold: formData.reasonForLossHold || null,
        finalDealValue: Number(formData.finalDealValue) || 0,

        // DP tracking
        dpStatus: formData.dpStatus,
        dpAmount: Number(formData.dpAmount) || 0,
        dueDate: formData.dueDate || null,
        status: formData.status,
        remarks: formData.remarks || null,
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-6 border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0f4d39] text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold font-judul flex items-center gap-2">
              <FileText size={20} className="text-amber-400" />
              <span>{initialData ? "Edit Sales Lead & Pipeline" : "Input Sales Lead Baru"}</span>
            </h2>
            <p className="text-xs text-emerald-100 font-subjudul">
              Sistem Pipeline Sales 3-Stage Consolidated (Camp, Village & Park)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-emerald-800 rounded-lg transition-colors text-emerald-100 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stage Tabs Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("STAGE1")}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-t-xl transition-all border-t-2 flex items-center justify-center gap-2 ${
              activeTab === "STAGE1"
                ? "bg-white text-[#0f4d39] border-[#0f4d39] shadow-sm"
                : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-[#0f4d39]/10 text-[#0f4d39] flex items-center justify-center text-[10px]">1</span>
            <span>Stage 1: Lead Data</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("STAGE2")}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-t-xl transition-all border-t-2 flex items-center justify-center gap-2 ${
              activeTab === "STAGE2"
                ? "bg-white text-indigo-700 border-indigo-600 shadow-sm"
                : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">2</span>
            <span>Stage 2: Follow-Up Log</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("STAGE3")}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-t-xl transition-all border-t-2 flex items-center justify-center gap-2 ${
              activeTab === "STAGE3"
                ? "bg-white text-emerald-700 border-emerald-600 shadow-sm"
                : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">3</span>
            <span>Stage 3: Closing & DP</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 grow">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STAGE 1: MASTER LEADS */}
          {activeTab === "STAGE1" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
                <span className="font-bold">Info:</span>
                <span>Input data awal prospect client yang masuk ke Sales.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tanggal Terima Lead */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Terima Lead <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateReceived}
                    onChange={(e) => setFormData({ ...formData, dateReceived: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39]"
                  />
                </div>

                {/* Sales Person / PIC */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>PIC Sales</span>
                    {salesPics.length > 0 && (
                      <span className="text-[10px] text-emerald-700 font-medium">Auto Suggest</span>
                    )}
                  </label>
                  {salesPics.length > 0 ? (
                    <select
                      value={formData.salesPerson}
                      onChange={(e) => handleSelectPic(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39] bg-white"
                    >
                      <option value="">-- Pilih PIC Sales --</option>
                      {salesPics.map((p, idx) => (
                        <option key={idx} value={p.name}>
                          {p.name} {p.phone ? `(${p.phone})` : ""}
                        </option>
                      ))}
                      <option value="Sri">Sri</option>
                      <option value="Rizki Kiki">Rizki Kiki</option>
                      <option value="Rizkita">Rizkita</option>
                      <option value="Riki">Riki</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Nama Sales PIC"
                      value={formData.salesPerson}
                      onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39]"
                    />
                  )}
                </div>

                {/* Company Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Perusahaan / Instansi / Event <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Telkom Indonesia / Reuni Akbar SMA 1"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39]"
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person (Nama Client)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bpk. Hendra"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39]"
                  />
                </div>

                {/* Phone / Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. HP / WhatsApp / Email
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={formData.phoneEmail}
                    onChange={(e) => setFormData({ ...formData, phoneEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39]"
                  />
                </div>

                {/* Lead Source */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sumber Lead (Lead Source)
                  </label>
                  <select
                    value={formData.leadSource}
                    onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39] bg-white"
                  >
                    {LEAD_SOURCES.map((src) => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>

                {/* Segment */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Segment Market
                  </label>
                  <select
                    value={formData.segment}
                    onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39] bg-white"
                  >
                    {SEGMENTS.map((seg) => (
                      <option key={seg} value={seg}>{seg}</option>
                    ))}
                  </select>
                </div>

                {/* Event Type / Product */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Acara / Produk
                  </label>
                  <select
                    value={formData.eventType}
                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39] bg-white"
                  >
                    {EVENT_TYPES.map((evt) => (
                      <option key={evt} value={evt}>{evt}</option>
                    ))}
                  </select>
                </div>

                {/* Proposed Event Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Pelaksanaan / Event
                  </label>
                  <input
                    type="date"
                    value={formData.proposedEventDate}
                    onChange={(e) => setFormData({ ...formData, proposedEventDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39]"
                  />
                </div>

                {/* Room / Venue / Unit */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room / Tenda / Venue / Package Area
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Villa Pine / Glamping Deluxe / Pine Forest Venue"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39]"
                  />
                </div>

                {/* Perhitungan Revenue Card */}
                <div className="md:col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Metode Estimasi Nilai Potential Deal
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRateTypeSwitch("PER_PAX")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                          rateType === "PER_PAX"
                            ? "bg-[#0f4d39] text-white border-[#0f4d39]"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Per Pax (Rate x Pax)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRateTypeSwitch("TOTAL_DIRECT")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                          rateType === "TOTAL_DIRECT"
                            ? "bg-[#0f4d39] text-white border-[#0f4d39]"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Total Langsung
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Jumlah Pax (Orang)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.pax}
                        onChange={(e) => handlePaxChange(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        {rateType === "PER_PAX" ? "Rate per Pax (Rp)" : "Estimasi Rate / Pax"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.rate}
                        readOnly={rateType === "TOTAL_DIRECT" && formData.pax > 0}
                        onChange={(e) => handleRateChange(parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39] ${
                          rateType === "TOTAL_DIRECT" && formData.pax > 0 ? "bg-slate-100 text-slate-500" : "bg-white"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Total Estimasi Revenue (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.total}
                        readOnly={rateType === "PER_PAX"}
                        onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold font-mono text-emerald-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39] ${
                          rateType === "PER_PAX" ? "bg-slate-100 text-slate-700" : "bg-white"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: FOLLOW-UP LOG */}
          {activeTab === "STAGE2" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 text-xs text-indigo-800 flex items-center gap-2">
                <span className="font-bold">Info:</span>
                <span>Pencatatan interaksi & follow-up perkembangan prospect client.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lead Status Dropdown */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Tahapan Lead (Pipeline Stage) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.leadStatus}
                    onChange={(e) => handleLeadStatusChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 bg-indigo-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    {LEAD_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st} ({LEAD_STATUS_PROBABILITIES[st] ?? 10}% Closing Prob)
                      </option>
                    ))}
                  </select>
                </div>

                {/* First Response Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Respon Pertama (First Response)
                  </label>
                  <input
                    type="date"
                    value={formData.firstResponseDate}
                    onChange={(e) => setFormData({ ...formData, firstResponseDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Last Follow-Up Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Follow-Up Terakhir
                  </label>
                  <input
                    type="date"
                    value={formData.lastFollowUpDate}
                    onChange={(e) => setFormData({ ...formData, lastFollowUpDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Latest Client Response */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Respon Terakhir Client (Client Feedback)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Client minta revisi penawaran harga untuk 100 pax, pertimbangkan diskon 5%"
                    value={formData.latestClientResponse}
                    onChange={(e) => setFormData({ ...formData, latestClientResponse: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Next Action */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Next Action (Tindakan Selanjutnya)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kirimkan proposal revisi & telfon ulang"
                    value={formData.nextAction}
                    onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Next Action Due Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jatuh Tempo Next Action
                  </label>
                  <input
                    type="date"
                    value={formData.nextActionDueDate}
                    onChange={(e) => setFormData({ ...formData, nextActionDueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: CLOSING & DP */}
          {activeTab === "STAGE3" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
                <span className="font-bold">Info:</span>
                <span>Proyeksi probabilitas closing, nilai deal akhir, & status pelunasan DP.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Closing Probability */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex justify-between">
                    <span>Probabilitas Closing (%)</span>
                    <span className="text-emerald-700 font-bold">{formData.closingProbability}%</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.closingProbability}
                    onChange={(e) => setFormData({ ...formData, closingProbability: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                {/* Final Deal Value */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nilai Deal Akhir (Final Value) Rp
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.finalDealValue}
                    onChange={(e) => setFormData({ ...formData, finalDealValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold font-mono text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                {/* Reason for Loss / Hold */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alasan Loss / Pending / On Hold (Jika Tidak Deal)
                  </label>
                  <select
                    value={formData.reasonForLossHold}
                    onChange={(e) => setFormData({ ...formData, reasonForLossHold: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  >
                    <option value="">-- Pilih Alasan Jika Hold/Loss --</option>
                    {REASONS_LOSS_HOLD.map((rsn) => (
                      <option key={rsn} value={rsn}>{rsn}</option>
                    ))}
                  </select>
                </div>

                {/* Tracking DP Section */}
                <div className="md:col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
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

                {/* Main Status & Remarks */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Utama Booking
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ForecastStatusType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39]"
                  >
                    <option value="TENTATIVE">Tentative (Kuning)</option>
                    <option value="CONFIRM">Confirm (Hijau)</option>
                    <option value="CANCEL">Cancel (Merah)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remarks / Catatan Khusus
                  </label>
                  <input
                    type="text"
                    placeholder="Catatan internal..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39]"
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            {activeTab !== "STAGE1" && (
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === "STAGE3" ? "STAGE2" : "STAGE1")}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all"
              >
                &larr; Prev Stage
              </button>
            )}
            {activeTab !== "STAGE3" && (
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === "STAGE1" ? "STAGE2" : "STAGE3")}
                className="px-3 py-1.5 text-xs font-bold text-[#0f4d39] bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-all"
              >
                Next Stage &rarr;
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-[#0f4d39] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
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
        </div>
      </div>
    </div>
  );
}
