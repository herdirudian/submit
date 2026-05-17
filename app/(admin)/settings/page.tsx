"use client";

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
        });
        toast.success("Settings branding & footer tersimpan");
      } catch {
        toast.error("Gagal menyimpan branding");
      }
    });
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

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Avatar URL (opsional)</label>
                <input
                  value={adminImage}
                  onChange={(e) => setAdminImage(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                  placeholder="https://..."
                />
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
                <div className="flex gap-2">
                  <input
                    value={brandLogoUrl}
                    onChange={(e) => setBrandLogoUrl(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
                    placeholder="https://..."
                  />
                  <label className="cursor-pointer px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-2">
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
                <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                  {brandLogoUrl ? (
                    <img src={brandLogoUrl} alt="Brand Logo" className="w-full h-full object-contain" />
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
        </div>
      )}
    </div>
  );
}
