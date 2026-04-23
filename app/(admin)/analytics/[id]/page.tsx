import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

type SearchParams = { from?: string; to?: string };

const parseDate = (value?: string) => {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const defaultFrom = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
};

const toDateInputValue = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: SearchParams;
}) {
  // Await params before accessing its properties
  const { id } = await params;
  const fromRaw = parseDate(searchParams?.from ?? undefined) ?? defaultFrom();
  const toRaw = parseDate(searchParams?.to ?? undefined) ?? new Date();
  const from = new Date(fromRaw.getFullYear(), fromRaw.getMonth(), fromRaw.getDate(), 0, 0, 0, 0);
  const to = endOfDay(toRaw);

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: {
            orderBy: { order: "asc" },
          },
        },
      },
      responses: {
        where: {
          submittedAt: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { submittedAt: "desc" },
        include: {
          answers: true,
        },
      },
    },
  });

  if (!form) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
            <AnalyticsDashboard
              form={form}
              dateRange={{
                from: toDateInputValue(from),
                to: toDateInputValue(toRaw),
              }}
            />
        </div>
    </div>
  );
}
