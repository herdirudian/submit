"use client";

import React, { useState, useEffect } from "react";
import { 
    Mail, Send, Users, BarChart3, TrendingUp, 
    MousePointer2, AlertCircle, UserMinus,
    Calendar, ArrowRight, Loader2, RefreshCcw
} from "lucide-react";
import { getBlastDashboardStats } from "@/actions/blast-dashboard";
import Link from "next/link";
import { formatDistance } from "date-fns";

import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';

export default function BlastDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        setLoading(true);
        try {
            const data = await getBlastDashboardStats();
            setStats(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="font-medium">Memuat data dashboard...</p>
            </div>
        );
    }

    const statCards = [
        { 
            label: "Total Email Terkirim", 
            value: stats.totalSent.toLocaleString(), 
            icon: Send, 
            color: "bg-blue-50 text-blue-600",
            sub: "Semua campaign"
        },
        { 
            label: "Open Rate", 
            value: `${stats.openRate.toFixed(1)}%`, 
            icon: Mail, 
            color: "bg-green-50 text-green-600",
            sub: `${stats.openRate > 20 ? 'Performa bagus' : 'Perlu ditingkatkan'}`
        },
        { 
            label: "Click Rate", 
            value: `${stats.clickRate.toFixed(1)}%`, 
            icon: MousePointer2, 
            color: "bg-primary-50 text-primary-600",
            sub: "Engagemen link"
        },
        { 
            label: "Bounce Rate", 
            value: `${stats.bounceRate.toFixed(1)}%`, 
            icon: AlertCircle, 
            color: "bg-red-50 text-red-600",
            sub: "Email tidak sampai"
        },
        { 
            label: "Unsubscribe", 
            value: "0", 
            icon: UserMinus, 
            color: "bg-slate-50 text-slate-600",
            sub: "Berhenti berlangganan"
        },
        { 
            label: "Campaign Aktif", 
            value: stats.activeCampaigns, 
            icon: TrendingUp, 
            color: "bg-orange-50 text-orange-600",
            sub: "Sedang berjalan"
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Blast Dashboard</h1>
                    <p className="text-slate-500 mt-1">Ikhtisar performa campaign email Anda.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={loadStats}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-primary-600 transition-all shadow-sm"
                        title="Refresh data"
                    >
                        <RefreshCcw size={20} />
                    </button>
                    <Link 
                        href="/campaigns/new"
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-sm"
                    >
                        <PlusIcon size={18} />
                        Buat Campaign
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {statCards.map((card, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">{card.label}</p>
                            <h3 className="text-2xl font-bold text-slate-800">{card.value}</h3>
                            <p className="text-xs text-slate-400 mt-2 font-medium">{card.sub}</p>
                        </div>
                        <div className={`p-3 rounded-xl ${card.color}`}>
                            <card.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Performance Charts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="font-bold text-slate-800">Statistik Performa Campaign</h3>
                        <p className="text-xs text-slate-400 mt-1">Data pengiriman email 7 hari terakhir</p>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                            { date: 'May 3', sent: 400, opened: 240 },
                            { date: 'May 4', sent: 300, opened: 139 },
                            { date: 'May 5', sent: 200, opened: 980 },
                            { date: 'May 6', sent: 278, opened: 390 },
                            { date: 'May 7', sent: 189, opened: 480 },
                            { date: 'May 8', sent: 239, opened: 380 },
                            { date: 'May 9', sent: 349, opened: 430 },
                        ]}>
                            <defs>
                                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0f4d39" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#0f4d39" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fill: '#94a3b8' }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fill: '#94a3b8' }}
                            />
                            <ChartTooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="sent" 
                                stroke="#0f4d39" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorSent)" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="opened" 
                                stroke="#22c55e" 
                                strokeWidth={3}
                                fill="transparent"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">Aktivitas Terbaru</h3>
                        <Link href="/campaigns" className="text-sm font-bold text-primary-600 hover:underline">
                            Lihat semua
                        </Link>
                    </div>
                    <div className="flex-1 p-6">
                        {stats.recentLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400">
                                <Mail size={40} className="mb-2 opacity-20" />
                                <p className="text-sm">Belum ada aktivitas pengiriman.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {stats.recentLogs.map((log: any, i: number) => (
                                    <div key={i} className="flex items-start gap-4">
                                        <div className={`mt-1 p-2 rounded-lg shrink-0 ${
                                            log.status === 'SENT' ? 'bg-blue-50 text-blue-600' :
                                            log.status === 'DELIVERED' ? 'bg-green-50 text-green-600' :
                                            'bg-red-50 text-red-600'
                                        }`}>
                                            <Mail size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate">
                                                Email terkirim ke <span className="font-bold">{log.contact.email}</span>
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Campaign: <span className="font-medium">{log.campaign.name}</span>
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                                <Calendar size={10} />
                                                {formatDistance(new Date(log.createdAt), new Date(), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions / Getting Started */}
                <div className="space-y-6">
                    <div className="bg-slate-800 text-white p-8 rounded-2xl shadow-sm relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-2">Siap untuk kirim blast?</h3>
                            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                                Mulai dengan mengimpor kontak pelanggan Anda, pilih template yang menarik, dan kirim campaign pertama Anda hari ini.
                            </p>
                            <Link 
                                href="/contacts"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all"
                            >
                                Import Kontak Sekarang
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                        <div className="absolute top-[-20px] right-[-20px] opacity-10">
                            <Mail size={150} />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4">Tips Campaign</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                                <p className="text-xs text-slate-500 leading-relaxed">Gunakan personalisasi seperti <code className="bg-slate-100 px-1 rounded text-primary-700">{"{{name}}"}</code> untuk meningkatkan open rate.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                                <p className="text-xs text-slate-500 leading-relaxed">Pastikan list kontak Anda sudah divalidasi untuk menghindari bounce yang tinggi.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PlusIcon({ size }: { size: number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
