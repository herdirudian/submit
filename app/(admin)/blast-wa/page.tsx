import React from "react";
import { MessageCircle, Settings, Send, Megaphone, Calendar, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { getCampaigns, deleteCampaign, sendCampaign } from "@/actions/campaign";
import { format } from "date-fns";
import WaCampaignList from "./WaCampaignList";

export default async function BlastWaDashboard() {
    // Fetch WhatsApp campaigns directly on the server
    const campaigns = await getCampaigns("WHATSAPP");

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Blast WhatsApp</h1>
                    <p className="text-slate-500 mt-1">Kirim pesan WhatsApp massal via OpenWA.</p>
                </div>
                <div className="flex gap-3">
                    <Link 
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Settings size={18} />
                        Konfigurasi API
                    </Link>
                    <Link 
                        href="/campaigns/new?type=WHATSAPP"
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-sm"
                    >
                        <Send size={18} />
                        Buat Pesan WA
                    </Link>
                </div>
            </div>

            <div className="bg-green-50 border border-green-200 p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center shrink-0 text-green-600">
                    <MessageCircle size={32} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-green-800 mb-2">Integrasi OpenWA Aktif</h2>
                    <p className="text-green-700 text-sm leading-relaxed">
                        Fitur Blast WhatsApp sudah siap digunakan. Pastikan Anda telah memasukkan URL API OpenWA Anda di menu <b>Settings</b>.
                        Sistem akan otomatis mengatur jeda (delay) secara natural untuk mencegah blokir.
                    </p>
                </div>
            </div>
            
            <WaCampaignList initialCampaigns={campaigns} />
        </div>
    );
}