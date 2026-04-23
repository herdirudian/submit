"use client";

import { deleteForm } from "@/actions/form";
import { Trash } from "lucide-react";
import { toast } from "sonner";
import { useTransition } from "react";

export default function DeleteFormButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this form? This action cannot be undone.")) {
      startTransition(async () => {
        try {
          await deleteForm(id);
          toast.success("Form deleted successfully");
        } catch (error) {
          toast.error("Failed to delete form");
        }
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-slate-400 hover:text-red-500 transition-colors p-1"
      title="Delete Form"
    >
      <Trash size={16} />
    </button>
  );
}
