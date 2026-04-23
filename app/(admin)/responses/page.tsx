import prisma from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { FileText } from "lucide-react";

type SearchParams = {
  q?: string;
  from?: string;
  to?: string;
  status?: string;
  page?: string;
};

const PAGE_SIZE = 20;

const parseDate = (value?: string) => {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export default async function ResponsesPage({ searchParams }: { searchParams?: SearchParams }) {
  const q = (searchParams?.q ?? "").trim();
  const from = parseDate(searchParams?.from ?? undefined);
  const toRaw = parseDate(searchParams?.to ?? undefined);
  const to = toRaw ? endOfDay(toRaw) : null;
  const statusRaw = (searchParams?.status ?? "all").toLowerCase();
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);

  const where: any = {};
  if (from || to) {
    where.submittedAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  if (statusRaw !== "all") {
    where.form = { ...(where.form ?? {}), status: statusRaw.toUpperCase() };
  }
  if (q) {
    where.OR = [
      { form: { title: { contains: q } } },
      { answers: { some: { value: { contains: q } } } },
    ];
  }

  const [total, responses] = await Promise.all([
    prisma.response.count({ where }),
    prisma.response.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        form: { select: { id: true, title: true, status: true } },
        answers: { select: { value: true }, take: 1 },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (next: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const merged: SearchParams = { ...searchParams, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.from) params.set("from", merged.from);
    if (merged.to) params.set("to", merged.to);
    if (merged.status && merged.status !== "all") params.set("status", merged.status);
    if (merged.page && merged.page !== "1") params.set("page", merged.page);
    const qs = params.toString();
    return qs ? `/responses?${qs}` : "/responses";
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2">
          <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-500">Responses</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Responses</h1>
        <p className="text-slate-500 mt-1">Cari dan filter submission dari semua form.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <form className="p-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-5 gap-3" action="/responses">
          <input
            name="q"
            defaultValue={q}
            placeholder="Keyword (form / jawaban)"
            className="md:col-span-2 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
          />
          <input
            type="date"
            name="from"
            defaultValue={searchParams?.from ?? ""}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
          />
          <input
            type="date"
            name="to"
            defaultValue={searchParams?.to ?? ""}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
          />
          <select
            name="status"
            defaultValue={statusRaw}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="all">Semua status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>
          <div className="md:col-span-5 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-500">
              Total: <span className="font-semibold text-slate-700">{total}</span>
            </div>
            <div className="flex gap-2">
              <Link
                href="/responses"
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                Reset
              </Link>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
              >
                Terapkan
              </button>
            </div>
          </div>
        </form>

        {responses.length === 0 ? (
          <div className="p-10 text-center text-slate-500">Tidak ada responses untuk filter ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Form
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Snippet
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {responses.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {format(new Date(r.submittedAt), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-800 font-semibold max-w-[360px] truncate">
                      {r.form.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold">
                      <span
                        className={`px-2.5 py-1 rounded-full border ${
                          r.form.status === "PUBLISHED"
                            ? "bg-green-50 text-green-700 border-green-100"
                            : r.form.status === "DRAFT"
                              ? "bg-yellow-50 text-yellow-700 border-yellow-100"
                              : "bg-red-50 text-red-700 border-red-100"
                        }`}
                      >
                        {r.form.status === "DRAFT" ? "Draft" : r.form.status === "PUBLISHED" ? "Published" : "Closed"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-[420px] truncate">
                      {r.answers[0]?.value || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/forms/${r.form.id}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors text-sm"
                      >
                        <FileText size={16} /> Buka
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-6 border-t border-slate-100 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Page <span className="font-semibold text-slate-700">{page}</span> /{" "}
            <span className="font-semibold text-slate-700">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <Link
              href={buildHref({ page: String(Math.max(1, page - 1)) })}
              className={`px-4 py-2 rounded-xl border font-semibold transition-colors ${
                page <= 1
                  ? "border-slate-200 text-slate-300 pointer-events-none"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Prev
            </Link>
            <Link
              href={buildHref({ page: String(Math.min(totalPages, page + 1)) })}
              className={`px-4 py-2 rounded-xl border font-semibold transition-colors ${
                page >= totalPages
                  ? "border-slate-200 text-slate-300 pointer-events-none"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

