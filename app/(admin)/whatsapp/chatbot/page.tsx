"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    MessageSquare, Plus, Trash2, Edit2, Save, X, 
    ArrowLeft, Bot, Power, Info, GripVertical, Check, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { getWaFaqs, createWaFaq, updateWaFaq, deleteWaFaq } from "@/actions/wa-chatbot";
import { getSettingsSnapshot, updateAppSettings } from "@/actions/settings";
import { toast } from "sonner";

export default function WaChatbotPage() {
    const [faqs, setFaqs] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    
    // Form state
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingFaq, setEditingFaq] = useState<any>(null);
    const [formData, setFormData] = useState({
        keyword: "",
        question: "",
        answer: "",
        order: 0
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [faqData, settingsData] = await Promise.all([
                getWaFaqs(),
                getSettingsSnapshot()
            ]);
            setFaqs(faqData);
            setSettings(settingsData.appSettings);
        } catch (error: any) {
            toast.error(error.message || "Gagal memuat data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleChatbot = async () => {
        if (!settings) return;
        const newVal = !settings.waChatbotEnabled;
        setIsSavingSettings(true);
        try {
            await updateAppSettings({ waChatbotEnabled: newVal });
            setSettings({ ...settings, waChatbotEnabled: newVal });
            toast.success(`Chatbot FAQ ${newVal ? 'diaktifkan' : 'dinonaktifkan'}`);
        } catch (error: any) {
            toast.error(error.message || "Gagal memperbarui pengaturan");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleSaveWelcomeMsg = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingSettings(true);
        try {
            await updateAppSettings({ waChatbotWelcomeMsg: settings.waChatbotWelcomeMsg });
            toast.success("Pesan sambutan chatbot diperbarui");
        } catch (error: any) {
            toast.error(error.message || "Gagal memperbarui pesan");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleSubmitFaq = async (e: React.FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading(editingFaq ? "Memperbarui FAQ..." : "Menambahkan FAQ...");
        try {
            if (editingFaq) {
                await updateWaFaq(editingFaq.id, formData);
                toast.success("FAQ berhasil diperbarui", { id: toastId });
            } else {
                await createWaFaq(formData);
                toast.success("FAQ berhasil ditambahkan", { id: toastId });
            }
            setShowAddModal(false);
            setEditingFaq(null);
            setFormData({ keyword: "", question: "", answer: "", order: 0 });
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Terjadi kesalahan", { id: toastId });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus FAQ ini?")) return;
        const toastId = toast.loading("Menghapus FAQ...");
        try {
            await deleteWaFaq(id);
            toast.success("FAQ dihapus", { id: toastId });
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Gagal menghapus FAQ", { id: toastId });
        }
    };

    const openEdit = (faq: any) => {
        setEditingFaq(faq);
        setFormData({
            keyword: faq.keyword,
            question: faq.question,
            answer: faq.answer,
            order: faq.order
        });
        setShowAddModal(true);
    };

    if (loading && !settings) {
        return <div className="p-8 text-center text-slate-500">Memuat chatbot...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/whatsapp" className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-primary-600 transition-all border border-transparent hover:border-slate-100">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Chatbot FAQ WhatsApp</h1>
                        <p className="text-slate-500 text-sm">Otomatisasi jawaban untuk pertanyaan umum tamu</p>
                    </div>
                </div>

                <button 
                    onClick={handleToggleChatbot}
                    disabled={isSavingSettings}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all shadow-sm ${
                        settings?.waChatbotEnabled 
                        ? "bg-green-50 text-green-700 border border-green-100" 
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                >
                    <Power size={18} />
                    {settings?.waChatbotEnabled ? "Chatbot Aktif" : "Chatbot Mati"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Settings & Welcome Message */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-primary-600">
                            <Bot size={20} />
                            <h3 className="font-bold">Konfigurasi Chatbot</h3>
                        </div>

                        <form onSubmit={handleSaveWelcomeMsg} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pesan Sambutan / Menu</label>
                                <textarea 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[200px] resize-none"
                                    placeholder="Halo! Pilih menu di bawah ini..."
                                    value={settings?.waChatbotWelcomeMsg || ""}
                                    onChange={(e) => setSettings({ ...settings, waChatbotWelcomeMsg: e.target.value })}
                                />
                                <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                    <Info size={12} />
                                    Daftar FAQ akan otomatis ditambahkan di bawah pesan ini.
                                </p>
                            </div>

                            <button 
                                type="submit"
                                disabled={isSavingSettings}
                                className="w-full py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                Simpan Pesan
                            </button>
                        </form>
                    </div>

                    <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 text-amber-900">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertCircle size={18} />
                            <h4 className="font-bold text-sm">Tips Chatbot</h4>
                        </div>
                        <ul className="text-xs space-y-2 opacity-80 leading-relaxed">
                            <li>• Gunakan angka (1, 2, 3) sebagai keyword agar mudah diketik tamu.</li>
                            <li>• Pastikan pesan sambutan jelas menginstruksikan tamu untuk memilih.</li>
                            <li>• Chatbot hanya merespon jika input tamu sama persis dengan keyword.</li>
                        </ul>
                    </div>
                </div>

                {/* Right Column: FAQ Items */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">Daftar Menu FAQ</h3>
                            <button 
                                onClick={() => { setEditingFaq(null); setFormData({ keyword: "", question: "", answer: "", order: faqs.length }); setShowAddModal(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20"
                            >
                                <Plus size={16} />
                                Tambah Menu
                            </button>
                        </div>

                        <div className="divide-y divide-slate-50">
                            {faqs.length === 0 ? (
                                <div className="p-20 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <MessageSquare size={32} />
                                    </div>
                                    <p className="text-slate-400 text-sm">Belum ada menu FAQ yang dibuat.</p>
                                </div>
                            ) : (
                                faqs.map((faq) => (
                                    <div key={faq.id} className="p-6 hover:bg-slate-50 transition-all group">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-black text-sm shrink-0">
                                                    {faq.keyword}
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="font-bold text-slate-800">{faq.question}</h4>
                                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                        {faq.answer}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button 
                                                    onClick={() => openEdit(faq)}
                                                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-white rounded-lg transition-all"
                                                    title="Edit FAQ"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(faq.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                                                    title="Hapus FAQ"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingFaq ? "Edit Menu FAQ" : "Tambah Menu FAQ Baru"}
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitFaq} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Keyword (Input Tamu)</label>
                                    <input 
                                        required
                                        type="text"
                                        placeholder="Misal: 1"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        value={formData.keyword}
                                        onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Urutan Menu</label>
                                    <input 
                                        type="number"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        value={formData.order}
                                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Judul Menu (Label)</label>
                                <input 
                                    required
                                    type="text"
                                    placeholder="Misal: Harga Tiket Masuk"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    value={formData.question}
                                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Jawaban Otomatis</label>
                                <textarea 
                                    required
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[150px] resize-none"
                                    placeholder="Tuliskan jawaban lengkap yang akan diterima tamu..."
                                    value={formData.answer}
                                    onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 border border-slate-200 text-slate-500 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20"
                                >
                                    {editingFaq ? "Simpan Perubahan" : "Simpan Menu"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
