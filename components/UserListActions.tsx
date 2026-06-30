"use client";

import { deleteUser, updateUser } from "@/actions/user";
import { Trash2, Edit2, X, User, Mail, Lock, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const editUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "CASHIER"]),
});

type EditUserValues = z.infer<typeof editUserSchema>;

export default function UserListActions({ user }: { user: any }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<EditUserValues>({
        resolver: zodResolver(editUserSchema),
        defaultValues: {
            name: user.name || "",
            email: user.email || "",
            role: user.role || "ADMIN",
        }
    });

    const onEditSubmit = async (data: EditUserValues) => {
        try {
            await updateUser(user.id, data);
            toast.success("User updated successfully");
            setIsEditOpen(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to update user");
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        
        setIsDeleting(true);
        try {
            await deleteUser(user.id);
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
                onClick={() => setIsEditOpen(true)}
                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                title="Edit User"
            >
                <Edit2 size={16} />
            </button>
            <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Delete User"
            >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>

            {isEditOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 text-left">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">Edit User</h2>
                            <button 
                                onClick={() => setIsEditOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit(onEditSubmit)} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                    {...register("name")}
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                                    placeholder="John Doe"
                                    />
                                </div>
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                    {...register("email")}
                                    type="email"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                                    placeholder="john@example.com"
                                    />
                                </div>
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <select
                                    {...register("role")}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all appearance-none bg-white"
                                    >
                                        <option value="ADMIN">Admin (Full Access)</option>
                                        <option value="CASHIER">Cashier (Contact Only)</option>
                                    </select>
                                </div>
                                {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Password (Leave blank to keep current)</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                    {...register("password")}
                                    type="password"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                                    placeholder="••••••••"
                                    />
                                </div>
                                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
