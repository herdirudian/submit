"use client";

import { useState } from "react";
import { Poll, PollQuestion, PollOption } from "@prisma/client";
import { CheckCircle, ArrowRight, ArrowLeft, Loader2, Check, Maximize2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { submitPollResult } from "@/actions/poll";
import ImageZoomModal from "@/components/ImageZoomModal";

type PollWithDetails = Poll & {
    questions: (PollQuestion & { options: PollOption[] })[];
};

export default function PublicPollRenderer({ poll }: { poll: PollWithDetails }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [zoomImage, setZoomImage] = useState<{ imageUrl: string; label: string; optionId: string } | null>(null);

    const questions = poll.questions;
    const currentQuestion = questions[currentStep];

    const handleSelect = (optionId: string) => {
        const newSelections = { ...selections, [currentQuestion.id]: optionId };
        setSelections(newSelections);
        
        // Auto-next logic
        setTimeout(() => {
            if (currentStep < questions.length - 1) {
                setCurrentStep(currentStep + 1);
                window.scrollTo(0, 0);
            } else {
                handleSubmit(newSelections);
            }
        }, 300); // Small delay for visual feedback
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            window.scrollTo(0, 0);
        }
    };

    const handleSubmit = async (allSelections: Record<string, string>) => {
        setIsSubmitting(true);
        try {
            const optionIds = Object.values(allSelections);
            
            await submitPollResult(poll.id, optionIds, {
                userAgent: navigator.userAgent
            });
            
            setIsSubmitted(true);
            window.scrollTo(0, 0);
        } catch (error) {
            toast.error("Gagal mengirim polling");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter options for PRODUCT_SELECT based on previous CATEGORY_SELECT
    const getVisibleOptions = () => {
        if (currentQuestion.type !== 'PRODUCT_SELECT') return currentQuestion.options;

        const prevStepIndex = questions.findIndex(q => q.type === 'CATEGORY_SELECT');
        if (prevStepIndex === -1) return currentQuestion.options;

        const selectedCategoryId = selections[questions[prevStepIndex].id];
        if (!selectedCategoryId) return [];

        return currentQuestion.options.filter(opt => opt.parentId === selectedCategoryId);
    };

    if (isSubmitted) {
        return (
            <div className="bg-white rounded-[40px] shadow-2xl p-10 md:p-20 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
                    <CheckCircle size={48} />
                </div>
                <h2 className="text-4xl font-judul font-bold text-slate-800 mb-4">Terima Kasih!</h2>
                <p className="text-lg text-slate-500 max-w-md mx-auto leading-relaxed">
                    Pilihan Anda telah berhasil kami catat. Partisipasi Anda sangat berarti bagi kami.
                </p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-12 px-10 py-4 bg-primary-600 text-white font-bold rounded-full hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
                >
                    Kembali ke Awal
                </button>
            </div>
        );
    }

    const visibleOptions = getVisibleOptions();

    return (
        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div className="bg-slate-50 px-8 py-10 md:px-12 border-b border-slate-100 text-center">
                {poll.logo && (
                    <div className="mb-6 flex justify-center">
                        <Image src={poll.logo} alt="Logo" width={100} height={100} className="object-contain" unoptimized />
                    </div>
                )}
                <h1 className="text-3xl font-judul font-bold text-slate-800 mb-2">{poll.title}</h1>
                {poll.description && <p className="text-slate-500 font-medium">{poll.description}</p>}
                
                {/* Progress Bar */}
                <div className="mt-8 max-w-xs mx-auto flex items-center gap-2">
                    {questions.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                                idx <= currentStep ? 'bg-primary-600' : 'bg-slate-200'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-12">
                <div className="mb-10 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 font-judul">{currentQuestion.label}</h2>
                    <p className="text-slate-400 mt-2 font-medium">Pilih salah satu opsi di bawah ini</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleOptions.map((opt) => (
                        <div
                            key={opt.id}
                            onClick={() => handleSelect(opt.id)}
                            className={`group relative flex flex-col p-4 rounded-3xl border-2 transition-all duration-300 text-left cursor-pointer ${
                                selections[currentQuestion.id] === opt.id
                                    ? 'border-primary-600 bg-primary-50/30 ring-4 ring-primary-50'
                                    : 'border-slate-100 bg-white hover:border-primary-200 hover:shadow-xl hover:-translate-y-1'
                            }`}
                        >
                            <div className="aspect-square w-full rounded-2xl bg-slate-50 mb-4 relative overflow-hidden">
                                {opt.imageUrl ? (
                                    <>
                                        <Image src={opt.imageUrl} alt={opt.label} fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                                        
                                        {/* Zoom Preview Button Overlay */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setZoomImage({
                                                    imageUrl: opt.imageUrl!,
                                                    label: opt.label,
                                                    optionId: opt.id
                                                });
                                            }}
                                            className="absolute top-3 left-3 bg-slate-900/75 hover:bg-slate-950 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-sm opacity-90 group-hover:opacity-100 shadow-md"
                                            title="Klik untuk Zoom Gambar"
                                        >
                                            <Maximize2 size={14} /> Zoom
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                        <CheckCircle size={48} />
                                    </div>
                                )}
                                {selections[currentQuestion.id] === opt.id && (
                                    <div className="absolute top-3 right-3 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300 z-10">
                                        <Check size={18} strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            <span className={`text-lg font-bold text-center w-full transition-colors ${
                                selections[currentQuestion.id] === opt.id ? 'text-primary-700' : 'text-slate-700'
                            }`}>
                                {opt.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Navigation */}
                <div className="mt-12 pt-8 border-t border-slate-50 flex items-center justify-start gap-4">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className="px-8 py-4 text-slate-400 font-bold hover:text-slate-600 disabled:opacity-0 transition-all flex items-center gap-2"
                    >
                        <ArrowLeft size={20} /> Kembali
                    </button>
                    
                    {isSubmitting && (
                        <div className="ml-auto flex items-center gap-2 text-primary-600 font-bold animate-pulse">
                            <Loader2 size={20} className="animate-spin" /> Mengirim...
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Zoom Preview */}
            <ImageZoomModal
                isOpen={!!zoomImage}
                onClose={() => setZoomImage(null)}
                imageUrl={zoomImage?.imageUrl || null}
                title={zoomImage?.label || ""}
                subtitle={`Langkah: ${currentQuestion.label}`}
                onSelect={zoomImage ? () => handleSelect(zoomImage.optionId) : undefined}
                isSelected={zoomImage ? selections[currentQuestion.id] === zoomImage.optionId : false}
            />
        </div>
    );
}

