import { getSystemStats, getRecentActivity } from "@/actions/analytics";
import { BarChart3, FileText, Users, Clock, ArrowUpRight } from "lucide-react";
import { formatDistance } from "date-fns";
import Link from "next/link";

export default async function AnalyticsPage() {
    const stats = await getSystemStats();
    const recentActivity = await getRecentActivity();

    return (
        <div>
            <div className="mb-8">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2">
                    <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
                        Dashboard
                    </Link>
                    <span>/</span>
                    <span className="text-slate-500">Analytics</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
                <p className="text-slate-500 mt-1">Ringkasan performa dan aktivitas sistem.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-primary-50 rounded-xl text-primary-600">
                            <FileText size={24} />
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <ArrowUpRight size={12} /> +12%
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Forms</p>
                        <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.totalForms}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <BarChart3 size={24} />
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <ArrowUpRight size={12} /> +24%
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Responses</p>
                        <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.totalResponses}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                            <Users size={24} />
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-full">
                            -
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Users</p>
                        <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.totalUsers}</h3>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Clock size={20} className="text-slate-400" />
                        Recent Activity
                    </h2>
                </div>
                
                {recentActivity.length === 0 ? (
                    <div className="p-10 text-center text-slate-500">
                        No recent activity found.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {recentActivity.map((activity) => (
                            <div key={activity.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 font-bold text-xs">
                                        SUB
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            New submission for <span className="text-primary-600">{activity.form.title}</span>
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            ID: {activity.id.substring(0, 8)}...
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                                    {formatDistance(new Date(activity.submittedAt), new Date(), { addSuffix: true })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
