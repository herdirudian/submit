"use client";

import { useState } from "react";
import { Poll, PollQuestion, PollOption, PollQuestionType } from "@prisma/client";
import { ArrowLeft, Save, Eye, Plus, Trash2, Image as ImageIcon, Layout, List, Layers, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { updatePoll, publishPoll } from "@/actions/poll";
import Image from "next/image";

type PollWithDetails = Poll & {
    questions: (PollQuestion & { options: PollOption[] })[];
};

export default function PollBuilderContext({ poll }: { poll: PollWithDetails }) {
    const [title, setTitle] = useState(poll.title);
    const [description, setDescription] = useState(poll.description || "");
    const [questions, setQuestions] = useState(poll.questions);
    const [status, setStatus] = useState(poll.status);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updatePoll(poll.id, {
                title,
                description,
                questions: questions.map((q, i) => ({
                    ...q,
                    order: i,
                    options: q.options.map((opt, optIdx) => ({
                        ...opt,
                        order: optIdx
                    }))
                }))
            });
            toast.success("Poll saved successfully");
        } catch (error) {
            toast.error("Failed to save poll");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            const newStatus = status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
            await publishPoll(poll.id, newStatus === 'PUBLISHED');
            setStatus(newStatus);
            toast.success(`Poll ${newStatus === 'PUBLISHED' ? 'published' : 'moved to draft'}`);
        } catch (error) {
            toast.error("Failed to update poll status");
        } finally {
            setIsPublishing(false);
        }
    };

    const addQuestion = (type: PollQuestionType) => {
        const newQuestion: any = {
            id: `temp-${Date.now()}`,
            type,
            label: type === 'INFO_STEP' ? 'Informasi Pendaftar' : type === 'CATEGORY_SELECT' ? 'Pilih Kategori' : 'Pilih Produk',
            order: questions.length,
            options: []
        };
        setQuestions([...questions, newQuestion]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestionLabel = (index: number, label: string) => {
        const newQuestions = [...questions];
        newQuestions[index].label = label;
        setQuestions(newQuestions);
    };

    const addOption = (qIndex: number) => {
        const newOption: any = {
            id: `opt-temp-${Date.now()}`,
            label: 'Opsi Baru',
            value: '',
            imageUrl: '',
            parentId: '',
            order: questions[qIndex].options.length
        };
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push(newOption);
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, optIndex: number, field: keyof PollOption, value: string) => {
        const newQuestions = [...questions];
        (newQuestions[qIndex].options[optIndex] as any)[field] = value;
        setQuestions(newQuestions);
    };

    const removeOption = (qIndex: number, optIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== optIndex);
        setQuestions(newQuestions);
    };

    const handleImageUpload = async (qIndex: number, optIndex: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success && data.urls?.[0]) {
                updateOption(qIndex, optIndex, 'imageUrl', data.urls[0]);
                toast.success("Image uploaded");
            }
        } catch (error) {
            toast.error("Upload failed");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-deskripsi">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link href="/polls" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <input 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-xl font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 font-judul"
                        />
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Poll Builder</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border rounded-full transition-all ${
                            status === 'PUBLISHED' 
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                        }`}
                    >
                        {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <div className={`w-2 h-2 rounded-full ${status === 'PUBLISHED' ? 'bg-green-500' : 'bg-yellow-500'}`} />}
                        {status === 'PUBLISHED' ? 'Published' : 'Draft'}
                    </button>
                    <Link 
                        href={`/public/polls/${poll.slug}`} 
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-full hover:bg-slate-50 transition-all"
                    >
                        <Eye size={16} /> Preview
                    </Link>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white font-bold rounded-full hover:bg-primary-700 transition-all shadow-md disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
            </header>

            <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
                    <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tambahkan deskripsi polling di sini..."
                        className="w-full text-slate-600 bg-transparent border-none focus:ring-0 p-0 resize-none"
                        rows={2}
                    />
                </div>

                <div className="space-y-8">
                    {questions.map((q, qIndex) => (
                        <div key={q.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden group">
                            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-xl shadow-sm text-primary-600">
                                        {q.type === 'INFO_STEP' ? <List size={20} /> : q.type === 'CATEGORY_SELECT' ? <Layers size={20} /> : <Layout size={20} />}
                                    </div>
                                    <input 
                                        value={q.label}
                                        onChange={(e) => updateQuestionLabel(qIndex, e.target.value)}
                                        className="font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 text-lg"
                                    />
                                </div>
                                <button onClick={() => removeQuestion(qIndex)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={20} />
                                </button>
                            </div>

                            <div className="p-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {q.options.map((opt, optIndex) => (
                                        <div key={opt.id} className="relative bg-slate-50 rounded-2xl p-4 border border-slate-100 group/opt">
                                            <button 
                                                onClick={() => removeOption(qIndex, optIndex)}
                                                className="absolute -top-2 -right-2 w-8 h-8 bg-white text-slate-300 hover:text-red-500 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/opt:opacity-100 transition-all z-10"
                                            >
                                                <Trash2 size={14} />
                                            </button>

                                            <div className="aspect-square bg-slate-200 rounded-xl mb-4 relative overflow-hidden flex items-center justify-center text-slate-400">
                                                {opt.imageUrl ? (
                                                    <Image src={opt.imageUrl} alt={opt.label} fill className="object-cover" unoptimized />
                                                ) : (
                                                    <ImageIcon size={32} />
                                                )}
                                                <input 
                                                    type="file" 
                                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                                    onChange={(e) => e.target.files?.[0] && handleImageUpload(qIndex, optIndex, e.target.files[0])}
                                                />
                                            </div>

                                            <input 
                                                value={opt.label}
                                                onChange={(e) => updateOption(qIndex, optIndex, 'label', e.target.value)}
                                                placeholder="Label Opsi"
                                                className="w-full text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-100 outline-none mb-2"
                                            />
                                            
                                            {q.type === 'PRODUCT_SELECT' && (
                                                <select
                                                    value={opt.parentId || ""}
                                                    onChange={(e) => updateOption(qIndex, optIndex, 'parentId', e.target.value)}
                                                    className="w-full text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none"
                                                >
                                                    <option value="">Pilih Kategori Induk</option>
                                                    {questions
                                                        .filter(prevQ => prevQ.type === 'CATEGORY_SELECT')
                                                        .flatMap(prevQ => prevQ.options)
                                                        .map(catOpt => (
                                                            <option key={catOpt.id} value={catOpt.id}>{catOpt.label}</option>
                                                        ))
                                                    }
                                                </select>
                                            )}
                                        </div>
                                    ))}
                                    
                                    <button 
                                        onClick={() => addOption(qIndex)}
                                        className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 hover:border-primary-300 hover:text-primary-500 transition-all group/add"
                                    >
                                        <div className="p-3 bg-slate-100 rounded-full group-hover/add:bg-primary-50 transition-colors">
                                            <Plus size={24} />
                                        </div>
                                        <span className="text-sm font-bold">Tambah Opsi</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add Question Actions */}
                <div className="mt-12 flex flex-col items-center gap-4">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tambah Langkah Polling</p>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => addQuestion('INFO_STEP')}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-all shadow-sm"
                        >
                            <List size={20} /> Form Info
                        </button>
                        <button 
                            onClick={() => addQuestion('CATEGORY_SELECT')}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-all shadow-sm"
                        >
                            <Layers size={20} /> Pilih Kategori
                        </button>
                        <button 
                            onClick={() => addQuestion('PRODUCT_SELECT')}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-all shadow-sm"
                        >
                            <Layout size={20} /> Pilih Produk
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
