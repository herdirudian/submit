import { getPollAnalytics } from "@/actions/poll";
import { notFound } from "next/navigation";
import PollAnalyticsDashboard from "@/components/PollAnalyticsDashboard";

type SearchParams = { from?: string; to?: string };

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

export default async function PollAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const sParams = await searchParams;

  const fromVal = sParams?.from ?? toDateInputValue(defaultFrom());
  const toVal = sParams?.to ?? toDateInputValue(new Date());

  try {
    const poll = await getPollAnalytics(id, fromVal, toVal);

    if (!poll) notFound();

    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-deskripsi">
        <div className="max-w-7xl mx-auto">
          <PollAnalyticsDashboard
            poll={poll}
            dateRange={{
              from: fromVal,
              to: toVal,
            }}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error(`[POLL ANALYTICS] Error:`, error);
    notFound();
  }
}
