import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import ExportButton from "@/components/ExportButton";

type SearchParams = {
  q?: string;
  from?: string;
  to?: string;
  page?: string;
};

const PAGE_SIZE = 25;

const parseDate = (value?: string) => {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export default async function FormResponsesPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: SearchParams;
}) {
  // Await params before accessing its properties
  const { id } = await params;

  const q = (searchParams?.q ?? "").trim();
  const from = parseDate(searchParams?.from ?? undefined);
  const toRaw = parseDate(searchParams?.to ?? undefined);
  const to = toRaw ? endOfDay(toRaw) : null;
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!form) {
    notFound();
  }

  const responseWhere: any = {
    formId: form.id,
  };
  if (from || to) {
    responseWhere.submittedAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  if (q) {
    responseWhere.answers = { some: { value: { contains: q } } };
  }

  const [total, responses] = await Promise.all([
    prisma.response.count({ where: responseWhere }),
    prisma.response.findMany({
      where: responseWhere,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { answers: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (next: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const merged: SearchParams = { ...searchParams, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.from) params.set("from", merged.from);
    if (merged.to) params.set("to", merged.to);
    if (merged.page && merged.page !== "1") params.set("page", merged.page);
    const qs = params.toString();
    return qs ? `/forms/${form.id}?${qs}` : `/forms/${form.id}`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{form.title}</h1>
          <p className="text-slate-500">Responses: {total}</p>
        </div>
        <div className="flex gap-2">
            <Link 
                href={`/analytics/${form.id}`} 
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-medium transition-colors text-sm flex items-center gap-2"
            >
                View Analytics
            </Link>
            <Link 
                href={`/builder/${form.id}`} 
                className="px-4 py-2 border rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
            >
                Edit Form
            </Link>
            <ExportButton id={form.id} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-100 p-4 mb-4">
        <form className="grid grid-cols-1 md:grid-cols-4 gap-3" action={`/forms/${form.id}`}>
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari keyword di jawaban"
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
          <div className="md:col-span-4 flex items-center justify-between gap-3">
            <Link href={`/forms/${form.id}`} className="text-sm font-semibold text-slate-600 hover:underline">
              Reset
            </Link>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
            >
              Terapkan
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto flex-1">
          {responses.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                  No responses yet.
              </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                    Submitted At
                  </th>
                  {form.questions.map((question) => (
                    <th key={question.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                      {question.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {responses.map((response) => (
                  <tr key={response.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(response.submittedAt), "MMM d, yyyy h:mm a")}
                    </td>
                    {form.questions.map((question) => {
                      const answer = response.answers.find(a => a.questionId === question.id);
                      return (
                        <td key={question.id} className="px-6 py-4 text-sm text-gray-900">
                          {answer?.value || "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      <div className="mt-4 flex items-center justify-between">
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
  );
}
