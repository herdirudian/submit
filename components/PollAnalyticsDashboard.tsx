"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
    ArrowLeft, Calendar, Download, TrendingUp, Users, Award, 
    Filter, Layers, ShoppingBag, Eye, RefreshCw, BarChart2
} from "lucide-react";
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell 
} from "recharts";

const INFO_COLORS = ['#0f4d39', '#2563eb', '#d97706', '#dc2626', '#9333ea', '#0891b2'];

type PollAnalyticsDashboardProps = {
    poll: any;
    dateRange: { from: string; to: string };
};

export default function PollAnalyticsDashboard({ poll, dateRange }: PollAnalyticsDashboardProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [from, setFrom] = useState(dateRange.from);
    const [to, setTo] = useState(dateRange.to);
    const [selectedInfoFilter, setSelectedInfoFilter] = useState<string>("ALL");

    // Extract questions and options metadata
    const infoOptions: any[] = poll.infoOptions || [];
    const categoryOptions: any[] = poll.categoryOptions || [];
    const productOptions: any[] = poll.productOptions || [];
    const submissions: any[] = poll.submissions || [];
    const dailyStats: any[] = poll.dailyStats || [];

    // Filter submissions based on selected Form Info option
    const filteredSubmissions = submissions.filter((sub) => {
        if (selectedInfoFilter === "ALL") return true;
        if (!poll.infoQuestion) return true;
        const infoAns = sub.answers[poll.infoQuestion.id];
        return infoAns?.optionId === selectedInfoFilter;
    });

    const totalSubmissions = submissions.length;
    const filteredTotal = filteredSubmissions.length;
    const views = poll.views || 0;
    const conversionRate = views > 0 ? ((totalSubmissions / views) * 100).toFixed(1) : "0";

    // Re-calculate Product & Category stats dynamically based on filteredSubmissions
    const calculateDynamicBreakdown = () => {
        const prodStats: Record<string, { total: number; byInfo: Record<string, number> }> = {};
        const catStats: Record<string, { total: number; byInfo: Record<string, number> }> = {};

        for (const p of productOptions) {
            prodStats[p.id] = { total: 0, byInfo: {} };
            for (const inf of infoOptions) {
                prodStats[p.id].byInfo[inf.id] = 0;
            }
        }

        for (const c of categoryOptions) {
            catStats[c.id] = { total: 0, byInfo: {} };
            for (const inf of infoOptions) {
                catStats[c.id].byInfo[inf.id] = 0;
            }
        }

        for (const sub of filteredSubmissions) {
            const infoAns = poll.infoQuestion ? sub.answers[poll.infoQuestion.id] : null;
            const catAns = poll.categoryQuestion ? sub.answers[poll.categoryQuestion.id] : null;
            const prodAns = poll.productQuestion ? sub.answers[poll.productQuestion.id] : null;

            if (catAns && catStats[catAns.optionId]) {
                catStats[catAns.optionId].total++;
                if (infoAns && catStats[catAns.optionId].byInfo[infoAns.optionId] !== undefined) {
                    catStats[catAns.optionId].byInfo[infoAns.optionId]++;
                }
            }

            if (prodAns && prodStats[prodAns.optionId]) {
                prodStats[prodAns.optionId].total++;
                if (infoAns && prodStats[prodAns.optionId].byInfo[infoAns.optionId] !== undefined) {
                    prodStats[prodAns.optionId].byInfo[infoAns.optionId]++;
                }
            }
        }

        const dynamicProducts = productOptions
            .map((p) => {
                const parentCat = categoryOptions.find((c) => c.id === p.parentId);
                return {
                    ...p,
                    categoryLabel: parentCat?.label || "-",
                    totalVotes: prodStats[p.id]?.total || 0,
                    byInfo: prodStats[p.id]?.byInfo || {}
                };
            })
            .sort((a, b) => b.totalVotes - a.totalVotes);

        const dynamicCategories = categoryOptions
            .map((c) => ({
                ...c,
                totalVotes: catStats[c.id]?.total || 0,
                byInfo: catStats[c.id]?.byInfo || {}
            }))
            .sort((a, b) => b.totalVotes - a.totalVotes);

        return { dynamicProducts, dynamicCategories };
    };

    const { dynamicProducts, dynamicCategories } = calculateDynamicBreakdown();
    const topProduct = dynamicProducts[0];

    // Handle Apply Date Filter
    const applyDateFilter = () => {
        const params = new URLSearchParams(searchParams.toString());
        if (from) params.set("from", from);
        else params.delete("from");
        if (to) params.set("to", to);
        else params.delete("to");

        router.push(`/polls/${poll.id}/analytics?${params.toString()}`);
    };

    const setQuickPreset = (days: number) => {
        const dTo = new Date();
        const dFrom = new Date();
        dFrom.setDate(dFrom.getDate() - days);

        const formatYMD = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        };

        const fStr = formatYMD(dFrom);
        const tStr = formatYMD(dTo);
        setFrom(fStr);
        setTo(tStr);

        const params = new URLSearchParams(searchParams.toString());
        params.set("from", fStr);
        params.set("to", tStr);
        router.push(`/polls/${poll.id}/analytics?${params.toString()}`);
    };

    // Export CSV
    const exportCsvData = () => {
        const rows: string[][] = [];
        rows.push(["EXPORT ANALITIK POLLING", poll.title]);
        rows.push(["Rentang Tanggal", `${from} s/d ${to}`]);
        rows.push(["Total Submisi", String(totalSubmissions)]);
        rows.push([]);

        // 1. Grouping Produk x Form Info
        rows.push(["--- GROUPING PRODUK X FORM INFO ---"]);
        const infoHeaders = infoOptions.map((i) => `Form Info: ${i.label}`);
        rows.push(["Nama Produk", "Kategori", "Total Suara", ...infoHeaders]);

        dynamicProducts.forEach((p) => {
            const infoCounts = infoOptions.map((inf) => String(p.byInfo[inf.id] || 0));
            rows.push([p.label, p.categoryLabel, String(p.totalVotes), ...infoCounts]);
        });
        rows.push([]);

        // 2. Data Submisi Harian
        rows.push(["--- ANALITIK SUBMISI PER TANGGAL ---"]);
        rows.push(["Tanggal", "Jumlah Suara"]);
        dailyStats.forEach((d) => {
            rows.push([d.formattedDate, String(d.totalVotes)]);
        });

        const csvContent = rows
            .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `analitik_polling_${poll.slug}_${from}_${to}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 font-deskripsi pb-16 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/polls/${poll.id}`}
                        className="p-2.5 bg-white hover:bg-slate-100 rounded-full transition-all text-slate-500 border border-slate-200 shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-800 font-judul">{poll.title} - Analitik</h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${poll.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                                {poll.status}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm mt-0.5">Grouping detail Form Info, Kategori & Produk terpopuler.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href={`/polls/${poll.id}`}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
                    >
                        Edit Polling
                    </Link>
                    <button
                        onClick={exportCsvData}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm shadow-primary-200"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Date Range Filter Box */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">Filter Rentang Tanggal</h3>
                            <p className="text-xs text-slate-400">Pilih rentang tanggal untuk melihat analitik per tanggal.</p>
                        </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setQuickPreset(7)}
                            className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                        >
                            7 Hari Terakhir
                        </button>
                        <button
                            onClick={() => setQuickPreset(30)}
                            className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                        >
                            30 Hari Terakhir
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end gap-4 pt-1">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dari Tanggal</label>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sampai Tanggal</label>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={applyDateFilter}
                        className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-primary-100"
                    >
                        <Filter size={16} /> Terapkan Filter
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-primary-50 text-primary-600 rounded-2xl">
                        <Users size={26} />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Suara</p>
                        <p className="text-2xl font-bold text-slate-800">{totalSubmissions}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <Eye size={26} />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Views</p>
                        <p className="text-2xl font-bold text-slate-800">{views}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <TrendingUp size={26} />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Konversi</p>
                        <p className="text-2xl font-bold text-slate-800">{conversionRate}%</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                        <Award size={26} />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Produk Teratas</p>
                        <p className="text-lg font-bold text-slate-800 truncate" title={topProduct?.label || '-'}>
                            {topProduct?.label || '-'}
                        </p>
                        {topProduct && (
                            <p className="text-xs text-amber-600 font-bold">{topProduct.totalVotes} Suara</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Daily Trend Chart (Analitik Per Tanggal) */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 font-judul flex items-center gap-2">
                            <BarChart2 className="text-primary-600" size={20} />
                            Analitik Suara Per Tanggal
                        </h3>
                        <p className="text-xs text-slate-400">Tren jumlah pemilih yang masuk setiap harinya dalam rentang tanggal yang dipilih.</p>
                    </div>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                        {dailyStats.length} Hari Terdaftar
                    </span>
                </div>

                {dailyStats.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm font-medium italic">
                        Belum ada data suara dalam rentang tanggal ini.
                    </div>
                ) : (
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0f4d39" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#0f4d39" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={12} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                                    formatter={(value: any) => [`${value} Suara`, "Total"]}
                                    labelFormatter={(label) => `Tanggal: ${label}`}
                                />
                                <Area type="monotone" dataKey="totalVotes" stroke="#0f4d39" strokeWidth={3} fillOpacity={1} fill="url(#colorVotes)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Segment Filter & Grouping Section */}
            <div className="space-y-6">
                {/* Section Title & Filter Tabs */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 font-judul flex items-center gap-2">
                            <Layers className="text-primary-600" size={22} />
                            Grouping Analitik: Form Info x Produk
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Lihat distribusi pilihan produk berdasarkan segmen Form Info responden.
                        </p>
                    </div>

                    {/* Filter Segment Tabs */}
                    {poll.infoQuestion && infoOptions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-full md:w-auto">
                            <button
                                onClick={() => setSelectedInfoFilter("ALL")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    selectedInfoFilter === "ALL"
                                        ? "bg-white text-primary-700 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Semua ({totalSubmissions})
                            </button>

                            {infoOptions.map((opt: any, idx: number) => {
                                const count = submissions.filter((s) => s.answers[poll.infoQuestion.id]?.optionId === opt.id).length;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => setSelectedInfoFilter(opt.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            selectedInfoFilter === opt.id
                                                ? "bg-white text-primary-700 shadow-sm"
                                                : "text-slate-500 hover:text-slate-800"
                                        }`}
                                    >
                                        <span
                                            className="w-2.5 h-2.5 rounded-full inline-block"
                                            style={{ backgroundColor: INFO_COLORS[idx % INFO_COLORS.length] }}
                                        />
                                        {opt.label} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Visual Product Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dynamicProducts.map((prod: any, pIdx: number) => {
                        const totalProdVotes = prod.totalVotes;
                        const pctOfTotal = filteredTotal > 0 ? Math.round((totalProdVotes / filteredTotal) * 100) : 0;

                        return (
                            <div
                                key={prod.id}
                                className={`bg-white rounded-3xl p-6 border transition-all ${
                                    pIdx === 0 ? "border-primary-200 ring-2 ring-primary-50 shadow-md" : "border-slate-100 shadow-sm"
                                } flex flex-col justify-between`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 relative overflow-hidden flex-shrink-0 border border-slate-100">
                                                {prod.imageUrl ? (
                                                    <Image src={prod.imageUrl} alt={prod.label} fill className="object-cover" unoptimized />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <ShoppingBag size={24} />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-base leading-tight">{prod.label}</h4>
                                                <span className="text-xs text-slate-400 font-semibold">Kategori: {prod.categoryLabel}</span>
                                            </div>
                                        </div>
                                        {pIdx === 0 && (
                                            <span className="p-1.5 bg-amber-400 text-white rounded-full shadow-md">
                                                <Award size={16} />
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-baseline justify-between mb-2">
                                        <span className="text-2xl font-bold text-slate-800">{totalProdVotes} <span className="text-xs font-semibold text-slate-400">Suara</span></span>
                                        <span className="text-sm font-bold text-primary-700">{pctOfTotal}% Dari Total</span>
                                    </div>

                                    {/* Overall Bar */}
                                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mb-5">
                                        <div className="h-full bg-primary-600 rounded-full transition-all duration-700" style={{ width: `${pctOfTotal}%` }} />
                                    </div>

                                    {/* Breakdown per Form Info */}
                                    {infoOptions.length > 0 && (
                                        <div className="space-y-3 pt-3 border-t border-slate-50">
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rincian Form Info</p>
                                            {infoOptions.map((infoOpt: any, iIdx: number) => {
                                                const infoCount = prod.byInfo[infoOpt.id] || 0;
                                                const infoPct = totalProdVotes > 0 ? Math.round((infoCount / totalProdVotes) * 100) : 0;
                                                const color = INFO_COLORS[iIdx % INFO_COLORS.length];

                                                return (
                                                    <div key={infoOpt.id} className="space-y-1">
                                                        <div className="flex justify-between text-xs font-semibold">
                                                            <span className="text-slate-600 flex items-center gap-1.5">
                                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                                                {infoOpt.label}
                                                            </span>
                                                            <span className="text-slate-700 font-bold">{infoCount} ({infoPct}%)</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-500"
                                                                style={{ width: `${infoPct}%`, backgroundColor: color }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Matrix Table: Form Info x Product */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 font-judul">Tabel Matriks Perbandingan Produk</h3>
                        <p className="text-xs text-slate-400">Rincian data suara terbanyak untuk setiap kombinasi Form Info & Produk.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Produk</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Total Suara</th>
                                {infoOptions.map((infoOpt: any, idx: number) => (
                                    <th key={infoOpt.id} className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center" style={{ color: INFO_COLORS[idx % INFO_COLORS.length] }}>
                                        {infoOpt.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm font-semibold">
                            {dynamicProducts.map((prod: any) => (
                                <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 relative overflow-hidden flex-shrink-0">
                                            {prod.imageUrl ? (
                                                <Image src={prod.imageUrl} alt={prod.label} fill className="object-cover" unoptimized />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <ShoppingBag size={14} />
                                                </div>
                                            )}
                                        </div>
                                        {prod.label}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{prod.categoryLabel}</td>
                                    <td className="px-6 py-4 text-center font-bold text-slate-800">
                                        <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full font-bold">
                                            {prod.totalVotes}
                                        </span>
                                    </td>
                                    {infoOptions.map((infoOpt: any) => {
                                        const count = prod.byInfo[infoOpt.id] || 0;
                                        const pct = prod.totalVotes > 0 ? Math.round((count / prod.totalVotes) * 100) : 0;
                                        return (
                                            <td key={infoOpt.id} className="px-6 py-4 text-center text-slate-700">
                                                <span className="font-bold">{count}</span>
                                                <span className="text-xs text-slate-400 ml-1 font-normal">({pct}%)</span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Submissions Log */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 font-judul">Log Responden Terbaru</h3>
                        <p className="text-xs text-slate-400">Daftar masukan polling dari pemilih terbaru.</p>
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Total {filteredSubmissions.length} Responden
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Waktu Submit</th>
                                {poll.infoQuestion && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{poll.infoQuestion.label}</th>}
                                {poll.categoryQuestion && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{poll.categoryQuestion.label}</th>}
                                {poll.productQuestion && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{poll.productQuestion.label}</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredSubmissions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">Belum ada data responden.</td>
                                </tr>
                            ) : (
                                filteredSubmissions.slice(0, 50).map((sub: any) => {
                                    const infoAns = poll.infoQuestion ? sub.answers[poll.infoQuestion.id] : null;
                                    const catAns = poll.categoryQuestion ? sub.answers[poll.categoryQuestion.id] : null;
                                    const prodAns = poll.productQuestion ? sub.answers[poll.productQuestion.id] : null;

                                    return (
                                        <tr key={sub.submissionId} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-slate-500 font-semibold whitespace-nowrap">
                                                {new Date(sub.createdAt).toLocaleString('id-ID', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            {poll.infoQuestion && (
                                                <td className="px-6 py-4 font-bold text-slate-700">
                                                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                                                        {infoAns?.optionLabel || "-"}
                                                    </span>
                                                </td>
                                            )}
                                            {poll.categoryQuestion && (
                                                <td className="px-6 py-4 font-bold text-slate-700">
                                                    {catAns?.optionLabel || "-"}
                                                </td>
                                            )}
                                            {poll.productQuestion && (
                                                <td className="px-6 py-4 font-bold text-primary-700">
                                                    {prodAns?.optionLabel || "-"}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
