"use client";

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Settings, Search, LogOut, FileText, BarChart3, Users, Inbox, Mail, Megaphone, Contact2, History } from 'lucide-react';
import { signOut, useSession } from "next-auth/react";
import NotificationDropdown from "@/components/NotificationDropdown";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const getActiveKey = (path: string) => {
    if (path === "/dashboard" || path.startsWith("/dashboard/")) return "dashboard";
    if (path === "/forms" || path.startsWith("/forms/") || path.startsWith("/builder/")) return "forms";
    if (path === "/responses" || path.startsWith("/responses/")) return "responses";
    if (path === "/analytics" || path.startsWith("/analytics/")) return "analytics";
    if (path === "/users" || path.startsWith("/users/")) return "users";
    if (path === "/blast-email" || path.startsWith("/blast-email")) return "blast-email";
    if (path === "/contacts" || path.startsWith("/contacts")) return "contacts";
    if (path === "/campaigns/logs" || path.startsWith("/campaigns/logs")) return "email-logs";
    if (path === "/campaigns" || path.startsWith("/campaigns")) return "campaigns";
    if (path === "/settings" || path.startsWith("/settings/")) return "settings";
    return null;
  };
  const activeKey = getActiveKey(pathname);

  const sidebarLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, id: 'dashboard' },
    { name: 'My Forms', href: '/forms', icon: FileText, id: 'forms' },
    { name: 'Responses', href: '/responses', icon: Inbox, id: 'responses' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, id: 'analytics' },
    { name: 'Users', href: '/users', icon: Users, id: 'users' },
    { name: 'Blast Dashboard', href: '/blast-email', icon: Mail, id: 'blast-email' },
    { name: 'Contacts', href: '/contacts', icon: Contact2, id: 'contacts' },
    { name: 'Campaigns', href: '/campaigns', icon: Megaphone, id: 'campaigns' },
    { name: 'Histori Email', href: '/campaigns/logs', icon: History, id: 'email-logs' },
  ];

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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Innap Style (Clean, White/Light, Modern Typography) */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col fixed inset-y-0 z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 relative">
             <img src="/logotlm.png" alt="The Lodge Maribaya" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-none font-judul tracking-wide">The Lodge</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide mt-1 font-subjudul">ADMIN PANEL</p>
          </div>
        </div>

        <div className="px-4 py-2">
            <p className="text-xs font-semibold text-slate-400 px-4 mb-2 uppercase tracking-wider">Main Menu</p>
            <nav className="space-y-1">
              {sidebarLinks.map((item) => (
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

        <div className="mt-auto p-4 border-t border-slate-100">
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
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Header - Search & Profile */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-40">
            {/* Search Bar */}
            <div className="relative w-96 hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search forms, responses..." 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all"
                />
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
                <NotificationDropdown />
                <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors">
                    {session?.user?.image ? (
                        <img src={session.user.image} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                            {initials}
                        </div>
                    )}
                    <div className="hidden md:block text-left">
                        <p className="text-sm font-bold text-slate-800 leading-none">{displayName}</p>
                        <p className="text-xs text-slate-400 mt-1">Super Admin</p>
                    </div>
                </div>
            </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
            {children}
        </main>
      </div>
    </div>
  );
}
