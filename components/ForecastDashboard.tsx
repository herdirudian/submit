"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import {
  getForecastItems,
  getForecastStats,
  deleteForecastItem,
  ForecastUnitType,
  ForecastStatusType,
} from "@/actions/forecast";
import ForecastModal from "@/components/ForecastModal";

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

  const [items, setItems] = useState<any[]>([]);
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedItems, fetchedStats] = await Promise.all([
        getForecastItems({
          unit: selectedUnit,
          month: selectedMonth,
          year: selectedYear,
          search: searchQuery,
          status: statusFilter,
        }),
        getForecastStats({
          unit: selectedUnit,
          month: selectedMonth,
          year: selectedYear,
        }),
      ]);

      setItems(fetchedItems);
      setStats(fetchedStats);
    } catch (err) {
      console.error("Failed to fetch forecast data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedUnit, selectedMonth, selectedYear, searchQuery, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus data forecast ini?")) {
      try {
        await deleteForecastItem(id);
        fetchData();
      } catch (err) {
        alert("Gagal menghapus data");
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDateStr = (d: any) => {
    if (!d) return "-";
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return "-";
    return dateObj.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const exportToCSV = () => {
    if (items.length === 0) {
      alert("Tidak ada data untuk diexport");
      return;
    }

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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <TrendingUp size={16} />
              <span>Sales & Booking Forecast</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-judul tracking-tight">
              Forecast Management System
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-xl">
              Monitoring dan analisis estimasi pendapatan reservasi grup untuk The Lodge Camp & Village dan Kawasan Wisata The Lodge Park.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Unit Switcher */}
            <div className="bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700 flex items-center">
              <button
                onClick={() => setSelectedUnit("CAMP_VILLAGE")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedUnit === "CAMP_VILLAGE"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Camp & Village
              </button>
              <button
                onClick={() => setSelectedUnit("PARK")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedUnit === "PARK"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                The Lodge Park
              </button>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="p-2 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Grand Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm col-span-2 md:col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue Forecast</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900">
            {formatCurrency(stats.grandTotal)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {stats.totalEntries} Transaksi ({stats.totalPax} Pax)
          </div>
        </div>

        {/* Confirm (Green) */}
        <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/60 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Confirm</span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="text-lg md:text-xl font-bold text-emerald-900">
            {formatCurrency(stats.confirmTotal)}
          </div>
          <div className="text-[11px] font-medium text-emerald-700 mt-1">
            Status Disetujui (Green)
          </div>
        </div>

        {/* Tentative (Yellow) */}
        <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/60 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tentative</span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <div className="text-lg md:text-xl font-bold text-amber-900">
            {formatCurrency(stats.tentativeTotal)}
          </div>
          <div className="text-[11px] font-medium text-amber-700 mt-1">
            Dalam Proses (Yellow)
          </div>
        </div>

        {/* Cancel (Red) */}
        <div className="bg-rose-50/60 rounded-2xl p-4 border border-rose-200/60 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cancel</span>
            <XCircle size={18} className="text-rose-600" />
          </div>
          <div className="text-lg md:text-xl font-bold text-rose-900">
            {formatCurrency(stats.cancelTotal)}
          </div>
          <div className="text-[11px] font-medium text-rose-700 mt-1">
            Dibatalkan (Red)
          </div>
        </div>

        {/* Pax / Rooms Count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {selectedUnit === "CAMP_VILLAGE" ? "Total Rooms" : "Total Pax"}
            </span>
            {selectedUnit === "CAMP_VILLAGE" ? (
              <Home size={18} className="text-indigo-600" />
            ) : (
              <Users size={18} className="text-indigo-600" />
            )}
          </div>
          <div className="text-lg md:text-xl font-bold text-slate-900">
            {selectedUnit === "CAMP_VILLAGE" ? `${stats.totalRoomCount} Unit` : `${stats.totalPax} Pax`}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {selectedUnit === "CAMP_VILLAGE" ? `${stats.totalPax} Pax Pengunjung` : "Pengunjung Event"}
          </div>
        </div>
      </div>

      {/* Main Controls & Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: Date & Month Selection */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Calendar size={16} className="text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m, idx) => (
                <option key={idx} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer border-l border-slate-200 pl-2"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Search by Company */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari Instansi / Company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Filter size={16} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="CONFIRM">Confirm (Green)</option>
              <option value="TENTATIVE">Tentative (Yellow)</option>
              <option value="CANCEL">Cancel (Red)</option>
            </select>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-semibold transition-colors"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span>Tambah Forecast</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-800 text-white font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 border-r border-slate-700 text-center w-12">No</th>
                <th className="py-3 px-3 border-r border-slate-700 min-w-[180px]">Company</th>
                <th className="py-3 px-3 border-r border-slate-700 min-w-[110px]">Reservation Date</th>
                {selectedUnit === "CAMP_VILLAGE" ? (
                  <>
                    <th className="py-3 px-3 border-r border-slate-700 min-w-[100px]">Check In</th>
                    <th className="py-3 px-3 border-r border-slate-700 min-w-[100px]">Check Out</th>
                  </>
                ) : (
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[100px]">Date</th>
                )}
                <th className="py-3 px-3 border-r border-slate-700 min-w-[120px]">Type of Event</th>
                {selectedUnit === "PARK" && (
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[100px]">Venue</th>
                )}
                <th className="py-3 px-3 border-r border-slate-700 text-center w-16">QTY Pax</th>
                {selectedUnit === "CAMP_VILLAGE" && (
                  <th className="py-3 px-3 border-r border-slate-700 text-center w-20">Room</th>
                )}
                <th className="py-3 px-3 border-r border-slate-700 text-right min-w-[100px]">Rate (Rp)</th>
                
                {/* Excel-style Colored Status Revenue Columns */}
                <th className="py-3 px-3 border-r border-slate-700 text-right bg-emerald-700 text-white min-w-[120px]">
                  Confirm (Green)
                </th>
                <th className="py-3 px-3 border-r border-slate-700 text-right bg-amber-600 text-white min-w-[120px]">
                  Tentative (Yellow)
                </th>
                <th className="py-3 px-3 border-r border-slate-700 text-right bg-rose-700 text-white min-w-[120px]">
                  Cancel (Red)
                </th>

                <th className="py-3 px-3 border-r border-slate-700 min-w-[90px]">PIC</th>
                <th className="py-3 px-3 border-r border-slate-700 min-w-[140px]">Remarks</th>
                {selectedUnit === "PARK" && (
                  <th className="py-3 px-3 border-r border-slate-700 min-w-[100px]">Segment</th>
                )}
                <th className="py-3 px-3 border-r border-slate-700 min-w-[100px]">Source</th>
                <th className="py-3 px-3 text-center min-w-[80px]">Aksi</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-slate-400">
                    <RefreshCw className="animate-spin inline-block mb-2 text-emerald-600" size={24} />
                    <p className="font-medium text-sm">Memuat data forecast...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-slate-400">
                    <Building2 className="inline-block mb-2 text-slate-300" size={32} />
                    <p className="font-medium text-sm">Belum ada data forecast untuk periode ini.</p>
                    <p className="text-xs text-slate-400 mt-1">Klik tombol &quot;Tambah Forecast&quot; untuk menginput data baru.</p>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const isConfirm = item.status === "CONFIRM";
                  const isTentative = item.status === "TENTATIVE";
                  const isCancel = item.status === "CANCEL";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors font-sans"
                    >
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-900">
                        {item.company}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">
                        {formatDateStr(item.reservationDate)}
                      </td>
                      {selectedUnit === "CAMP_VILLAGE" ? (
                        <>
                          <td className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">
                            {formatDateStr(item.checkIn)}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">
                            {formatDateStr(item.checkOut)}
                          </td>
                        </>
                      ) : (
                        <td className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap">
                          {formatDateStr(item.eventDate)}
                        </td>
                      )}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        {item.eventType || "-"}
                      </td>
                      {selectedUnit === "PARK" && (
                        <td className="py-2.5 px-3 border-r border-slate-200 font-medium">
                          {item.venue || "-"}
                        </td>
                      )}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center font-semibold">
                        {item.pax || 0}
                      </td>
                      {selectedUnit === "CAMP_VILLAGE" && (
                        <td className="py-2.5 px-3 border-r border-slate-200 text-center">
                          {item.room || "-"}
                        </td>
                      )}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right whitespace-nowrap font-mono text-slate-600">
                        {formatCurrency(item.rate)}
                      </td>

                      {/* Status Column Breakdown matching Excel */}
                      {/* Confirm (Green) */}
                      <td
                        className={`py-2.5 px-3 border-r border-slate-200 text-right whitespace-nowrap font-mono font-bold ${
                          isConfirm
                            ? "bg-emerald-100 text-emerald-900"
                            : "text-slate-300 bg-slate-50/50"
                        }`}
                      >
                        {isConfirm ? formatCurrency(item.total) : "-"}
                      </td>

                      {/* Tentative (Yellow) */}
                      <td
                        className={`py-2.5 px-3 border-r border-slate-200 text-right whitespace-nowrap font-mono font-bold ${
                          isTentative
                            ? "bg-amber-100 text-amber-900"
                            : "text-slate-300 bg-slate-50/50"
                        }`}
                      >
                        {isTentative ? formatCurrency(item.total) : "-"}
                      </td>

                      {/* Cancel (Red) */}
                      <td
                        className={`py-2.5 px-3 border-r border-slate-200 text-right whitespace-nowrap font-mono font-bold ${
                          isCancel
                            ? "bg-rose-100 text-rose-900"
                            : "text-slate-300 bg-slate-50/50"
                        }`}
                      >
                        {isCancel ? formatCurrency(item.total) : "-"}
                      </td>

                      <td className="py-2.5 px-3 border-r border-slate-200 font-medium">
                        {item.pic || "-"}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-slate-500 max-w-[200px] truncate" title={item.remarks}>
                        {item.remarks || "-"}
                      </td>
                      {selectedUnit === "PARK" && (
                        <td className="py-2.5 px-3 border-r border-slate-200">
                          {item.segment || "-"}
                        </td>
                      )}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        {item.source || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                <tr className="bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
                  <td colSpan={selectedUnit === "CAMP_VILLAGE" ? 6 : 6} className="py-3 px-3 text-right border-r border-slate-700">
                    TOTAL FORECAST PERIODE INI:
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-700 text-emerald-400 font-bold">
                    {stats.totalPax} Pax
                  </td>
                  {selectedUnit === "CAMP_VILLAGE" && (
                    <td className="py-3 px-3 text-center border-r border-slate-700 text-indigo-300 font-bold">
                      {stats.totalRoomCount} Unit
                    </td>
                  )}
                  <td className="py-3 px-3 border-r border-slate-700"></td>
                  
                  <td className="py-3 px-3 text-right border-r border-slate-700 bg-emerald-800 text-emerald-100 font-mono">
                    {formatCurrency(stats.confirmTotal)}
                  </td>
                  <td className="py-3 px-3 text-right border-r border-slate-700 bg-amber-700 text-amber-100 font-mono">
                    {formatCurrency(stats.tentativeTotal)}
                  </td>
                  <td className="py-3 px-3 text-right border-r border-slate-700 bg-rose-800 text-rose-100 font-mono">
                    {formatCurrency(stats.cancelTotal)}
                  </td>
                  
                  <td colSpan={selectedUnit === "PARK" ? 5 : 4} className="py-3 px-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
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
    </div>
  );
}

