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
    <div>
      {/* Standard Clean Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2">
            <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-500">Forecast</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 font-judul">Sales & Booking Forecast</h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitoring dan analisis estimasi pendapatan reservasi grup The Lodge Maribaya.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? "animate-spin text-primary-600" : ""} />
          </button>

          <button
            onClick={exportToCSV}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-slate-700 hover:text-primary-700 border border-slate-200 hover:border-primary-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>Tambah Forecast</span>
          </button>
        </div>
      </div>

      {/* Unit Switcher Tabs */}
      <div className="flex items-center gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/80">
        <button
          onClick={() => setSelectedUnit("CAMP_VILLAGE")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            selectedUnit === "CAMP_VILLAGE"
              ? "bg-primary-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Home size={16} />
          <span>Camp & Village</span>
        </button>
        <button
          onClick={() => setSelectedUnit("PARK")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            selectedUnit === "PARK"
              ? "bg-primary-700 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <Building2 size={16} />
          <span>The Lodge Park</span>
        </button>
      </div>

      {/* Stats Cards - Aligned with App Branding */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Grand Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <div className="p-2.5 bg-primary-50 text-primary-700 rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-800 font-sans">
              {formatCurrency(stats.grandTotal)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {stats.totalEntries} Booking ({stats.totalPax} Pax)
            </p>
          </div>
        </div>

        {/* Confirm (Green) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Confirm</span>
            <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-emerald-700 font-sans">
              {formatCurrency(stats.confirmTotal)}
            </h3>
            <p className="text-xs text-emerald-600 mt-1 font-medium">Disetujui</p>
          </div>
        </div>

        {/* Tentative (Yellow) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Tentative</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-amber-700 font-sans">
              {formatCurrency(stats.tentativeTotal)}
            </h3>
            <p className="text-xs text-amber-600 mt-1 font-medium">Dalam Proses</p>
          </div>
        </div>

        {/* Cancel (Red) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Cancel</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <XCircle size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-rose-700 font-sans">
              {formatCurrency(stats.cancelTotal)}
            </h3>
            <p className="text-xs text-rose-600 mt-1 font-medium">Dibatalkan</p>
          </div>
        </div>

        {/* Pax / Rooms Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {selectedUnit === "CAMP_VILLAGE" ? "Total Rooms" : "Total Pax"}
            </span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              {selectedUnit === "CAMP_VILLAGE" ? <Home size={20} /> : <Users size={20} />}
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-800">
              {selectedUnit === "CAMP_VILLAGE" ? `${stats.totalRoomCount} Unit` : `${stats.totalPax} Pax`}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {selectedUnit === "CAMP_VILLAGE" ? `${stats.totalPax} Pax Pengunjung` : "Pengunjung Event"}
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month & Year Selectors */}
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

          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari Company / Instansi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
              <option value="CONFIRM">Confirm (Hijau)</option>
              <option value="TENTATIVE">Tentative (Kuning)</option>
              <option value="CANCEL">Cancel (Merah)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clean & Elegant Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-center w-12">No</th>
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
                
                {/* Colored Status Revenue Headers */}
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right bg-emerald-600 text-white min-w-[120px]">
                  Confirm (Green)
                </th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right bg-amber-500 text-white min-w-[120px]">
                  Tentative (Yellow)
                </th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right bg-rose-600 text-white min-w-[120px]">
                  Cancel (Red)
                </th>

                <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[90px]">PIC</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[140px]">Remarks</th>
                {selectedUnit === "PARK" && (
                  <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[100px]">Segment</th>
                )}
                <th className="py-3.5 px-3 border-r border-slate-200/60 min-w-[100px]">Source</th>
                <th className="py-3.5 px-3 text-center min-w-[80px]">Aksi</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-slate-400">
                    <RefreshCw className="animate-spin inline-block mb-2 text-primary-600" size={24} />
                    <p className="font-medium text-sm">Memuat data forecast...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-slate-400">
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

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors font-sans"
                    >
                      <td className="py-3 px-3 border-r border-slate-100 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100 font-semibold text-slate-800">
                        {item.company}
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
                      <td className="py-3 px-3 border-r border-slate-100 text-center font-semibold text-slate-800">
                        {item.pax || 0}
                      </td>
                      {selectedUnit === "CAMP_VILLAGE" && (
                        <td className="py-3 px-3 border-r border-slate-100 text-center text-slate-600">
                          {item.room || "-"}
                        </td>
                      )}
                      <td className="py-3 px-3 border-r border-slate-100 text-right whitespace-nowrap text-slate-600">
                        {formatCurrency(item.rate)}
                      </td>

                      {/* Status Column Breakdown */}
                      {/* Confirm (Green) */}
                      <td
                        className={`py-3 px-3 border-r border-slate-100 text-right whitespace-nowrap font-bold ${
                          isConfirm
                            ? "bg-emerald-50/80 text-emerald-800"
                            : "text-slate-300 bg-slate-50/30"
                        }`}
                      >
                        {isConfirm ? formatCurrency(item.total) : "-"}
                      </td>

                      {/* Tentative (Yellow) */}
                      <td
                        className={`py-3 px-3 border-r border-slate-100 text-right whitespace-nowrap font-bold ${
                          isTentative
                            ? "bg-amber-50/80 text-amber-800"
                            : "text-slate-300 bg-slate-50/30"
                        }`}
                      >
                        {isTentative ? formatCurrency(item.total) : "-"}
                      </td>

                      {/* Cancel (Red) */}
                      <td
                        className={`py-3 px-3 border-r border-slate-100 text-right whitespace-nowrap font-bold ${
                          isCancel
                            ? "bg-rose-50/80 text-rose-800"
                            : "text-slate-300 bg-slate-50/30"
                        }`}
                      >
                        {isCancel ? formatCurrency(item.total) : "-"}
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
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
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
                <tr className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                  <td colSpan={selectedUnit === "CAMP_VILLAGE" ? 6 : 6} className="py-3.5 px-3 text-right border-r border-slate-700">
                    TOTAL FORECAST:
                  </td>
                  <td className="py-3.5 px-3 text-center border-r border-slate-700 text-emerald-300 font-bold">
                    {stats.totalPax} Pax
                  </td>
                  {selectedUnit === "CAMP_VILLAGE" && (
                    <td className="py-3.5 px-3 text-center border-r border-slate-700 text-blue-300 font-bold">
                      {stats.totalRoomCount} Unit
                    </td>
                  )}
                  <td className="py-3.5 px-3 border-r border-slate-700"></td>
                  
                  <td className="py-3.5 px-3 text-right border-r border-slate-700 bg-emerald-800 text-emerald-100 font-mono">
                    {formatCurrency(stats.confirmTotal)}
                  </td>
                  <td className="py-3.5 px-3 text-right border-r border-slate-700 bg-amber-700 text-amber-100 font-mono">
                    {formatCurrency(stats.tentativeTotal)}
                  </td>
                  <td className="py-3.5 px-3 text-right border-r border-slate-700 bg-rose-800 text-rose-100 font-mono">
                    {formatCurrency(stats.cancelTotal)}
                  </td>
                  
                  <td colSpan={selectedUnit === "PARK" ? 5 : 4} className="py-3.5 px-3"></td>
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
