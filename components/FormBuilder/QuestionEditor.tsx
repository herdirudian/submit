import { updateQuestion } from "@/actions/question";
import { addOption, deleteOption, updateOption } from "@/actions/option";
import { Question, QuestionOption } from "@prisma/client";
import { useState } from "react";
import { X, Plus, Circle, Square, Upload, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

type VisibilityOperator = "equals" | "not_equals";
type VisibilityRule = { questionId: string; operator: VisibilityOperator; value: string };

export default function QuestionEditor({
  question,
  questions = [],
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
  const [label, setLabel] = useState(question.label);
  const [required, setRequired] = useState(question.required);
  
  // Validation state
  const validation = question.validation ? JSON.parse(question.validation) : {};
  const [regex, setRegex] = useState(validation.regex || "");
  const [minLength, setMinLength] = useState(validation.minLength || "");
  const [maxLength, setMaxLength] = useState(validation.maxLength || "");
  const [min, setMin] = useState(validation.min || "");
  const [max, setMax] = useState(validation.max || "");

  // Logic state
  const logic: { visibility?: VisibilityRule } = (() => {
    if (!question.logic) return {};
    try {
      return JSON.parse(question.logic);
    } catch {
      return {};
    }
  })();
  const [visibilityRule, setVisibilityRule] = useState<VisibilityRule | null>(logic.visibility ?? null);

  const handleBlur = async () => {
    if (label !== question.label) {
      try {
        onSaveStart?.();
        await updateQuestion(question.id, { label });
        onSaveSuccess?.();
      } catch (error) {
        onSaveError?.();
        toast.error("Failed to update question");
      }
    }
  };

  const handleRequiredChange = async (checked: boolean) => {
      setRequired(checked);
      try {
        onSaveStart?.();
        await updateQuestion(question.id, { required: checked });
        onSaveSuccess?.();
      } catch (error) {
        onSaveError?.();
        toast.error("Failed to update question");
      }
  }

  const handleValidationChange = async (key: string, value: string | number) => {
    const newValidation = { ...validation, [key]: value };
    // Remove empty keys
    Object.keys(newValidation).forEach(k => newValidation[k] === "" && delete newValidation[k]);

    try {
      onSaveStart?.();
      await updateQuestion(question.id, { validation: JSON.stringify(newValidation) });
      onSaveSuccess?.();
    } catch (error) {
      onSaveError?.();
      toast.error("Failed to update validation");
    }
  };

  const handleLogicChange = async (rule: VisibilityRule | null) => {
      setVisibilityRule(rule);
      const newLogic = { ...logic, visibility: rule };
      if (!rule) delete newLogic.visibility;

      try {
        onSaveStart?.();
        await updateQuestion(question.id, { logic: JSON.stringify(newLogic) });
        onSaveSuccess?.();
      } catch (error) {
        onSaveError?.();
        toast.error("Failed to update logic");
      }
  };

  // ... (Option handling logic)
  // Option Handlers
  const handleAddOption = async () => {
      try {
          onSaveStart?.();
          await addOption(question.id, question.formId);
          onSaveSuccess?.();
      } catch (error) {
          onSaveError?.();
          toast.error("Failed to add option");
      }
  };

  const handleDeleteOption = async (optionId: string) => {
      try {
          onSaveStart?.();
          await deleteOption(optionId, question.formId);
          onSaveSuccess?.();
      } catch (error) {
          onSaveError?.();
          toast.error("Failed to delete option");
      }
  };

  const handleUpdateOption = async (optionId: string, newLabel: string) => {
      try {
          onSaveStart?.();
          await updateOption(optionId, question.formId, { label: newLabel });
          onSaveSuccess?.();
      } catch (error) {
          onSaveError?.();
          toast.error("Failed to update option");
      }
  };

  if (question.type === 'SECTION_BREAK') {
      return (
        <div className="py-2">
             <div className="flex items-center gap-4 mb-2">
                <div className="flex-1 h-px bg-slate-300"></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Page Break</span>
                <div className="flex-1 h-px bg-slate-300"></div>
             </div>
             <div className="mb-2 text-center">
                 <input 
                     type="text" 
                     value={label}
                     onChange={(e) => setLabel(e.target.value)}
                     onBlur={handleBlur}
                     className="w-full text-center text-sm font-medium border-none focus:ring-0 p-0 placeholder:text-slate-300 focus:outline-none text-slate-500"
                     placeholder="New Page Title (Optional)"
                 />
             </div>
        </div>
      );
  }

  return (
    <div>
        <div className="mb-2">
            <input 
                type="text" 
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={handleBlur}
                className="w-full text-lg font-medium border-none focus:ring-0 p-0 placeholder:text-slate-300 focus:outline-none"
                placeholder="Question Text"
            />
        </div>
        
        {/* Type specific preview */}
        <div className="mb-4 text-sm text-slate-400">
            {question.type === 'SHORT_TEXT' && <div className="border-b border-dashed border-slate-300 py-2 w-1/2">Short answer text</div>}
            {question.type === 'PARAGRAPH' && <div className="border-b border-dashed border-slate-300 py-2 w-full">Long answer text</div>}
            {question.type === 'DATE' && <div className="border border-slate-200 rounded p-2 w-40 flex items-center gap-2"><span className="opacity-50">mm/dd/yyyy</span></div>}
            {question.type === 'FILE_UPLOAD' && (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
                    <div className="inline-flex p-3 bg-slate-50 rounded-full text-slate-400 mb-2">
                        <Upload size={20} />
                    </div>
                    <p className="text-xs text-slate-500">File Upload Preview</p>
                </div>
            )}
            
            {(question.type === 'DROPDOWN' || question.type === 'RADIO' || question.type === 'CHECKBOX') && (
                <div className="space-y-2">
                    {question.options.map((opt, index) => (
                        <div key={opt.id} className="flex items-center gap-2 group">
                            {/* Icon Indicator */}
                            <div className="flex-shrink-0 text-slate-400">
                                {question.type === 'RADIO' && <Circle size={16} />}
                                {question.type === 'CHECKBOX' && <Square size={16} />}
                                {question.type === 'DROPDOWN' && <span className="text-xs w-4 inline-block text-center">{index + 1}.</span>}
                            </div>
                            
                            {/* Editable Option Input */}
                            <input 
                                type="text"
                                defaultValue={opt.label}
                                onBlur={(e) => {
                                    if (e.target.value !== opt.label) {
                                        handleUpdateOption(opt.id, e.target.value);
                                    }
                                }}
                                className="flex-1 text-sm text-slate-700 border-transparent hover:border-slate-200 focus:border-primary-500 border rounded px-2 py-1 focus:outline-none transition-colors"
                            />
                            
                            {/* Delete Button */}
                            <button 
                                onClick={() => handleDeleteOption(opt.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                                title="Remove Option"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    
                    <button 
                        onClick={handleAddOption}
                        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 mt-2 px-1"
                    >
                        <Plus size={14} />
                        <span>Add Option</span>
                    </button>
                </div>
            )}
        </div>

        {/* Settings Footer */}
        <div className="border-t pt-3 mt-2 space-y-4">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <input 
                        id={`req-${question.id}`}
                        type="checkbox" 
                        checked={required} 
                        onChange={(e) => handleRequiredChange(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor={`req-${question.id}`} className="text-xs font-medium text-slate-500 uppercase cursor-pointer">Required</label>
                </div>
            </div>

            {/* Logic Settings */}
            <details className="group">
                <summary className="text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer list-none flex items-center gap-2">
                    <span className="group-open:rotate-90 transition-transform">▸</span> Conditional Logic
                </summary>
                <div className="mt-3 p-3 bg-slate-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-600">Show this question when:</label>
                        {visibilityRule && (
                            <button 
                                onClick={() => handleLogicChange(null)}
                                className="text-xs text-red-500 hover:text-red-700"
                            >
                                Clear Rule
                            </button>
                        )}
                    </div>
                    
                    {visibilityRule ? (
                        <div className="grid gap-2">
                            <select 
                                value={visibilityRule.questionId}
                                onChange={(e) => handleLogicChange({ ...visibilityRule, questionId: e.target.value })}
                                className="w-full text-xs px-2 py-1 rounded border border-slate-200"
                            >
                                <option value="">Select Question</option>
                                {questions
                                    .filter(q => q.id !== question.id && q.order < question.order) // Only show previous questions
                                    .map(q => (
                                        <option key={q.id} value={q.id}>{q.label.substring(0, 30)}</option>
                                    ))
                                }
                            </select>
                            
                            <div className="flex gap-2">
                                <select 
                                    value={visibilityRule.operator}
                                    onChange={(e) => {
                                      const nextOperator: VisibilityOperator = e.target.value === "not_equals" ? "not_equals" : "equals";
                                      handleLogicChange({ ...visibilityRule, operator: nextOperator });
                                    }}
                                    className="w-1/3 text-xs px-2 py-1 rounded border border-slate-200"
                                >
                                    <option value="equals">Equals</option>
                                    <option value="not_equals">Not Equals</option>
                                    {/* Add contains/etc based on type if needed */}
                                </select>
                                <input 
                                    type="text" 
                                    value={visibilityRule.value}
                                    onChange={(e) => handleLogicChange({ ...visibilityRule, value: e.target.value })}
                                    placeholder="Value"
                                    className="flex-1 text-xs px-2 py-1 rounded border border-slate-200"
                                />
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={() => handleLogicChange({ questionId: "", operator: "equals", value: "" })}
                            className="w-full py-2 border border-dashed border-slate-300 rounded text-xs text-slate-500 hover:bg-slate-100 flex items-center justify-center gap-2"
                        >
                            <ArrowRightLeft size={14} /> Add Logic Rule
                        </button>
                    )}
                    <p className="text-[10px] text-slate-400">
                        This question will only be visible if the condition is met.
                    </p>
                </div>
            </details>

            {/* Advanced Validation Settings */}
            <details className="group">
                <summary className="text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer list-none flex items-center gap-2">
                    <span className="group-open:rotate-90 transition-transform">▸</span> Advanced Validation
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                    {(question.type === 'SHORT_TEXT' || question.type === 'PARAGRAPH' || question.type === 'EMAIL' || question.type === 'PHONE') && (
                        <>
                            {(question.type === 'SHORT_TEXT' || question.type === 'PARAGRAPH') && (
                                <>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Min Length</label>
                                        <input 
                                            type="number" 
                                            value={minLength}
                                            onChange={(e) => {
                                                setMinLength(e.target.value);
                                                handleValidationChange("minLength", e.target.value);
                                            }}
                                            className="w-full text-xs px-2 py-1 rounded border border-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Max Length</label>
                                        <input 
                                            type="number" 
                                            value={maxLength}
                                            onChange={(e) => {
                                                setMaxLength(e.target.value);
                                                handleValidationChange("maxLength", e.target.value);
                                            }}
                                            className="w-full text-xs px-2 py-1 rounded border border-slate-200"
                                        />
                                    </div>
                                </>
                            )}
                            <div className="col-span-2">
                                <label className="block text-xs text-slate-500 mb-1">Regex Pattern</label>
                                <input 
                                    type="text" 
                                    value={regex}
                                    onChange={(e) => {
                                        setRegex(e.target.value);
                                        handleValidationChange("regex", e.target.value);
                                    }}
                                    placeholder={question.type === 'PHONE' ? "e.g. ^\\+?[0-9]{10,14}$" : "e.g. ^[A-Za-z]+$"}
                                    className="w-full text-xs px-2 py-1 rounded border border-slate-200 font-mono"
                                />
                            </div>
                        </>
                    )}

                    {question.type === 'NUMBER' && (
                        <>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Min Value</label>
                                <input 
                                    type="number" 
                                    value={min}
                                    onChange={(e) => {
                                        setMin(e.target.value);
                                        handleValidationChange("min", e.target.value);
                                    }}
                                    className="w-full text-xs px-2 py-1 rounded border border-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Max Value</label>
                                <input 
                                    type="number" 
                                    value={max}
                                    onChange={(e) => {
                                        setMax(e.target.value);
                                        handleValidationChange("max", e.target.value);
                                    }}
                                    className="w-full text-xs px-2 py-1 rounded border border-slate-200"
                                />
                            </div>
                        </>
                    )}
                </div>
            </details>
        </div>
    </div>
  );
}
