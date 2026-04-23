"use client";

import { deleteUser } from "@/actions/user";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function UserListActions({ userId }: { userId: string }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        
        setIsDeleting(true);
        try {
            await deleteUser(userId);
            toast.success("User deleted successfully");
        } catch (error) {
            toast.error("Failed to delete user");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex justify-end gap-2">
            <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Delete User"
            >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
        </div>
    );
}
