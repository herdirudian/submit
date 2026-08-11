"use client";

import React, { useState, useEffect } from "react";
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie
} from "recharts";
import { 
    Clock, Users, MessageSquare, TrendingUp, 
    Calendar, ArrowLeft, RefreshCw, Award
} from "lucide-react";
import Link from "next/link";
import { getWaAnalytics } from "@/actions/analytics";
import { toast } from "sonner";

export default function WhatsAppAnalytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await getWaAnalytics(days);
            setData(result);
        } catch (error: any) {
            toast.error(error.message || "Gagal memuat analitik");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [days]);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin text-primary-500" size={40} />
                    <p className="text-slate-500 font-medium">Memuat data analitik...</p>
                </div>
            </div>
        );
    }

    const dailyChatData = data?.dailyChats.labels.map((label: string, index: number) => ({
        name: label,
        chats: data.dailyChats.data[index]
    }));

    const COLORS = ['#0f4d39', '#1a7a5c', '#2fb38a', '#64d4b3', '#a7edd9'];

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link 
                        href="/whatsapp" 
                        className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-primary-600 transition-all border border-transparent hover:border-slate-100"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Analitik Performa CS</h1>
                        <p className="text-slate-500 text-sm">Pantau efisiensi dan interaksi WhatsApp CRM</p>
                    </div>
                </div>

                <div className="flex items-center bg-white rounded-2xl border border-slate-100 p-1 shadow-sm">
                    {[7, 14, 30].map((d) => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                days === d 
                                ? "bg-primary-50 text-primary-700" 
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            {d} Hari
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Chat Baru</p>
                        <h3 className="text-2xl font-black text-slate-800">
                            {data?.dailyChats.data.reduce((a: number, b: number) => a + b, 0)}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Rata-rata Respon</p>
                        <h3 className="text-2xl font-black text-slate-800">
                            {data?.agents.length > 0 
                                ? Math.round(data.agents.reduce((a: any, b: any) => a + b.avgResponseTime, 0) / data.agents.length)
                                : 0
                            } <span className="text-sm font-bold text-slate-400">Menit</span>
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Agen Aktif</p>
                        <h3 className="text-2xl font-black text-slate-800">{data?.agents.length}</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Chats Chart */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp size={18} className="text-primary-500" />
                        <h3 className="font-bold text-slate-800">Tren Chat Masuk</h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyChatData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    stroke="#94a3b8" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="chats" 
                                    stroke="#0f4d39" 
                                    strokeWidth={4} 
                                    dot={{ fill: '#0f4d39', strokeWidth: 2, r: 4 }} 
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Agent Performance Table */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Award size={18} className="text-primary-500" />
                        <h3 className="font-bold text-slate-800">Efisiensi Agen</h3>
                    </div>
                    <div className="space-y-4">
                        {data?.agents.map((agent: any, idx: number) => (
                            <div key={agent.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{agent.name}</p>
                                        <p className="text-[10px] text-slate-500">{agent.totalResponses} Respon Terkirim</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-800">{agent.avgResponseTime}m</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Avg Respon</p>
                                </div>
                            </div>
                        ))}
                        {data?.agents.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-slate-400 text-sm italic">Belum ada data performa agen</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Most Used Templates */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                        <Calendar size={18} className="text-primary-500" />
                        <h3 className="font-bold text-slate-800">Template Terpopuler</h3>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.templates} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    stroke="#94a3b8" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    width={100}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                                    {data?.templates.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Insight */}
                <div className="bg-primary-900 p-8 rounded-3xl shadow-xl shadow-primary-900/20 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold mb-4">Insight Performa</h3>
                        <p className="text-primary-100 text-sm leading-relaxed mb-6">
                            Berdasarkan data {days} hari terakhir, tingkat respon agen terbaik adalah 
                            <span className="font-bold text-white"> {data?.agents[0]?.name || "n/a"}</span> dengan rata-rata 
                            <span className="font-bold text-white"> {data?.agents[0]?.avgResponseTime || 0} menit</span>.
                        </p>
                        <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-primary-300 mb-2">Rekomendasi</p>
                            <p className="text-xs text-primary-50 italic">
                                "Gunakan template '{data?.templates[0]?.name || "..."}' lebih sering untuk mempercepat respon pada pertanyaan umum."
                            </p>
                        </div>
                    </div>
                    {/* Decorative circles */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary-800 rounded-full opacity-50 blur-2xl"></div>
                    <div className="absolute top-10 right-10 w-20 h-20 bg-primary-700 rounded-full opacity-30 blur-xl"></div>
                </div>
            </div>
        </div>
    );
}
