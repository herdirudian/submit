import React from "react";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
    const lastUpdated = "10 Agustus 2026";

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 sm:p-12">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Syarat & Ketentuan</h1>
                            <p className="text-slate-500 text-sm">Terakhir diperbarui: {lastUpdated}</p>
                        </div>
                    </div>

                    <div className="prose prose-slate max-w-none space-y-8 text-slate-600">
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">1. Penerimaan Ketentuan</h2>
                            <p>
                                Dengan mengakses dan menggunakan sistem CRM ini, Anda setuju untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak setuju dengan bagian mana pun dari ketentuan ini, Anda tidak diperkenankan menggunakan layanan kami.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">2. Penggunaan Layanan</h2>
                            <p>
                                Layanan ini disediakan khusus untuk pengelolaan komunikasi pelanggan The Lodge Maribaya. Anda setuju untuk:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Memberikan informasi yang akurat dan lengkap.</li>
                                <li>Tidak menggunakan layanan untuk tujuan ilegal atau tidak sah.</li>
                                <li>Menjaga keamanan akun dan akses Anda ke sistem.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">3. Komunikasi WhatsApp & Email</h2>
                            <p>
                                Dengan menggunakan layanan ini, Anda memberikan persetujuan untuk menerima komunikasi melalui WhatsApp dan Email dari The Lodge Maribaya terkait informasi operasional, reservasi, dan promosi yang relevan.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">4. Batasan Tanggung Jawab</h2>
                            <p>
                                The Lodge Maribaya tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau konsekuensial yang timbul dari penggunaan atau ketidakmampuan menggunakan layanan ini.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">5. Perubahan Ketentuan</h2>
                            <p>
                                Kami berhak untuk mengubah Syarat dan Ketentuan ini kapan saja. Perubahan akan berlaku segera setelah diposting di halaman ini.
                            </p>
                        </section>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
                        <Link 
                            href="/"
                            className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                        >
                            <ArrowLeft size={16} />
                            Kembali ke Beranda
                        </Link>
                        <p className="text-xs text-slate-400">© 2026 The Lodge Group. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
