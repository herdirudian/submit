import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Question, QuestionOption } from "@prisma/client";
import { GripVertical, Trash2, Copy } from "lucide-react";
import QuestionEditor from "./QuestionEditor";
import { deleteQuestion, duplicateQuestion } from "@/actions/question";
import { toast } from "sonner";

export default function SortableQuestion({
  question,
  questions,
  onSaveStart,
  onSaveSuccess,
  onSaveError,
}: {
  question: Question & { options: QuestionOption[] };
  questions?: Question[];
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  onSaveError?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : "auto",
  };

  const handleDelete = async () => {
    if (!confirm("Hapus pertanyaan ini?")) return;
    try {
      onSaveStart?.();
      await deleteQuestion(question.id, question.formId);
      onSaveSuccess?.();
      toast.success("Question deleted");
    } catch (error) {
      onSaveError?.();
      toast.error("Failed to delete question");
    }
  };

  const handleDuplicate = async () => {
    try {
      onSaveStart?.();
      await duplicateQuestion(question.id, question.formId);
      onSaveSuccess?.();
      toast.success("Question duplicated");
    } catch (error) {
      onSaveError?.();
      toast.error("Failed to duplicate question");
    }
  };

  return (
    <div 
        ref={setNodeRef} 
        style={style} 
        className={`bg-white rounded-xl shadow-sm border border-slate-200 group transition-all ${isDragging ? 'shadow-2xl scale-105 opacity-90 ring-2 ring-primary-500' : 'hover:shadow-md'}`}
    >
      <div className="p-1">
          <div className="flex items-start">
            {/* Drag Handle */}
            <div {...attributes} {...listeners} className="p-4 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors">
                <GripVertical size={20} />
            </div>

            {/* Content */}
            <div className="flex-1 py-4 pr-4">
                <QuestionEditor
                  question={question}
                  questions={questions}
                  onSaveStart={onSaveStart}
                  onSaveSuccess={onSaveSuccess}
                  onSaveError={onSaveError}
                />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1 p-2 pt-4 border-l border-slate-100">
                <button 
                    onClick={handleDuplicate}
                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    title="Duplicate"
                >
                    <Copy size={18} />
                </button>
                <button 
                    onClick={handleDelete}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete"
                >
                    <Trash2 size={18} />
                </button>
            </div>
          </div>
      </div>
    </div>
  );
}
