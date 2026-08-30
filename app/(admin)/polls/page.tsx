import { getPolls } from "@/actions/poll";
import CreatePollButton from "@/components/CreatePollButton";
import Link from "next/link";
import { formatDistance } from "date-fns";
import { Calendar, Edit, Eye, PieChart, Trash2, BarChart2 } from "lucide-react";

type PollsSearchParams = { status?: string };

export default async function PollsPage({ searchParams }: { searchParams: Promise<PollsSearchParams> }) {
  const polls = await getPolls();
  const sParams = await searchParams;
  const activeStatus = (sParams?.status ?? "all").toLowerCase();

  const counts = {
    all: polls.length,
    draft: polls.filter((p) => p.status === "DRAFT").length,
    published: polls.filter((p) => p.status === "PUBLISHED").length,
    closed: polls.filter((p) => p.status === "CLOSED").length,
  };

  const filteredPolls =
    activeStatus === "draft"
      ? polls.filter((p) => p.status === "DRAFT")
      : activeStatus === "published"
        ? polls.filter((p) => p.status === "PUBLISHED")
        : activeStatus === "closed"
          ? polls.filter((p) => p.status === "CLOSED")
          : polls;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2">
            <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-500">Polling</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Polling Interaktif</h1>
          <p className="text-slate-500 mt-1">Buat polling produk dengan kategori hierarki.</p>
        </div>
        <CreatePollButton />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/polls"
          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            activeStatus === "all"
              ? "bg-primary-50 text-primary-700 border-primary-100"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Semua <span className="text-xs font-bold opacity-80">({counts.all})</span>
        </Link>
        <Link
          href="/polls?status=draft"
          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            activeStatus === "draft"
              ? "bg-yellow-50 text-yellow-700 border-yellow-100"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Draft <span className="text-xs font-bold opacity-80">({counts.draft})</span>
        </Link>
        <Link
          href="/polls?status=published"
          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            activeStatus === "published"
              ? "bg-green-50 text-green-700 border-green-100"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Published <span className="text-xs font-bold opacity-80">({counts.published})</span>
        </Link>
        <Link
          href="/polls?status=closed"
          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            activeStatus === "closed"
              ? "bg-red-50 text-red-700 border-red-100"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Closed <span className="text-xs font-bold opacity-80">({counts.closed})</span>
        </Link>
      </div>

      {filteredPolls.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
            <PieChart size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-800">Belum ada polling</h3>
          <p className="text-slate-500 mb-6">Mulai buat polling interaktif pertamamu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPolls.map((poll) => (
            <div
              key={poll.id}
              className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                    <PieChart size={20} />
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      poll.status === "PUBLISHED"
                        ? "bg-green-50 text-green-600 border-green-100"
                        : poll.status === "DRAFT"
                          ? "bg-yellow-50 text-yellow-600 border-yellow-100"
                          : "bg-red-50 text-red-600 border-red-100"
                    }`}
                  >
                    {poll.status === "DRAFT" ? "Draft" : poll.status === "PUBLISHED" ? "Published" : "Closed"}
                  </span>
                </div>

                <h3 className="font-bold text-lg text-slate-800 mb-2 truncate group-hover:text-primary-700 transition-colors">
                  {poll.title}
                </h3>
                
                <div className="flex items-center gap-4 mt-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Votes</span>
                        <span className="text-lg font-bold text-slate-700">{(poll as any)._count.results}</span>
                    </div>
                    <div className="h-8 w-[1px] bg-slate-100"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Views</span>
                        <span className="text-lg font-bold text-slate-700">{poll.views}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-6">
                  <Calendar size={14} />
                  <span>Dibuat {formatDistance(new Date(poll.createdAt), new Date(), { addSuffix: true })}</span>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <Link
                    href={`/polls/${poll.id}`}
                    className="text-sm font-semibold text-slate-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Edit size={16} /> Edit
                  </Link>
                  <Link
                    href={`/polls/${poll.id}/analytics`}
                    className="text-sm font-semibold text-slate-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
                  >
                    <BarChart2 size={16} /> Analytics
                  </Link>
                  <Link
                    href={`/public/polls/${poll.slug}`}
                    target="_blank"
                    className="text-sm font-semibold text-slate-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Eye size={16} /> Preview
                  </Link>
                </div>
                <button className="text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
