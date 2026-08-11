"use client";

import React, { useState, useEffect } from "react";
import { 
    FileText, RefreshCw, Search, CheckCircle2, 
    Clock, AlertCircle, MessageSquare, ExternalLink,
    Filter, Tag, Globe
} from "lucide-react";
import { getWaTemplates, syncWaTemplatesAction } from "@/actions/whatsapp";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function WaTemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");

    useEffect(() => {
        loadTemplates();
    }, []);

    async function loadTemplates() {
        setLoading(true);
        try {
            const data = await getWaTemplates();
            setTemplates(data);
        } catch (error) {
            console.error(error);
            toast.error("Gagal mengambil data template");
        } finally {
            setLoading(false);
        }
    }

    const handleSync = async () => {
        setSyncing(true);
        const toastId = toast.loading("Menyinkronkan template dari Meta...");
        try {
            const result = await syncWaTemplatesAction();
            if (result.success) {
                toast.success(`${result.count} Template berhasil disinkronkan!`, { id: toastId });
                loadTemplates();
            } else {
                toast.error(result.error || "Gagal sinkronisasi template", { id: toastId });
            }
        } catch (error: any) {
            toast.error(error.message || "Gagal sinkronisasi template", { id: toastId });
        } finally {
            setSyncing(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toUpperCase()) {
            case "APPROVED":
                return <CheckCircle2 size={16} className="text-emerald-500" />;
            case "PENDING":
                return <Clock size={16} className="text-amber-500" />;
            case "REJECTED":
                return <AlertCircle size={16} className="text-red-500" />;
            default:
                return <Clock size={16} className="text-slate-400" />;
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status.toUpperCase()) {
            case "APPROVED":
                return "bg-emerald-50 text-emerald-700 border-emerald-100";
            case "PENDING":
                return "bg-amber-50 text-amber-700 border-amber-100";
            case "REJECTED":
                return "bg-red-50 text-red-700 border-red-100";
            default:
                return "bg-slate-50 text-slate-700 border-slate-100";
        }
    };

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             t.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === "ALL" || t.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = Array.from(new Set(templates.map(t => t.category))).filter(Boolean);

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Template WhatsApp</h1>
                    <p className="text-slate-500 mt-1">Kelola dan pantau status template pesan resmi dari Meta</p>
                </div>
                <button 
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 disabled:opacity-50"
                >
                    <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
                    {syncing ? "Menyinkronkan..." : "Sinkronisasi Template"}
                </button>
            </div>

            {/* Filters Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Cari nama template atau isi pesan..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-50 transition-all shadow-sm"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-50 transition-all shadow-sm appearance-none"
                    >
                        <option value="ALL">Semua Kategori</option>
                        {categories.map((cat: any) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 bg-white rounded-3xl border border-slate-100 animate-pulse"></div>
                    ))}
                </div>
            ) : filteredTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map((template) => (
                        <div key={template.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden">
                            {/* Card Header */}
                            <div className="p-5 border-b border-slate-50 flex items-start justify-between bg-slate-50/30">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-slate-800 group-hover:text-primary-600 transition-colors truncate w-40" title={template.name}>
                                        {template.name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <Tag size={10} />
                                            {template.category}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <Globe size={10} />
                                            {template.language}
                                        </span>
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1.5 ${getStatusStyles(template.status)}`}>
                                    {getStatusIcon(template.status)}
                                    {template.status}
                                </div>
                            </div>

                            {/* Card Body - Content Preview */}
                            <div className="p-6 flex-1 bg-white relative">
                                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-6 font-medium">
                                    {template.content || "Tidak ada konten teks"}
                                </div>
                                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent"></div>
                            </div>

                            {/* Card Footer */}
                            <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                                <span className="text-[10px] text-slate-400 font-medium italic">
                                    Diperbarui: {format(new Date(template.updatedAt), "d MMM yyyy", { locale: id })}
                                </span>
                                <div className="flex gap-2">
                                    <button 
                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-white rounded-lg transition-all"
                                        title="Preview Lengkap"
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-100 p-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-50 text-slate-300 flex items-center justify-center rounded-3xl mx-auto">
                        <MessageSquare size={40} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Tidak ada template ditemukan</h3>
                        <p className="text-slate-500">Coba ubah filter atau sinkronisasi ulang dari Meta Developer Console.</p>
                    </div>
                    <button 
                        onClick={handleSync}
                        className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all mt-4"
                    >
                        Sinkronisasi Sekarang
                    </button>
                </div>
            )}
        </div>
    );
}
