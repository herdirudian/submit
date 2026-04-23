"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 max-w-lg w-full">
        <div className="text-sm font-semibold text-red-600 mb-2">Terjadi kesalahan</div>
        <div className="text-xl font-bold text-slate-800 mb-2">Gagal memuat halaman</div>
        <div className="text-slate-500 text-sm mb-6">
          Coba muat ulang. Kalau masih terjadi, periksa koneksi database atau konfigurasi environment.
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
          >
            Coba lagi
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
          >
            Ke Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
