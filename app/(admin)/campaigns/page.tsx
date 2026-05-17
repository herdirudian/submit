"use client";

import React, { useState, useEffect } from "react";
import { 
    Plus, Megaphone, Calendar, Send, 
    MoreHorizontal, Edit2, Trash2, Loader2,
    CheckCircle, Clock, AlertTriangle, Eye
} from "lucide-react";
import { getCampaigns, deleteCampaign, sendCampaignNow } from "@/actions/campaign";
import Link from "next/link";
import { format } from "date-fns";

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCampaigns();
    }, []);

    async function loadCampaigns() {
        setLoading(true);
        try {
            const data = await getCampaigns();
            setCampaigns(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("Hapus campaign ini?")) {
            await deleteCampaign(id);
            loadCampaigns();
        }
    };

    const handleSend = async (id: string) => {
        if (confirm("Kirim campaign ini sekarang?")) {
            try {
                await sendCampaignNow(id);
                loadCampaigns();
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Campaign Email</h1>
                    <p className="text-slate-500 mt-1">Buat dan kelola campaign blast email Anda.</p>
                </div>
                <Link 
                    href="/campaigns/new"
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-sm"
                >
                    <Plus size={18} />
                    Buat Campaign
                </Link>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <Loader2 size={32} className="animate-spin mb-4" />
                    <p>Memuat campaign...</p>
                </div>
            ) : campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                    <Megaphone size={48} className="text-slate-200 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800">Belum ada campaign</h3>
                    <p className="text-sm mb-6">Mulai buat campaign pertama Anda untuk menjangkau audiens.</p>
                    <Link 
                        href="/campaigns/new"
                        className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all"
                    >
                        Buat Campaign Sekarang
                    </Link>
                </div>
            ) : (
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
                                        <span className="text-slate-400">Dibuka:</span>
                                        <span className="font-bold text-green-600">{campaign.totalOpened}</span>
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
                                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                            title="Kirim Sekarang"
                                        >
                                            <Send size={16} />
                                        </button>
                                    )}
                                    <button className="p-2 text-slate-400 hover:text-primary-600 transition-colors">
                                        <Edit2 size={16} />
                                    </button>
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
            )}
        </div>
    );
}
