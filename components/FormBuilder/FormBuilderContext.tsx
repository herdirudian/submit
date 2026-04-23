"use client";

import { Form, Question, QuestionOption, QuestionType } from "@prisma/client";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, TouchSensor, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";
import Toolbox from "./Toolbox";
import SortableQuestion from "./SortableQuestion";
import { addQuestion, updateQuestionOrder } from "@/actions/question";
import { ArrowLeft, Eye, Share2, X, Settings, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { publishForm } from "@/actions/form";
import FormSettings from "./FormSettings";
import { format } from "date-fns";

type FormWithQuestions = Form & {
  questions: (Question & { options: QuestionOption[] })[];
};

export default function FormBuilderContext({ form }: { form: FormWithQuestions }) {
  const [questions, setQuestions] = useState<(Question & { options: QuestionOption[] })[]>(form.questions);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<Form["status"]>(form.status);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date>(new Date(form.updatedAt));

  const runSave = async <T,>(fn: () => Promise<T>) => {
    setSaveState("saving");
    try {
      const result = await fn();
      setSaveState("saved");
      setLastSavedAt(new Date());
      return result;
    } catch (error) {
      setSaveState("error");
      throw error;
    }
  };

  const onSaveStart = () => setSaveState("saving");
  const onSaveSuccess = () => {
    setSaveState("saved");
    setLastSavedAt(new Date());
  };
  const onSaveError = () => setSaveState("error");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Avoid accidental drags
      },
    }),
    useSensor(TouchSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (active.data.current?.isToolboxItem) {
        return;
    }

    if (active.id !== over.id) {
      const oldIndex = questions.findIndex((item) => item.id === active.id);
      const newIndex = questions.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(questions, oldIndex, newIndex);
      setQuestions(newItems);

      const updates = newItems.map((item, index) => ({
        id: item.id,
        order: index,
      }));

      runSave(() => updateQuestionOrder(form.id, updates)).catch(() => {
        toast.error("Gagal menyimpan urutan");
      });
    }
  };

  const handleAddQuestion = async (type: QuestionType) => {
      try {
          const newQuestion = await runSave(() => addQuestion(form.id, type, questions.length));
          setQuestions((prev) => [...prev, newQuestion]); 
          toast.success("Question added");
      } catch (error) {
          onSaveError();
          toast.error("Failed to add question");
      }
  };

  const handlePublishToggle = async () => {
      const isPublishing = formStatus !== "PUBLISHED";
      const ok = confirm(isPublishing ? "Publish form ini?" : "Unpublish form ini?");
      if (!ok) return;

      try {
        await runSave(() => publishForm(form.id, isPublishing));
        setFormStatus(isPublishing ? "PUBLISHED" : "DRAFT");
        toast.success(isPublishing ? "Form Published" : "Form Unpublished");
      } catch (error) {
        toast.error("Gagal mengubah status publikasi");
      }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50 font-deskripsi">
        {/* Header - Modern & Branded */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10 sticky top-0 shadow-sm">
            <div className="flex items-center gap-6">
                <Link href="/dashboard" className="text-slate-400 hover:text-primary-700 transition-colors p-2 hover:bg-primary-50 rounded-full">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold font-judul text-slate-800 tracking-wide">{form.title}</h1>
                        <button onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-primary-600 transition-colors p-1 rounded-full hover:bg-slate-100" title="Form Settings">
                            <Settings size={16} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        formStatus === 'PUBLISHED' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                        }`}>
                        {formStatus}
                        </span>
                        <span className={`text-xs ${saveState === "error" ? "text-red-500" : "text-slate-400"} flex items-center gap-1`}>
                            {saveState === "saving" ? <Loader2 className="animate-spin" size={12} /> : null}
                            {saveState === "saving"
                              ? "Menyimpan..."
                              : saveState === "error"
                                ? "Gagal menyimpan"
                                : `Tersimpan ${format(lastSavedAt, "HH:mm")}`}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                 <Link 
                    href={`/public/forms/${form.slug}`} 
                    target="_blank" 
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-full hover:bg-slate-50 hover:text-primary-700 transition-all"
                >
                    <Eye size={16} />
                    <span className="hidden sm:inline">Preview</span>
                </Link>
                <button 
                    onClick={handlePublishToggle}
                    className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-full shadow-md transition-all transform active:scale-95 ${
                        formStatus === 'PUBLISHED' 
                        ? 'bg-white text-red-600 border border-red-100 hover:bg-red-50' 
                        : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg'
                    }`}
                >
                    {formStatus === 'PUBLISHED' ? (
                        <>
                            <X size={16} /> Unpublish
                        </>
                    ) : (
                        <>
                            <Share2 size={16} /> Publish
                        </>
                    )}
                </button>
            </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Toolbox - Modernized */}
            <aside className="w-72 bg-white border-r border-slate-200 p-6 overflow-y-auto hidden md:block shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-0">
                <Toolbox onAdd={handleAddQuestion} />
            </aside>

            {/* Main Canvas - Modernized */}
            <main className="flex-1 bg-slate-50/50 p-4 sm:p-8 overflow-y-auto relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                <div className="max-w-3xl mx-auto">
                    {questions.length === 0 ? (
                        <div className="text-center py-32 bg-white/80 backdrop-blur-sm border-2 border-dashed border-slate-300 rounded-3xl">
                            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Share2 size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Start Building Your Form</h3>
                            <p className="text-slate-500 max-w-xs mx-auto">Drag items from the sidebar or click to add your first question.</p>
                        </div>
                    ) : (
                        <DndContext 
                            sensors={sensors} 
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-6 pb-20">
                                    {/* Form Title Card (Visual Only) */}
                                    <div className="bg-white rounded-t-2xl rounded-b-lg border-t-[12px] border-primary-700 shadow-sm p-8 mb-6 relative group cursor-pointer text-center" onClick={() => setIsSettingsOpen(true)}>
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-primary-50 hover:text-primary-600">
                                                <Settings size={18} />
                                            </button>
                                        </div>
                                        {form.logo && (
                                            <div className="mb-6 flex justify-center">
                                                <img 
                                                    src={form.logo} 
                                                    alt="Logo" 
                                                    style={{ width: form.logoWidth || 128 }}
                                                    className="object-contain" 
                                                />
                                            </div>
                                        )}
                                        <h1 
                                            className="font-judul text-slate-800 mb-2 font-bold"
                                            style={{ fontSize: form.titleFontSize || 30 }}
                                        >
                                            {form.title}
                                        </h1>
                                        <p 
                                            className="text-slate-500 max-w-lg mx-auto leading-relaxed"
                                            style={{ fontSize: form.descriptionFontSize || 16 }}
                                        >
                                            {form.description || "Form Description"}
                                        </p>
                                    </div>

                                    {questions.map((question) => (
                                        <SortableQuestion
                                          key={question.id}
                                          question={question}
                                          questions={questions}
                                          onSaveStart={onSaveStart}
                                          onSaveSuccess={onSaveSuccess}
                                          onSaveError={onSaveError}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                            
                            <DragOverlay>
                                {activeId ? (
                                    <div className="bg-white p-6 border border-primary-200 rounded-2xl shadow-xl opacity-90 scale-105 cursor-grabbing">
                                        <div className="h-4 bg-slate-100 rounded w-3/4 mb-2"></div>
                                        <div className="h-8 bg-slate-50 rounded w-full"></div>
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    )}
                </div>
            </main>
        </div>
        
        <FormSettings 
            form={form} 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
        />
    </div>
  );
}
