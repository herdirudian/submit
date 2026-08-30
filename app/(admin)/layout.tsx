"use client";

import React from 'react';
import Link from 'next/link';
import Image from "next/image";
import { 
  LayoutDashboard, Settings, Search, LogOut, FileText, 
  BarChart3, Users, Inbox, Mail, Megaphone, 
  Contact2, MessageSquare, MessageCircle, History, Hash,
  Menu, X as CloseIcon, PieChart
} from 'lucide-react';
import { signOut, useSession } from "next-auth/react";
import NotificationDropdown from "@/components/NotificationDropdown";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const pathname = usePathname();

  // Close sidebar when route changes on mobile
  React.useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);
  const getActiveKey = (path: string) => {
    if (path === "/dashboard" || path.startsWith("/dashboard/")) return "dashboard";
    if (path === "/forms" || path.startsWith("/forms/") || path.startsWith("/builder/")) return "forms";
    if (path === "/responses" || path.startsWith("/responses/")) return "responses";
    if (path === "/analytics" || path.startsWith("/analytics/")) return "analytics";
    if (path === "/polls" || path.startsWith("/polls/")) return "polls";
    if (path === "/users" || path.startsWith("/users/")) return "users";
    if (path === "/blast-email" || path.startsWith("/blast-email")) return "blast-email";
    if (path === "/blast-wa" || path.startsWith("/blast-wa")) return "blast-wa";
    if (path === "/contacts" || path.startsWith("/contacts")) return "contacts";
    if (path === "/whatsapp" || path.startsWith("/whatsapp")) {
      if (path === "/whatsapp/quick-replies") return "quick-replies";
      if (path === "/whatsapp/chatbot") return "wa-chatbot";
      if (path === "/whatsapp/templates") return "wa-templates";
      if (path === "/whatsapp/analytics") return "wa-analytics";
      return "whatsapp";
    }
    if (path === "/campaigns/logs" || path.startsWith("/campaigns/logs")) return "email-logs";
    if (path === "/campaigns" || path.startsWith("/campaigns")) return "campaigns";
    if (path === "/settings" || path.startsWith("/settings/")) return "settings";
    return null;
  };
  const activeKey = getActiveKey(pathname);

  const sidebarLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, id: 'dashboard', roles: ['ADMIN'] },
    { name: 'My Forms', href: '/forms', icon: FileText, id: 'forms', roles: ['ADMIN'] },
    { name: 'Responses', href: '/responses', icon: Inbox, id: 'responses', roles: ['ADMIN'] },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, id: 'analytics', roles: ['ADMIN'] },
    { name: 'Polling', href: '/polls', icon: PieChart, id: 'polls', roles: ['ADMIN'] },
    { name: 'Users', href: '/users', icon: Users, id: 'users', roles: ['ADMIN'] },
    { name: 'Blast Email', href: '/blast-email', icon: Mail, id: 'blast-email', roles: ['ADMIN'] },
    { name: 'Blast WA', href: '/blast-wa', icon: MessageCircle, id: 'blast-wa', roles: ['ADMIN'] },
    { name: 'Contacts', href: '/contacts', icon: Contact2, id: 'contacts', roles: ['ADMIN', 'CASHIER'] },
    { name: 'WA CRM', href: '/whatsapp', icon: MessageSquare, id: 'whatsapp', roles: ['ADMIN'] },
    { name: 'Analitik WA', href: '/whatsapp/analytics', icon: BarChart3, id: 'wa-analytics', roles: ['ADMIN'] },
    { name: 'Balasan Cepat', href: '/whatsapp/quick-replies', icon: Hash, id: 'quick-replies', roles: ['ADMIN'] },
    { name: 'Chatbot FAQ', href: '/whatsapp/chatbot', icon: MessageSquare, id: 'wa-chatbot', roles: ['ADMIN'] },
    { name: 'Template WA', href: '/whatsapp/templates', icon: FileText, id: 'wa-templates', roles: ['ADMIN'] },
    { name: 'Campaigns', href: '/campaigns', icon: Megaphone, id: 'campaigns', roles: ['ADMIN'] },
    { name: 'Histori Email', href: '/campaigns/logs', icon: History, id: 'email-logs', roles: ['ADMIN'] },
  ];

  const filteredLinks = sidebarLinks.filter(item => 
    !item.roles || item.roles.includes((session?.user as any)?.role || 'ADMIN')
  );

  const navItemClassName = (key: string) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
      activeKey === key
        ? "text-primary-700 bg-primary-50"
        : "text-slate-500 hover:text-primary-700 hover:bg-primary-50"
    }`;

  const displayName = session?.user?.name || session?.user?.email || "Admin";
  const initials = (() => {
    const base = (session?.user?.name || session?.user?.email || "").trim();
    if (!base) return "AD";
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    return (parts[0]?.slice(0, 2) ?? "AD").toUpperCase();
  })();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 bg-white border-r border-slate-100 flex flex-col fixed inset-y-0 z-[60] transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative">
               <Image src="/logotlm.png" alt="The Lodge Maribaya" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-none font-judul tracking-wide">The Lodge</h1>
              <p className="text-xs text-slate-400 font-medium tracking-wide mt-1 font-subjudul">ADMIN PANEL</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 md:hidden"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="px-4 py-2 flex-1 overflow-y-auto">
            <p className="text-xs font-semibold text-slate-400 px-4 mb-2 uppercase tracking-wider">Main Menu</p>
            <nav className="space-y-1">
              {filteredLinks.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={navItemClassName(item.id)}
                >
                  <item.icon size={20} />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
        </div>

        <div className="p-4 border-t border-slate-100">
            <nav className="space-y-1">
                 <Link href="/settings" className={navItemClassName("settings")}>
                    <Settings size={20} />
                    <span>Settings</span>
                </Link>
                <button 
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header - Search & Profile */}
        <header className="h-16 md:h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
            <div className="flex items-center gap-2 md:gap-4 flex-1">
                {/* Mobile Menu Toggle */}
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl md:hidden shrink-0"
                >
                  <Menu size={24} />
                </button>

                {/* Search Bar */}
                <div className="relative w-full max-w-md hidden lg:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search forms, responses..." 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all"
                    />
                </div>

                {/* Logo for mobile only */}
                <div className="md:hidden flex items-center gap-2 truncate">
                  <Image src="/logotlm.png" alt="Logo" width={28} height={28} className="shrink-0" />
                  <span className="font-bold text-slate-800 text-sm truncate">The Lodge</span>
                </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
                <NotificationDropdown />
                <div className="h-6 w-[1px] bg-slate-200 mx-1 md:mx-2 hidden sm:block"></div>
                <div className="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-slate-50 p-1 md:p-2 rounded-xl transition-colors">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs relative overflow-hidden shrink-0">
                        {session?.user?.image ? (
                            <Image src={session.user.image} alt={displayName} fill className="object-cover" />
                        ) : (
                            initials
                        )}
                    </div>
                    <div className="hidden sm:block text-left">
                        <p className="text-xs md:text-sm font-bold text-slate-800 leading-none truncate max-w-[120px]">{displayName}</p>
                        <p className="text-[10px] md:text-xs text-slate-400 mt-1">{(session?.user as any)?.role === 'CASHIER' ? 'Cashier' : 'Super Admin'}</p>
                    </div>
                </div>
            </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
            {children}
        </main>
      </div>
    </div>
  );
}
