import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
    const lastUpdated = "10 Agustus 2026";

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 sm:p-12">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Kebijakan Privasi</h1>
                            <p className="text-slate-500 text-sm">Terakhir diperbarui: {lastUpdated}</p>
                        </div>
                    </div>

                    <div className="prose prose-slate max-w-none space-y-8 text-slate-600">
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">1. Informasi yang Kami Kumpulkan</h2>
                            <p>
                                Kami mengumpulkan informasi yang Anda berikan langsung kepada kami saat Anda menggunakan layanan CRM kami, termasuk namun tidak terbatas pada:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Informasi Kontak (Nama, Alamat Email, Nomor WhatsApp).</li>
                                <li>Data Interaksi (Riwayat pesan WhatsApp dan email).</li>
                                <li>Informasi Profil Bisnis (jika ada).</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">2. Penggunaan Informasi</h2>
                            <p>Informasi yang kami kumpulkan digunakan untuk:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Menyediakan, memelihara, dan meningkatkan layanan komunikasi kami.</li>
                                <li>Mengirimkan notifikasi operasional dan kampanye pemasaran (Email & WhatsApp) terkait The Lodge Maribaya.</li>
                                <li>Menanggapi komentar, pertanyaan, dan memberikan layanan pelanggan.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">3. Perlindungan Data</h2>
                            <p>
                                Keamanan data Anda adalah prioritas kami. Kami menggunakan enkripsi dan prosedur keamanan tingkat industri untuk melindungi informasi pribadi Anda dari akses, penggunaan, atau pengungkapan yang tidak sah.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">4. Penghapusan Data (Data Deletion)</h2>
                            <p>
                                Pengguna memiliki hak untuk meminta penghapusan data pribadi mereka dari sistem kami kapan saja. Jika Anda ingin menghapus data Anda, silakan hubungi kami melalui email di <strong>admin@thelodgegroup.id</strong> dengan subjek "Permintaan Penghapusan Data".
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">5. Kontak Kami</h2>
                            <p>
                                Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, silakan hubungi kami di:
                                <br />
                                <strong>The Lodge Maribaya</strong>
                                <br />
                                Email: admin@thelodgegroup.id
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
