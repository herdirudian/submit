"use client";

import React, { useState, useEffect } from "react";
import { 
    Plus, Search, Edit2, Trash2, MessageSquare, 
    Hash, Save, X, Loader2, AlertCircle
} from "lucide-react";
import { 
    getWaQuickReplies, createWaQuickReply, 
    updateWaQuickReply, deleteWaQuickReply 
} from "@/actions/whatsapp";
import { toast } from "sonner";

export default function QuickRepliesPage() {
    const [replies, setReplies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReply, setEditingReply] = useState<any>(null);
    const [formData, setFormData] = useState({ shortcut: "/", content: "" });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadReplies();
    }, []);

    async function loadReplies() {
        setLoading(true);
        try {
            const data = await getWaQuickReplies();
            setReplies(data);
        } catch (error) {
            toast.error("Gagal memuat balasan cepat");
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingReply) {
                await updateWaQuickReply(editingReply.id, formData);
                toast.success("Balasan cepat berhasil diperbarui");
            } else {
                await createWaQuickReply(formData);
                toast.success("Balasan cepat berhasil ditambahkan");
            }
            setIsModalOpen(false);
            setEditingReply(null);
            setFormData({ shortcut: "/", content: "" });
            loadReplies();
        } catch (error: any) {
            toast.error(error.message || "Gagal menyimpan balasan cepat");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus balasan cepat ini?")) return;
        try {
            await deleteWaQuickReply(id);
            toast.success("Balasan cepat berhasil dihapus");
            loadReplies();
        } catch (error) {
            toast.error("Gagal menghapus balasan cepat");
        }
    };

    const openEditModal = (reply: any) => {
        setEditingReply(reply);
        setFormData({ shortcut: reply.shortcut, content: reply.content });
        setIsModalOpen(true);
    };

    const filteredReplies = replies.filter(r => 
        r.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 font-judul tracking-wide">Manajemen Balasan Cepat</h1>
                    <p className="text-slate-500 mt-1 font-subjudul">Kelola shortcut balasan (canned responses) untuk agen CS.</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingReply(null);
                        setFormData({ shortcut: "/", content: "" });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-100"
                >
                    <Plus size={20} />
                    Tambah Shortcut
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Cari shortcut atau isi balasan..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Shortcut</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Isi Balasan</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-20 text-center text-slate-400">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : filteredReplies.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-20 text-center text-slate-400">
                                        <AlertCircle className="mx-auto mb-2" size={32} />
                                        Belum ada balasan cepat yang dibuat.
                                    </td>
                                </tr>
                            ) : (
                                filteredReplies.map((reply) => (
                                    <tr key={reply.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-3 py-1 bg-primary-50 text-primary-700 rounded-lg font-bold text-sm ring-1 ring-primary-100">
                                                {reply.shortcut}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-600 line-clamp-2 max-w-xl font-medium">
                                                {reply.content}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => openEditModal(reply)}
                                                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(reply.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Tambah/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingReply ? "Edit Balasan Cepat" : "Tambah Balasan Cepat"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Hash size={16} className="text-primary-600" />
                                    Shortcut
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Contoh: /harga"
                                    value={formData.shortcut}
                                    onChange={e => setFormData({ ...formData, shortcut: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all font-medium"
                                />
                                <p className="text-[10px] text-slate-400 font-medium">Mulai dengan karakter '/' (contoh: /jam_operasional)</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <MessageSquare size={16} className="text-primary-600" />
                                    Isi Balasan
                                </label>
                                <textarea 
                                    required
                                    rows={5}
                                    placeholder="Tuliskan teks jawaban otomatis..."
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all font-medium resize-none"
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-100"
                                >
                                    {submitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
