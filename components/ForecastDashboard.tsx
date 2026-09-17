"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Plus,
  Search,
  Download,
  Calendar,
  Filter,
  Edit2,
  Trash2,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Home,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
  Bell,
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Layers,
  Layers3,
  Mail,
} from "lucide-react";
import {
  getForecastItems,
  getForecastStats,
  deleteForecastItem,
  getForecastReminders,
  autoProcessForecastReminders,
  sendForecastEmailReminderAction,
  getForecastAnalyticsSummary,
  ForecastUnitType,
  ForecastStatusType,
  ForecastDpStatusType,
} from "@/actions/forecast";
import ForecastModal from "@/components/ForecastModal";
import ForecastWaModal from "@/components/ForecastWaModal";
import ForecastAnalyticsCharts from "@/components/ForecastAnalyticsCharts";
import { generateForecastPdfReport } from "@/utils/forecastPdfGenerator";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function ForecastDashboard() {
  const currentDate = new Date();
  const [selectedUnit, setSelectedUnit] = useState<ForecastUnitType>("ALL");
  const [stageView, setStageView] = useState<"ALL" | "STAGE1" | "STAGE2" | "STAGE3">("ALL");
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ForecastStatusType | "ALL">("ALL");
  const [dpStatusFilter, setDpStatusFilter] = useState<ForecastDpStatusType | "ALL">("ALL");
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Column-level Filters State
  const [showColFilters, setShowColFilters] = useState(true);
  const [colCompany, setColCompany] = useState("");
  const [colEventType, setColEventType] = useState("ALL");
  const [colPipelineStage, setColPipelineStage] = useState("ALL");
  const [colDpStatus, setColDpStatus] = useState("ALL");
  const [colPicSales, setColPicSales] = useState("ALL");
  const [colStatus, setColStatus] = useState("ALL");
  const [colLeadSource, setColLeadSource] = useState("ALL");
  const [colSegment, setColSegment] = useState("ALL");

  const [items, setItems] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [stats, setStats] = useState<{
    confirmTotal: number;
    tentativeTotal: number;
    cancelTotal: number;
    grandTotal: number;
    totalPax: number;
    totalRoomCount: number;
    totalEntries: number;
  }>({
    confirmTotal: 0,
    tentativeTotal: 0,
    cancelTotal: 0,
    grandTotal: 0,
    totalPax: 0,
    totalRoomCount: 0,
    totalEntries: 0,
  });

  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const handleSendEmailReminder = async (forecastId: string) => {
    try {
      setSendingEmailId(forecastId);
      const res = await sendForecastEmailReminderAction({ forecastId });
      if (res.success) {
        alert(`Email reminder berhasil dikirim ke: ${res.sentTo.join(", ")}`);
      } else {
        alert(`Gagal mengirim email: ${res.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setSendingEmailId(null);
    }
  };
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // WA Modal State
  const [waModalItem, setWaModalItem] = useState<any | null>(null);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Auto-trigger background WA reminders
      autoProcessForecastReminders(selectedUnit === "ALL" ? "CAMP_VILLAGE" : selectedUnit).catch((err) =>
        console.warn("Background auto reminder process:", err)
      );

      const [fetchedItems, fetchedStats, fetchedReminders] = await Promise.all([
        getForecastItems({
          unit: selectedUnit,
          month: selectedMonth,
          year: selectedYear,
          search: searchQuery,
          status: statusFilter,
          dpStatus: dpStatusFilter,
        }),
        getForecastStats({
          unit: selectedUnit,
          month: selectedMonth,
          year: selectedYear,
        }),
        getForecastReminders(selectedUnit === "ALL" ? "CAMP_VILLAGE" : selectedUnit),
      ]);

      setItems(fetchedItems);
      setStats(fetchedStats);
      setReminders(fetchedReminders);
    } catch (err) {
      console.error("Error fetching forecast data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedUnit, selectedMonth, selectedYear, searchQuery, statusFilter, dpStatusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data forecast ini?")) return;
    try {
      await deleteForecastItem(id);
      fetchData();
    } catch (err) {
      console.error("Error deleting forecast item:", err);
      alert("Gagal menghapus data");
    }
  };

  const formatCurrency = (val: number | null | undefined) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDateStr = (d: string | Date | null | undefined) => {
    if (!d) return "-";
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return "-";
    return dateObj.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // DP Status Badge renderer
  const renderDpBadge = (dpStatus: string, dpAmount: number) => {
    if (dpStatus === "LUNAS") {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Lunas</span>
        </span>
      );
    }
    if (dpStatus === "DP_30" || dpStatus === "DP_50" || dpStatus === "DP_CUSTOM") {
      const pct = dpStatus === "DP_30" ? "DP 30%" : dpStatus === "DP_50" ? "DP 50%" : "Sudah DP";
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>{pct}</span>
          </span>
          {dpAmount > 0 && (
            <span className="text-[10px] font-mono text-slate-500 font-medium">
              {formatCurrency(dpAmount)}
            </span>
          )}
        </div>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-medium text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        <span>Belum DP</span>
      </span>
    );
  };

  // Due Date alert renderer
  const renderDueDateCell = (dueDate: string | Date | null) => {
    if (!dueDate) return <span className="text-slate-300 font-mono text-center block">-</span>;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueD = new Date(dueDate);
    dueD.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const formatted = formatDateStr(dueDate);

    if (diffDays < 0) {
      return (
        <div className="flex flex-col items-center">
          <span className="font-semibold text-rose-700">{formatted}</span>
          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
            Terlewat {Math.abs(diffDays)} Hari
          </span>
        </div>
      );
    }

    if (diffDays <= 3) {
      return (
        <div className="flex flex-col items-center">
          <span className="font-semibold text-amber-700">{formatted}</span>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            H-{diffDays} Due Date
          </span>
        </div>
      );
    }

    return <span className="font-medium text-slate-700">{formatted}</span>;
  };

  // Days left helper for tentative items
  const getItemUrgency = (item: any) => {
    if (item.status !== "TENTATIVE") return null;
    const targetDate = item.proposedEventDate || item.eventDate || item.checkIn;
    if (!targetDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventD = new Date(targetDate);
    eventD.setHours(0, 0, 0, 0);

    const diffTime = eventD.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysLeft >= 0 && daysLeft <= 3) {
      return { level: "URGENT", label: `H-${daysLeft} URGENT`, daysLeft };
    }
    if (daysLeft > 3 && daysLeft <= 7) {
      return { level: "WARNING", label: `H-${daysLeft} Warning`, daysLeft };
    }
    return null;
  };
  // Column filter options derived from current items
  const uniqueEventTypes = Array.from(new Set(items.map((i) => i.eventType).filter(Boolean))).sort();
  const uniqueSalesPics = Array.from(new Set(items.map((i) => i.salesPerson || i.pic).filter(Boolean))).sort();
  const uniquePipelineStages = Array.from(new Set(items.map((i) => i.leadStatus || "New Lead").filter(Boolean))).sort();
  const uniqueLeadSources = Array.from(new Set(items.map((i) => i.leadSource || i.source).filter(Boolean))).sort();
  const uniqueSegments = Array.from(new Set(items.map((i) => i.segment).filter(Boolean))).sort();

  const activeColFilterCount = [
    colCompany.trim() !== "",
    colEventType !== "ALL",
    colPipelineStage !== "ALL",
    colDpStatus !== "ALL",
    colPicSales !== "ALL",
    colStatus !== "ALL",
    colLeadSource !== "ALL",
    colSegment !== "ALL",
  ].filter(Boolean).length;

  const resetColFilters = () => {
    setColCompany("");
    setColEventType("ALL");
    setColPipelineStage("ALL");
    setColDpStatus("ALL");
    setColPicSales("ALL");
    setColStatus("ALL");
    setColLeadSource("ALL");
    setColSegment("ALL");
  };

  // Filtered dataset based on column filters
  const filteredItems = items.filter((item) => {
    if (colCompany.trim() && !item.company?.toLowerCase().includes(colCompany.trim().toLowerCase())) {
      return false;
    }
    if (colEventType !== "ALL" && item.eventType !== colEventType) {
      return false;
    }
    if (colPipelineStage !== "ALL" && (item.leadStatus || "New Lead") !== colPipelineStage) {
      return false;
    }
    if (colDpStatus !== "ALL" && item.dpStatus !== colDpStatus) {
      return false;
    }
    if (colPicSales !== "ALL" && (item.salesPerson || item.pic) !== colPicSales) {
      return false;
    }
    if (colStatus !== "ALL" && item.status !== colStatus) {
      return false;
    }
    if (colLeadSource !== "ALL" && (item.leadSource || item.source) !== colLeadSource) {
      return false;
    }
    if (colSegment !== "ALL" && item.segment !== colSegment) {
      return false;
    }
    return true;
  });

  const filteredTotalPax = filteredItems.reduce((acc, i) => acc + (i.pax || 0), 0);
  const filteredConfirmTotal = filteredItems.filter((i) => i.status === "CONFIRM").reduce((acc, i) => acc + (i.total || 0), 0);
  const filteredTentativeTotal = filteredItems.filter((i) => i.status === "TENTATIVE").reduce((acc, i) => acc + (i.total || 0), 0);
  const filteredCancelTotal = filteredItems.filter((i) => i.status === "CANCEL").reduce((acc, i) => acc + (i.total || 0), 0);

  const exportToCSV = () => {
    const headers = [
      "Company",
      "Tanggal Terima Lead",
      "Contact Person",
      "No HP / Email",
      "Lead Source",
      "Segment",
      "Jenis Event",
      "Tanggal Event",
      "Pax",
      "Room / Venue",
      "Rate",
      "Total Revenue",
      "PIC Sales",
      "First Response Date",
      "Last Follow Up Date",
      "Respon Terakhir Client",
      "Next Action",
      "Jatuh Tempo Next Action",
      "Lead Status Stage",
      "Closing Prob (%)",
      "Alasan Loss / Hold",
      "Nilai Deal Akhir",
      "Status DP",
      "Nominal DP",
      "Jatuh Tempo Pelunasan",
      "Status Utama",
      "Remarks",
    ];

    const rows = filteredItems.map((item) => {
      const dpStatusText = item.dpStatus === "LUNAS" ? "Lunas" : item.dpStatus === "DP_30" ? "DP 30%" : item.dpStatus === "DP_50" ? "DP 50%" : item.dpStatus === "DP_CUSTOM" ? "Sudah DP (Custom)" : "Belum DP";

      return [
        `"${item.company || ""}"`,
        formatDateStr(item.dateReceived || item.reservationDate),
        `"${item.contactPerson || ""}"`,
        `"${item.phoneEmail || item.picPhone || ""}"`,
        `"${item.leadSource || item.source || ""}"`,
        `"${item.segment || ""}"`,
        `"${item.eventType || ""}"`,
        formatDateStr(item.proposedEventDate || item.eventDate || item.checkIn),
        item.pax || 0,
        `"${item.room || item.venue || ""}"`,
        item.rate || 0,
        item.total || 0,
        `"${item.salesPerson || item.pic || ""}"`,
        formatDateStr(item.firstResponseDate),
        formatDateStr(item.lastFollowUpDate),
        `"${item.latestClientResponse || ""}"`,
        `"${item.nextAction || ""}"`,
        formatDateStr(item.nextActionDueDate),
        `"${item.leadStatus || "New Lead"}"`,
        `${item.closingProbability || 10}%`,
        `"${item.reasonForLossHold || ""}"`,
        item.finalDealValue || 0,
        `"${dpStatusText}"`,
        item.dpAmount || 0,
        formatDateStr(item.dueDate),
        `"${item.status || "TENTATIVE"}"`,
        `"${item.remarks || ""}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Forecast_3Stage_${selectedUnit}_${MONTHS[selectedMonth - 1]}_${selectedYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = async () => {
    try {
      setPdfLoading(true);
      const summary = await getForecastAnalyticsSummary({
        unit: selectedUnit,
        year: selectedYear,
        month: selectedMonth,
      });

      await generateForecastPdfReport({
        unit: selectedUnit,
        month: selectedMonth,
        year: selectedYear,
        items: filteredItems,
        stats,
        targetAmount: summary?.targetRevenue || 0,
      });
    } catch (err) {
      console.error("Error generating PDF report:", err);
      alert("Gagal mengunduh laporan PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto space-y-5 pb-12 font-sans overflow-x-hidden px-2 sm:px-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
            <Link href="/dashboard" className="hover:text-slate-700 transition-colors">
              Dashboard
            </Link>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-slate-600 font-semibold">Consolidated 3-Stage Sales Pipeline & Forecast</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-judul">
            Sales Pipeline & Forecast System
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 font-subjudul">
            Sistem Terpadu 3-Stage Sales Pipeline & Forecast Reservasi Grup (Camp, Village & Park).
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-xs active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-[#0f4d39]" : ""} />
          </button>

          <button
            onClick={exportToCSV}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={pdfLoading}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
            title="Cetak Laporan PDF Executive Summary"
          >
            {pdfLoading ? (
              <Loader2 size={14} className="animate-spin text-rose-600" />
            ) : (
              <FileText size={14} className="text-rose-600" />
            )}
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 border px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs ${
              showAnalytics
                ? "bg-[#0f4d39] text-white border-[#0f4d39]"
                : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
            }`}
          >
            <BarChart3 size={15} />
            <span>Analitik</span>
            {showAnalytics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#0f4d39] hover:bg-[#0b3c2c] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Tambah Lead / Forecast</span>
          </button>
        </div>
      </div>

      {/* Segmented Unit & Stage Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Unit Selector */}
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setSelectedUnit("ALL")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedUnit === "ALL"
                ? "bg-white text-[#0f4d39] shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers size={14} />
            <span>Semua Unit (Consolidated)</span>
          </button>
          <button
            onClick={() => setSelectedUnit("CAMP_VILLAGE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedUnit === "CAMP_VILLAGE"
                ? "bg-white text-[#0f4d39] shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Home size={14} />
            <span>Camp & Village</span>
          </button>
          <button
            onClick={() => setSelectedUnit("PARK")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedUnit === "PARK"
                ? "bg-white text-[#0f4d39] shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Building2 size={14} />
            <span>The Lodge Park</span>
          </button>
        </div>

        {/* 3-Stage Pipeline View Filter */}
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setStageView("ALL")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              stageView === "ALL"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers3 size={14} />
            <span>Consolidated View</span>
          </button>
          <button
            onClick={() => setStageView("STAGE1")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              stageView === "STAGE1"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-800 hover:bg-amber-100/60"
            }`}
          >
            <span>Stage 1: Leads</span>
          </button>
          <button
            onClick={() => setStageView("STAGE2")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              stageView === "STAGE2"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-indigo-800 hover:bg-indigo-100/60"
            }`}
          >
            <span>Stage 2: Follow-Up</span>
          </button>
          <button
            onClick={() => setStageView("STAGE3")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              stageView === "STAGE3"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-emerald-800 hover:bg-emerald-100/60"
            }`}
          >
            <span>Stage 3: Closing</span>
          </button>
        </div>
      </div>

      {/* Follow-up Reminder Banner */}
      {reminders.length > 0 && (
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-white p-4 shadow-xs relative overflow-hidden backdrop-blur-sm">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 rounded-l-2xl" />
          <div className="flex items-start justify-between gap-4 pl-1">
            <div className="flex items-start gap-3.5">
              <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl border border-amber-500/20 mt-0.5">
                <Bell size={18} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>Peringatan Follow-up Reservasi Tentative (H-7 / H-3)</span>
                  <span className="px-2 py-0.5 bg-amber-200/70 text-amber-900 font-bold rounded-full text-[10px]">
                    {reminders.length} Reservasi
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Terdapat {reminders.length} reservasi berstatus <span className="font-semibold text-amber-800">Tentative</span> yang mendekati tanggal pelaksanaan. Segera lakukan follow-up atau kirim pesan WA.
                </p>

                {/* Reminder Cards List */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {reminders.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2.5 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl border border-amber-200/80 text-xs shadow-2xs hover:shadow-xs transition-all"
                    >
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                          r.urgency === "URGENT"
                            ? "bg-rose-50 text-rose-700 border border-rose-200/80"
                            : "bg-amber-50 text-amber-800 border border-amber-200/80"
                        }`}
                      >
                        {r.urgency === "URGENT" ? `H-${r.daysLeft} URGENT` : `H-${r.daysLeft} Warning`}
                      </span>
                      <span className="font-semibold text-slate-800 truncate max-w-[140px]">{r.company}</span>
                      <span className="text-slate-400 text-[11px]">({r.pax} Pax)</span>
                      <button
                        onClick={() => {
                          setWaModalItem(r);
                          setIsWaModalOpen(true);
                        }}
                        className="flex items-center gap-1 bg-[#0f4d39] hover:bg-[#0b3c2c] text-white font-medium text-[11px] px-2.5 py-1 rounded-lg shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <MessageSquare size={12} />
                        <span>Kirim WA</span>
                      </button>
                      <button
                        onClick={() => handleSendEmailReminder(r.id)}
                        disabled={sendingEmailId === r.id}
                        className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] px-2.5 py-1 rounded-lg shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        title="Kirim Email Reminder ke Sales PIC"
                      >
                        {sendingEmailId === r.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Mail size={12} />
                        )}
                        <span>Email Sales</span>
                      </button>
                    </div>
                  ))}
                  {reminders.length > 3 && (
                    <span className="text-xs text-amber-800 font-semibold self-center">
                      +{reminders.length - 3} reservasi lainnya di tabel
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Refined KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Total Grand Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 border-t-4 border-t-[#0f4d39] shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Potential Revenue</span>
            <div className="p-2 bg-slate-50 text-[#0f4d39] group-hover:bg-emerald-50 transition-colors rounded-xl border border-slate-100">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-xl xl:text-2xl font-bold text-slate-900 font-mono tracking-tight leading-tight">
              {formatCurrency(stats.grandTotal)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium whitespace-nowrap">
              {stats.totalEntries} Leads ({stats.totalPax} Pax)
            </p>
          </div>
        </div>

        {/* Confirm */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 border-t-4 border-t-emerald-500 shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Confirm / Deal</span>
            <div className="p-2 bg-emerald-50/80 text-emerald-600 rounded-xl border border-emerald-100">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-xl xl:text-2xl font-bold text-slate-900 font-mono tracking-tight leading-tight">
              {formatCurrency(stats.confirmTotal)}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-700 font-medium">Closing Realized</span>
            </div>
          </div>
        </div>

        {/* Tentative */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 border-t-4 border-t-amber-500 shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Tentative Prospek</span>
            <div className="p-2 bg-amber-50/80 text-amber-600 rounded-xl border border-amber-100">
              <Clock size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-xl xl:text-2xl font-bold text-slate-900 font-mono tracking-tight leading-tight">
              {formatCurrency(stats.tentativeTotal)}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-xs text-amber-700 font-medium">Dalam Follow-Up</span>
            </div>
          </div>
        </div>

        {/* Cancel */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 border-t-4 border-t-rose-500 shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Lost / Cancel</span>
            <div className="p-2 bg-rose-50/80 text-rose-600 rounded-xl border border-rose-100">
              <XCircle size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-xl xl:text-2xl font-bold text-slate-900 font-mono tracking-tight leading-tight">
              {formatCurrency(stats.cancelTotal)}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-xs text-rose-700 font-medium">Batal / Lost</span>
            </div>
          </div>
        </div>

        {/* Total Pax */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 border-t-4 border-t-indigo-500 shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pax Prospek</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Users size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-xl xl:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              {stats.totalPax} Pax
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium whitespace-nowrap">
              Estimasi Pengunjung Grup
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Toggle */}
      {showAnalytics && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <ForecastAnalyticsCharts
            unit={selectedUnit === "ALL" ? "CAMP_VILLAGE" : selectedUnit}
            year={selectedYear}
            month={selectedMonth}
            onRefreshParent={fetchData}
          />
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month & Year Selectors */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Calendar size={15} className="text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m, idx) => (
                <option key={idx} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-slate-300">|</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Cari Company / Instansi / Contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39] transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Filter size={15} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Status Booking</option>
              <option value="CONFIRM">Confirm (Hijau)</option>
              <option value="TENTATIVE">Tentative (Kuning)</option>
              <option value="CANCEL">Cancel (Merah)</option>
            </select>
          </div>

          {/* DP Status Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Filter size={15} className="text-slate-400" />
            <select
              value={dpStatusFilter}
              onChange={(e) => setDpStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Status DP</option>
              <option value="BELUM_DP">Belum DP</option>
              <option value="DP_30">DP 30%</option>
              <option value="DP_50">DP 50%</option>
              <option value="DP_CUSTOM">Sudah DP (Custom)</option>
              <option value="LUNAS">Lunas</option>
            </select>
          </div>

          {/* Column Filter Toggle Button */}
          <button
            onClick={() => setShowColFilters(!showColFilters)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              activeColFilterCount > 0
                ? "bg-[#0f4d39] text-white border-[#0f4d39] shadow-xs"
                : showColFilters
                ? "bg-slate-100 text-slate-800 border-slate-300"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
            title="Tampilkan / sembunyikan baris filter di setiap kolom tabel"
          >
            <Filter size={14} />
            <span>Filter Kolom</span>
            {activeColFilterCount > 0 && (
              <span className="px-1.5 py-0.5 bg-emerald-400 text-[#0f4d39] font-extrabold rounded-full text-[10px]">
                {activeColFilterCount}
              </span>
            )}
          </button>

          {/* Reset All Column Filters */}
          {activeColFilterCount > 0 && (
            <button
              onClick={resetColFilters}
              className="flex items-center gap-1 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100/80 border border-rose-200 rounded-xl text-xs font-semibold transition-all shadow-xs"
            >
              <XCircle size={14} />
              <span>Reset Filter ({activeColFilterCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden w-full">
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
            {/* STAGE-BASED TABLE HEADERS */}
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              {stageView === "ALL" && (
                <tr>
                  <th className="py-3 px-2.5 border-r border-slate-200 text-center w-10 font-bold text-slate-400">No</th>
                  <th className="py-3 px-3 border-r border-slate-200 min-w-[170px]">Company / Instansi</th>
                  <th className="py-3 px-2.5 border-r border-slate-200 min-w-[95px]">Terima Lead</th>
                  <th className="py-3 px-2.5 border-r border-slate-200 min-w-[95px]">Tanggal Event</th>
                  <th className="py-3 px-2.5 border-r border-slate-200 min-w-[110px]">Jenis Acara</th>
                  <th className="py-3 px-2 text-center w-14">Pax</th>
                  <th className="py-3 px-2.5 border-r border-slate-200 text-right min-w-[100px]">Rate (Rp)</th>
                  <th className="py-3 px-2.5 border-r border-slate-200 text-right bg-emerald-50/60 text-emerald-800 min-w-[110px]">Confirm (Rp)</th>
                  <th className="py-3 px-2.5 border-r border-slate-200 text-right bg-amber-50/60 text-amber-800 min-w-[110px]">Tentative (Rp)</th>
                  <th className="py-3 px-2.5 border-r border-slate-200 text-right bg-rose-50/60 text-rose-800 min-w-[110px]">Cancel (Rp)</th>
                  <th className="py-3 px-2.5 border-r border-slate-200 text-center min-w-[120px]">Pipeline Stage</th>
                  <th className="py-3 px-2.5 border-r border-slate-200 text-center min-w-[110px]">Status DP</th>
                  <th className="py-3 px-2.5 border-r border-slate-200 min-w-[85px]">PIC Sales</th>
                  <th className="py-3 px-2.5 text-center min-w-[90px]">Aksi</th>
                </tr>
              )}

              {/* SUB-HEADER FILTER ROW FOR CONSOLIDATED ALL VIEW */}
              {stageView === "ALL" && showColFilters && (
                <tr className="bg-slate-100/90 border-b border-slate-200">
                  <td className="py-1.5 px-1 text-center font-normal text-slate-400">
                    <Filter size={12} className="inline-block text-slate-400" />
                  </td>
                  <td className="py-1.5 px-1.5">
                    <input
                      type="text"
                      placeholder="Filter Company..."
                      value={colCompany}
                      onChange={(e) => setColCompany(e.target.value)}
                      className="w-full text-[11px] px-2 py-1 border border-slate-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-[#0f4d39]"
                    />
                  </td>
                  <td className="py-1.5 px-1 text-center text-slate-300">-</td>
                  <td className="py-1.5 px-1 text-center text-slate-300">-</td>
                  <td className="py-1.5 px-1.5">
                    <select
                      value={colEventType}
                      onChange={(e) => setColEventType(e.target.value)}
                      className="w-full text-[11px] px-1.5 py-1 border border-slate-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-[#0f4d39] cursor-pointer"
                    >
                      <option value="ALL">Semua Acara</option>
                      {uniqueEventTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-1 text-center text-slate-300">-</td>
                  <td className="py-1.5 px-1 text-center text-slate-300">-</td>
                  <td className="py-1.5 px-1.5 bg-emerald-50/40 text-center">
                    <button
                      onClick={() => setColStatus(colStatus === "CONFIRM" ? "ALL" : "CONFIRM")}
                      className={`w-full text-[10px] font-bold px-1.5 py-1 rounded-md border transition-all ${
                        colStatus === "CONFIRM"
                          ? "bg-emerald-600 text-white border-emerald-700"
                          : "bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-100/50"
                      }`}
                    >
                      {colStatus === "CONFIRM" ? "✓ Confirm" : "Confirm"}
                    </button>
                  </td>
                  <td className="py-1.5 px-1.5 bg-amber-50/40 text-center">
                    <button
                      onClick={() => setColStatus(colStatus === "TENTATIVE" ? "ALL" : "TENTATIVE")}
                      className={`w-full text-[10px] font-bold px-1.5 py-1 rounded-md border transition-all ${
                        colStatus === "TENTATIVE"
                          ? "bg-amber-600 text-white border-amber-700"
                          : "bg-white text-amber-800 border-amber-200 hover:bg-amber-100/50"
                      }`}
                    >
                      {colStatus === "TENTATIVE" ? "✓ Tentative" : "Tentative"}
                    </button>
                  </td>
                  <td className="py-1.5 px-1.5 bg-rose-50/40 text-center">
                    <button
                      onClick={() => setColStatus(colStatus === "CANCEL" ? "ALL" : "CANCEL")}
                      className={`w-full text-[10px] font-bold px-1.5 py-1 rounded-md border transition-all ${
                        colStatus === "CANCEL"
                          ? "bg-rose-600 text-white border-rose-700"
                          : "bg-white text-rose-800 border-rose-200 hover:bg-rose-100/50"
                      }`}
                    >
                      {colStatus === "CANCEL" ? "✓ Cancel" : "Cancel"}
                    </button>
                  </td>
                  <td className="py-1.5 px-1.5">
                    <select
                      value={colPipelineStage}
                      onChange={(e) => setColPipelineStage(e.target.value)}
                      className="w-full text-[11px] px-1.5 py-1 border border-slate-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-[#0f4d39] cursor-pointer"
                    >
                      <option value="ALL">Semua Stage</option>
                      {uniquePipelineStages.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-1.5">
                    <select
                      value={colDpStatus}
                      onChange={(e) => setColDpStatus(e.target.value as any)}
                      className="w-full text-[11px] px-1.5 py-1 border border-slate-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-[#0f4d39] cursor-pointer"
                    >
                      <option value="ALL">Semua DP</option>
                      <option value="BELUM_DP">Belum DP</option>
                      <option value="DP_30">DP 30%</option>
                      <option value="DP_50">DP 50%</option>
                      <option value="DP_CUSTOM">Sudah DP</option>
                      <option value="LUNAS">Lunas</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-1.5">
                    <select
                      value={colPicSales}
                      onChange={(e) => setColPicSales(e.target.value)}
                      className="w-full text-[11px] px-1.5 py-1 border border-slate-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-[#0f4d39] cursor-pointer"
                    >
                      <option value="ALL">Semua PIC</option>
                      {uniqueSalesPics.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-1 text-center">
                    {activeColFilterCount > 0 ? (
                      <button
                        onClick={resetColFilters}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline transition-colors whitespace-nowrap"
                        title="Reset filter kolom"
                      >
                        Reset
                      </button>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              )}

              {stageView === "STAGE1" && (
                <tr className="bg-amber-50/80 text-amber-900">
                  <th className="py-3 px-2.5 border-r border-amber-200/80 text-center w-10">No</th>
                  <th className="py-3 px-2.5 border-r border-amber-200/80 min-w-[95px]">Tgl Terima</th>
                  <th className="py-3 px-3 border-r border-amber-200/80 min-w-[160px]">Company / Instansi</th>
                  <th className="py-3 px-2.5 border-r border-amber-200/80 min-w-[120px]">Contact Person</th>
                  <th className="py-3 px-2.5 border-r border-amber-200/80 min-w-[120px]">HP / Email</th>
                  <th className="py-3 px-2.5 border-r border-amber-200/80 min-w-[100px]">Sumber Lead</th>
                  <th className="py-3 px-2.5 border-r border-amber-200/80 min-w-[100px]">Segment</th>
                  <th className="py-3 px-2.5 border-r border-amber-200/80 min-w-[120px]">Jenis Acara</th>
                  <th className="py-3 px-2.5 border-r border-amber-200/80 min-w-[95px]">Tgl Event</th>
                  <th className="py-3 px-2 text-center w-14">Pax</th>
                  <th className="py-3 px-2.5 border-r border-amber-200/80 text-right min-w-[90px]">Rate</th>
                  <th className="py-3 px-2.5 border-r border-amber-200/80 text-right font-bold min-w-[110px]">Total Rev</th>
                  <th className="py-3 px-2.5 border-r border-amber-200/80 min-w-[90px]">Sales PIC</th>
                  <th className="py-3 px-2.5 text-center min-w-[90px]">Aksi</th>
                </tr>
              )}

              {/* SUB-HEADER FILTER ROW FOR STAGE 1 */}
              {stageView === "STAGE1" && showColFilters && (
                <tr className="bg-amber-100/60 border-b border-amber-200">
                  <td className="py-1.5 px-1 text-center font-normal text-amber-400">
                    <Filter size={12} className="inline-block text-amber-600" />
                  </td>
                  <td className="py-1.5 px-1 text-center text-amber-300">-</td>
                  <td className="py-1.5 px-1.5">
                    <input
                      type="text"
                      placeholder="Filter Company..."
                      value={colCompany}
                      onChange={(e) => setColCompany(e.target.value)}
                      className="w-full text-[11px] px-2 py-1 border border-amber-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                  <td className="py-1.5 px-1 text-center text-amber-300">-</td>
                  <td className="py-1.5 px-1 text-center text-amber-300">-</td>
                  <td className="py-1.5 px-1.5">
                    <select
                      value={colLeadSource}
                      onChange={(e) => setColLeadSource(e.target.value)}
                      className="w-full text-[11px] px-1.5 py-1 border border-amber-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="ALL">Semua Sumber</option>
                      {uniqueLeadSources.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-1.5">
                    <select
                      value={colSegment}
                      onChange={(e) => setColSegment(e.target.value)}
                      className="w-full text-[11px] px-1.5 py-1 border border-amber-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="ALL">Semua Segment</option>
                      {uniqueSegments.map((sg) => (
                        <option key={sg} value={sg}>{sg}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-1.5">
                    <select
                      value={colEventType}
                      onChange={(e) => setColEventType(e.target.value)}
                      className="w-full text-[11px] px-1.5 py-1 border border-amber-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="ALL">Semua Acara</option>
                      {uniqueEventTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-1 text-center text-amber-300">-</td>
                  <td className="py-1.5 px-1 text-center text-amber-300">-</td>
                  <td className="py-1.5 px-1 text-center text-amber-300">-</td>
                  <td className="py-1.5 px-1 text-center text-amber-300">-</td>
                  <td className="py-1.5 px-1.5">
                    <select
                      value={colPicSales}
                      onChange={(e) => setColPicSales(e.target.value)}
                      className="w-full text-[11px] px-1.5 py-1 border border-amber-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="ALL">Semua PIC</option>
                      {uniqueSalesPics.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-1 text-center">
                    {activeColFilterCount > 0 && (
                      <button onClick={resetColFilters} className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline">Reset</button>
                    )}
                  </td>
                </tr>
              )}

              {stageView === "STAGE2" && (
                <tr className="bg-indigo-50/80 text-indigo-900">
                  <th className="py-3 px-2.5 border-r border-indigo-200/80 text-center w-10">No</th>
                  <th className="py-3 px-3 border-r border-indigo-200/80 min-w-[170px]">Company / Instansi</th>
                  <th className="py-3 px-2.5 border-r border-indigo-200/80 min-w-[90px]">Sales PIC</th>
                  <th className="py-3 px-2.5 border-r border-indigo-200/80 min-w-[95px]">First Response</th>
                  <th className="py-3 px-2.5 border-r border-indigo-200/80 min-w-[95px]">Last Follow-Up</th>
                  <th className="py-3 px-3 border-r border-indigo-200/80 min-w-[200px]">Respon Terakhir Client</th>
                  <th className="py-3 px-3 border-r border-indigo-200/80 min-w-[170px]">Next Action</th>
                  <th className="py-3 px-2.5 border-r border-indigo-200/80 min-w-[95px]">Due Next Action</th>
                  <th className="py-3 px-2.5 border-r border-indigo-200/80 text-center min-w-[130px]">Pipeline Stage</th>
                  <th className="py-3 px-2.5 text-center min-w-[90px]">Aksi</th>
                </tr>
              )}

              {/* SUB-HEADER FILTER ROW FOR STAGE 2 */}
              {stageView === "STAGE2" && showColFilters && (
                <tr className="bg-indigo-100/60 border-b border-indigo-200">
                  <td className="py-1.5 px-1 text-center font-normal text-indigo-400">
                    <Filter size={12} className="inline-block text-indigo-600" />
                  </td>
                  <td className="py-1.5 px-1.5">
                    <input
                      type="text"
                      placeholder="Filter Company..."
                      value={colCompany}
                      onChange={(e) => setColCompany(e.target.value)}
                      className="w-full text-[11px] px-2 py-1 border border-indigo-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="py-1.5 px-1.5">
                    <select
                      value={colPicSales}
                      onChange={(e) => setColPicSales(e.target.value)}
                      className="w-full text-[11px] px-1.5 py-1 border border-indigo-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="ALL">Semua PIC</option>
                      {uniqueSalesPics.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-1 text-center text-indigo-300">-</td>
                  <td className="py-1.5 px-1 text-center text-indigo-300">-</td>
                  <td className="py-1.5 px-1 text-center text-indigo-300">-</td>
                  <td className="py-1.5 px-1 text-center text-indigo-300">-</td>
                  <td className="py-1.5 px-1 text-center text-indigo-300">-</td>
                  <td className="py-1.5 px-1.5">
                    <select
                      value={colPipelineStage}
                      onChange={(e) => setColPipelineStage(e.target.value)}
                      className="w-full text-[11px] px-1.5 py-1 border border-indigo-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="ALL">Semua Stage</option>
                      {uniquePipelineStages.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-1 text-center">
                    {activeColFilterCount > 0 && (
                      <button onClick={resetColFilters} className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline">Reset</button>
                    )}
                  </td>
                </tr>
              )}

              {stageView === "STAGE3" && (
                <tr className="bg-emerald-50/80 text-emerald-900">
                  <th className="py-3 px-2.5 border-r border-emerald-200/80 text-center w-10">No</th>
                  <th className="py-3 px-3 border-r border-emerald-200/80 min-w-[170px]">Company / Instansi</th>
                  <th className="py-3 px-2.5 border-r border-emerald-200/80 min-w-[90px]">Sales PIC</th>
                  <th className="py-3 px-2.5 border-r border-emerald-200/80 text-center min-w-[130px]">Pipeline Stage</th>
                  <th className="py-3 px-2 text-center w-16">Closing %</th>
                  <th className="py-3 px-2.5 border-r border-emerald-200/80 text-right min-w-[110px]">Potential Rev</th>
                  <th className="py-3 px-2.5 border-r border-emerald-200/80 text-right font-bold min-w-[110px]">Nilai Deal Akhir</th>
                  <th className="py-3 px-2.5 border-r border-emerald-200/80 text-center min-w-[120px]">Status DP & Nominal</th>
                  <th className="py-3 px-2.5 border-r border-emerald-200/80 text-center min-w-[115px]">Jatuh Tempo</th>
                  <th className="py-3 px-2.5 border-r border-emerald-200/80 min-w-[130px]">Alasan Hold / Loss</th>
                  <th className="py-3 px-2.5 text-center min-w-[90px]">Aksi</th>
                </tr>
              )}

              {/* SUB-HEADER FILTER ROW FOR STAGE 3 */}
              {stageView === "STAGE3" && showColFilters && (
                <tr className="bg-emerald-100/60 border-b border-emerald-200">
                  <td className="py-1.5 px-1 text-center font-normal text-emerald-400">
                    <Filter size={12} className="inline-block text-emerald-600" />
                  </td>
                  <td className="py-1.5 px-1.5">
                    <input
                      type="text"
                      placeholder="Filter Company..."
                      value={colCompany}
                      onChange={(e) => setColCompany(e.target.value)}
                      className="w-full text-[11px] px-2 py-1 border border-emerald-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-1.5 px-1.5">
                    <select
                      value={colPicSales}
                      onChange={(e) => setColPicSales(e.target.value)}
                      className="w-full text-[11px] px-1.5 py-1 border border-emerald-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="ALL">Semua PIC</option>
                      {uniqueSalesPics.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-1.5">
                    <select
                      value={colPipelineStage}
                      onChange={(e) => setColPipelineStage(e.target.value)}
                      className="w-full text-[11px] px-1.5 py-1 border border-emerald-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="ALL">Semua Stage</option>
                      {uniquePipelineStages.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-1 text-center text-emerald-300">-</td>
                  <td className="py-1.5 px-1 text-center text-emerald-300">-</td>
                  <td className="py-1.5 px-1 text-center text-emerald-300">-</td>
                  <td className="py-1.5 px-1.5">
                    <select
                      value={colDpStatus}
                      onChange={(e) => setColDpStatus(e.target.value as any)}
                      className="w-full text-[11px] px-1.5 py-1 border border-emerald-200 rounded-lg bg-white text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="ALL">Semua DP</option>
                      <option value="BELUM_DP">Belum DP</option>
                      <option value="DP_30">DP 30%</option>
                      <option value="DP_50">DP 50%</option>
                      <option value="DP_CUSTOM">Sudah DP</option>
                      <option value="LUNAS">Lunas</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-1 text-center text-emerald-300">-</td>
                  <td className="py-1.5 px-1 text-center text-emerald-300">-</td>
                  <td className="py-1.5 px-1 text-center">
                    {activeColFilterCount > 0 && (
                      <button onClick={resetColFilters} className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline">Reset</button>
                    )}
                  </td>
                </tr>
              )}
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={20} className="py-12 text-center text-slate-400">
                    <RefreshCw className="animate-spin inline-block mb-2 text-[#0f4d39]" size={24} />
                    <p className="font-medium text-sm">Memuat data 3-stage sales pipeline...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-12 text-center text-slate-400">
                    <Filter className="inline-block mb-2 text-slate-300" size={32} />
                    <p className="font-medium text-sm text-slate-600">Tidak ada data yang sesuai dengan filter kolom yang dipilih.</p>
                    {activeColFilterCount > 0 && (
                      <button
                        onClick={resetColFilters}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0f4d39] rounded-xl text-xs font-bold border border-emerald-200 transition-all shadow-xs"
                      >
                        <RefreshCw size={13} />
                        <span>Reset Semua Filter Kolom</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const isConfirm = item.status === "CONFIRM";
                  const isTentative = item.status === "TENTATIVE";
                  const isCancel = item.status === "CANCEL";
                  const urgency = getItemUrgency(item);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/90 transition-colors font-sans ${
                        urgency?.level === "URGENT"
                          ? "bg-rose-50/20"
                          : urgency?.level === "WARNING"
                          ? "bg-amber-50/20"
                          : ""
                      }`}
                    >
                      <td className="py-3 px-2.5 border-r border-slate-100 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>

                      {/* CONSOLIDATED / ALL VIEW ROWS */}
                      {stageView === "ALL" && (
                        <>
                          <td className="py-3 px-3 border-r border-slate-100 font-semibold text-slate-900">
                            <div className="flex flex-col gap-1">
                              <span>{item.company}</span>
                              {urgency && (
                                <span
                                  className={`w-fit font-bold text-[10px] px-2 py-0.5 rounded-full ${
                                    urgency.level === "URGENT"
                                      ? "bg-rose-50 text-rose-700 border border-rose-200/80"
                                      : "bg-amber-50 text-amber-800 border border-amber-200/80"
                                  }`}
                                >
                                  {urgency.label}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-600">
                            {formatDateStr(item.dateReceived || item.reservationDate)}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-600">
                            {formatDateStr(item.proposedEventDate || item.eventDate || item.checkIn)}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-slate-600">
                            {item.eventType || "-"}
                          </td>
                          <td className="py-3 px-2 text-center font-semibold text-slate-900">
                            {item.pax || 0}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-right whitespace-nowrap font-mono text-slate-600">
                            {formatCurrency(item.rate)}
                          </td>

                          {/* Confirm */}
                          <td className="py-3 px-2.5 border-r border-slate-100 text-right whitespace-nowrap">
                            {isConfirm ? (
                              <span className="inline-block bg-emerald-50 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-200/60">
                                {formatCurrency(item.total)}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono text-center block">-</span>
                            )}
                          </td>

                          {/* Tentative */}
                          <td className="py-3 px-2.5 border-r border-slate-100 text-right whitespace-nowrap">
                            {isTentative ? (
                              <span className="inline-block bg-amber-50 text-amber-800 font-mono font-bold px-2 py-0.5 rounded-md border border-amber-200/60">
                                {formatCurrency(item.total)}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono text-center block">-</span>
                            )}
                          </td>

                          {/* Cancel */}
                          <td className="py-3 px-2.5 border-r border-slate-100 text-right whitespace-nowrap">
                            {isCancel ? (
                              <span className="inline-block bg-rose-50 text-rose-800 font-mono font-bold px-2 py-0.5 rounded-md border border-rose-200/60">
                                {formatCurrency(item.total)}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono text-center block">-</span>
                            )}
                          </td>

                          {/* Pipeline Stage */}
                          <td className="py-3 px-2.5 border-r border-slate-100 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                              <span>{item.leadStatus || "New Lead"}</span>
                              <span className="text-[9px] font-mono text-indigo-600">({item.closingProbability || 10}%)</span>
                            </span>
                          </td>

                          {/* DP Status */}
                          <td className="py-3 px-2.5 border-r border-slate-100 text-center whitespace-nowrap">
                            {renderDpBadge(item.dpStatus, item.dpAmount)}
                          </td>

                          <td className="py-3 px-2.5 border-r border-slate-100 font-medium text-slate-700">
                            {item.salesPerson || item.pic || "-"}
                          </td>
                        </>
                      )}

                      {/* STAGE 1 VIEW ROWS */}
                      {stageView === "STAGE1" && (
                        <>
                          <td className="py-3 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-600">
                            {formatDateStr(item.dateReceived || item.reservationDate)}
                          </td>
                          <td className="py-3 px-3 border-r border-slate-100 font-semibold text-slate-900">
                            {item.company}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-slate-700">
                            {item.contactPerson || "-"}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-slate-600 font-mono">
                            {item.phoneEmail || item.picPhone || "-"}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-slate-600">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                              {item.leadSource || item.source || "-"}
                            </span>
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-slate-600">
                            {item.segment || "-"}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-slate-600">
                            {item.eventType || "-"}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-600">
                            {formatDateStr(item.proposedEventDate || item.eventDate || item.checkIn)}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-800">
                            {item.pax || 0}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-right font-mono text-slate-600">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-right font-mono font-bold text-emerald-800">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 font-medium text-slate-700">
                            {item.salesPerson || item.pic || "-"}
                          </td>
                        </>
                      )}

                      {/* STAGE 2 VIEW ROWS */}
                      {stageView === "STAGE2" && (
                        <>
                          <td className="py-3 px-3 border-r border-slate-100 font-semibold text-slate-900">
                            {item.company}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 font-medium text-slate-700">
                            {item.salesPerson || item.pic || "-"}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-600">
                            {formatDateStr(item.firstResponseDate)}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-600 font-semibold text-indigo-900">
                            {formatDateStr(item.lastFollowUpDate)}
                          </td>
                          <td className="py-3 px-3 border-r border-slate-100 text-slate-600 max-w-[220px] truncate" title={item.latestClientResponse}>
                            {item.latestClientResponse || "-"}
                          </td>
                          <td className="py-3 px-3 border-r border-slate-100 text-slate-800 font-medium max-w-[180px] truncate" title={item.nextAction}>
                            {item.nextAction || "-"}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-center whitespace-nowrap">
                            {renderDueDateCell(item.nextActionDueDate)}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                              <span>{item.leadStatus || "New Lead"}</span>
                            </span>
                          </td>
                        </>
                      )}

                      {/* STAGE 3 VIEW ROWS */}
                      {stageView === "STAGE3" && (
                        <>
                          <td className="py-3 px-3 border-r border-slate-100 font-semibold text-slate-900">
                            {item.company}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 font-medium text-slate-700">
                            {item.salesPerson || item.pic || "-"}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span>{item.leadStatus || "New Lead"}</span>
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-emerald-700">
                            {item.closingProbability || 10}%
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-right font-mono text-slate-600">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-right font-mono font-bold text-emerald-800">
                            {formatCurrency(item.finalDealValue || (item.status === "CONFIRM" ? item.total : 0))}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-center whitespace-nowrap">
                            {renderDpBadge(item.dpStatus, item.dpAmount)}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-center whitespace-nowrap">
                            {renderDueDateCell(item.dueDate)}
                          </td>
                          <td className="py-3 px-2.5 border-r border-slate-100 text-slate-500 text-[11px] max-w-[150px] truncate" title={item.reasonForLossHold}>
                            {item.reasonForLossHold || "-"}
                          </td>
                        </>
                      )}

                      {/* Actions Column */}
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setWaModalItem(item);
                              setIsWaModalOpen(true);
                            }}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Kirim WA Follow-up"
                          >
                            <MessageSquare size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#0f4d39] hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer Totals */}
            {!loading && items.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 text-slate-800 font-bold text-xs border-t-2 border-slate-200">
                  <td colSpan={3} className="py-3.5 px-3 text-right uppercase tracking-wider text-slate-500 font-bold">
                    Total Pipeline Forecast {activeColFilterCount > 0 ? "(Terfilter)" : ""}:
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-900 font-bold">
                    {filteredTotalPax} Pax
                  </td>
                  <td colSpan={stageView === "ALL" ? 3 : 2}></td>
                  <td className="py-3.5 px-3 text-right bg-emerald-50/80 text-emerald-900 font-mono font-bold">
                    {formatCurrency(filteredConfirmTotal)}
                  </td>
                  <td className="py-3.5 px-3 text-right bg-amber-50/80 text-amber-900 font-mono font-bold">
                    {formatCurrency(filteredTentativeTotal)}
                  </td>
                  <td className="py-3.5 px-3 text-right bg-rose-50/80 text-rose-900 font-mono font-bold">
                    {formatCurrency(filteredCancelTotal)}
                  </td>
                  <td colSpan={6} className="py-3.5 px-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Forecast Edit / Create Modal */}
      <ForecastModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={() => fetchData()}
        unit={selectedUnit === "ALL" ? "CAMP_VILLAGE" : selectedUnit}
        initialData={editingItem}
      />

      {/* WA CRM Follow-up Quick Send Modal */}
      <ForecastWaModal
        isOpen={isWaModalOpen}
        onClose={() => {
          setIsWaModalOpen(false);
          setWaModalItem(null);
        }}
        forecastItem={waModalItem}
      />
    </div>
  );
}
