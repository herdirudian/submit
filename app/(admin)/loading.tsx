import { FileText } from "lucide-react";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
          <div className="h-7 w-56 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="h-10 w-28 bg-slate-100 rounded-xl animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-400">
                <FileText size={24} />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                <div className="h-7 w-16 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 space-y-3">
              <div className="h-5 w-3/4 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
              <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
