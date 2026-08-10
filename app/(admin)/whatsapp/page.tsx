import React from "react";
import WhatsAppInbox from "./WhatsAppInbox";
import { getWaChats, getAgents } from "@/actions/whatsapp";

export default async function WhatsAppPage() {
    const chats = await getWaChats();
    const agents = await getAgents();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 font-judul tracking-wide">WhatsApp Shared Inbox</h1>
                    <p className="text-slate-500 mt-1 font-subjudul">Kelola seluruh percakapan pelanggan dari satu tempat.</p>
                </div>
            </div>

            <WhatsAppInbox initialChats={chats} agents={agents} />
        </div>
    );
}
