"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Parser } from "json2csv";

export default function ExportButton({ onExport, filename = "export.csv" }: { onExport: () => Promise<any[]>, filename?: string }) {
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        try {
            setLoading(true);
            const data = await onExport();
            if (!data || data.length === 0) {
                alert("Tidak ada data untuk diekspor.");
                return;
            }
            const parser = new Parser();
            const csv = parser.parse(data);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error(err);
            alert("Gagal mengekspor data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button 
            onClick={handleExport}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
        >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Export
        </button>
    );
}
