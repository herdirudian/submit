import { getPollAnalytics } from "@/actions/poll";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, PieChart, TrendingUp, Users, Award } from "lucide-react";
import Image from "next/image";

export default async function PollAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    try {
        const poll = await getPollAnalytics(id);

        if (!poll) notFound();

        const totalVotes = poll.questions.reduce((acc, q) => {
            const qVotes = q.options.reduce((oAcc, opt) => oAcc + opt._count.results, 0);
            return Math.max(acc, qVotes);
        }, 0);

        const recentResults = (poll as any).recentResults || [];

        return (
            <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-deskripsi">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                        <div className="flex items-center gap-4">
                            <Link href={`/polls/${id}`} className="p-2 bg-white hover:bg-slate-100 rounded-full transition-all text-slate-400 border border-slate-200 shadow-sm">
                                <ArrowLeft size={20} />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800 font-judul">{poll.title} - Analitik</h1>
                                <p className="text-slate-500">Lihat performa dan produk terpopuler Anda.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                                <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Total Suara</p>
                                    <p className="text-xl font-bold text-slate-800">{totalVotes}</p>
                                </div>
                            </div>
                            <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Views</p>
                                    <p className="text-xl font-bold text-slate-800">{poll.views}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-10">
                        {poll.questions.map((q) => (
                            <div key={q.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-50 flex items-center gap-3 bg-slate-50/30">
                                    <div className="p-2 bg-white rounded-xl shadow-sm text-primary-600">
                                        <PieChart size={20} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 font-judul">{q.label}</h3>
                                </div>
                                
                                <div className="p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Bar Chart Representation */}
                                        <div className="space-y-6">
                                            {q.options
                                                .sort((a, b) => b._count.results - a._count.results)
                                                .map((opt, idx) => {
                                                    const percentage = totalVotes > 0 ? Math.round((opt._count.results / totalVotes) * 100) : 0;
                                                    return (
                                                        <div key={opt.id} className="space-y-2">
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="font-bold text-slate-700 flex items-center gap-2">
                                                                    {idx === 0 && <Award size={16} className="text-yellow-500" />}
                                                                    {opt.label}
                                                                </span>
                                                                <span className="text-slate-400 font-bold">{opt._count.results} Suara ({percentage}%)</span>
                                                            </div>
                                                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-primary-600' : 'bg-slate-300'}`}
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>

                                        {/* Visual Top Products */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {q.options
                                                .sort((a, b) => b._count.results - a._count.results)
                                                .slice(0, 6)
                                                .map((opt, idx) => (
                                                    <div key={opt.id} className={`relative p-3 rounded-2xl border ${idx === 0 ? 'border-primary-200 bg-primary-50/20' : 'border-slate-100 bg-slate-50/50'} flex flex-col items-center text-center`}>
                                                        {idx === 0 && (
                                                            <div className="absolute -top-2 -right-2 bg-yellow-400 text-white p-1.5 rounded-full shadow-lg z-10">
                                                                <Award size={14} strokeWidth={3} />
                                                            </div>
                                                        )}
                                                        <div className="aspect-square w-full rounded-xl bg-slate-200 mb-3 relative overflow-hidden">
                                                            {opt.imageUrl ? (
                                                                <Image src={opt.imageUrl} alt={opt.label} fill className="object-cover" unoptimized />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                    <BarChart3 size={24} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700 truncate w-full">{opt.label}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">{opt._count.results} Votes</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Recent Submissions Table */}
                    <div className="mt-12 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm text-primary-600">
                                    <BarChart3 size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 font-judul">Data Responden Terbaru</h3>
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">100 Data Terakhir</span>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Waktu</th>
                                        <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Langkah/Pertanyaan</th>
                                        <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Pilihan</th>
                                        <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Perangkat</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {recentResults.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-10 text-center text-slate-400 font-medium italic">Belum ada data masuk.</td>
                                        </tr>
                                    ) : (
                                        recentResults.map((res: any) => (
                                            <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-4 text-sm text-slate-500 whitespace-nowrap">
                                                    {new Date(res.createdAt).toLocaleString('id-ID', { 
                                                        dateStyle: 'short', 
                                                        timeStyle: 'short' 
                                                    })}
                                                </td>
                                                <td className="px-8 py-4 text-sm font-bold text-slate-700">
                                                    {res.option.question.label}
                                                </td>
                                                <td className="px-8 py-4">
                                                    <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-bold">
                                                        {res.option.label}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-[10px] text-slate-400 max-w-[200px] truncate" title={res.userAgent}>
                                                    {res.userAgent || 'Unknown'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error(`[POLL ANALYTICS] Error:`, error);
        notFound();
    }
}
