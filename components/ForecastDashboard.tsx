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
} from "lucide-react";
import {
  getForecastItems,
  getForecastStats,
  deleteForecastItem,
  getForecastReminders,
  autoProcessForecastReminders,
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
  const [selectedUnit, setSelectedUnit] = useState<ForecastUnitType>("CAMP_VILLAGE");
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ForecastStatusType | "ALL">("ALL");
  const [dpStatusFilter, setDpStatusFilter] = useState<ForecastDpStatusType | "ALL">("ALL");
  const [showAnalytics, setShowAnalytics] = useState(false);

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
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // WA Modal State
  const [waModalItem, setWaModalItem] = useState<any | null>(null);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Auto-trigger background WA reminders for H-7 / H-3 tentative items
      autoProcessForecastReminders(selectedUnit).catch((err) =>
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
        getForecastReminders(selectedUnit),
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
    const targetDate = item.unit === "CAMP_VILLAGE" ? item.checkIn : item.eventDate;
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

  const exportToCSV = () => {
    let headers: string[] = [];
    if (selectedUnit === "CAMP_VILLAGE") {
      headers = [
        "Company",
        "Reservation Date",
        "Check In",
        "Check Out",
        "Type of Event",
        "Pax",
        "Room",
        "Rate",
        "Confirm (Rp)",
        "Tentative (Rp)",
        "Cancel (Rp)",
        "Status DP",
        "Nominal DP",
        "Jatuh Tempo Pelunasan",
        "PIC",
        "Remarks",
        "Source",
      ];
    } else {
      headers = [
        "Company",
        "Reservation Date",
        "Event Date",
        "Type of Event",
        "Venue",
        "Pax",
        "Rate",
        "Confirm (Rp)",
        "Tentative (Rp)",
        "Cancel (Rp)",
        "Status DP",
        "Nominal DP",
        "Jatuh Tempo Pelunasan",
        "PIC",
        "Remarks",
        "Segment",
        "Source",
      ];
    }

    const rows = items.map((item) => {
      const confirmVal = item.status === "CONFIRM" ? item.total : 0;
      const tentativeVal = item.status === "TENTATIVE" ? item.total : 0;
      const cancelVal = item.status === "CANCEL" ? item.total : 0;
      const dpStatusText = item.dpStatus === "LUNAS" ? "Lunas" : item.dpStatus === "DP_30" ? "DP 30%" : item.dpStatus === "DP_50" ? "DP 50%" : item.dpStatus === "DP_CUSTOM" ? "Sudah DP (Custom)" : "Belum DP";

      if (selectedUnit === "CAMP_VILLAGE") {
        return [
          `"${item.company || ""}"`,
          formatDateStr(item.reservationDate),
          formatDateStr(item.checkIn),
          formatDateStr(item.checkOut),
          `"${item.eventType || ""}"`,
          item.pax || 0,
          `"${item.room || ""}"`,
          item.rate || 0,
          confirmVal,
          tentativeVal,
          cancelVal,
          `"${dpStatusText}"`,
          item.dpAmount || 0,
          formatDateStr(item.dueDate),
          `"${item.pic || ""}"`,
          `"${item.remarks || ""}"`,
          `"${item.source || ""}"`,
        ].join(",");
      } else {
        return [
          `"${item.company || ""}"`,
          formatDateStr(item.reservationDate),
          formatDateStr(item.eventDate),
          `"${item.eventType || ""}"`,
          `"${item.venue || ""}"`,
          item.pax || 0,
          item.rate || 0,
          confirmVal,
          tentativeVal,
          cancelVal,
          `"${dpStatusText}"`,
          item.dpAmount || 0,
          formatDateStr(item.dueDate),
          `"${item.pic || ""}"`,
          `"${item.remarks || ""}"`,
          `"${item.segment || ""}"`,
          `"${item.source || ""}"`,
        ].join(",");
      }
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Forecast_${selectedUnit}_${MONTHS[selectedMonth - 1]}_${selectedYear}.csv`
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
        items,
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
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      {/* Page Header (Agency Style) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
            <Link href="/dashboard" className="hover:text-slate-700 transition-colors">
              Dashboard
            </Link>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-slate-600 font-semibold">Forecast</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-judul">
            Forecast Reservasi
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 font-subjudul">
            Estimasi pendapatan reservasi grup The Lodge Camp & Village dan Kawasan Wisata The Lodge Park.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="p-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-2xs hover:border-slate-300 active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-[#0f4d39]" : ""} />
          </button>

          <button
            onClick={exportToCSV}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 hover:border-slate-300 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={pdfLoading}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200/80 hover:border-rose-300 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs disabled:opacity-50"
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
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 border px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
              showAnalytics
                ? "bg-[#0f4d39] text-white border-[#0f4d39]"
                : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/80 hover:border-slate-300"
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
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#0f4d39] hover:bg-[#0b3c2c] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs hover:shadow-xs active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Tambah Forecast</span>
          </button>
        </div>
      </div>

      {/* Segmented Unit Control Tabs (Vercel Style) */}
      <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 shadow-inner">
        <button
          onClick={() => setSelectedUnit("CAMP_VILLAGE")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            selectedUnit === "CAMP_VILLAGE"
              ? "bg-white text-[#0f4d39] shadow-xs border border-slate-200/50"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Home size={15} />
          <span>Camp & Village</span>
        </button>
        <button
          onClick={() => setSelectedUnit("PARK")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            selectedUnit === "PARK"
              ? "bg-white text-[#0f4d39] shadow-xs border border-slate-200/50"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Building2 size={15} />
          <span>The Lodge Park</span>
        </button>
      </div>

      {/* Follow-up Reminder Banner (Modern Alert Style) */}
      {reminders.length > 0 && (
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-white p-4 shadow-2xs relative overflow-hidden backdrop-blur-sm">
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
                  Terdapat {reminders.length} reservasi berstatus <span className="font-semibold text-amber-800">Tentative</span> yang mendekati tanggal pelaksanaan dalam 14 hari ke depan. Segera lakukan follow-up atau kirim notifikasi WA.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Grand Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 border-t-4 border-t-[#0f4d39] shadow-2xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[125px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</span>
            <div className="p-2 bg-slate-50 text-[#0f4d39] group-hover:bg-emerald-50 transition-colors rounded-xl border border-slate-100">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-xl xl:text-2xl font-bold text-slate-900 font-mono tracking-tight leading-tight">
              {formatCurrency(stats.grandTotal)}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium whitespace-nowrap">
              {stats.totalEntries} Booking ({stats.totalPax} Pax)
            </p>
          </div>
        </div>

        {/* Confirm */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 border-t-4 border-t-emerald-500 shadow-2xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[125px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Confirm</span>
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
              <span className="text-xs text-emerald-700 font-medium">Disetujui</span>
            </div>
          </div>
        </div>

        {/* Tentative */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 border-t-4 border-t-amber-500 shadow-2xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[125px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Tentative</span>
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
              <span className="text-xs text-amber-700 font-medium">Dalam Proses</span>
            </div>
          </div>
        </div>

        {/* Cancel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 border-t-4 border-t-rose-500 shadow-2xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[125px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Cancel</span>
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
              <span className="text-xs text-rose-700 font-medium">Dibatalkan</span>
            </div>
          </div>
        </div>

        {/* Pax / Rooms Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 border-t-4 border-t-indigo-500 shadow-2xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between min-h-[125px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {selectedUnit === "CAMP_VILLAGE" ? "Total Rooms" : "Total Pax"}
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              {selectedUnit === "CAMP_VILLAGE" ? <Home size={18} /> : <Users size={18} />}
            </div>
          </div>
          <div>
            <h3 className="text-xl xl:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              {selectedUnit === "CAMP_VILLAGE" ? `${stats.totalRoomCount} Unit` : `${stats.totalPax} Pax`}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium whitespace-nowrap">
              {selectedUnit === "CAMP_VILLAGE" ? `${stats.totalPax} Pax Pengunjung` : "Pengunjung Event"}
            </p>
          </div>
        </div>
      </div>

      {/* Forecast Analytics & Revenue Trend Charts (Toggleable via Analitik Button) */}
      {showAnalytics && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <ForecastAnalyticsCharts
            unit={selectedUnit}
            year={selectedYear}
            month={selectedMonth}
            onRefreshParent={fetchData}
          />
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month & Year Selectors */}
          <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-200/80 text-xs">
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
              placeholder="Cari Company / Instansi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f4d39]/20 focus:border-[#0f4d39] transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-200/80 text-xs">
            <Filter size={15} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="CONFIRM">Confirm</option>
              <option value="TENTATIVE">Tentative</option>
              <option value="CANCEL">Cancel</option>
            </select>
          </div>

          {/* DP Status Filter */}
          <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-200/80 text-xs">
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
        </div>
      </div>

      {/* Refined Modern Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1350px]">
            {/* Table Header */}
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-center w-12 font-bold text-slate-400">No</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[180px]">Company</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[110px]">Reservation Date</th>
                {selectedUnit === "CAMP_VILLAGE" ? (
                  <>
                    <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[100px]">Check In</th>
                    <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[100px]">Check Out</th>
                  </>
                ) : (
                  <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[100px]">Event Date</th>
                )}
                <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[120px]">Type of Event</th>
                {selectedUnit === "PARK" && (
                  <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[100px]">Venue</th>
                )}
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-center w-16">Pax</th>
                {selectedUnit === "CAMP_VILLAGE" && (
                  <th className="py-3.5 px-3 border-r border-slate-200/60 text-center w-20">Room</th>
                )}
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right min-w-[100px]">Rate (Rp)</th>
                
                {/* Modern Status Headers with Soft Tints */}
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right bg-emerald-50/60 text-emerald-800 font-bold min-w-[120px]">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Confirm (Rp)</span>
                  </div>
                </th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right bg-amber-50/60 text-amber-800 font-bold min-w-[120px]">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Tentative (Rp)</span>
                  </div>
                </th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right bg-rose-50/60 text-rose-800 font-bold min-w-[120px]">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Cancel (Rp)</span>
                  </div>
                </th>

                {/* Tracking DP & Due Date Headers */}
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-center min-w-[130px]">
                  Status DP & Nominal
                </th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-center min-w-[125px]">
                  Jatuh Tempo Pelunasan
                </th>

                <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[90px]">PIC</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[140px]">Remarks</th>
                {selectedUnit === "PARK" && (
                  <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[100px]">Segment</th>
                )}
                <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[100px]">Source</th>
                <th className="py-3.5 px-3 text-center min-w-[110px]">Aksi</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={20} className="py-12 text-center text-slate-400">
                    <RefreshCw className="animate-spin inline-block mb-2 text-[#0f4d39]" size={24} />
                    <p className="font-medium text-sm">Memuat data forecast...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-12 text-center text-slate-400">
                    <Building2 className="inline-block mb-2 text-slate-300" size={32} />
                    <p className="font-medium text-sm text-slate-600">Belum ada data forecast untuk periode ini.</p>
                    <p className="text-xs text-slate-400 mt-1">Klik tombol &quot;Tambah Forecast&quot; di kanan atas untuk menginput data.</p>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
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
                      <td className="py-3 px-3 border-r border-slate-100 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>
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
                      <td className="py-3 px-3 border-r border-slate-100 whitespace-nowrap text-slate-600">
                        {formatDateStr(item.reservationDate)}
                      </td>
                      {selectedUnit === "CAMP_VILLAGE" ? (
                        <>
                          <td className="py-3 px-3 border-r border-slate-100 whitespace-nowrap text-slate-600">
                            {formatDateStr(item.checkIn)}
                          </td>
                          <td className="py-3 px-3 border-r border-slate-100 whitespace-nowrap text-slate-600">
                            {formatDateStr(item.checkOut)}
                          </td>
                        </>
                      ) : (
                        <td className="py-3 px-3 border-r border-slate-100 whitespace-nowrap text-slate-600">
                          {formatDateStr(item.eventDate)}
                        </td>
                      )}
                      <td className="py-3 px-3 border-r border-slate-100 text-slate-600">
                        {item.eventType || "-"}
                      </td>
                      {selectedUnit === "PARK" && (
                        <td className="py-3 px-3 border-r border-slate-100 font-medium text-slate-700">
                          {item.venue || "-"}
                        </td>
                      )}
                      <td className="py-3 px-3 border-r border-slate-100 text-center font-semibold text-slate-900">
                        {item.pax || 0}
                      </td>
                      {selectedUnit === "CAMP_VILLAGE" && (
                        <td className="py-3 px-3 border-r border-slate-100 text-center text-slate-600">
                          {item.room || "-"}
                        </td>
                      )}
                      <td className="py-3 px-3 border-r border-slate-100 text-right whitespace-nowrap font-mono text-slate-600">
                        {formatCurrency(item.rate)}
                      </td>

                      {/* Status Column Breakdown */}
                      {/* Confirm Column */}
                      <td className="py-3 px-3 border-r border-slate-100 text-right whitespace-nowrap">
                        {isConfirm ? (
                          <span className="inline-block bg-emerald-50 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-200/60">
                            {formatCurrency(item.total)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-center block">-</span>
                        )}
                      </td>

                      {/* Tentative Column */}
                      <td className="py-3 px-3 border-r border-slate-100 text-right whitespace-nowrap">
                        {isTentative ? (
                          <span className="inline-block bg-amber-50 text-amber-800 font-mono font-bold px-2 py-0.5 rounded-md border border-amber-200/60">
                            {formatCurrency(item.total)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-center block">-</span>
                        )}
                      </td>

                      {/* Cancel Column */}
                      <td className="py-3 px-3 border-r border-slate-100 text-right whitespace-nowrap">
                        {isCancel ? (
                          <span className="inline-block bg-rose-50 text-rose-800 font-mono font-bold px-2 py-0.5 rounded-md border border-rose-200/60">
                            {formatCurrency(item.total)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-center block">-</span>
                        )}
                      </td>

                      {/* Status DP & Nominal */}
                      <td className="py-3 px-3 border-r border-slate-100 text-center whitespace-nowrap">
                        {renderDpBadge(item.dpStatus, item.dpAmount)}
                      </td>

                      {/* Jatuh Tempo Pelunasan */}
                      <td className="py-3 px-3 border-r border-slate-100 text-center whitespace-nowrap">
                        {renderDueDateCell(item.dueDate)}
                      </td>

                      <td className="py-3 px-3 border-r border-slate-100 font-medium text-slate-700">
                        {item.pic || "-"}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100 text-slate-500 max-w-[200px] truncate" title={item.remarks}>
                        {item.remarks || "-"}
                      </td>
                      {selectedUnit === "PARK" && (
                        <td className="py-3 px-3 border-r border-slate-100 text-slate-600">
                          {item.segment || "-"}
                        </td>
                      )}
                      <td className="py-3 px-3 border-r border-slate-100 text-slate-600">
                        {item.source || "-"}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Send WA Follow-up button */}
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
                <tr className="bg-slate-50/90 text-slate-800 font-bold text-xs border-t-2 border-slate-200/80">
                  <td colSpan={selectedUnit === "CAMP_VILLAGE" ? 6 : 6} className="py-3.5 px-3 text-right border-r border-slate-200/60 uppercase tracking-wider text-slate-500 font-bold">
                    Total Forecast:
                  </td>
                  <td className="py-3.5 px-3 text-center border-r border-slate-200/60 text-slate-900 font-bold">
                    {stats.totalPax} Pax
                  </td>
                  {selectedUnit === "CAMP_VILLAGE" && (
                    <td className="py-3.5 px-3 text-center border-r border-slate-200/60 text-indigo-700 font-bold">
                      {stats.totalRoomCount} Unit
                    </td>
                  )}
                  <td className="py-3.5 px-3 border-r border-slate-200/60"></td>
                  
                  <td className="py-3.5 px-3 text-right border-r border-slate-200/60 bg-emerald-50/80 text-emerald-900 font-mono font-bold">
                    {formatCurrency(stats.confirmTotal)}
                  </td>
                  <td className="py-3.5 px-3 text-right border-r border-slate-200/60 bg-amber-50/80 text-amber-900 font-mono font-bold">
                    {formatCurrency(stats.tentativeTotal)}
                  </td>
                  <td className="py-3.5 px-3 text-right border-r border-slate-200/60 bg-rose-50/80 text-rose-900 font-mono font-bold">
                    {formatCurrency(stats.cancelTotal)}
                  </td>
                  
                  <td colSpan={selectedUnit === "PARK" ? 7 : 6} className="py-3.5 px-3"></td>
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
        unit={selectedUnit}
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
