"use client";

import { duplicateForm } from "@/actions/form";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export default function DuplicateFormButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDuplicate = () => {
    if (!confirm("Duplicate form ini? Form hasil duplikasi akan dibuat sebagai DRAFT.")) return;

    startTransition(async () => {
      try {
        const created = await duplicateForm(id);
        toast.success("Form berhasil diduplikasi");
        router.push(`/builder/${created.id}`);
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Gagal menduplikasi form");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={isPending}
      className="text-sm font-semibold text-slate-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
      title="Duplicate Form"
    >
      <Copy size={16} /> Duplicate
    </button>
  );
}
