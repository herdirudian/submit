import { getForms } from "@/actions/form";
import CreateFormButton from "@/components/CreateFormButton";
import DeleteFormButton from "@/components/DeleteFormButton";
import DuplicateFormButton from "@/components/DuplicateFormButton";
import Link from "next/link";
import { formatDistance } from "date-fns";
import { Calendar, Edit, Eye, FileText } from "lucide-react";

type FormsSearchParams = { status?: string };

export default async function FormsPage({ searchParams }: { searchParams?: FormsSearchParams }) {
  const forms = await getForms();
  const activeStatus = (searchParams?.status ?? "all").toLowerCase();
  const counts = {
    all: forms.length,
    draft: forms.filter((f) => f.status === "DRAFT").length,
    published: forms.filter((f) => f.status === "PUBLISHED").length,
    closed: forms.filter((f) => f.status === "CLOSED").length,
  };

  const filteredForms =
    activeStatus === "draft"
      ? forms.filter((f) => f.status === "DRAFT")
      : activeStatus === "published"
        ? forms.filter((f) => f.status === "PUBLISHED")
        : activeStatus === "closed"
          ? forms.filter((f) => f.status === "CLOSED")
          : forms;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2">
            <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-500">Forms</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Forms</h1>
          <p className="text-slate-500 mt-1">Kelola semua form yang kamu buat.</p>
        </div>
        <CreateFormButton />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/forms"
          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            activeStatus === "all"
              ? "bg-primary-50 text-primary-700 border-primary-100"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Semua <span className="text-xs font-bold opacity-80">({counts.all})</span>
        </Link>
        <Link
          href="/forms?status=draft"
          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            activeStatus === "draft"
              ? "bg-yellow-50 text-yellow-700 border-yellow-100"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Draft <span className="text-xs font-bold opacity-80">({counts.draft})</span>
        </Link>
        <Link
          href="/forms?status=published"
          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            activeStatus === "published"
              ? "bg-green-50 text-green-700 border-green-100"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Published <span className="text-xs font-bold opacity-80">({counts.published})</span>
        </Link>
        <Link
          href="/forms?status=closed"
          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            activeStatus === "closed"
              ? "bg-red-50 text-red-700 border-red-100"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Closed <span className="text-xs font-bold opacity-80">({counts.closed})</span>
        </Link>
      </div>

      {filteredForms.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
            <FileText size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-800">Tidak ada form</h3>
          <p className="text-slate-500 mb-6">Coba ganti filter atau buat form baru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map((form) => (
            <div
              key={form.id}
              className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                    <FileText size={20} />
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      form.status === "PUBLISHED"
                        ? "bg-green-50 text-green-600 border-green-100"
                        : form.status === "DRAFT"
                          ? "bg-yellow-50 text-yellow-600 border-yellow-100"
                          : "bg-red-50 text-red-600 border-red-100"
                    }`}
                  >
                    {form.status === "DRAFT" ? "Draft" : form.status === "PUBLISHED" ? "Published" : "Closed"}
                  </span>
                </div>

                <h3 className="font-bold text-lg text-slate-800 mb-2 truncate group-hover:text-primary-700 transition-colors">
                  {form.title}
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2 min-h-[40px] mb-4">
                  {form.description || "No description provided."}
                </p>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <Calendar size={14} />
                  <span>{formatDistance(new Date(form.createdAt), new Date(), { addSuffix: true })}</span>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                <div className="flex gap-3 items-center">
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
                    <Eye size={16} /> Responses
                  </Link>
                  <DuplicateFormButton id={form.id} />
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
