import { getDashboardStats, getForms } from "@/actions/form";
import CreateFormButton from "@/components/CreateFormButton";
import Link from "next/link";
import { formatDistance } from "date-fns";
import { FileText, Eye, Edit, Calendar, Clock, BarChart } from "lucide-react";
import DeleteFormButton from "@/components/DeleteFormButton";

export default async function DashboardPage() {
  const forms = await getForms();
  const stats = await getDashboardStats();

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2">
              <span className="text-slate-500">Dashboard</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 mt-1">Ringkasan aktivitas dan form terbaru.</p>
        </div>
        <CreateFormButton />
      </div>

      {/* Stats Cards (Mockup) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-primary-50 rounded-xl text-primary-600">
                  <FileText size={24} />
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-medium">Total Forms</p>
                  <h3 className="text-2xl font-bold text-slate-800">{stats.totalForms}</h3>
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                  <BarChart size={24} />
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-medium">Total Responses</p>
                  <h3 className="text-2xl font-bold text-slate-800">{stats.totalResponses}</h3>
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                  <Clock size={24} />
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-medium">Pending Review</p>
                  <h3 className="text-2xl font-bold text-slate-800">0</h3>
              </div>
          </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold text-slate-800">Recent Forms</h2>
        <Link href="/forms" className="text-sm font-semibold text-primary-600 hover:underline">
          Lihat semua
        </Link>
      </div>

      {forms.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
            <FileText size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-800">No forms created yet</h3>
          <p className="text-slate-500 mb-6">Create your first form to get started collecting data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <div key={form.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                        <FileText size={20} />
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        form.status === 'PUBLISHED' ? 'bg-green-50 text-green-600 border-green-100' :
                        form.status === 'DRAFT' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                        'bg-red-50 text-red-600 border-red-100'
                    }`}>
                        {form.status}
                    </span>
                </div>
                
                <h3 className="font-bold text-lg text-slate-800 mb-2 truncate group-hover:text-primary-700 transition-colors">{form.title}</h3>
                <p className="text-slate-500 text-sm line-clamp-2 min-h-[40px] mb-4">
                    {form.description || "No description provided."}
                </p>
                
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <Calendar size={14} />
                    <span>{formatDistance(new Date(form.createdAt), new Date(), { addSuffix: true })}</span>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                <div className="flex gap-3">
                    <Link 
                        href={`/builder/${form.id}`} 
                        className="text-sm font-semibold text-slate-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
                    >
                        <Edit size={16} /> Edit
                    </Link>
                    <Link 
                        href={`/forms/${form.id}`} 
                        className="text-sm font-semibold text-slate-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
                    >
                        <Eye size={16} /> View
                    </Link>
                </div>
                <DeleteFormButton id={form.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
