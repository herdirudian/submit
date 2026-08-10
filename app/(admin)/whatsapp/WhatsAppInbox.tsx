"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
    Search, Phone, User, MoreVertical, Send, 
    Paperclip, Smile, Shield, Check, CheckCheck, 
    Clock, Filter, UserPlus, Info, Trash2, 
    MessageSquare, Hash, Tag, Plus, RefreshCw,
    Building, MapPin
} from "lucide-react";
import { 
    getWaChats, getWaChatMessages, sendWaMessageAction, 
    assignChatAction, getAgents, getWaQuickReplies, 
    startNewChatAction, syncWaTemplatesAction 
} from "@/actions/whatsapp";
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            refreshChats();
            if (selectedChat) {
                refreshMessages(selectedChat.id);
            }
        }, 5000); // Poll every 5 seconds

        loadQuickReplies();
        return () => clearInterval(interval);
    }, [selectedChat]);

    async function refreshChats() {
        try {
            const data = await getWaChats();
            setChats(data);
        } catch (error) {
            console.error("Polling chats failed", error);
        }
    }

    async function refreshMessages(chatId: string) {
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
    }

    async function loadQuickReplies() {
        try {
            const data = await getWaQuickReplies();
            setQuickReplies(data);
        } catch (error) {
            console.error(error);
        }
    }

    const handleQuickReply = (content: string) => {
          setMessageInput(content);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (selectedChat) {
            setLoadingMessages(true);
            refreshMessages(selectedChat.id).finally(() => setLoadingMessages(false));
        }
    }, [selectedChat]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedChat) return;

        const body = messageInput;
        setMessageInput("");

        try {
            const newMsg = await sendWaMessageAction(selectedChat.id, body, isInternal);
            setMessages([...messages, newMsg]);
            
            // Update chat list last message
            setChats(chats.map(c => 
                c.id === selectedChat.id 
                ? { ...c, lastMessage: body, lastMessageAt: new Date() } 
                : c
            ));
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleStartChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWaId.trim()) return;
        
        setStartingChat(true);
        try {
            const chat = await startNewChatAction(newWaId);
            setChats([chat, ...chats.filter(c => c.id !== chat.id)]);
            setSelectedChat(chat);
            setShowNewChatModal(false);
            setNewWaId("");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setStartingChat(false);
        }
    };

    const handleAssign = async (userId: string | null) => {
        if (!selectedChat) return;
        try {
            await assignChatAction(selectedChat.id, userId);
            const agent = agents.find(a => a.id === userId);
            setSelectedChat({ ...selectedChat, assignedTo: agent ? { id: agent.id, name: agent.name } : null });
            setChats(chats.map(c => 
                c.id === selectedChat.id 
                ? { ...c, assignedTo: agent ? { id: agent.id, name: agent.name } : null } 
                : c
            ));
        } catch (error) {
            console.error(error);
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
                            <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-white rounded-xl transition-all">
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
                            <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg shrink-0">
                                {chat.contact?.name?.[0] || <Phone size={20} />}
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
                                {chat.assignedTo && (
                                    <div className="mt-2 flex items-center gap-1">
                                        <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">
                                            {chat.assignedTo.name[0]}
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium">{chat.assignedTo.name}</span>
                                    </div>
                                )}
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
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
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
                                <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-xl transition-all">
                                    <UserPlus size={20} />
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
                                                <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
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
                                        <button type="button" className="p-2 text-slate-400 hover:text-primary-600 transition-all">
                                            <Paperclip size={20} />
                                        </button>
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
            {selectedChat && (
                <div className="w-72 border-l border-slate-100 bg-white p-6 space-y-8 overflow-y-auto hidden xl:block">
                    <div className="text-center space-y-3">
                        <div className="w-20 h-20 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-2xl mx-auto shadow-sm">
                            {selectedChat.contact?.name?.[0] || <Phone size={32} />}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-lg">{selectedChat.contact?.name || "Anonim"}</h4>
                            <p className="text-sm text-slate-400 font-medium">+{selectedChat.waId}</p>
                        </div>
                        <div className="flex justify-center gap-2 pt-2">
                            <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-full uppercase tracking-wider">Pelanggan</span>
                            {selectedChat.contact?.ticketType && (
                                <span className="text-[10px] font-bold px-2 py-1 bg-primary-50 text-primary-600 rounded-full uppercase tracking-wider">
                                    {selectedChat.contact.ticketType}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <User size={14} />
                            Penugasan Agen
                        </h5>
                        <select 
                            value={selectedChat.assignedTo?.id || ""}
                            onChange={(e) => handleAssign(e.target.value || null)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-slate-50"
                        >
                            <option value="">Belum Ditugaskan</option>
                            {agents.map(agent => (
                                <option key={agent.id} value={agent.id}>{agent.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-4">
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Info size={14} />
                            Informasi Kontak
                        </h5>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Building size={14} className="text-slate-300" />
                                <div className="text-xs">
                                    <p className="text-slate-400">Perusahaan</p>
                                    <p className="font-bold text-slate-700">{selectedChat.contact?.company || "-"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin size={14} className="text-slate-300" />
                                <div className="text-xs">
                                    <p className="text-slate-400">Kota</p>
                                    <p className="font-bold text-slate-700">{selectedChat.contact?.city || "-"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Hash size={14} className="text-slate-300" />
                                <div className="text-xs">
                                    <p className="text-slate-400">ID Kontak</p>
                                    <p className="font-bold text-slate-700">{selectedChat.contact?.id || "N/A"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Tag size={14} className="text-slate-300" />
                                <div className="text-xs">
                                    <p className="text-slate-400">Label/Tag</p>
                                    <p className="font-bold text-slate-700">{selectedChat.contact?.tags || "-"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
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
