"use client";

import React from "react";
import { Download } from "lucide-react";
import { Parser } from "json2csv";

export default function ExportButton({ data, filename = "export.csv" }: { data: any[], filename?: string }) {
    const handleExport = () => {
        try {
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
        }
    };

    return (
        <button 
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
            <Download size={18} />
            Export
        </button>
    );
}
