"use client";

import React, { useState, useEffect } from "react";
import { 
    Megaphone, Send, Save, ArrowLeft, 
    Layout, Users, Type, Eye, Loader2,
    CheckCircle, AlertTriangle, Info, Upload, X, Image as ImageIcon
} from "lucide-react";
import { createCampaign, renderCampaignPreview } from "@/actions/campaign";
import { getContactLists } from "@/actions/contact";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NewCampaignPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploadingHeader, setUploadingHeader] = useState(false);
    const [uploadingFooter, setUploadingFooter] = useState(false);
    const [fetchingLists, setFetchingLists] = useState(true);
    const [contactLists, setContactLists] = useState<any[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [previewHtml, setPreviewHtml] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: "",
        subject: "",
        previewText: "",
        content: "",
        contactListId: "",
        headerImageUrl: "",
        footerImageUrl: "",
        ctaText: "",
        ctaUrl: ""
    });

    useEffect(() => {
        loadContactLists();
    }, []);

    const handleUpload = async (file: File) => {
        const data = new FormData();
        data.append("file", file);

        const res = await fetch("/api/upload", { method: "POST", body: data });
        const result = await res.json();
        if (!result?.success || !result?.url) {
            throw new Error("Upload failed");
        }
        
        return String(result.url);
    };

    async function loadContactLists() {
        try {
            const data = await getContactLists();
            setContactLists(data);
            if (data.length > 0) {
                setFormData(prev => ({ ...prev, contactListId: data[0].id }));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setFetchingLists(false);
        }
    }

    const handlePreview = async () => {
        if (!formData.content) {
            toast.error("Isi email masih kosong");
            return;
        }
        setPreviewLoading(true);
        setShowPreview(true);
        try {
            const html = await renderCampaignPreview({
                content: formData.content,
                headerImageUrl: formData.headerImageUrl,
                footerImageUrl: formData.footerImageUrl,
                ctaText: formData.ctaText,
                ctaUrl: formData.ctaUrl
            });
            setPreviewHtml(html);
        } catch (error) {
            console.error(error);
            toast.error("Gagal merender preview");
            setShowPreview(false);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createCampaign(formData);
            router.push("/campaigns");
        } catch (error: any) {
            console.error(error);
            alert("Gagal membuat campaign: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link href="/campaigns" className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-primary-600 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Buat Campaign Baru</h1>
                        <p className="text-slate-500 text-sm">Rancang pesan blast email Anda.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Editor */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Type size={16} className="text-primary-600" />
                                    Subjek Email
                                </label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="Contoh: Penawaran Spesial Akhir Bulan!"
                                    value={formData.subject}
                                    onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary-50 focus:border-primary-500 outline-none transition-all font-medium text-slate-800"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Tombol CTA (Optional)</label>
                                    <input 
                                        type="text"
                                        placeholder="Contoh: Pelajari Selengkapnya"
                                        value={formData.ctaText}
                                        onChange={(e) => setFormData(p => ({ ...p, ctaText: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Link Tombol (URL)</label>
                                    <input 
                                        type="text"
                                        placeholder="https://..."
                                        value={formData.ctaUrl}
                                        onChange={(e) => setFormData(p => ({ ...p, ctaUrl: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Preview Text (Optional)</label>
                                <input 
                                    type="text"
                                    placeholder="Teks singkat yang muncul setelah subjek di inbox"
                                    value={formData.previewText}
                                    onChange={(e) => setFormData(p => ({ ...p, previewText: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary-50 focus:border-primary-500 outline-none transition-all text-sm text-slate-600"
                                />
                            </div>
                        </div>

                        <hr className="border-slate-50" />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Layout size={16} className="text-primary-600" />
                                    Isi Email (HTML / Text)
                                </label>
                                <div className="flex gap-2">
                                    <button type="button" className="text-xs font-bold text-primary-600 hover:bg-primary-50 px-2 py-1 rounded transition-colors">
                                        Template
                                    </button>
                                </div>
                            </div>
                            <textarea 
                                required
                                placeholder="Tulis konten email Anda di sini..."
                                value={formData.content}
                                onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
                                className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary-50 focus:border-primary-500 outline-none transition-all min-h-[400px] font-mono text-sm leading-relaxed"
                            />
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-3">
                                <div className="flex gap-3 items-start">
                                    <Info size={18} className="text-primary-600 mt-0.5 shrink-0" />
                                    <div className="text-xs text-slate-500 leading-relaxed">
                                        <p className="font-bold text-slate-700 mb-1">Tips Konten Menarik:</p>
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>Gunakan <code className="bg-white px-1 border border-slate-200 rounded text-primary-700 font-bold">{"{{name}}"}</code> untuk menyapa nama.</li>
                                            <li><strong>Gambar:</strong> Gunakan tag HTML <code className="bg-white px-1 border border-slate-200 rounded text-primary-700">{"<img src='URL_GAMBAR'>"}</code>.</li>
                                            <li><strong>Tombol:</strong> Gunakan class <code className="bg-white px-1 border border-slate-200 rounded text-primary-700">btn</code>, contoh: <br/>
                                                <code className="bg-white px-1 border border-slate-200 rounded text-primary-700">{"<a href='...' class='btn'>Klik Di Sini</a>"}</code>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Settings */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <h3 className="font-bold text-slate-800 border-b border-slate-50 pb-4">Pengaturan Campaign</h3>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Nama Campaign</label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="Internal: Promo Mei 2024"
                                    value={formData.name}
                                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Users size={16} className="text-primary-600" />
                                    Target Penerima (List)
                                </label>
                                {fetchingLists ? (
                                    <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                                        <Loader2 size={14} className="animate-spin" />
                                        Memuat daftar kontak...
                                    </div>
                                ) : (
                                    <select 
                                        required
                                        value={formData.contactListId}
                                        onChange={(e) => setFormData(p => ({ ...p, contactListId: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm bg-white"
                                    >
                                        <option value="">Pilih List Kontak...</option>
                                        {contactLists.map(list => (
                                            <option key={list.id} value={list.id}>{list.name} ({list._count.members} kontak)</option>
                                        ))}
                                    </select>
                                )}
                                <p className="text-[10px] text-slate-400">Pilih segmen audiens yang akan menerima email ini.</p>
                            </div>

                            <hr className="border-slate-50" />

                            {/* Header Image Upload */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                                    <span>Gambar Header</span>
                                    {formData.headerImageUrl && (
                                        <button 
                                            type="button" 
                                            onClick={() => setFormData(p => ({ ...p, headerImageUrl: "" }))}
                                            className="text-xs text-red-500 hover:underline flex items-center gap-1"
                                        >
                                            <X size={12} /> Hapus
                                        </button>
                                    )}
                                </label>
                                
                                {formData.headerImageUrl ? (
                                    <div className="relative aspect-[3/1] rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                                        <img src={formData.headerImageUrl} alt="Header" className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center aspect-[3/1] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-primary-300 transition-all cursor-pointer group">
                                        {uploadingHeader ? (
                                            <Loader2 size={24} className="animate-spin text-primary-600" />
                                        ) : (
                                            <>
                                                <Upload size={24} className="text-slate-400 group-hover:text-primary-600" />
                                                <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Upload Header</span>
                                            </>
                                        )}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={async (e) => {
                                                const f = e.target.files?.[0];
                                                if (!f) return;
                                                setUploadingHeader(true);
                                                try {
                                                    const url = await handleUpload(f);
                                                    setFormData(p => ({ ...p, headerImageUrl: url }));
                                                    toast.success("Header image uploaded");
                                                } catch {
                                                    toast.error("Gagal upload header");
                                                } finally {
                                                    setUploadingHeader(false);
                                                }
                                            }}
                                        />
                                    </label>
                                )}
                                <p className="text-[10px] text-slate-400 italic">Menggantikan logo default di bagian atas email.</p>
                            </div>

                            {/* Footer Image Upload */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                                    <span>Gambar Footer</span>
                                    {formData.footerImageUrl && (
                                        <button 
                                            type="button" 
                                            onClick={() => setFormData(p => ({ ...p, footerImageUrl: "" }))}
                                            className="text-xs text-red-500 hover:underline flex items-center gap-1"
                                        >
                                            <X size={12} /> Hapus
                                        </button>
                                    )}
                                </label>
                                
                                {formData.footerImageUrl ? (
                                    <div className="relative aspect-[3/1] rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                                        <img src={formData.footerImageUrl} alt="Footer" className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center aspect-[3/1] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-primary-300 transition-all cursor-pointer group">
                                        {uploadingFooter ? (
                                            <Loader2 size={24} className="animate-spin text-primary-600" />
                                        ) : (
                                            <>
                                                <Upload size={24} className="text-slate-400 group-hover:text-primary-600" />
                                                <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Upload Footer</span>
                                            </>
                                        )}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={async (e) => {
                                                const f = e.target.files?.[0];
                                                if (!f) return;
                                                setUploadingFooter(true);
                                                try {
                                                    const url = await handleUpload(f);
                                                    setFormData(p => ({ ...p, footerImageUrl: url }));
                                                    toast.success("Footer image uploaded");
                                                } catch {
                                                    toast.error("Gagal upload footer");
                                                } finally {
                                                    setUploadingFooter(false);
                                                }
                                            }}
                                        />
                                    </label>
                                )}
                                <p className="text-[10px] text-slate-400 italic">Muncul di bagian bawah email, di atas informasi perusahaan.</p>
                            </div>
                        </div>

                        <div className="pt-4 space-y-3">
                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-100"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                Simpan Draft
                            </button>
                            <button 
                                type="button"
                                onClick={handlePreview}
                                disabled={previewLoading}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                            >
                                {previewLoading ? <Loader2 size={20} className="animate-spin" /> : <Eye size={20} />}
                                Preview Email
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-sm">
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-primary-400">
                            <AlertTriangle size={16} />
                            Checklist Sebelum Kirim
                        </h4>
                        <ul className="space-y-3 text-xs text-slate-400">
                            <li className="flex gap-2">
                                <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[8px] font-bold shrink-0">✓</div>
                                <span>Pastikan subjek email menarik</span>
                            </li>
                            <li className="flex gap-2">
                                <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[8px] font-bold shrink-0">✓</div>
                                <span>Cek link di dalam email</span>
                            </li>
                            <li className="flex gap-2">
                                <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[8px] font-bold shrink-0">✓</div>
                                <span>Kirim email testing ke diri sendiri</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </form>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Preview Email Blast</h3>
                                <p className="text-xs text-slate-500">Tampilan yang akan diterima oleh pelanggan Anda.</p>
                            </div>
                            <button 
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-8">
                            {previewLoading ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
                                    <Loader2 size={40} className="animate-spin text-primary-600" />
                                    <p className="font-medium animate-pulse">Menyiapkan tampilan preview...</p>
                                </div>
                            ) : (
                                <div className="max-w-[600px] mx-auto shadow-2xl rounded-xl overflow-hidden bg-white">
                                    <iframe 
                                        srcDoc={previewHtml}
                                        title="Email Preview"
                                        className="w-full min-h-[600px] border-none"
                                        style={{ height: 'calc(90vh - 150px)' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                            <button 
                                onClick={() => setShowPreview(false)}
                                className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all"
                            >
                                Tutup Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
