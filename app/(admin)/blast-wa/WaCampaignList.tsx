"use client";

import React, { useState } from "react";
import { Megaphone, Calendar, Edit2, Trash2, Send, Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { deleteCampaign, sendCampaign } from "@/actions/campaign";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function WaCampaignList({ initialCampaigns }: { initialCampaigns: any[] }) {
    const [campaigns, setCampaigns] = useState(initialCampaigns);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const router = useRouter();

    const handleDelete = async (id: string) => {
        if (!confirm("Yakin ingin menghapus pesan ini?")) return;
        try {
            await deleteCampaign(id);
            setCampaigns(prev => prev.filter(c => c.id !== id));
            toast.success("Pesan WA berhasil dihapus");
        } catch (error) {
            toast.error("Gagal menghapus pesan");
        }
    };

    const handleSend = async (id: string) => {
        if (!confirm("Mulai kirim blast WhatsApp sekarang? Proses ini akan memakan waktu karena ada delay natural antar pesan.")) return;
        
        setLoadingId(id);
        toast.loading("Memulai pengiriman pesan WhatsApp...", { id: 'send-wa' });
        
        try {
            const res = await sendCampaign(id);
            if (res?.success) {
                toast.success(`Blast selesai! Terkirim: ${res.successCount}, Gagal: ${res.failCount}`, { id: 'send-wa' });
                router.refresh();
            }
        } catch (error: any) {
            toast.error(error.message || "Gagal mengirim pesan", { id: 'send-wa' });
        } finally {
            setLoadingId(null);
        }
    };

    if (campaigns.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                <MessageCircle size={48} className="text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Belum ada Draft Pesan WA</h3>
                <p className="text-sm mb-6">Mulai buat pesan massal pertama Anda untuk menjangkau pelanggan.</p>
                <Link 
                    href="/campaigns/new?type=WHATSAPP"
                    className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all"
                >
                    Buat Pesan WA Sekarang
                </Link>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                    <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2 rounded-lg ${
                                campaign.status === 'SENT' ? 'bg-green-50 text-green-600' :
                                campaign.status === 'DRAFT' ? 'bg-slate-50 text-slate-500' :
                                campaign.status === 'SENDING' ? 'bg-blue-50 text-blue-600' :
                                'bg-orange-50 text-orange-600'
                            }`}>
                                <Megaphone size={20} />
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                                campaign.status === 'SENT' ? 'bg-green-50 text-green-600 border border-green-100' :
                                campaign.status === 'DRAFT' ? 'bg-slate-50 text-slate-500 border border-slate-100' :
                                campaign.status === 'SENDING' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                'bg-orange-50 text-orange-600 border border-orange-100'
                            }`}>
                                {campaign.status}
                            </span>
                        </div>

                        <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{campaign.name}</h3>
                        <p className="text-sm text-slate-500 line-clamp-1 mb-4">{campaign.subject}</p>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">Penerima:</span>
                                <span className="font-bold text-slate-700">{campaign.contactList?.name || "No list"}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">Terkirim:</span>
                                <span className="font-bold text-slate-700">{campaign.totalSent}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">Gagal/Bounced:</span>
                                <span className="font-bold text-red-600">{campaign.totalBounced}</span>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            <Calendar size={12} />
                            {format(new Date(campaign.createdAt), "MMM d, yyyy")}
                        </div>
                        <div className="flex gap-2">
                            {campaign.status === 'DRAFT' && (
                                <button 
                                    onClick={() => handleSend(campaign.id)}
                                    disabled={loadingId === campaign.id}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Kirim Sekarang"
                                >
                                    {loadingId === campaign.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                </button>
                            )}
                            <Link 
                                href={`/campaigns/${campaign.id}`}
                                className="p-2 text-slate-400 hover:text-primary-600 transition-colors"
                            >
                                <Edit2 size={16} />
                            </Link>
                            <button 
                                onClick={() => handleDelete(campaign.id)}
                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}