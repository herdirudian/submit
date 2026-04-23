"use client";

import { useState, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { getNotifications, getUnreadCount, markAllAsRead } from "@/actions/notification";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

type Notification = {
    id: string;
    title: string;
    message: string;
    link: string | null;
    read: boolean;
    createdAt: Date;
};

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = async () => {
        try {
            const [data, count] = await Promise.all([
                getNotifications(),
                getUnreadCount()
            ]);
            setNotifications(data);
            setUnreadCount(count);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    // Poll for notifications every 30 seconds
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            fetchNotifications();
        }
    };

    const handleMarkAllRead = async () => {
        setLoading(true);
        await markAllAsRead();
        await fetchNotifications();
        setLoading(false);
    };

    return (
        <div className="relative">
            <button 
                onClick={handleOpen}
                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors relative"
                title="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">Notifications</h3>
                            {unreadCount > 0 && (
                                <button 
                                    onClick={handleMarkAllRead}
                                    disabled={loading}
                                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                                >
                                    <Check size={12} /> Mark all read
                                </button>
                            )}
                        </div>
                        
                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    No notifications yet.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {notifications.map((notif) => (
                                        <div 
                                            key={notif.id} 
                                            className={`p-4 hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-primary-50/30' : ''}`}
                                        >
                                            <Link href={notif.link || "#"} onClick={() => setIsOpen(false)}>
                                                <div className="flex gap-3">
                                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!notif.read ? 'bg-primary-500' : 'bg-slate-200'}`}></div>
                                                    <div>
                                                        <h4 className={`text-sm ${!notif.read ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                                                            {notif.title}
                                                        </h4>
                                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                            {notif.message}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 mt-2">
                                                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
