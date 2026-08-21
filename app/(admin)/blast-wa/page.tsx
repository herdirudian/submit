import React from "react";
import { MessageCircle, Settings, Send, Megaphone, Calendar, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { getCampaigns, deleteCampaign, sendCampaignNow } from "@/actions/campaign";
import WaCampaignList from "./WaCampaignList";

export default async function BlastWaDashboard() {
    // Fetch WhatsApp campaigns directly on the server
    const campaigns = await getCampaigns("WHATSAPP");

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Blast WhatsApp</h1>
                    <p className="text-slate-500 mt-1">Kirim pesan WhatsApp massal menggunakan Template Resmi Meta.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <Link 
                        href="/whatsapp/templates"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm text-sm"
                    >
                        <Megaphone size={18} />
                        Kelola Template
                    </Link>
                    <Link 
                        href="/campaigns/new?type=WHATSAPP"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 text-sm"
                    >
                        <Send size={18} />
                        Buat Blast WA
                    </Link>
                </div>
            </div>

            <div className="bg-primary-50 border border-primary-100 p-6 rounded-3xl flex flex-col md:flex-row gap-6 items-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shrink-0 text-primary-600 shadow-sm border border-primary-100">
                    <MessageCircle size={32} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-primary-800 mb-1">WhatsApp Cloud API Aktif</h2>
                    <p className="text-primary-700/80 text-sm leading-relaxed">
                        Fitur Blast WhatsApp menggunakan infrastruktur resmi Meta. Pastikan Anda telah mensinkronisasi template di menu <b>Template WA</b> sebelum membuat campaign baru.
                        Sistem ini mendukung personalisasi variabel seperti nama pelanggan otomatis.
                    </p>
                </div>
            </div>
            
            <WaCampaignList initialCampaigns={campaigns} />
        </div>
    );
}