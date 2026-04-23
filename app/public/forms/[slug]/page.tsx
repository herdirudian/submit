import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import PublicFormRenderer from "@/components/PublicFormRenderer";
import { MapPin, Phone, Mail, Clock, Instagram, Globe } from "lucide-react";
import { incrementFormViews } from "@/actions/form";

export const dynamic = "force-dynamic";

function safeExternalUrl(raw?: string | null): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);
  const candidate = hasScheme ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default async function PublicFormPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const appSettings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });

  const form = await prisma.form.findUnique({
    where: { slug },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!form) {
    notFound();
  }

  if (form.status !== "PUBLISHED") {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200">
              <div className="bg-white/80 backdrop-blur-md p-10 rounded-2xl shadow-xl text-center max-w-md border border-white/50">
                  <h1 className="text-2xl font-bold text-slate-800 mb-2">Form Not Available</h1>
                  <p className="text-slate-500">This form is currently {form.status.toLowerCase()} or does not exist.</p>
              </div>
          </div>
      )
  }

  await incrementFormViews(slug);

  const primaryColor = form.primaryColor || "#0f4d39";
  const backgroundColor = form.backgroundColor || "#f8fafc";
  const fontFamily = form.fontFamily || "var(--font-deskripsi)";
  const instagramUrl = safeExternalUrl(form.socialInstagram);
  const tiktokUrl = safeExternalUrl(form.socialTiktok);
  const websiteUrl = safeExternalUrl(form.socialWebsite);
  const defaultBrandName = appSettings?.brandName || "The Lodge";
  const defaultBrandLogo = appSettings?.brandLogoUrl || "/logotlm.png";
  const sidebarLogoSrc = defaultBrandLogo;
  const headerLogoSrc = form.logo || defaultBrandLogo;

  return (
    <div 
        className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-cover bg-center bg-fixed"
        style={{ 
            fontFamily,
            backgroundImage: `url('https://images.unsplash.com/photo-1501854140884-074bf86ee95c?q=80&w=2070&auto=format&fit=crop')` 
        }}
    >
        <div className="absolute inset-0 backdrop-blur-sm" style={{ backgroundColor: `${primaryColor}80` }}></div>
        
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col-reverse lg:flex-row min-h-[600px] animate-fade-in-up relative z-10">
            
            {/* Left Sidebar - Contact Info */}
            {(form.showSidebar ?? true) && (
            <div 
                className="lg:w-1/3 relative"
                style={{ backgroundColor: primaryColor }}
            >
                <div className="text-white p-8 sm:p-12 flex flex-col lg:sticky lg:top-0 lg:h-screen overflow-hidden relative h-full">
                    {/* Decorative Circles - Adjusted to be subtle variations of primary color */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full opacity-10"></div>
                    <div className="absolute bottom-10 -left-10 w-40 h-40 bg-white rounded-full opacity-5"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-2">
                                <img src={sidebarLogoSrc} alt={defaultBrandName} className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h2 className="text-xl font-judul font-bold leading-none tracking-wide">{form.sidebarTitle || defaultBrandName}</h2>
                                <p className="text-xs font-subjudul tracking-widest uppercase opacity-80 mt-1">{form.sidebarSubtitle || ""}</p>
                            </div>
                        </div>

                        <h3 className="text-2xl font-bold mb-6 font-judul">Contact Information</h3>
                        <p className="text-primary-100 mb-10 leading-relaxed text-sm">
                            {form.sidebarDescription || "Have questions or need assistance? Feel free to reach out to us. We are here to help you experience the best of nature."}
                        </p>

                        <div className="space-y-6">
                            {form.contactAddress && (
                                <div className="flex items-start gap-4">
                                    <MapPin className="text-primary-300 mt-1 flex-shrink-0" size={20} />
                                    <div>
                                        <h4 className="font-semibold text-sm">Address</h4>
                                        <p className="text-primary-100 text-sm whitespace-pre-line">{form.contactAddress}</p>
                                    </div>
                                </div>
                            )}
                            
                            {form.contactPhone && (
                                <div className="flex items-start gap-4">
                                    <Phone className="text-primary-300 mt-1 flex-shrink-0" size={20} />
                                    <div>
                                        <h4 className="font-semibold text-sm">Phone</h4>
                                        <p className="text-primary-100 text-sm">{form.contactPhone}</p>
                                    </div>
                                </div>
                            )}

                            {form.contactEmail && (
                                <div className="flex items-start gap-4">
                                    <Mail className="text-primary-300 mt-1 flex-shrink-0" size={20} />
                                    <div>
                                        <h4 className="font-semibold text-sm">Email</h4>
                                        <p className="text-primary-100 text-sm">{form.contactEmail}</p>
                                    </div>
                                </div>
                            )}

                            {form.contactWorkingHours && (
                                <div className="flex items-start gap-4">
                                    <Clock className="text-primary-300 mt-1 flex-shrink-0" size={20} />
                                    <div>
                                        <h4 className="font-semibold text-sm">Working Hours</h4>
                                        <p className="text-primary-100 text-sm">{form.contactWorkingHours}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative z-10 mt-12 pt-8 border-t border-white/20">
                        <div className="flex gap-4">
                            {instagramUrl && (
                                <a href={instagramUrl} target="_blank" rel="noopener noreferrer nofollow" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" title="Instagram">
                                    <Instagram size={16} />
                                </a>
                            )}
                            {tiktokUrl && (
                                <a href={tiktokUrl} target="_blank" rel="noopener noreferrer nofollow" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" title="TikTok">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z"/>
                                    </svg>
                                </a>
                            )}
                            {websiteUrl && (
                                <a href={websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" title="Website">
                                    <Globe size={16} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Right Main Content - Form */}
            <div className={`${(form.showSidebar ?? true) ? 'lg:w-2/3' : 'w-full'} p-8 sm:p-12 lg:p-16 overflow-y-auto`} style={{ backgroundColor }}>
                 <div className="max-w-2xl mx-auto">
                    <div className="mb-10 border-b border-slate-100 pb-8 text-center">
                        {headerLogoSrc && (
                            <div className="mb-6 flex justify-center">
                                <img 
                                    src={headerLogoSrc} 
                                    alt="Form Logo" 
                                    style={{ width: form.logoWidth || 128 }}
                                    className="object-contain hover:scale-105 transition-transform duration-300" 
                                />
                            </div>
                        )}
                        <h1 
                            className="font-judul font-bold text-slate-800 mb-3 tracking-wide"
                            style={{ fontSize: form.titleFontSize || 30 }}
                        >
                            {form.title}
                        </h1>
                        {form.description && (
                            <p 
                                className="text-slate-500 leading-relaxed font-deskripsi max-w-lg mx-auto"
                                style={{ fontSize: form.descriptionFontSize || 16 }}
                            >
                                {form.description}
                            </p>
                        )}
                    </div>

                    <PublicFormRenderer form={form} />
                 </div>
            </div>

        </div>
    </div>
  );
}
