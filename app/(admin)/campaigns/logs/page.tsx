"use client";

import React, { useState, useEffect } from "react";
import { 
    History, Mail, CheckCircle, XCircle, 
    Calendar, User, Megaphone, Loader2,
    RefreshCcw, AlertTriangle, Search, Filter
} from "lucide-react";
import { getEmailLogs } from "@/actions/campaign";
import { format } from "date-fns";
import Link from "next/link";

export default function EmailLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("");
    const pageSize = 50;

    useEffect(() => {
        loadLogs();
    }, [page, status]);

    async function loadLogs() {
        setLoading(true);
        try {
            const data = await getEmailLogs({ page, pageSize, status });
            setLogs(data.logs);
            setTotal(data.total);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <History size={28} className="text-primary-600" />
                        Histori Pengiriman Email
                    </h1>
                    <p className="text-slate-500 text-sm">Pantau status pengiriman email kampanye Anda.</p>
                </div>
                <button 
                    onClick={() => { setPage(1); loadLogs(); }}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-primary-600 transition-all shadow-sm"
                >
                    <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex gap-3 w-full md:w-auto">
                    <select 
                        value={status}
                        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                        className="px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500 bg-white text-sm"
                    >
                        <option value="">Semua Status</option>
                        <option value="SENT">Terkirim (SENT)</option>
                        <option value="FAILED">Gagal (FAILED)</option>
                        <option value="DELIVERED">Sampai (DELIVERED)</option>
                    </select>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                    Menampilkan {logs.length} dari {total} log pengiriman
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Penerima</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Campaign & Subjek</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Waktu</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center">
                                        <Loader2 size={24} className="animate-spin inline-block text-primary-600 mb-2" />
                                        <p className="text-sm text-slate-400">Memuat histori...</p>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center">
                                        <Mail size={40} className="mx-auto text-slate-200 mb-2" />
                                        <p className="text-sm text-slate-400">Belum ada histori pengiriman.</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {log.status === 'SENT' || log.status === 'DELIVERED' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider w-fit">
                                                        <CheckCircle size={10} /> {log.status}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-wider w-fit">
                                                        <XCircle size={10} /> {log.status}
                                                    </span>
                                                )}
                                                {log.errorMessage && (
                                                    <span className="text-[10px] text-red-500 font-medium max-w-[150px] truncate" title={log.errorMessage}>
                                                        Error: {log.errorMessage}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">{log.contact.name || 'No Name'}</span>
                                                <span className="text-xs text-slate-400">{log.contact.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-700">{log.campaign.name}</span>
                                                <span className="text-xs text-slate-400 truncate max-w-[250px]">{log.campaign.subject}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Calendar size={14} className="text-slate-400" />
                                                {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm")}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-30 hover:text-primary-600 transition-colors"
                        >
                            Sebelumnya
                        </button>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Halaman {page} dari {totalPages}
                        </div>
                        <button 
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-30 hover:text-primary-600 transition-colors"
                        >
                            Berikutnya
                        </button>
                    </div>
                )}
            </div>

            {/* Help Note */}
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 items-start">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                    <p className="font-bold mb-1">Email Masih Belum Diterima?</p>
                    <ul className="list-disc ml-4 space-y-1">
                        <li>Jika status <strong>SENT</strong> tapi email tidak masuk, cek folder <strong>Spam/Junk</strong>.</li>
                        <li>Pastikan konfigurasi SMTP di file <code>.env</code> sudah benar (Host, Port, User, Pass).</li>
                        <li>Jika status <strong>FAILED</strong>, lihat pesan error di atas untuk mengetahui penyebab penolakan dari server email (SMTP).</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
