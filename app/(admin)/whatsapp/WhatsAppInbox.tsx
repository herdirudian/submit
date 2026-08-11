"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
    Search, Phone, User, MoreVertical, Send, 
    Paperclip, Smile, Shield, Check, CheckCheck, 
    Clock, Filter, UserPlus, Info, Trash2, 
    MessageSquare, Hash, Tag, Plus, RefreshCw,
    Building, MapPin, UserCheck, FileText, Image as ImageIcon,
    Play, Download, Mail, Ticket
} from "lucide-react";
import { 
    getWaChats, getWaChatMessages, sendWaMessageAction, 
    assignChatAction, getAgents, getWaQuickReplies, 
    startNewChatAction, syncWaTemplatesAction, updateChatContactAction,
    updateChatStatusAction, sendWaMediaAction
} from "@/actions/whatsapp";
import { updateContact, createContact } from "@/actions/contact";
import { formatDistance } from "date-fns";
import { id } from "date-fns/locale";
import { X } from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppInbox({ initialChats, agents }: { initialChats: any[], agents: any[] }) {
    const [chats, setChats] = useState(initialChats);
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [messageInput, setMessageInput] = useState("");
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isInternal, setIsInternal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [quickReplies, setQuickReplies] = useState<any[]>([]);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [newWaId, setNewWaId] = useState("");
    const [startingChat, setStartingChat] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showQuickReplyMenu, setShowQuickReplyMenu] = useState(false);
    const [quickReplyFilter, setQuickReplyFilter] = useState("");
    const [showProfileSidebar, setShowProfileSidebar] = useState(true);
    const [isEditingContact, setIsEditingContact] = useState(false);
    const [isRegisteringContact, setIsRegisteringContact] = useState(false);
    const [editContactData, setEditContactData] = useState<any>({});
    const [selectedStatus, setSelectedStatus] = useState<string>("");
    const [selectedTag, setSelectedTag] = useState<string>("");
    const [showFilters, setShowFilters] = useState(false);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            refreshChats();
            if (selectedChat) {
                refreshMessages(selectedChat.id);
            }
        }, 5000); // Poll every 5 seconds

        loadQuickReplies();
        return () => clearInterval(interval);
    }, [selectedChat, selectedStatus, selectedTag]);

    const refreshChats = useCallback(async () => {
        try {
            const data = await getWaChats({ 
                status: selectedStatus as any || undefined, 
                tag: selectedTag || undefined 
            });
            setChats(data);
        } catch (error) {
            console.error("Polling chats failed", error);
        }
    }, [selectedStatus, selectedTag]);

    const refreshMessages = useCallback(async (chatId: string) => {
        try {
            const data = await getWaChatMessages(chatId);
            // Only update if message count changed or something changed
            setMessages(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(data)) {
                    return data;
                }
                return prev;
            });
        } catch (error) {
            console.error("Polling messages failed", error);
        }
    }, []);

    const loadQuickReplies = useCallback(async () => {
        try {
            const data = await getWaQuickReplies();
            setQuickReplies(data);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const handleQuickReply = (content: string) => {
        setMessageInput(content);
    };

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (selectedChat) {
            setLoadingMessages(true);
            refreshMessages(selectedChat.id).finally(() => setLoadingMessages(false));
        }
    }, [selectedChat, refreshMessages]);

    useEffect(() => {
        const interval = setInterval(() => {
            refreshChats();
            if (selectedChat) {
                refreshMessages(selectedChat.id);
            }
        }, 5000); // Poll every 5 seconds

        loadQuickReplies();
        return () => clearInterval(interval);
    }, [selectedChat, refreshChats, refreshMessages, loadQuickReplies]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedChat) return;

        const body = messageInput;
        setMessageInput("");

        try {
            const newMsg = await sendWaMessageAction(selectedChat.id, body, isInternal);
            setMessages(prev => [...prev, newMsg]);
            
            // Update chat list last message
            setChats(prevChats => prevChats.map(c => 
                c.id === selectedChat.id 
                ? { ...c, lastMessage: body, lastMessageAt: new Date() } 
                : c
            ));
        } catch (error: any) {
            toast.error(error.message || "Gagal mengirim pesan");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedChat) return;

        // Determine media type
        let type: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' = 'DOCUMENT';
        if (file.type.startsWith('image/')) type = 'IMAGE';
        else if (file.type.startsWith('video/')) type = 'VIDEO';
        else if (file.type.startsWith('audio/')) type = 'AUDIO';

        setUploading(true);
        const toastId = toast.loading(`Mengunggah ${type.toLowerCase()}...`);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const uploadData = await uploadRes.json();
            if (!uploadData.success) throw new Error(uploadData.error);

            const newMsg = await sendWaMediaAction(selectedChat.id, type, uploadData.url, file.name);
            setMessages(prev => [...prev, newMsg]);
            
            setChats(prevChats => prevChats.map(c => 
                c.id === selectedChat.id 
                ? { ...c, lastMessage: `[${type}] ${file.name}`, lastMessageAt: new Date() } 
                : c
            ));

            toast.success(`${type} berhasil dikirim`, { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Gagal mengirim media", { id: toastId });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleStartChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWaId.trim()) return;
        
        setStartingChat(true);
        try {
            const chat = await startNewChatAction(newWaId);
            setChats(prev => [chat, ...prev.filter(c => c.id !== chat.id)]);
            setSelectedChat(chat);
            setShowNewChatModal(false);
            setNewWaId("");
        } catch (error: any) {
            toast.error(error.message || "Gagal memulai chat");
        } finally {
            setStartingChat(false);
        }
    };

    const handleAssign = async (userId: string | null) => {
        if (!selectedChat) return;
        try {
            await assignChatAction(selectedChat.id, userId);
            const agent = agents.find(a => a.id === userId);
            const updatedChat = { ...selectedChat, assignedTo: agent ? { id: agent.id, name: agent.name } : null };
            setSelectedChat(updatedChat);
            setChats(prev => prev.map(c => 
                c.id === selectedChat.id 
                ? updatedChat
                : c
            ));
        } catch (error) {
            console.error(error);
            toast.error("Gagal menugaskan agen");
        }
    };

    const handleUpdateStatus = async (status: any) => {
        if (!selectedChat) return;
        const toastId = toast.loading("Memperbarui status chat...");
        try {
            await updateChatStatusAction(selectedChat.id, status);
            const updatedChat = { ...selectedChat, status };
            setSelectedChat(updatedChat);
            setChats(prev => prev.map(c => 
                c.id === selectedChat.id 
                ? updatedChat
                : c
            ));
            toast.success(`Status chat diubah menjadi ${status}`, { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Gagal memperbarui status chat", { id: toastId });
        }
    };

    const handleSyncTemplates = async () => {
        setSyncing(true);
        const toastId = toast.loading("Menyinkronkan template dari Meta...");
        try {
            const result = await syncWaTemplatesAction();
            if (result.success) {
                toast.success(`${result.count} Template berhasil disinkronkan!`, { id: toastId });
            } else {
                toast.error(result.error || "Gagal sinkronisasi template", { id: toastId });
            }
        } catch (error: any) {
            toast.error(error.message || "Gagal sinkronisasi template", { id: toastId });
        } finally {
            setSyncing(false);
        }
    };

    const handleUpdateContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChat?.contact?.id) return;

        const toastId = toast.loading("Memperbarui data kontak...");
        try {
            const updated = await updateContact(selectedChat.contact.id, editContactData);
            toast.success("Kontak berhasil diperbarui!", { id: toastId });
            setIsEditingContact(false);
            
            // Update local state
            const updatedChat = { ...selectedChat, contact: updated };
            setSelectedChat(updatedChat);
            setChats(prev => prev.map(c => c.id === selectedChat.id ? updatedChat : c));
        } catch (error: any) {
            toast.error(error.message || "Gagal memperbarui kontak", { id: toastId });
        }
    };

    const handleRegisterContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChat) return;

        const toastId = toast.loading("Mendaftarkan kontak baru...");
        try {
            // 1. Create the contact
            const newContact = await createContact({
                ...editContactData,
                waNumber: selectedChat.waId,
                phone: selectedChat.waId,
                customerType: editContactData.customerType || "Pelanggan",
                ticketType: editContactData.ticketType || "Umum"
            });

            // 2. Link contact to waChat
            await updateChatContactAction(selectedChat.id, newContact.id);

            toast.success("Kontak berhasil didaftarkan!", { id: toastId });
            setIsRegisteringContact(false);
            
            // 3. Update local state
            const updatedChat = { ...selectedChat, contact: newContact };
            setSelectedChat(updatedChat);
            setChats(prev => prev.map(c => c.id === selectedChat.id ? updatedChat : c));
        } catch (error: any) {
            toast.error(error.message || "Gagal mendaftarkan kontak", { id: toastId });
        }
    };

    const startEditing = () => {
        if (!selectedChat?.contact) return;
        setEditContactData({
            name: selectedChat.contact.name || "",
            email: selectedChat.contact.email || "",
            company: selectedChat.contact.company || "",
            city: selectedChat.contact.city || "",
            tags: selectedChat.contact.tags || "",
            ticketType: selectedChat.contact.ticketType || "",
            customerType: selectedChat.contact.customerType || "",
        });
        setIsEditingContact(true);
    };

    const filteredChats = chats.filter(c => 
        c.waId.includes(searchTerm) || 
        c.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Left Sidebar: Chat List */}
            <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800">WhatsApp CRM</h2>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSyncTemplates}
                                disabled={syncing}
                                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-white rounded-xl transition-all disabled:opacity-50"
                                title="Sinkronkan Template Meta"
                            >
                                <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
                            </button>
                            <button 
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-2 rounded-xl transition-all ${showFilters ? 'text-primary-600 bg-primary-50' : 'text-slate-400 hover:text-primary-600 hover:bg-white'}`}
                                title="Filter Chat"
                            >
                                <Filter size={18} />
                            </button>
                            <button 
                                onClick={() => setShowNewChatModal(true)}
                                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-white rounded-xl transition-all"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                    {showFilters && (
                        <div className="space-y-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Status Chat</label>
                                <select 
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="">Semua Status</option>
                                    <option value="OPEN">Open</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="RESOLVED">Resolved</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Tag Kontak</label>
                                <input 
                                    type="text"
                                    placeholder="Filter berdasarkan tag..."
                                    value={selectedTag}
                                    onChange={(e) => setSelectedTag(e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            {(selectedStatus || selectedTag) && (
                                <button 
                                    onClick={() => { setSelectedStatus(""); setSelectedTag(""); }}
                                    className="w-full py-1.5 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    Reset Filter
                                </button>
                            )}
                        </div>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Cari percakapan..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredChats.map((chat) => (
                        <div 
                            key={chat.id}
                            onClick={() => setSelectedChat(chat)}
                            className={`px-4 py-4 flex items-start gap-3 cursor-pointer transition-all border-l-4 ${
                                selectedChat?.id === chat.id 
                                ? "bg-white border-primary-500 shadow-sm" 
                                : "border-transparent hover:bg-white/50"
                            }`}
                        >
                            <div className="relative shrink-0">
                                <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg">
                                    {chat.contact?.name?.[0] || <Phone size={20} />}
                                </div>
                                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                    chat.status === 'OPEN' ? 'bg-green-500' : 
                                    chat.status === 'PENDING' ? 'bg-amber-500' : 
                                    'bg-slate-400'
                                }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className="text-sm font-bold text-slate-800 truncate">
                                        {chat.contact?.name || `+${chat.waId}`}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {formatDistance(new Date(chat.lastMessageAt), new Date(), { locale: id })}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-1">
                                    {chat.lastMessage || "Belum ada pesan"}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    {chat.assignedTo && (
                                        <div className="flex items-center gap-1">
                                            <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">
                                                {chat.assignedTo.name[0]}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium">{chat.assignedTo.name}</span>
                                        </div>
                                    )}
                                    {chat.status !== 'OPEN' && (
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                                            chat.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-500 border border-slate-200'
                                        }`}>
                                            {chat.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {chat._count.messages > 0 && (
                                <div className="w-5 h-5 bg-primary-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg shadow-primary-100">
                                    {chat._count.messages}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content: Chat Window */}
            <div className="flex-1 flex flex-col bg-white">
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-20 px-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                                    {selectedChat.contact?.name?.[0] || <Phone size={18} />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">{selectedChat.contact?.name || `+${selectedChat.waId}`}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <select 
                                            value={selectedChat.status}
                                            onChange={(e) => handleUpdateStatus(e.target.value)}
                                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border outline-none transition-all cursor-pointer ${
                                                selectedChat.status === 'OPEN' ? 'bg-green-50 text-green-600 border-green-100' : 
                                                selectedChat.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                                'bg-slate-50 text-slate-500 border-slate-200'
                                            }`}
                                        >
                                            <option value="OPEN">🟢 OPEN</option>
                                            <option value="PENDING">🟠 PENDING</option>
                                            <option value="RESOLVED">⚪ RESOLVED</option>
                                        </select>
                                        <span className="text-[10px] text-slate-300">|</span>
                                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">WhatsApp Cloud API</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2 mr-2">
                                    {agents.slice(0, 3).map((agent, i) => (
                                        <div key={agent.id} className="w-7 h-7 rounded-full bg-white border-2 border-white shadow-sm ring-1 ring-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600" title={agent.name}>
                                            {agent.name[0]}
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => setShowProfileSidebar(!showProfileSidebar)}
                                    className={`p-2 rounded-xl transition-all ${showProfileSidebar ? 'text-primary-600 bg-primary-50' : 'text-slate-400 hover:text-primary-600 hover:bg-slate-50'}`}
                                    title="Toggle Profil Pelanggan"
                                >
                                    <Info size={20} />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-xl transition-all">
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    <Clock className="animate-spin mr-2" size={20} />
                                    <span>Memuat pesan...</span>
                                </div>
                            ) : (
                                messages.map((msg, i) => (
                                    <div key={msg.id} className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[70%] group ${msg.isInternal ? "w-full" : ""}`}>
                                            {msg.isInternal && (
                                                <div className="flex items-center gap-2 mb-1 px-2">
                                                    <Shield size={12} className="text-amber-500" />
                                                    <span className="text-[10px] font-bold text-amber-600 uppercase">Catatan Internal</span>
                                                </div>
                                            )}
                                            <div className={`p-4 rounded-2xl shadow-sm text-sm relative ${
                                                msg.isInternal 
                                                ? "bg-amber-50 border border-amber-100 text-amber-900 rounded-lg"
                                                : msg.fromMe 
                                                ? "bg-primary-600 text-white rounded-tr-none" 
                                                : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                                            }`}>
                                                {msg.type === 'IMAGE' && msg.mediaUrl && (
                                                    <div className="mb-2 rounded-lg overflow-hidden border border-black/5">
                                                        <img src={msg.mediaUrl} alt={msg.mediaCaption || "Image"} className="max-w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.mediaUrl, '_blank')} />
                                                    </div>
                                                )}
                                                {msg.type === 'VIDEO' && msg.mediaUrl && (
                                                    <div className="mb-2 rounded-lg overflow-hidden border border-black/5 bg-black/5 aspect-video flex items-center justify-center relative group">
                                                        <video src={msg.mediaUrl} className="max-w-full max-h-60" controls />
                                                    </div>
                                                )}
                                                {msg.type === 'AUDIO' && msg.mediaUrl && (
                                                    <div className="mb-2 w-full">
                                                        <audio src={msg.mediaUrl} controls className="w-full h-8" />
                                                    </div>
                                                )}
                                                {msg.type === 'DOCUMENT' && msg.mediaUrl && (
                                                    <div className="mb-2 p-3 bg-black/5 rounded-xl border border-black/5 flex items-center gap-3 group/doc cursor-pointer hover:bg-black/10 transition-colors" onClick={() => window.open(msg.mediaUrl, '_blank')}>
                                                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-primary-600 shadow-sm">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-bold truncate ${msg.fromMe ? 'text-white' : 'text-slate-800'}`}>
                                                                {msg.mediaCaption || msg.body || "Document"}
                                                            </p>
                                                            <p className={`text-[10px] ${msg.fromMe ? 'text-primary-100' : 'text-slate-400'}`}>Klik untuk mengunduh</p>
                                                        </div>
                                                        <Download size={16} className={msg.fromMe ? 'text-white/50' : 'text-slate-300'} />
                                                    </div>
                                                )}
                                                
                                                {msg.type === 'TEXT' || (msg.type !== 'TEXT' && msg.mediaCaption && msg.mediaCaption !== msg.body) ? (
                                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                                                ) : null}
                                                
                                                <div className={`flex items-center gap-1 mt-2 justify-end ${msg.fromMe ? "text-primary-200" : "text-slate-400"}`}>
                                                    <span className="text-[9px] font-medium">
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {msg.fromMe && !msg.isInternal && (
                                                        msg.status === 'READ' ? <CheckCheck size={12} className="text-white" /> : 
                                                        msg.status === 'DELIVERED' ? <CheckCheck size={12} /> : 
                                                        <Check size={12} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 border-t border-slate-100">
                            {quickReplies.length > 0 && !isInternal && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {quickReplies.map(qr => (
                                        <button 
                                            key={qr.id}
                                            onClick={() => handleQuickReply(qr.content)}
                                            className="text-[10px] font-bold px-3 py-1 bg-white border border-slate-200 text-slate-500 hover:border-primary-500 hover:text-primary-600 rounded-full transition-all"
                                        >
                                            {qr.shortcut}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <form onSubmit={handleSendMessage} className="space-y-4">
                                <div className="flex items-center gap-4 px-2">
                                    <button 
                                        type="button"
                                        onClick={() => setIsInternal(false)}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${!isInternal ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Balas Pelanggan
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setIsInternal(true)}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isInternal ? 'bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-100' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Catatan Internal
                                    </button>
                                </div>
                                <div className="relative">
                                    {showQuickReplyMenu && !isInternal && (
                                        <div className="absolute bottom-full left-0 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl mb-2 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Balasan Cepat</span>
                                                <button onClick={() => setShowQuickReplyMenu(false)}><X size={14} className="text-slate-400" /></button>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {quickReplies
                                                    .filter(qr => qr.shortcut.toLowerCase().includes(quickReplyFilter))
                                                    .map(qr => (
                                                        <button 
                                                            key={qr.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const words = messageInput.split(/\s/);
                                                                words.pop();
                                                                setMessageInput(words.join(" ") + (words.length > 0 ? " " : "") + qr.content);
                                                                setShowQuickReplyMenu(false);
                                                            }}
                                                            className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border-b border-slate-50 last:border-0"
                                                        >
                                                            <p className="text-xs font-bold text-primary-600 mb-0.5">{qr.shortcut}</p>
                                                            <p className="text-[11px] text-slate-500 line-clamp-1">{qr.content}</p>
                                                        </button>
                                                    ))
                                                }
                                                {quickReplies.filter(qr => qr.shortcut.toLowerCase().includes(quickReplyFilter)).length === 0 && (
                                                    <div className="p-4 text-center text-xs text-slate-400">Tidak ada shortcut yang cocok</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <textarea 
                                        value={messageInput}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setMessageInput(val);
                                            
                                            // Handle Quick Reply shortcut "/"
                                            const lastWord = val.split(/\s/).pop() || "";
                                            if (lastWord.startsWith("/")) {
                                                setShowQuickReplyMenu(true);
                                                setQuickReplyFilter(lastWord.toLowerCase());
                                            } else {
                                                setShowQuickReplyMenu(false);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                        placeholder={isInternal ? "Tulis catatan internal untuk tim..." : "Ketik pesan ke pelanggan..."}
                                        className={`w-full pl-4 pr-32 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 transition-all min-h-[60px] max-h-[200px] resize-none text-sm ${
                                            isInternal 
                                            ? "bg-amber-50/50 focus:ring-amber-50 focus:border-amber-400" 
                                            : "focus:ring-primary-50 focus:border-primary-500"
                                        }`}
                                    />
                                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                                        <button type="button" className="p-2 text-slate-400 hover:text-primary-600 transition-all">
                                            <Smile size={20} />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className={`p-2 transition-all ${uploading ? 'text-primary-400 animate-pulse' : 'text-slate-400 hover:text-primary-600'}`}
                                        >
                                            <Paperclip size={20} />
                                        </button>
                                        <input 
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        />
                                        <button 
                                            type="submit"
                                            disabled={!messageInput.trim()}
                                            className={`p-2.5 rounded-xl text-white shadow-lg transition-all disabled:opacity-50 disabled:shadow-none ${isInternal ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-primary-600 hover:bg-primary-700 shadow-primary-100'}`}
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6">
                            <MessageSquare size={40} className="text-slate-200" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Pilih Percakapan</h3>
                        <p className="text-sm mt-1">Pilih salah satu chat di samping untuk mulai membalas pesan.</p>
                    </div>
                )}
            </div>

            {/* Right Sidebar: Details & Assignment */}
            {selectedChat && showProfileSidebar && (
                <div className="w-80 border-l border-slate-100 bg-white flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Profil Pelanggan</h3>
                        <button onClick={() => setShowProfileSidebar(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Avatar & Basic Info */}
                        <div className="text-center space-y-3">
                            <div className="w-24 h-24 rounded-3xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-3xl mx-auto shadow-sm ring-4 ring-primary-50/50">
                                {selectedChat.contact?.name?.[0] || <Phone size={36} />}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-xl leading-tight">{selectedChat.contact?.name || "Anonim"}</h4>
                                <p className="text-sm text-slate-400 font-medium mt-1">+{selectedChat.waId}</p>
                            </div>
                            <div className="flex justify-center flex-wrap gap-2 pt-2">
                                <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg uppercase tracking-wider">
                                    {selectedChat.contact?.customerType || "Pelanggan"}
                                </span>
                                {selectedChat.contact?.ticketType && (
                                    <span className="text-[10px] font-bold px-2.5 py-1 bg-primary-50 text-primary-600 rounded-lg uppercase tracking-wider">
                                        {selectedChat.contact.ticketType}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Assignment Section */}
                        <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <UserCheck size={14} className="text-primary-500" />
                                Penugasan Agen
                            </h5>
                            <select 
                                value={selectedChat.assignedTo?.id || ""}
                                onChange={(e) => handleAssign(e.target.value || null)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white"
                            >
                                <option value="">Belum Ditugaskan</option>
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Contact Details Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info size={14} className="text-primary-500" />
                                    Detail Informasi
                                </h5>
                                {!isEditingContact && !isRegisteringContact && selectedChat.contact && (
                                    <button 
                                        onClick={startEditing}
                                        className="text-[10px] font-bold text-primary-600 hover:text-primary-700 uppercase transition-colors"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>

                            {isEditingContact || isRegisteringContact ? (
                                <form onSubmit={isRegisteringContact ? handleRegisterContact : handleUpdateContact} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Nama</label>
                                        <input 
                                            type="text"
                                            value={editContactData.name || ""}
                                            onChange={e => setEditContactData({...editContactData, name: e.target.value})}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                            required={isRegisteringContact}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Email</label>
                                        <input 
                                            type="email"
                                            value={editContactData.email || ""}
                                            onChange={e => setEditContactData({...editContactData, email: e.target.value})}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Perusahaan</label>
                                            <input 
                                                type="text"
                                                value={editContactData.company || ""}
                                                onChange={e => setEditContactData({...editContactData, company: e.target.value})}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Kota</label>
                                            <input 
                                                type="text"
                                                value={editContactData.city || ""}
                                                onChange={e => setEditContactData({...editContactData, city: e.target.value})}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Tipe Tiket</label>
                                            <input 
                                                type="text"
                                                value={editContactData.ticketType || ""}
                                                onChange={e => setEditContactData({...editContactData, ticketType: e.target.value})}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                                placeholder="Contoh: Umum, VIP"
                                                required={isRegisteringContact}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Tipe Customer</label>
                                            <input 
                                                type="text"
                                                value={editContactData.customerType || ""}
                                                onChange={e => setEditContactData({...editContactData, customerType: e.target.value})}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                                placeholder="Contoh: Pelanggan, Agent"
                                                required={isRegisteringContact}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Tags (Pisahkan Koma)</label>
                                        <input 
                                            type="text"
                                            value={editContactData.tags || ""}
                                            onChange={e => setEditContactData({...editContactData, tags: e.target.value})}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                            placeholder="VIP, Agent, Promo"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setIsEditingContact(false);
                                                setIsRegisteringContact(false);
                                            }}
                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            Batal
                                        </button>
                                        <button 
                                            type="submit"
                                            className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all"
                                        >
                                            {isRegisteringContact ? "Daftarkan" : "Simpan"}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                                            <Mail size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                                            <p className="text-sm font-bold text-slate-700 truncate">{selectedChat.contact?.email || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                                            <Building size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Perusahaan</p>
                                            <p className="text-sm font-bold text-slate-700 truncate">{selectedChat.contact?.company || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
                                            <MapPin size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Kota</p>
                                            <p className="text-sm font-bold text-slate-700 truncate">{selectedChat.contact?.city || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                                            <Ticket size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Tipe Tiket</p>
                                            <p className="text-sm font-bold text-slate-700 truncate">{selectedChat.contact?.ticketType || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                                            <Tag size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Tags / Label</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {selectedChat.contact?.tags ? selectedChat.contact.tags.split(',').map((tag: string, i: number) => (
                                                    <span key={i} className="text-[9px] font-bold px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md border border-purple-100">
                                                        {tag.trim()}
                                                    </span>
                                                )) : <span className="text-sm font-bold text-slate-700">-</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-slate-100 transition-colors">
                                            <Hash size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">ID Database</p>
                                            <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">{selectedChat.contact?.id || "Belum Terdaftar"}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!selectedChat.contact && !isRegisteringContact && (
                            <div className="bg-primary-50 p-4 rounded-2xl border border-primary-100 space-y-3">
                                <p className="text-xs text-primary-700 leading-relaxed">
                                    Nomor ini belum terdaftar di database kontak Anda.
                                </p>
                                <button 
                                    onClick={() => {
                                        setEditContactData({
                                            name: "",
                                            email: "",
                                            company: "",
                                            city: "",
                                            tags: "",
                                            ticketType: "Umum",
                                            customerType: "Pelanggan"
                                        });
                                        setIsRegisteringContact(true);
                                    }}
                                    className="w-full py-2 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 transition-all shadow-md shadow-primary-100"
                                >
                                    Daftarkan Kontak
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-50">
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all text-sm font-bold">
                            <Trash2 size={18} />
                            Hapus Percakapan
                        </button>
                    </div>
                </div>
            )}

            {/* New Chat Modal */}
            {showNewChatModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Mulai Chat Baru</h3>
                            <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleStartChat} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Nomor WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Contoh: 628123456789"
                                        value={newWaId}
                                        onChange={e => setNewWaId(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400">Gunakan kode negara tanpa tanda + atau spasi (contoh: 62 untuk Indonesia).</p>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setShowNewChatModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit"
                                    disabled={startingChat || !newWaId.trim()}
                                    className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-100"
                                >
                                    {startingChat ? <Clock size={18} className="animate-spin" /> : <MessageSquare size={18} />}
                                    Mulai Chat
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
