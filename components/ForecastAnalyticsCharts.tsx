"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  TrendingUp,
  Target,
  Percent,
  Edit3,
  AlertCircle,
  BarChart3,
  X,
  Save,
  Award,
} from "lucide-react";
import {
  getForecastYearlyTrend,
  getForecastAnalyticsSummary,
  saveForecastTarget,
  ForecastUnitType,
} from "@/actions/forecast";

interface ForecastAnalyticsChartsProps {
  unit: ForecastUnitType;
  year: number;
  month: number;
  onRefreshParent?: () => void;
}

const MONTH_NAMES = [
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

const formatShortCurrency = (val: number) => {
  if (!val) return "Rp 0";
  if (val >= 1_000_000_000) {
    return `Rp ${(val / 1_000_000_000).toFixed(1)} M`;
  }
  if (val >= 1_000_000) {
    return `Rp ${(val / 1_000_000).toFixed(0)} Jt`;
  }
  return `Rp ${val.toLocaleString("id-ID")}`;
};

const formatFullCurrency = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export default function ForecastAnalyticsCharts({
  unit,
  year,
  month,
  onRefreshParent,
}: ForecastAnalyticsChartsProps) {
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any>(null);

  // Target modal state
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetInput, setTargetInput] = useState<string>("");
  const [savingTarget, setSavingTarget] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [trend, summary] = await Promise.all([
        getForecastYearlyTrend({ unit, year }),
        getForecastAnalyticsSummary({ unit, year, month }),
      ]);
      setTrendData(trend);
      setMonthlySummary(summary);
      setTargetInput(summary.targetRevenue ? String(summary.targetRevenue) : "");
    } catch (err) {
      console.error("Error loading analytics charts:", err);
    } finally {
      setLoading(false);
    }
  }, [unit, year, month]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingTarget(true);
      const numericTarget = parseFloat(targetInput.replace(/[^0-9]/g, "")) || 0;
      await saveForecastTarget({
        unit,
        year,
        month,
        target: numericTarget,
      });
      setIsTargetModalOpen(false);
      await loadAnalytics();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      console.error("Failed to save target:", err);
    } finally {
      setSavingTarget(false);
    }
  };

  if (!isClient) return null;

  const currentMonthName = MONTH_NAMES[month - 1];

  // Overall yearly summary calculations
  const totalYearlyConfirm = trendData.reduce((acc, curr) => acc + (curr.confirmRevenue || 0), 0);
  const totalYearlyTarget = trendData.reduce((acc, curr) => acc + (curr.targetRevenue || 0), 0);
  const totalYearlyConfirmCount = trendData.reduce((acc, curr) => acc + (curr.confirmCount || 0), 0);
  const totalYearlyTentativeCount = trendData.reduce((acc, curr) => acc + (curr.tentativeCount || 0), 0);
  const totalYearlyCancelCount = trendData.reduce((acc, curr) => acc + (curr.cancelCount || 0), 0);
  const totalYearlyEntries = totalYearlyConfirmCount + totalYearlyTentativeCount + totalYearlyCancelCount;

  const yearlyClosingRate = totalYearlyEntries > 0
    ? Math.round((totalYearlyConfirmCount / totalYearlyEntries) * 100)
    : 0;

  const monthlyTargetProgress = monthlySummary?.targetProgress || 0;
  const monthlyClosingRate = monthlySummary?.closingRate || 0;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs">
          <p className="font-bold border-b border-slate-800 pb-1.5 mb-2 text-slate-300">
            {label} {year}
          </p>
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-6 py-0.5">
              <span className="flex items-center gap-2 font-medium" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">
                {formatFullCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Pie chart breakdown data for monthly conversion
  const conversionPieData = [
    { name: "Confirm", value: monthlySummary?.confirmCount || 0, color: "#10b981" },
    { name: "Tentative", value: monthlySummary?.tentativeCount || 0, color: "#f59e0b" },
    { name: "Cancel", value: monthlySummary?.cancelCount || 0, color: "#f43f5e" },
  ].filter((d) => d.value > 0);

  return (
    <div className="mb-8 space-y-6">
      {/* Cards Grid: Target vs Realisasi & Closing Rate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Target vs Realisasi (Monthly) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#0f4d39]" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-[#0f4d39] rounded-xl border border-emerald-100">
                  <Target size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Target vs Realisasi
                  </h4>
                  <p className="text-xs text-slate-600 font-semibold">{currentMonthName} {year}</p>
                </div>
              </div>
              <button
                onClick={() => setIsTargetModalOpen(true)}
                className="p-1.5 text-slate-400 hover:text-[#0f4d39] hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                title="Set Target Revenue"
              >
                <Edit3 size={14} />
                <span>Set Target</span>
              </button>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-500 font-medium">Realisasi (Confirm):</span>
                <span className="text-sm font-bold text-emerald-700 font-mono">
                  {formatFullCurrency(monthlySummary?.confirmRevenue || 0)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-500 font-medium">Target Revenue:</span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {monthlySummary?.targetRevenue > 0
                    ? formatFullCurrency(monthlySummary.targetRevenue)
                    : "Belum diset"}
                </span>
              </div>
            </div>

            {/* Target Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-slate-600">Pencapaian Target</span>
                <span
                  className={
                    monthlyTargetProgress >= 100
                      ? "text-emerald-700 font-mono"
                      : monthlyTargetProgress >= 70
                      ? "text-amber-700 font-mono"
                      : "text-slate-600 font-mono"
                  }
                >
                  {monthlyTargetProgress}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    monthlyTargetProgress >= 100
                      ? "bg-emerald-600"
                      : monthlyTargetProgress >= 70
                      ? "bg-amber-500"
                      : "bg-[#0f4d39]"
                  }`}
                  style={{ width: `${Math.min(monthlyTargetProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              {monthlyTargetProgress >= 100 ? (
                <>
                  <Award size={14} className="text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Target Tercapai! 🎉</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} className="text-amber-500" />
                  <span>
                    Kekurangan:{" "}
                    <strong className="font-mono text-slate-800">
                      {formatShortCurrency(
                        Math.max(0, (monthlySummary?.targetRevenue || 0) - (monthlySummary?.confirmRevenue || 0))
                      )}
                    </strong>
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Card 2: Conversion / Closing Rate (Monthly) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <Percent size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Closing Rate (Bulan Ini)
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">Conversion Tentative ➔ Confirm</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div>
                <h3 className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
                  {monthlyClosingRate}%
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  <span className="font-bold text-emerald-700">{monthlySummary?.confirmCount || 0}</span> dari{" "}
                  <span className="font-bold text-slate-800">
                    {(monthlySummary?.confirmCount || 0) +
                      (monthlySummary?.tentativeCount || 0) +
                      (monthlySummary?.cancelCount || 0)}
                  </span>{" "}
                  reservasi Confirm
                </p>
              </div>

              {/* Small Donut Visual */}
              {conversionPieData.length > 0 && (
                <div className="w-16 h-16 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={conversionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={30}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {conversionPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {monthlySummary?.confirmCount || 0} Confirm
              </span>
              <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {monthlySummary?.tentativeCount || 0} Tentative
              </span>
            </span>
          </div>
        </div>

        {/* Card 3: Yearly Performance Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Ringkasan Tahunan ({year})
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">Akumulasi 12 Bulan</p>
                </div>
              </div>
            </div>

            <div className="mt-2 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500 font-medium">Total Revenue Confirm:</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatShortCurrency(totalYearlyConfirm)}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500 font-medium">Total Target Tahunan:</span>
                <span className="text-sm font-bold text-slate-600 font-mono">
                  {formatShortCurrency(totalYearlyTarget)}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500 font-medium">Closing Rate Rata-rata:</span>
                <span className="text-sm font-bold text-indigo-700 font-mono">
                  {yearlyClosingRate}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Entry: <strong className="text-slate-800">{totalYearlyEntries} Reservasi</strong></span>
            <span className="text-emerald-700 font-semibold">{totalYearlyConfirmCount} Disetujui</span>
          </div>
        </div>
      </div>

      {/* Main Chart Section: Monthly Revenue Trend (Jan - Dec) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-judul flex items-center gap-2">
              <TrendingUp size={18} className="text-[#0f4d39]" />
              <span>Grafik Tren Revenue & Target vs Realisasi ({year})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-subjudul">
              Perbandingan akumulasi pendapatan bulanan (Confirm, Tentative, Cancel) dengan garis Target Revenue.
            </p>
          </div>

          {/* Legend Badges */}
          <div className="flex flex-wrap items-center gap-3.5 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              Confirm
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-sm bg-amber-500" />
              Tentative
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-sm bg-rose-500" />
              Cancel
            </span>
            <span className="flex items-center gap-1.5 text-slate-800">
              <span className="w-4 h-0.5 bg-[#0f4d39]" />
              Target Line
            </span>
          </div>
        </div>

        {/* Chart Canvas */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
            Memuat grafik tren...
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trendData}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="monthName"
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatShortCurrency}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Bars for Confirm, Tentative, Cancel */}
                <Bar
                  dataKey="confirmRevenue"
                  name="Confirm Revenue"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Bar
                  dataKey="tentativeRevenue"
                  name="Tentative Revenue"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Bar
                  dataKey="cancelRevenue"
                  name="Cancel Revenue"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />

                {/* Target Overlay Line */}
                <Line
                  type="monotone"
                  dataKey="targetRevenue"
                  name="Target Revenue"
                  stroke="#0f4d39"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#0f4d39", strokeWidth: 2, stroke: "#ffffff" }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Target Setting Modal */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-[#0f4d39] rounded-xl border border-emerald-100">
                  <Target size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-judul">
                  Set Target Revenue ({currentMonthName} {year})
                </h3>
              </div>
              <button
                onClick={() => setIsTargetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nominal Target Pendapatan (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder="Contoh: 500000000"
                    required
                    min="0"
                    step="1000000"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-900 font-mono font-bold text-sm focus:bg-white focus:border-[#0f4d39] focus:ring-2 focus:ring-[#0f4d39]/20 outline-none transition-all"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Masukkan target omset untuk bulan {currentMonthName} {year} dalam satuan Rupiah.
                </p>
              </div>

              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Realisasi Saat Ini:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatFullCurrency(monthlySummary?.confirmRevenue || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Unit Bisnis:</span>
                  <span className="font-bold text-slate-800">
                    {unit === "CAMP_VILLAGE" ? "Camp & Village" : "The Lodge Park"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingTarget}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0f4d39] hover:bg-[#0b3c2c] rounded-xl shadow-2xs transition-all disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{savingTarget ? "Menyimpan..." : "Simpan Target"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
