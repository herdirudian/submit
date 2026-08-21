"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, Save } from "lucide-react";
import { getSettingsSnapshot, updateAdminProfile, updateAppSettings } from "@/actions/settings";

type Snapshot = Awaited<ReturnType<typeof getSettingsSnapshot>>;

export default function SettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const [adminName, setAdminName] = useState("");
  const [adminImage, setAdminImage] = useState("");

  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");

  const [address, setAddress] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [whatsappApiUrl, setWhatsappApiUrl] = useState("");
  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  const [whatsappProvider, setWhatsappProvider] = useState("OPENWA");
  const [waAutoReplyEnabled, setWaAutoReplyEnabled] = useState(false);
  const [waAutoReplyMessage, setWaAutoReplyMessage] = useState("");
  const [waWorkingHoursStart, setWaWorkingHoursStart] = useState("08:00");
  const [waWorkingHoursEnd, setWaWorkingHoursEnd] = useState("17:00");
  const [waWorkingDays, setWaWorkingDays] = useState("1,2,3,4,5,6,7");

  const [testWaNumber, setTestWaNumber] = useState("");
  const [isTestingWa, setIsTestingWa] = useState(false);

  const canSave = useMemo(() => !isLoading && !!snapshot?.user, [isLoading, snapshot?.user]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getSettingsSnapshot()
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        setAdminName(data.user?.name ?? "");
        setAdminImage(data.user?.image ?? "");
        setBrandName(data.appSettings.brandName ?? "");
        setBrandLogoUrl(data.appSettings.brandLogoUrl ?? "");
        setFromName(data.appSettings.notificationFromName ?? "");
        setFromEmail(data.appSettings.notificationFromEmail ?? "");
        setAddress(data.appSettings.address ?? "");
        setInstagramUrl(data.appSettings.instagramUrl ?? "");
        setFacebookUrl(data.appSettings.facebookUrl ?? "");
        setTwitterUrl(data.appSettings.twitterUrl ?? "");
        setLinkedinUrl(data.appSettings.linkedinUrl ?? "");
        setWebsiteUrl(data.appSettings.websiteUrl ?? "");
        setTiktokUrl(data.appSettings.tiktokUrl ?? "");
        setWhatsappApiUrl(data.appSettings.whatsappApiUrl ?? "");
        setWhatsappApiKey(data.appSettings.whatsappApiKey ?? "");
        setWhatsappProvider(data.appSettings.whatsappProvider ?? "OPENWA");
        setWaAutoReplyEnabled(data.appSettings.waAutoReplyEnabled ?? false);
        setWaAutoReplyMessage(data.appSettings.waAutoReplyMessage ?? "");
        setWaWorkingHoursStart(data.appSettings.waWorkingHoursStart ?? "08:00");
        setWaWorkingHoursEnd(data.appSettings.waWorkingHoursEnd ?? "17:00");
        setWaWorkingDays(data.appSettings.waWorkingDays ?? "1,2,3,4,5,6,7");
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Gagal memuat Settings");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!data?.success || !data?.url) {
      throw new Error("Upload failed");
    }
    return String(data.url);
  };

  const saveProfile = () => {
    if (!canSave) return;
    startTransition(async () => {
      try {
        await updateAdminProfile({ name: adminName, image: adminImage });
        toast.success("Profil admin tersimpan");
      } catch {
        toast.error("Gagal menyimpan profil admin");
      }
    });
  };

  const saveBranding = () => {
    if (!canSave) return;
    startTransition(async () => {
      try {
        await updateAppSettings({
          brandName,
          brandLogoUrl,
          notificationFromName: fromName,
          notificationFromEmail: fromEmail,
          address,
          instagramUrl,
          facebookUrl,
          twitterUrl,
          linkedinUrl,
          websiteUrl,
          tiktokUrl,
          whatsappApiUrl,
          whatsappApiKey,
          whatsappProvider,
          waAutoReplyEnabled,
          waAutoReplyMessage,
          waWorkingHoursStart,
          waWorkingHoursEnd,
          waWorkingDays,
        });
        toast.success("Settings branding & footer tersimpan");
      } catch {
        toast.error("Gagal menyimpan branding");
      }
    });
  };

  const handleTestWa = async () => {
    if (!testWaNumber) return;
    setIsTestingWa(true);
    toast.loading("Mengirim pesan test (membutuhkan waktu 15-25 detik karena simulasi mengetik)...", { id: 'test-wa' });
    try {
      // Need to import testWhatsAppConnection at the top
      const { testWhatsAppConnection } = await import('@/actions/settings');
      const result = await testWhatsAppConnection(testWaNumber);
      
      if (result.success) {
        toast.success("Test pesan berhasil terkirim!", { id: 'test-wa' });
        setTestWaNumber("");
      } else {
        toast.error(result.error || "Gagal mengirim test pesan", { id: 'test-wa' });
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan internal", { id: 'test-wa' });
    } finally {
      setIsTestingWa(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2">
          <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-500">Settings</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Settings & Branding</h1>
        <p className="text-slate-500 mt-1">Kelola profil admin, branding default, dan email pengirim notifikasi.</p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-500">
          <Loader2 className="inline-block animate-spin mr-2" size={18} />
          Memuat settings...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="text-lg font-bold text-slate-800">Profil Admin</div>
              <div className="text-sm text-slate-500">Info dasar akun admin yang sedang login.</div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama</label>
                <input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  placeholder="Nama admin"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email (readonly)</label>
                <input
                  value={snapshot?.user?.email ?? ""}
                  readOnly
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden relative flex-shrink-0">
                  {adminImage ? (
                    <Image src={adminImage} alt="Profile" fill className="object-cover" />
                  ) : (
                    <ImageIcon size={32} />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Avatar URL (opsional)</label>
                  <input
                    value={adminImage}
                    onChange={(e) => setAdminImage(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={isPending || !canSave}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60"
                >
                  {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Simpan Profil
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="text-lg font-bold text-slate-800">Brand Default</div>
              <div className="text-sm text-slate-500">Dipakai sebagai default logo/brand di public form.</div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Brand</label>
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  placeholder="Nama brand"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Logo URL</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={brandLogoUrl}
                    onChange={(e) => setBrandLogoUrl(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 min-w-0"
                    placeholder="https://..."
                  />
                  <label className="cursor-pointer px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2 shrink-0">
                    <Upload size={16} />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        startTransition(async () => {
                          try {
                            const url = await handleUpload(f);
                            setBrandLogoUrl(url);
                            toast.success("Logo ter-upload");
                          } catch {
                            toast.error("Gagal upload logo");
                          }
                        });
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="md:col-span-2 flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50">
                <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden relative">
                  {brandLogoUrl ? (
                    <Image src={brandLogoUrl} alt="Brand Logo" fill className="object-contain" />
                  ) : (
                    <ImageIcon className="text-slate-300" size={22} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">{brandName || "Brand"}</div>
                  <div className="text-xs text-slate-500 truncate">{brandLogoUrl || "Belum ada logo"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="text-lg font-bold text-slate-800">Email & Footer Info</div>
              <div className="text-sm text-slate-500">Info pengirim email dan detail footer (alamat & sosmed).</div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">From Name</label>
                  <input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                    placeholder="Nama pengirim"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">From Email</label>
                  <input
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                    placeholder="no-reply@domain.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Alamat Perusahaan (Muncul di Footer)</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  placeholder="Contoh: Jl. Maribaya No. 149, Lembang, Bandung Barat"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Instagram URL</label>
                  <input
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 text-sm"
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Facebook URL</label>
                  <input
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 text-sm"
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Twitter / X URL</label>
                  <input
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 text-sm"
                    placeholder="https://x.com/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">LinkedIn URL</label>
                  <input
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 text-sm"
                    placeholder="https://linkedin.com/company/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Website URL</label>
                  <input
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">TikTok URL</label>
                  <input
                    value={tiktokUrl}
                    onChange={(e) => setTiktokUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 text-sm"
                    placeholder="https://tiktok.com/@..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={saveBranding}
                  disabled={isPending || !canSave}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60"
                >
                  {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Simpan Branding & Footer
                </button>
              </div>
            </div>
          </div>

          {/* WhatsApp API Settings */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="text-lg font-bold text-slate-800">WhatsApp Cloud API (Meta)</div>
              <div className="text-sm text-slate-500">Konfigurasi WhatsApp Business API resmi dari Meta.</div>
            </div>
            <div className="p-6 space-y-6">
              {/* WhatsApp Provider Selection */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Provider WhatsApp API</label>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-100 bg-slate-50 sm:bg-transparent sm:border-none sm:p-0">
                    <input
                      type="radio"
                      name="waProvider"
                      value="OPENWA"
                      checked={whatsappProvider === "OPENWA"}
                      onChange={(e) => setWhatsappProvider(e.target.value)}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">OpenWA (Tidak Resmi)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-100 bg-slate-50 sm:bg-transparent sm:border-none sm:p-0">
                    <input
                      type="radio"
                      name="waProvider"
                      value="OFFICIAL_META"
                      checked={whatsappProvider === "OFFICIAL_META"}
                      onChange={(e) => setWhatsappProvider(e.target.value)}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Meta Cloud API (Resmi)</span>
                  </label>
                </div>
              </div>

              {whatsappProvider === "OPENWA" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Endpoint URL OpenWA</label>
                      <input
                        value={whatsappApiUrl}
                        onChange={(e) => setWhatsappApiUrl(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                        placeholder="https://api.thelodgegroup.id/api/sessions/main/messages/send-text"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">URL API OpenWA Anda (Method POST).</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">API Key OpenWA</label>
                      <input
                        value={whatsappApiKey}
                        onChange={(e) => setWhatsappApiKey(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                        placeholder="Contoh: owa_k1_abcdefghijklmnop"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Header x-api-key untuk otentikasi.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number ID</label>
                      <input
                        value={whatsappApiUrl}
                        onChange={(e) => setWhatsappApiUrl(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                        placeholder="Contoh: 123456789012345"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Dapatkan dari Dashboard Meta Developer &gt; WhatsApp &gt; Getting Started.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Access Token</label>
                      <input
                        value={whatsappApiKey}
                        onChange={(e) => setWhatsappApiKey(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                        placeholder="EAAGm0..."
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Permanent Access Token dari System User Meta.</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mt-4">
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <b>Catatan Penting Meta API:</b> Pengiriman pesan massal menggunakan Meta API <b>wajib menggunakan Template Message</b> yang sudah disetujui. Buat Campaign WA Anda dengan nama subjek yang <b>sama persis</b> dengan nama template di dashboard Meta.
                    </p>
                  </div>
                </>
              )}

              <div className="mt-6 p-4 border border-slate-200 rounded-xl bg-slate-50">
                <div className="font-semibold text-sm mb-3">Test Kirim Pesan</div>
                <div className="flex gap-2">
                  <input
                    value={testWaNumber}
                    onChange={(e) => setTestWaNumber(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                    placeholder="Contoh: 08123456789"
                  />
                  <button
                    type="button"
                    onClick={handleTestWa}
                    disabled={isTestingWa || !testWaNumber}
                    className="px-4 py-2 bg-slate-800 text-white text-sm rounded-xl font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {isTestingWa ? <Loader2 size={14} className="animate-spin" /> : "Kirim Test Pesan"}
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={saveBranding}
                disabled={!canSave || isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Simpan API WA
              </button>
            </div>
          </div>

          {/* WhatsApp Auto Reply & Jam Operasional */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="text-lg font-bold text-slate-800">WhatsApp Auto-Reply & Jam Operasional</div>
              <div className="text-sm text-slate-500">Otomatisasi balasan pesan saat di luar jam kerja.</div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <div className="font-bold text-slate-800">Aktifkan Auto-Reply</div>
                  <div className="text-xs text-slate-500">Kirim pesan otomatis jika ada chat masuk di luar jam operasional.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setWaAutoReplyEnabled(!waAutoReplyEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${waAutoReplyEnabled ? 'bg-primary-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${waAutoReplyEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Jam Mulai Operasional</label>
                  <input
                    type="time"
                    value={waWorkingHoursStart}
                    onChange={(e) => setWaWorkingHoursStart(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Jam Selesai Operasional</label>
                  <input
                    type="time"
                    value={waWorkingHoursEnd}
                    onChange={(e) => setWaWorkingHoursEnd(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Hari Operasional</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: '1', label: 'Sen' },
                    { id: '2', label: 'Sel' },
                    { id: '3', label: 'Rab' },
                    { id: '4', label: 'Kam' },
                    { id: '5', label: 'Jum' },
                    { id: '6', label: 'Sab' },
                    { id: '7', label: 'Min' },
                  ].map((day) => {
                    const isActive = waWorkingDays.split(',').includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          const days = waWorkingDays.split(',').filter(d => d !== "");
                          if (isActive) {
                            setWaWorkingDays(days.filter(d => d !== day.id).join(','));
                          } else {
                            setWaWorkingDays([...days, day.id].sort().join(','));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          isActive 
                          ? 'bg-primary-600 border-primary-600 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Pesan Auto-Reply</label>
                <textarea
                  value={waAutoReplyMessage}
                  onChange={(e) => setWaAutoReplyMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  placeholder="Contoh: Terima kasih sudah menghubungi The Lodge Maribaya. Saat ini kantor kami sudah tutup..."
                />
                <p className="text-[10px] text-slate-400 mt-1">Gunakan bahasa yang ramah dan informatif.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={saveBranding}
                disabled={!canSave || isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-100 disabled:opacity-50"
              >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Simpan Auto-Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
