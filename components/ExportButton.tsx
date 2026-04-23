"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ExportButton({ id }: { id: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/forms/${id}/export`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `form_responses_${id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Export started");
    } catch (error) {
      toast.error("Failed to export data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={isLoading}
      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
    >
      {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      Export CSV
    </button>
  );
}
