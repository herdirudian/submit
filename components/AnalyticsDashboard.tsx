"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { Form, Question, Response, Answer, QuestionOption } from "@prisma/client";
import { ArrowLeft, Eye, FileText, MousePointerClick, Download } from "lucide-react";
import Link from "next/link";
import ExportButton from "@/components/ExportButton";
import { useRouter } from "next/navigation";

type FormWithData = Form & {
    questions: (Question & { options: QuestionOption[] })[];
    responses: (Response & { answers: Answer[] })[];
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

type DateRange = { from: string; to: string };

export default function AnalyticsDashboard({ form, dateRange }: { form: FormWithData; dateRange: DateRange }) {
    // 1. Calculate Summary Stats
    const totalResponses = form.responses.length;
    const views = form.views || 0; 
    const conversionRate = views > 0 ? ((totalResponses / views) * 100).toFixed(1) : 0;
    
    const [isClient, setIsClient] = useState(false);
    const router = useRouter();
    const [from, setFrom] = useState(dateRange.from);
    const [to, setTo] = useState(dateRange.to);
    
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        setFrom(dateRange.from);
        setTo(dateRange.to);
    }, [dateRange.from, dateRange.to]);

    // 2. Prepare Chart Data
    const getChartData = (question: Question & { options: QuestionOption[] }) => {
        const counts: Record<string, number> = {};
        
        // Initialize with 0 for all options
        question.options.forEach(opt => {
            counts[opt.label] = 0;
        });

        // Count answers
        form.responses.forEach(res => {
            const answer = res.answers.find(a => a.questionId === question.id);
            if (answer && answer.value) {
                // Split for multi-select (checkboxes)
                const values = answer.value.split(', ');
                values.forEach(val => {
                    // Only count if it's a valid option (or accumulate all values if we want raw data)
                    // For now, let's also include values that might not be in current options to be safe
                    if (counts[val] === undefined) {
                        counts[val] = 0;
                    }
                    counts[val]++;
                });
            }
        });

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0); // Only show options with data? Or show all? Let's show all for context but maybe filter empty if too many
    };

    const getTopAnswers = (question: Question & { options: QuestionOption[] }, limit = 5) => {
        const counts: Record<string, number> = {};

        const addValue = (value: string) => {
            const v = value.trim();
            if (!v) return;
            counts[v] = (counts[v] ?? 0) + 1;
        };

        form.responses.forEach((res) => {
            const answer = res.answers.find((a) => a.questionId === question.id);
            if (!answer?.value) return;

            if (question.type === "CHECKBOX") {
                const raw = answer.value.trim();
                if (!raw) return;
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        parsed.forEach((v) => typeof v === "string" && addValue(v));
                        return;
                    }
                } catch {}
                raw.split(",").map((s) => s.trim()).filter(Boolean).forEach(addValue);
                return;
            }

            addValue(answer.value);
        });

        return Object.entries(counts)
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    };

    const exportChartData = () => {
        const escapeCsv = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
        const rows: string[] = [];
        rows.push(["question", "type", "answer", "count", "percent"].map(escapeCsv).join(","));

        form.questions.forEach((q) => {
            if (["DROPDOWN", "RADIO", "CHECKBOX"].includes(q.type)) {
                const data = getChartData(q);
                data
                    .sort((a, b) => b.value - a.value)
                    .forEach((d) => {
                        const pct = totalResponses > 0 ? ((d.value / totalResponses) * 100).toFixed(2) : "0.00";
                        rows.push([q.label, q.type, d.name, String(d.value), pct].map(escapeCsv).join(","));
                    });
                return;
            }

            const top = getTopAnswers(q, 50);
            top.forEach((t) => {
                const pct = totalResponses > 0 ? ((t.count / totalResponses) * 100).toFixed(2) : "0.00";
                rows.push([q.label, q.type, t.value, String(t.count), pct].map(escapeCsv).join(","));
            });
        });

        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analytics-${form.slug}-${from}_to_${to}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const applyRange = () => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const qs = params.toString();
        router.push(qs ? `/analytics/${form.id}?${qs}` : `/analytics/${form.id}`);
    };

    if (!isClient) return <div className="p-10 text-center">Loading analytics...</div>;

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{form.title}</h1>
                        <p className="text-slate-500">Analytics & Insights</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                     <Link 
                        href={`/builder/${form.id}`} 
                        className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-medium transition-colors text-sm"
                    >
                        Edit Form
                    </Link>
                    <button
                        type="button"
                        onClick={exportChartData}
                        className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-medium transition-colors text-sm flex items-center gap-2"
                    >
                        <Download size={16} /> Export Chart Data
                    </button>
                    <ExportButton id={form.id} />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                    <div className="text-sm font-bold text-slate-800">Rentang tanggal</div>
                    <div className="text-xs text-slate-500 mt-1">Filter responses yang dipakai untuk analytics.</div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-500 mb-1">From</label>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-500 mb-1">To</label>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={applyRange}
                        className="h-[42px] mt-[18px] px-5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
                    >
                        Terapkan
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Responses</p>
                        <h3 className="text-2xl font-bold text-slate-800">{totalResponses}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-4 bg-purple-50 text-purple-600 rounded-xl">
                        <Eye size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Views</p>
                        <h3 className="text-2xl font-bold text-slate-800">{views}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-4 bg-green-50 text-green-600 rounded-xl">
                        <MousePointerClick size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Conversion Rate</p>
                        <h3 className="text-2xl font-bold text-slate-800">{conversionRate}%</h3>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {form.questions.map((question) => {
                    if (!['DROPDOWN', 'RADIO', 'CHECKBOX'].includes(question.type)) return null;

                    const data = getChartData(question);
                    const isPie = question.type === 'RADIO' || question.type === 'DROPDOWN';
                    const hasData = data.some(d => d.value > 0);
                    const top = [...data].sort((a, b) => b.value - a.value).slice(0, 5);

                    return (
                        <div key={question.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-50 pb-4">
                                {question.label}
                            </h3>
                            <div className="h-64 w-full flex items-center justify-center">
                                {hasData ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        {isPie ? (
                                            <PieChart>
                                                <Pie
                                                    data={data}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {data.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        ) : (
                                            <BarChart data={data}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                                <Bar dataKey="value" fill="#0f4d39" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-slate-400 text-sm">No data available yet</div>
                                )}
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Top Answers</div>
                                {top.length === 0 ? (
                                    <div className="text-sm text-slate-400">Belum ada jawaban.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {top.map((t) => (
                                            <div key={t.name} className="flex items-center justify-between gap-3">
                                                <div className="text-sm text-slate-700 truncate">{t.name}</div>
                                                <div className="text-sm font-bold text-slate-800">
                                                    {t.value}
                                                    <span className="text-xs text-slate-400 font-semibold ml-2">
                                                        {totalResponses > 0 ? `${Math.round((t.value / totalResponses) * 100)}%` : "0%"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-lg font-bold text-slate-800">Top Answers (Non-Choice)</div>
                        <div className="text-sm text-slate-500">Ringkasan jawaban untuk pertanyaan teks/angka/dll.</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {form.questions
                        .filter((q) => !["DROPDOWN", "RADIO", "CHECKBOX"].includes(q.type))
                        .map((q) => {
                            const top = getTopAnswers(q, 5);
                            return (
                                <div key={q.id} className="border border-slate-100 rounded-2xl p-5">
                                    <div className="font-bold text-slate-800 mb-1">{q.label}</div>
                                    <div className="text-xs text-slate-400 font-semibold mb-3">{q.type}</div>
                                    {top.length === 0 ? (
                                        <div className="text-sm text-slate-400">Belum ada jawaban.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {top.map((t) => (
                                                <div key={t.value} className="flex items-center justify-between gap-3">
                                                    <div className="text-sm text-slate-700 truncate">{t.value}</div>
                                                    <div className="text-sm font-bold text-slate-800">
                                                        {t.count}
                                                        <span className="text-xs text-slate-400 font-semibold ml-2">
                                                            {totalResponses > 0 ? `${Math.round((t.count / totalResponses) * 100)}%` : "0%"}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>
            
             {/* Recent Responses Table */}
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800">Recent Responses</h3>
                    <Link href={`/forms/${form.id}`} className="text-primary-600 text-sm font-medium hover:underline">
                        View All
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                                {form.questions.slice(0, 3).map(q => (
                                    <th key={q.id} className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {q.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {form.responses.slice(0, 5).map(response => (
                                <tr key={response.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {format(new Date(response.submittedAt), "MMM d, HH:mm")}
                                    </td>
                                    {form.questions.slice(0, 3).map(q => {
                                        const answer = response.answers.find(a => a.questionId === q.id);
                                        return (
                                            <td key={q.id} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 max-w-[200px] truncate">
                                                {answer?.value || "-"}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
