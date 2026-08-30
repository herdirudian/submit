"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { createPoll } from "@/actions/poll";

export default function CreatePollButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsLoading(true);
        try {
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const poll = await createPoll({ title, slug });
            toast.success("Poll created successfully");
            router.push(`/polls/${poll.id}`);
            setIsOpen(false);
            setTitle("");
        } catch (error) {
            toast.error("Failed to create poll");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-full font-bold hover:bg-primary-700 transition-all shadow-md active:scale-95"
            >
                <Plus size={20} />
                Buat Polling Baru
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl">
                                    <BarChart2 size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Buat Polling Baru</h2>
                                    <p className="text-sm text-slate-500">Berikan judul untuk polling interaktifmu.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Judul Polling</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Misal: Polling Produk Terfavorit"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-300 transition-all font-medium"
                                        required
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-2 px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Buat Polling"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
