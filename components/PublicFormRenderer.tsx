"use client";

import { Form, Question, QuestionOption } from "@prisma/client";
import { useForm } from "react-hook-form";
import { submitForm } from "@/actions/submission";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle, ChevronDown, Check, ArrowRight, Upload, X, File } from "lucide-react";

// ... existing code ...

type FormWithQuestions = Form & {
  questions: (Question & { options: QuestionOption[] })[];
};

export default function PublicFormRenderer({ form }: { form: FormWithQuestions }) {
  type FormValues = Record<string, unknown>;
  type QuestionWithOptions = Question & { options: QuestionOption[] };
  type FieldError = { type?: string };

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { register, handleSubmit, trigger, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>();
  const allValues = watch();
  
  // File upload state
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});

  const parseValidation = (question: Question) => {
    if (!question.validation) return null;
    try {
      return JSON.parse(question.validation);
    } catch {
      return null;
    }
  };

  const getErrorMessage = (question: Question) => {
    const error = (errors as unknown as Record<string, FieldError | undefined>)?.[question.id];
    if (!error) return null;

    const validation = parseValidation(question) as Record<string, unknown> | null;
    const type = error.type;

    const toNumber = (value: unknown) => {
      if (typeof value === "number") return value;
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
      return null;
    };

    if (type === "required") return "Wajib diisi";
    if (type === "minLength") {
      const min = toNumber(validation?.minLength);
      return min !== null ? `Minimal ${min} karakter` : "Terlalu pendek";
    }
    if (type === "maxLength") {
      const max = toNumber(validation?.maxLength);
      return max !== null ? `Maksimal ${max} karakter` : "Terlalu panjang";
    }
    if (type === "pattern") return "Format tidak valid";
    if (type === "min") {
      const min = toNumber(validation?.min);
      return min !== null ? `Minimal ${min}` : "Nilai terlalu kecil";
    }
    if (type === "max") {
      const max = toNumber(validation?.max);
      return max !== null ? `Maksimal ${max}` : "Nilai terlalu besar";
    }

    return "Input tidak valid";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [questionId]: true }));

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        if (data.success) {
            setFileUrls(prev => ({ ...prev, [questionId]: data.url }));
            setValue(questionId, data.url); // Set hidden input value
        } else {
            toast.error("Upload failed");
        }
    } catch (error) {
        toast.error("Upload error");
    } finally {
        setUploading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const removeFile = (questionId: string) => {
    setFileUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[questionId];
        return newUrls;
    });
    setValue(questionId, ""); // Clear hidden input
  };


  // Check if a question should be visible
  const isQuestionVisible = (question: Question) => {
      if (!question.logic) return true;
      try {
          const logic = JSON.parse(question.logic) as { visibility?: { questionId: string; operator: string; value: string } };
          if (!logic.visibility) return true;

          const { questionId, operator, value } = logic.visibility;
          const targetValue = allValues[questionId];

          if (targetValue === undefined || targetValue === null || targetValue === "") return false;

          const targetString = Array.isArray(targetValue) ? targetValue.join(", ") : String(targetValue);

          if (operator === 'equals') return targetString === value;
          if (operator === 'not_equals') return targetString !== value;
          
          return true;
      } catch (e) {
          return true;
      }
  };

  // Group questions into steps
  const steps = form.questions.reduce<QuestionWithOptions[][]>((acc, question) => {
    if (question.type === 'SECTION_BREAK') {
      acc.push([]);
    } else {
      if (acc.length === 0) acc.push([]);
      acc[acc.length - 1].push(question);
    }
    return acc;
  }, []);

  // Filter visible questions for the current step
  // Note: We need to be careful with steps. If a section break is hidden, what happens? 
  // For now, let's assume section breaks don't have logic, only questions do.
  
  // Ensure at least one step exists
  if (steps.length === 0) steps.push([]);

  const visibleQuestionsByStep = steps.map((step) => step.filter(isQuestionVisible));
  const currentQuestions = visibleQuestionsByStep[currentStep] ?? [];
  
  // Skip empty steps if all questions in a step are hidden? 
  // This is complex. For now, let's just render the step, if it's empty, user clicks next.
  // Better: Filter currentQuestions. If length is 0 and it's not the last step, auto-advance?
  // Let's stick to standard behavior: render what's visible.

  const totalSteps = steps.length;
  const nextVisibleStepIndex = (() => {
    for (let i = currentStep + 1; i < totalSteps; i += 1) {
      if ((visibleQuestionsByStep[i]?.length ?? 0) > 0) return i;
    }
    return null;
  })();

  const prevVisibleStepIndex = (() => {
    for (let i = currentStep - 1; i >= 0; i -= 1) {
      if ((visibleQuestionsByStep[i]?.length ?? 0) > 0) return i;
    }
    return null;
  })();

  const isLastVisibleStep = nextVisibleStepIndex === null;

  useEffect(() => {
    if (currentQuestions.length > 0) return;
    if (nextVisibleStepIndex !== null && nextVisibleStepIndex !== currentStep) {
      setCurrentStep(nextVisibleStepIndex);
      window.scrollTo(0, 0);
      return;
    }
    if (prevVisibleStepIndex !== null && prevVisibleStepIndex !== currentStep) {
      setCurrentStep(prevVisibleStepIndex);
      window.scrollTo(0, 0);
    }
  }, [currentQuestions.length, currentStep, nextVisibleStepIndex, prevVisibleStepIndex]);

  const handleNext = async () => {
    if (nextVisibleStepIndex === null) return;
    if (currentQuestions.length === 0) {
      setCurrentStep(nextVisibleStepIndex);
      window.scrollTo(0, 0);
      return;
    }

    const currentStepFieldIds = currentQuestions.map((q) => q.id);
    const isValid = await trigger(currentStepFieldIds);
    if (!isValid) return;

    setCurrentStep(nextVisibleStepIndex);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    if (prevVisibleStepIndex === null) return;
    setCurrentStep(prevVisibleStepIndex);
    window.scrollTo(0, 0);
  };

  const getSafeRedirectUrl = (raw?: string | null) => {
    const value = (raw ?? "").trim();
    if (!value) return null;
    if (value.startsWith("/") && !value.startsWith("//")) return value;
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url.toString();
    } catch {
      return null;
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
        await submitForm(form.id, data);
        const redirect = getSafeRedirectUrl(form.redirectUrl);
        if (redirect) {
          window.location.assign(redirect);
          return;
        }
        setIsSubmitted(true);
        window.scrollTo(0, 0);
    } catch (error) {
        console.error(error);
        toast.error("Failed to submit form. Please try again.");
    }
  };

  if (isSubmitted) {
      return (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center animate-fade-in-up">
              <div className="bg-green-50 p-6 rounded-full shadow-lg mb-8">
                  <CheckCircle className="text-green-600 w-20 h-20" />
              </div>
              <h2 className="text-4xl font-judul font-bold text-slate-800 mb-4 tracking-wide">
                {form.thankYouTitle || "Thank You!"}
              </h2>
              <p className="text-slate-500 text-lg mb-10 max-w-md mx-auto leading-relaxed whitespace-pre-line">
                  {form.thankYouMessage || "Your response has been successfully recorded. We appreciate your time and input."}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="group px-8 py-3 bg-white border-2 border-primary-600 text-primary-700 font-bold rounded-full hover:bg-primary-600 hover:text-white transition-all flex items-center gap-2"
              >
                  Submit another response
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
          </div>
      )
  }

  // Theme Customization - Dynamic Styles
  const primaryColor = form.primaryColor || "#0f4d39";
  const fontFamily = form.fontFamily || "var(--font-deskripsi)";

  // Helper to generate a lighter shade for backgrounds/focus rings
  const primaryLight = `${primaryColor}1A`; // 10% opacity hex
  
  return (
    <div className="space-y-8" style={{ fontFamily }}>
        {/* Stepper UI */}
        {totalSteps > 1 && (
            <div className="mb-12">
                <div className="flex items-center justify-between relative max-w-3xl mx-auto">
                    {/* Connecting Line */}
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 transform -translate-y-1/2 rounded-full"></div>
                    <div 
                        className="absolute top-1/2 left-0 h-1 -z-10 transform -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out"
                        style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%`, backgroundColor: primaryColor }}
                    ></div>

                    {steps.map((_, index) => (
                        <div key={index} className="flex flex-col items-center gap-2">
                            <div 
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 bg-white
                                    ${index <= currentStep 
                                        ? 'shadow-md scale-110' 
                                        : 'border-slate-300 text-slate-400'
                                    }
                                `}
                                style={index <= currentStep ? { 
                                    borderColor: primaryColor, 
                                    color: index < currentStep ? 'white' : primaryColor,
                                    backgroundColor: index < currentStep ? primaryColor : 'white'
                                } : {}}
                            >
                                {index < currentStep ? <Check size={20} /> : index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {currentQuestions.map((question, index) => (
                <div 
                    key={question.id} 
                    className="group animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    <div className="mb-3">
                        <label className="block text-lg font-bold font-judul text-slate-800 tracking-wide">
                            {question.label}
                            {question.required && <span className="text-red-500 ml-1 text-xl align-top">*</span>}
                        </label>
                        {question.description && (
                            <p className="text-sm text-slate-400 mt-1 font-light leading-relaxed">{question.description}</p>
                        )}
                    </div>

                    <div className="relative">
                        {/* Short Text */}
                        {question.type === 'SHORT_TEXT' && (
                            <input
                                {...register(question.id, { 
                                    required: question.required,
                                    minLength: question.validation ? JSON.parse(question.validation).minLength : undefined,
                                    maxLength: question.validation ? JSON.parse(question.validation).maxLength : undefined,
                                    pattern: question.validation ? new RegExp(JSON.parse(question.validation).regex) : undefined
                                })}
                                type="text"
                                className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:bg-white transition-all outline-none placeholder:text-slate-300 font-medium text-slate-700 text-lg shadow-sm"
                                placeholder="Type your answer here..."
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = primaryColor;
                                    e.currentTarget.style.boxShadow = `0 0 0 4px ${primaryLight}`;
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = '';
                                    e.currentTarget.style.boxShadow = '';
                                }}
                            />
                        )}

                        {/* Paragraph */}
                        {question.type === 'PARAGRAPH' && (
                            <textarea
                                {...register(question.id, { 
                                    required: question.required,
                                    minLength: question.validation ? JSON.parse(question.validation).minLength : undefined,
                                    maxLength: question.validation ? JSON.parse(question.validation).maxLength : undefined
                                })}
                                rows={3}
                                className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:bg-white transition-all outline-none placeholder:text-slate-300 font-medium text-slate-700 text-lg shadow-sm resize-none"
                                placeholder="Type your detailed answer here..."
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = primaryColor;
                                    e.currentTarget.style.boxShadow = `0 0 0 4px ${primaryLight}`;
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = '';
                                    e.currentTarget.style.boxShadow = '';
                                }}
                            />
                        )}
                        
                        {/* Number */}
                        {question.type === 'NUMBER' && (
                            <input
                                {...register(question.id, { 
                                    required: question.required,
                                    min: question.validation ? JSON.parse(question.validation).min : undefined,
                                    max: question.validation ? JSON.parse(question.validation).max : undefined
                                })}
                                type="number"
                                className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:bg-white transition-all outline-none placeholder:text-slate-300 font-medium text-slate-700 text-lg shadow-sm"
                                placeholder="0"
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = primaryColor;
                                    e.currentTarget.style.boxShadow = `0 0 0 4px ${primaryLight}`;
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = '';
                                    e.currentTarget.style.boxShadow = '';
                                }}
                            />
                        )}

                        {/* Email */}
                        {question.type === 'EMAIL' && (
                            <input
                                {...register(question.id, { 
                                    required: question.required,
                                    pattern: question.validation ? new RegExp(JSON.parse(question.validation).regex) : undefined
                                })}
                                type="email"
                                className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:bg-white transition-all outline-none placeholder:text-slate-300 font-medium text-slate-700 text-lg shadow-sm"
                                placeholder="email@example.com"
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = primaryColor;
                                    e.currentTarget.style.boxShadow = `0 0 0 4px ${primaryLight}`;
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = '';
                                    e.currentTarget.style.boxShadow = '';
                                }}
                            />
                        )}

                        {/* Phone */}
                        {question.type === 'PHONE' && (
                            <input
                                {...register(question.id, { 
                                    required: question.required,
                                    pattern: question.validation ? new RegExp(JSON.parse(question.validation).regex) : undefined
                                })}
                                type="tel"
                                className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:bg-white transition-all outline-none placeholder:text-slate-300 font-medium text-slate-700 text-lg shadow-sm"
                                placeholder="(+62) 812-3456-7890"
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = primaryColor;
                                    e.currentTarget.style.boxShadow = `0 0 0 4px ${primaryLight}`;
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = '';
                                    e.currentTarget.style.boxShadow = '';
                                }}
                            />
                        )}

                        {/* Date */}
                        {question.type === 'DATE' && (
                            <input
                                {...register(question.id, { required: question.required })}
                                type="date"
                                className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:bg-white transition-all outline-none text-slate-700 font-medium text-lg shadow-sm cursor-pointer"
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = primaryColor;
                                    e.currentTarget.style.boxShadow = `0 0 0 4px ${primaryLight}`;
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = '';
                                    e.currentTarget.style.boxShadow = '';
                                }}
                            />
                        )}

                        {/* Dropdown */}
                        {question.type === 'DROPDOWN' && (
                            <div className="relative">
                                <select
                                    {...register(question.id, { required: question.required })}
                                    className="block w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-4 focus:bg-white transition-all outline-none text-slate-700 font-medium text-lg shadow-sm cursor-pointer"
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = primaryColor;
                                        e.currentTarget.style.boxShadow = `0 0 0 4px ${primaryLight}`;
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = '';
                                        e.currentTarget.style.boxShadow = '';
                                    }}
                                >
                                    <option value="">Select an option</option>
                                    {question.options.map(opt => (
                                        <option key={opt.id} value={opt.label}>{opt.label}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                    <ChevronDown size={24} />
                                </div>
                            </div>
                        )}

                        {/* Radio */}
                        {question.type === 'RADIO' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                {question.options.map(opt => (
                                    <label key={opt.id} className="relative flex items-center p-4 rounded-xl border-2 border-slate-100 hover:bg-white cursor-pointer transition-all hover:shadow-md">
                                        <input
                                            {...register(question.id, { required: question.required })}
                                            type="radio"
                                            id={opt.id}
                                            value={opt.label}
                                            className="peer sr-only"
                                        />
                                        <div 
                                            className="absolute inset-0 rounded-xl border-2 transition-all pointer-events-none peer-checked:bg-opacity-5"
                                            style={{ borderColor: 'transparent' }} // Default state handled by class
                                        ></div>
                                        {/* Custom styles for checked state using inline styles for dynamic color */}
                                        <style jsx>{`
                                            #${opt.id}:checked ~ div {
                                                border-color: ${primaryColor};
                                                background-color: ${primaryLight};
                                            }
                                            #${opt.id}:checked ~ span {
                                                color: ${primaryColor};
                                                font-weight: 700;
                                            }
                                            #${opt.id}:checked ~ .radio-indicator {
                                                border-color: ${primaryColor};
                                            }
                                            #${opt.id}:checked ~ .radio-indicator div {
                                                background-color: ${primaryColor};
                                                opacity: 1;
                                            }
                                        `}</style>

                                        <div className="radio-indicator w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center mr-3 transition-all">
                                            <div className="w-2 h-2 bg-white rounded-full opacity-0 transition-opacity" />
                                        </div>
                                        <span className="text-base font-medium text-slate-700 transition-colors">
                                            {opt.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {/* Checkbox */}
                        {question.type === 'CHECKBOX' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                {question.options.map(opt => (
                                    <label key={opt.id} className="relative flex items-center p-4 rounded-xl border-2 border-slate-100 hover:bg-white cursor-pointer transition-all hover:shadow-md">
                                        <input
                                            {...register(question.id, { required: question.required })}
                                            type="checkbox"
                                            id={opt.id}
                                            value={opt.label}
                                            className="peer sr-only"
                                        />
                                        
                                        <style jsx>{`
                                            #${opt.id}:checked ~ div {
                                                border-color: ${primaryColor};
                                                background-color: ${primaryLight};
                                            }
                                            #${opt.id}:checked ~ span {
                                                color: ${primaryColor};
                                                font-weight: 700;
                                            }
                                            #${opt.id}:checked ~ .checkbox-indicator {
                                                border-color: ${primaryColor};
                                                background-color: ${primaryColor};
                                            }
                                            #${opt.id}:checked ~ .checkbox-indicator svg {
                                                opacity: 1;
                                            }
                                        `}</style>

                                        <div className="checkbox-indicator w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center mr-3 transition-all text-white">
                                            <Check size={12} className="opacity-0 transition-opacity" strokeWidth={4} />
                                        </div>
                                        <span className="text-base font-medium text-slate-700 transition-colors">
                                            {opt.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {/* File Upload */}
                        {question.type === 'FILE_UPLOAD' && (
                            <div className="mt-2">
                                <input
                                    type="hidden"
                                    {...register(question.id, { required: question.required })}
                                />
                                
                                {!fileUrls[question.id] ? (
                                    <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-slate-50 transition-colors text-center group cursor-pointer">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => handleFileUpload(e, question.id)}
                                            disabled={uploading[question.id]}
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            <div 
                                                className="p-4 rounded-full transition-transform group-hover:scale-110"
                                                style={{ backgroundColor: primaryLight, color: primaryColor }}
                                            >
                                                {uploading[question.id] ? (
                                                    <Loader2 size={24} className="animate-spin" />
                                                ) : (
                                                    <Upload size={24} />
                                                )}
                                            </div>
                                            <p className="font-medium text-slate-700">
                                                {uploading[question.id] ? "Uploading..." : "Click or drag file to upload"}
                                            </p>
                                            <p className="text-xs text-slate-400">Max file size: 5MB</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                                                <File size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">
                                                    {fileUrls[question.id].split('/').pop()}
                                                </p>
                                                <p className="text-xs font-medium text-green-600">Upload Complete</p>
                                            </div>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => removeFile(question.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {errors[question.id] && (
                        <p className="mt-2 text-sm text-red-500 font-medium flex items-center gap-1 animate-pulse">
                            <span>⚠️</span> {getErrorMessage(question)}
                        </p>
                    )}
                </div>
            ))}

            <div className="pt-8 mt-12 border-t border-slate-100 flex justify-between gap-4">
                {prevVisibleStepIndex !== null && (
                    <button
                        type="button"
                        onClick={handleBack}
                        className="px-8 py-4 rounded-full border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        Back
                    </button>
                )}
                
                {!isLastVisibleStep ? (
                    <button
                        type="button"
                        onClick={handleNext}
                        className="ml-auto px-8 py-4 rounded-full shadow-lg text-lg font-bold text-white transition-all hover:scale-[1.01] active:scale-95 flex items-center gap-2"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryLight}` }}
                    >
                        Next <ArrowRight size={20} />
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="ml-auto px-8 py-4 rounded-full shadow-lg text-lg font-bold text-white focus:outline-none focus:ring-4 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryLight}` }}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin h-6 w-6" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                Submit Application <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                )}
            </div>
        </form>
    </div>
  );
}
