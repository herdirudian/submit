"use client";

import { useEffect, useState } from "react";
import { X, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { checkSlugAvailability, updateForm, updateFormSlug } from "@/actions/form";
import { Form } from "@prisma/client";

export default function FormSettings({ form, isOpen, onClose }: { form: Form; isOpen: boolean; onClose: () => void }) {
  const [title, setTitle] = useState(form.title);
  const [description, setDescription] = useState(form.description || "");
  const [logo, setLogo] = useState(form.logo || "");
  const [logoWidth, setLogoWidth] = useState(form.logoWidth || 128);
  const [titleFontSize, setTitleFontSize] = useState(form.titleFontSize || 30);
  const [descriptionFontSize, setDescriptionFontSize] = useState(form.descriptionFontSize || 16);
  const [slug, setSlug] = useState(form.slug);
  const [slugState, setSlugState] = useState<
    | { state: "idle"; message: string }
    | { state: "checking"; message: string }
    | { state: "ok"; message: string }
    | { state: "error"; message: string }
  >({ state: "idle", message: "" });
  
  // Sidebar State
  const [sidebarTitle, setSidebarTitle] = useState(form.sidebarTitle || "The Lodge");
  const [sidebarSubtitle, setSidebarSubtitle] = useState(form.sidebarSubtitle || "Maribaya");
  const [sidebarDescription, setSidebarDescription] = useState(form.sidebarDescription || "");
  const [contactAddress, setContactAddress] = useState(form.contactAddress || "");
  const [contactPhone, setContactPhone] = useState(form.contactPhone || "");
  const [contactEmail, setContactEmail] = useState(form.contactEmail || "");
  const [contactWorkingHours, setContactWorkingHours] = useState(form.contactWorkingHours || "");
  const [socialInstagram, setSocialInstagram] = useState(form.socialInstagram || "");
  const [socialTiktok, setSocialTiktok] = useState(form.socialTiktok || "");
  const [socialWebsite, setSocialWebsite] = useState(form.socialWebsite || "");
  const [showSidebar, setShowSidebar] = useState(form.showSidebar ?? true);
  
  // Theme State
  const [primaryColor, setPrimaryColor] = useState(form.primaryColor || "#0f4d39");
  const [backgroundColor, setBackgroundColor] = useState(form.backgroundColor || "#f8fafc");
  const [fontFamily, setFontFamily] = useState(form.fontFamily || "var(--font-deskripsi)");
  
  // Email & Thank You State
  const [emailSubject, setEmailSubject] = useState(form.emailSubject || "Submission Received");
  const [emailBody, setEmailBody] = useState(form.emailBody || "");
  const [thankYouTitle, setThankYouTitle] = useState(form.thankYouTitle || "Thank You!");
  const [thankYouMessage, setThankYouMessage] = useState(form.thankYouMessage || "Your response has been successfully recorded.");
  const [redirectUrl, setRedirectUrl] = useState(form.redirectUrl || "");

  const [activeTab, setActiveTab] = useState<'general' | 'sidebar' | 'theme' | 'messages'>('general');

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  useEffect(() => {
    let cancelled = false;
    const value = slug.trim();
    if (!value) {
      setSlugState({ state: "error", message: "Slug wajib diisi" });
      return;
    }

    setSlugState({ state: "checking", message: "Cek slug..." });
    const t = setTimeout(() => {
      checkSlugAvailability(value, form.id)
        .then((res) => {
          if (cancelled) return;
          if (!res.ok) {
            setSlugState({ state: "error", message: res.message });
            return;
          }
          setSlug(value !== res.slug ? res.slug : value);
          setSlugState({ state: res.available ? "ok" : "error", message: res.message });
        })
        .catch(() => {
          if (cancelled) return;
          setSlugState({ state: "error", message: "Gagal cek slug" });
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form.id, slug]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });
        const data = await res.json();
        if (data.success) {
            setLogo(data.url);
            toast.success("Logo uploaded");
        } else {
            toast.error("Upload failed");
        }
    } catch (err) {
        toast.error("Error uploading file");
    } finally {
        setIsUploading(false);
    }
  };

  const handleSave = async () => {
      setIsSaving(true);
      try {
          if (slug.trim() !== form.slug) {
              await updateFormSlug(form.id, slug);
          }
          await updateForm(form.id, { 
              title, 
              description, 
              logo,
              logoWidth,
              titleFontSize,
              descriptionFontSize,
              redirectUrl,
              sidebarTitle,
              sidebarSubtitle,
              sidebarDescription,
              contactAddress,
              contactPhone,
              contactEmail,
              contactWorkingHours,
              socialInstagram,
              socialTiktok,
              socialWebsite,
              showSidebar,
              primaryColor,
              backgroundColor,
              fontFamily,
              emailSubject,
              emailBody,
              thankYouTitle,
              thankYouMessage
          });
          toast.success("Form settings saved");
          onClose();
      } catch (error) {
          toast.error("Failed to save settings");
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800 font-judul">Form Settings</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6">
            <button 
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveTab('general')}
            >
                General & Branding
            </button>
            <button 
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sidebar' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveTab('sidebar')}
            >
                Sidebar & Contact
            </button>
            <button 
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'theme' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveTab('theme')}
            >
                Theme & Colors
            </button>
            <button 
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'messages' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveTab('messages')}
            >
                Messages & Email
            </button>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {activeTab === 'messages' ? (
                <div className="space-y-6">
                     <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Thank You Page</h4>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                                <input 
                                    type="text" 
                                    value={thankYouTitle}
                                    onChange={(e) => setThankYouTitle(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                                <textarea 
                                    rows={3}
                                    value={thankYouMessage}
                                    onChange={(e) => setThankYouMessage(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Redirect After Submit</h4>
                        <p className="text-xs text-slate-500 mb-4">Jika diisi, user akan diarahkan ke URL ini setelah submit.</p>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Redirect URL (opsional)</label>
                            <input
                                type="text"
                                value={redirectUrl}
                                onChange={(e) => setRedirectUrl(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                                placeholder="https://... atau /thank-you"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Email Notification (to User)</h4>
                        <p className="text-xs text-slate-500 mb-4">Sent to users if they provide an email address.</p>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Subject</label>
                                <input 
                                    type="text" 
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Custom Message Body</label>
                                <textarea 
                                    rows={4}
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none resize-none"
                                    placeholder="Optional: Add a custom message to the confirmation email..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'theme' ? (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Color</label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="color" 
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="w-10 h-10 p-1 rounded-lg border border-slate-200 cursor-pointer"
                            />
                            <input 
                                type="text" 
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none uppercase font-mono"
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Used for buttons, highlights, and active states.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Background Color</label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="color" 
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                                className="w-10 h-10 p-1 rounded-lg border border-slate-200 cursor-pointer"
                            />
                            <input 
                                type="text" 
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                                className="px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none uppercase font-mono"
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Page background color.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Font Family</label>
                        <select 
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                        >
                            <option value="var(--font-deskripsi)">The Lodge Default (Deskripsi)</option>
                            <option value="var(--font-judul)">The Lodge Heading (Judul)</option>
                            <option value="var(--font-sub-judul)">The Lodge Subtitle (Sub Judul)</option>
                            <option value="Inter">Inter</option>
                            <option value="Roboto">Roboto</option>
                            <option value="Open Sans">Open Sans</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Select the base font for the form content.</p>
                    </div>
                </div>
            ) : activeTab === 'general' ? (
                <>
                    {/* Logo Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Form Logo</label>
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                                {logo ? (
                                    <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="text-slate-300" />
                                )}
                                {isUploading && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-primary-600" size={20} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="cursor-pointer px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors inline-flex items-center gap-2 shadow-sm">
                                    <Upload size={16} />
                                    Upload Logo
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                </label>
                                <p className="text-xs text-slate-400 mt-2">Recommended: 200x200px (PNG/JPG)</p>
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Form Title</label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">SEO Slug</label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                            placeholder="mis: event-registration"
                        />
                        <div className="mt-2 flex items-center justify-between gap-3">
                            <div
                                className={`text-xs font-semibold ${
                                    slugState.state === "ok"
                                        ? "text-green-700"
                                        : slugState.state === "checking"
                                            ? "text-slate-500"
                                            : slugState.state === "error"
                                                ? "text-red-600"
                                                : "text-slate-500"
                                }`}
                            >
                                {slugState.message}
                            </div>
                            <div className="text-xs text-slate-500 font-medium truncate">
                                /public/forms/{slug.trim() || "your-slug"}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                        <textarea 
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Styling Settings */}
                    <div className="pt-6 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Appearance</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Logo Width */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Logo Width (px)</label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="range" 
                                        min="50" 
                                        max="400" 
                                        value={logoWidth} 
                                        onChange={(e) => setLogoWidth(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                    />
                                    <span className="text-sm font-medium text-slate-600 w-12 text-right">{logoWidth}px</span>
                                </div>
                            </div>

                            {/* Title Font Size */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Title Size (px)</label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="range" 
                                        min="16" 
                                        max="72" 
                                        value={titleFontSize} 
                                        onChange={(e) => setTitleFontSize(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                    />
                                    <span className="text-sm font-medium text-slate-600 w-12 text-right">{titleFontSize}px</span>
                                </div>
                            </div>

                            {/* Description Font Size */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Description Size (px)</label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="range" 
                                        min="12" 
                                        max="32" 
                                        value={descriptionFontSize} 
                                        onChange={(e) => setDescriptionFontSize(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                    />
                                    <span className="text-sm font-medium text-slate-600 w-12 text-right">{descriptionFontSize}px</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">Show Sidebar</h4>
                            <p className="text-xs text-slate-500">Toggle visibility of the left sidebar on the public form.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={showSidebar} 
                                onChange={(e) => setShowSidebar(e.target.checked)} 
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    {showSidebar && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Sidebar Title</label>
                                    <input 
                                        type="text" 
                                        value={sidebarTitle}
                                        onChange={(e) => setSidebarTitle(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                                        placeholder="The Lodge"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Sidebar Subtitle</label>
                                    <input 
                                        type="text" 
                                        value={sidebarSubtitle}
                                        onChange={(e) => setSidebarSubtitle(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                                        placeholder="Maribaya"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Sidebar Description</label>
                                <textarea 
                                    rows={3}
                                    value={sidebarDescription}
                                    onChange={(e) => setSidebarDescription(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none resize-none"
                                    placeholder="Have questions or need assistance?..."
                                />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Contact Details</h4>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                                    <textarea 
                                        rows={2}
                                        value={contactAddress}
                                        onChange={(e) => setContactAddress(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none resize-none"
                                        placeholder="Jalan Maribaya No..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                                        <input 
                                            type="text" 
                                            value={contactPhone}
                                            onChange={(e) => setContactPhone(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                                            placeholder="+62..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                                        <input 
                                            type="text" 
                                            value={contactEmail}
                                            onChange={(e) => setContactEmail(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                                            placeholder="info@..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Working Hours</label>
                                    <input 
                                        type="text" 
                                        value={contactWorkingHours}
                                        onChange={(e) => setContactWorkingHours(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                                        placeholder="Mon - Sun: 08:00 AM - 05:00 PM"
                                    />
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Social Media Links</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Instagram URL</label>
                                            <input 
                                                type="text" 
                                                value={socialInstagram}
                                                onChange={(e) => setSocialInstagram(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                                                placeholder="https://instagram.com/..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">TikTok URL</label>
                                            <input 
                                                type="text" 
                                                value={socialTiktok}
                                                onChange={(e) => setSocialTiktok(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                                                placeholder="https://tiktok.com/@..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Website URL</label>
                                            <input 
                                                type="text" 
                                                value={socialWebsite}
                                                onChange={(e) => setSocialWebsite(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                                                placeholder="https://thelodgemaribaya.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                disabled={isSaving || isUploading}
                className="px-6 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 shadow-md hover:shadow-lg transition-all disabled:opacity-70 flex items-center gap-2"
            >
                {isSaving && <Loader2 className="animate-spin" size={16} />}
                Save Changes
            </button>
        </div>
      </div>
    </div>
  );
}
