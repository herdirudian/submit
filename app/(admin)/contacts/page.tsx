"use client";

import React, { useState, useEffect } from "react";
import { 
    Search, Plus, Filter, Download, Upload, MoreHorizontal, 
    Mail, User, Users, Building, MapPin, Tag, Trash2, Edit2, Loader2,
    CheckCircle, AlertTriangle, X
} from "lucide-react";
import { ContactStatus } from "@prisma/client";
import Link from "next/link";
import { getContacts, deleteContact, getContactLists, createContact, importContacts, createContactList, deleteContactList, removeContactFromList } from "@/actions/contact";
import ContactExportButton from "@/components/ContactExportButton";

export default function ContactsPage() {
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<ContactStatus | undefined>();
    const [activeTab, setActiveTab] = useState<'contacts' | 'lists'>('contacts');
    const [contactLists, setContactLists] = useState<any[]>([]);
    
    const [showImportModal, setShowImportModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreateListModal, setShowCreateListModal] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createListLoading, setCreateListLoading] = useState(false);
    const [importTargetListId, setImportTargetListId] = useState<string>("");
    const [importNewListName, setImportNewListName] = useState<string>("");
    const [newList, setNewList] = useState<{ name: string; description: string }>({ name: "", description: "" });
    const [selectedListId, setSelectedListId] = useState<string | undefined>();
    const [selectedListName, setSelectedListName] = useState<string | undefined>();
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [showBulkAddModal, setShowBulkAddModal] = useState(false);
    const [bulkTargetListId, setBulkTargetListId] = useState("");
    const [bulkLoading, setBulkLoading] = useState(false);

    const [newContact, setNewContact] = useState({
        email: "",
        name: "",
        company: "",
        city: "",
        tags: "",
        listId: ""
    });

    useEffect(() => {
        loadContacts();
        loadLists();
        if (selectedListId) {
            setNewContact(p => ({ ...p, listId: selectedListId }));
        }
    }, [page, status, selectedListId]);

    async function loadLists() {
        const lists = await getContactLists();
        setContactLists(lists);
    }

    async function loadContacts() {
        setLoading(true);
        try {
            const data = await getContacts({ page, search, status, listId: selectedListId });
            setContacts(data.contacts);
            setTotal(data.total);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadContacts();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Hapus kontak ini?")) {
            await deleteContact(id);
            loadContacts();
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            await createContact(newContact);
            setShowCreateModal(false);
            setNewContact({ email: "", name: "", company: "", city: "", tags: "", listId: selectedListId || "" });
            loadContacts();
            loadLists();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setCreateLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!importTargetListId) {
            alert("Pilih list tujuan terlebih dahulu");
            return;
        }
        if (importTargetListId === "__new__" && !importNewListName.trim()) {
            alert("Nama list baru wajib diisi");
            return;
        }

        setImportLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split("\n");
            const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
            
            const importedData = lines.slice(1).map(line => {
                const values = line.split(",");
                const obj: any = {};
                headers.forEach((header, i) => {
                    obj[header] = values[i]?.trim();
                });
                return obj;
            }).filter(item => item.email);

            try {
                const listId = importTargetListId && importTargetListId !== "__new__" ? importTargetListId : undefined;
                const listName = importTargetListId === "__new__" ? importNewListName.trim() : "";

                const result = await importContacts(importedData, {
                    ...(listId ? { listId } : {}),
                    ...(listName ? { listName } : {}),
                });
                alert(`Import berhasil! ${result.successCount} sukses, ${result.errorCount} gagal.`);
                setShowImportModal(false);
                setImportTargetListId("");
                setImportNewListName("");
                loadContacts();
                loadLists();
            } catch (error: any) {
                alert(error.message);
            } finally {
                setImportLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleDeleteList = async (id: string) => {
        if (!confirm("Hapus list ini? Anggota list juga akan terhapus dari list (kontaknya tetap ada).")) return;
        try {
            await deleteContactList(id);
            if (selectedListId === id) {
                setSelectedListId(undefined);
                setSelectedListName(undefined);
            }
            loadLists();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleRemoveFromList = async (contactId: string) => {
        if (!selectedListId) return;
        if (!confirm("Keluarkan kontak ini dari list?")) return;
        
        try {
            await removeContactFromList(selectedListId, contactId);
            loadContacts();
            loadLists();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleBulkAddToList = async () => {
        if (!bulkTargetListId || selectedContactIds.length === 0) return;
        setBulkLoading(true);
        try {
            await addContactsToList(bulkTargetListId, selectedContactIds);
            alert(`${selectedContactIds.length} kontak berhasil ditambahkan ke list.`);
            setShowBulkAddModal(false);
            setSelectedContactIds([]);
            setBulkTargetListId("");
            loadLists();
            loadContacts();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setBulkLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedContactIds.length === contacts.length) {
            setSelectedContactIds([]);
        } else {
            setSelectedContactIds(contacts.map(c => c.id));
        }
    };

    const toggleSelectContact = (id: string) => {
        setSelectedContactIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleCreateList = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateListLoading(true);
        try {
            await createContactList({ name: newList.name, description: newList.description || undefined });
            setShowCreateListModal(false);
            setNewList({ name: "", description: "" });
            loadLists();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setCreateListLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Manajemen Kontak</h1>
                    <p className="text-slate-500 mt-1">Kelola database email dan segmentasi pelanggan.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <ContactExportButton data={contacts} filename="contacts.csv" />
                    <button 
                        onClick={() => setShowImportModal(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Upload size={18} />
                        Import
                    </button>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-sm"
                    >
                        <Plus size={18} />
                        Tambah Kontak
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('contacts')}
                    className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'contacts' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    Semua Kontak
                </button>
                <button 
                    onClick={() => setActiveTab('lists')}
                    className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'lists' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    Segmentasi / List ({contactLists.length})
                </button>
            </div>

            {activeTab === 'contacts' ? (
                <>
                {/* Filters & Search */}
                <div className="space-y-4">
                    {selectedListId && (
                        <div className="flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-xl border border-primary-100 w-fit">
                            <Users size={16} />
                            <span className="text-sm font-bold">Menampilkan Anggota List: {selectedListName}</span>
                            <button 
                                onClick={() => {
                                    setSelectedListId(undefined);
                                    setSelectedListName(undefined);
                                }}
                                className="ml-2 p-1 hover:bg-primary-100 rounded-full transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                        <form onSubmit={handleSearch} className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Cari email, nama, atau perusahaan..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                            />
                        </form>
                        <div className="flex gap-3 w-full md:w-auto">
                            {selectedContactIds.length > 0 && (
                                <button 
                                    onClick={() => setShowBulkAddModal(true)}
                                    className="px-4 py-2 bg-primary-50 text-primary-700 rounded-xl border border-primary-200 font-bold text-sm hover:bg-primary-100 transition-all flex items-center gap-2"
                                >
                                    <Plus size={16} />
                                    Tambah ke List ({selectedContactIds.length})
                                </button>
                            )}
                            <select 
                                value={status || ""}
                                onChange={(e) => setStatus(e.target.value as ContactStatus || undefined)}
                                className="px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500 bg-white text-sm"
                            >
                                <option value="">Semua Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="UNSUBSCRIBED">Unsubscribed</option>
                                <option value="BOUNCED">Bounced</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="px-6 py-4">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                            checked={contacts.length > 0 && selectedContactIds.length === contacts.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Kontak</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Perusahaan / Kota</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tags</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <Loader2 size={32} className="animate-spin" />
                                                <p className="text-sm">Memuat kontak...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : contacts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <User size={48} className="text-slate-200" />
                                                <p className="text-lg font-medium text-slate-500">Belum ada kontak</p>
                                                <p className="text-sm">Mulai dengan menambah kontak baru atau import CSV.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    contacts.map((contact) => (
                                        <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                    checked={selectedContactIds.includes(contact.id)}
                                                    onChange={() => toggleSelectContact(contact.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                                                        {(contact.name?.[0] || contact.email[0]).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{contact.name || "Unknown"}</div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                                            <Mail size={12} />
                                                            {contact.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-600 space-y-1">
                                                    {contact.company && (
                                                        <div className="flex items-center gap-1">
                                                            <Building size={12} className="text-slate-400" />
                                                            {contact.company}
                                                        </div>
                                                    )}
                                                    {contact.city && (
                                                        <div className="flex items-center gap-1">
                                                            <MapPin size={12} className="text-slate-400" />
                                                            {contact.city}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                                                    contact.status === 'ACTIVE' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                    contact.status === 'UNSUBSCRIBED' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                                    'bg-red-50 text-red-600 border border-red-100'
                                                }`}>
                                                    {contact.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {contact.tags ? contact.tags.split(",").map((tag: string, i: number) => (
                                                        <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                            {tag.trim()}
                                                        </span>
                                                    )) : (
                                                        <span className="text-[10px] text-slate-400">No tags</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button className="p-2 text-slate-400 hover:text-primary-600 transition-colors">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    {selectedListId ? (
                                                        <button 
                                                            onClick={() => handleRemoveFromList(contact.id)}
                                                            className="p-2 text-slate-400 hover:text-orange-600 transition-colors"
                                                            title="Keluarkan dari list"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleDelete(contact.id)}
                                                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                                            title="Hapus kontak permanen"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {total > 0 && (
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-sm text-slate-500 font-medium">
                                Menampilkan <span className="text-slate-800 font-bold">{contacts.length}</span> dari <span className="text-slate-800 font-bold">{total}</span> kontak
                            </p>
                            <div className="flex gap-2">
                                <button 
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
                                >
                                    Prev
                                </button>
                                <button 
                                    disabled={contacts.length < 20}
                                    onClick={() => setPage(p => p + 1)}
                                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                </>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contactLists.map(list => (
                        <div key={list.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
                                    <Users size={24} />
                                </div>
                                <button onClick={() => handleDeleteList(list.id)} className="p-2 text-slate-400 hover:text-red-600">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-1">{list.name}</h3>
                            <p className="text-sm text-slate-500 mb-4">{list.description || "Tidak ada deskripsi."}</p>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    {list._count.members} Anggota
                                </span>
                                <button 
                                    onClick={() => {
                                        setSelectedListId(list.id);
                                        setSelectedListName(list.name);
                                        setActiveTab('contacts');
                                    }}
                                    className="text-xs font-bold text-primary-600 hover:underline"
                                >
                                    Kelola Anggota
                                </button>
                            </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => setShowCreateListModal(true)}
                        className="bg-white p-6 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-primary-500 hover:text-primary-600 transition-all"
                    >
                        <Plus size={32} />
                        <span className="font-bold">Buat List Baru</span>
                    </button>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Import Kontak (CSV)</h3>
                            <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="text-sm text-slate-500">
                                Format header minimal: <span className="font-semibold">email</span>. Opsional: name, company, city, tags
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Tambahkan ke List</label>
                                <select
                                    required
                                    value={importTargetListId}
                                    onChange={(e) => setImportTargetListId(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                >
                                    <option value="">Pilih list...</option>
                                    {contactLists.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.name} ({l._count.members} kontak)
                                        </option>
                                    ))}
                                    <option value="__new__">Buat list baru...</option>
                                </select>
                            </div>

                            {importTargetListId === "__new__" && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Nama List Baru</label>
                                    <input
                                        value={importNewListName}
                                        onChange={(e) => setImportNewListName(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Contoh: Leads April"
                                    />
                                    <p className="text-xs text-slate-400">List akan dibuat otomatis dan kontak import dimasukkan ke list tersebut.</p>
                                </div>
                            )}

                            <div className="pt-2">
                                <label className="text-sm font-bold text-slate-700">File CSV</label>
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={(e) => {
                                        handleFileUpload(e);
                                    }}
                                    className="mt-2 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary-600 file:text-white hover:file:bg-primary-700"
                                    disabled={
                                        importLoading ||
                                        !importTargetListId ||
                                        (importTargetListId === "__new__" && !importNewListName.trim())
                                    }
                                />
                                {importLoading && (
                                    <div className="flex items-center gap-2 text-slate-400 text-xs mt-3">
                                        <Loader2 size={14} className="animate-spin" />
                                        Mengimpor kontak...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create List Modal */}
            {showCreateListModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Buat List Kontak</h3>
                            <button onClick={() => setShowCreateListModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateList} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Nama List</label>
                                <input
                                    required
                                    value={newList.name}
                                    onChange={(e) => setNewList((p) => ({ ...p, name: e.target.value }))}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Contoh: Customer VIP"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Deskripsi (opsional)</label>
                                <textarea
                                    rows={3}
                                    value={newList.description}
                                    onChange={(e) => setNewList((p) => ({ ...p, description: e.target.value }))}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Keterangan segmentasi..."
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={createListLoading}
                                className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2"
                            >
                                {createListLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                Simpan List
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Contact Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Tambah Kontak Manual</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Email</label>
                                <input 
                                    type="email" required
                                    value={newContact.email}
                                    onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Tambahkan ke List (opsional)</label>
                                <select
                                    value={newContact.listId}
                                    onChange={e => setNewContact(p => ({ ...p, listId: e.target.value }))}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                >
                                    <option value="">Pilih List...</option>
                                    {contactLists.map(l => (
                                        <option key={l.id} value={l.id}>{l.name} ({l._count.members} anggota)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Nama</label>
                                    <input 
                                        type="text"
                                        value={newContact.name}
                                        onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Perusahaan</label>
                                    <input 
                                        type="text"
                                        value={newContact.company}
                                        onChange={e => setNewContact(p => ({ ...p, company: e.target.value }))}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Kota</label>
                                    <input 
                                        type="text"
                                        value={newContact.city}
                                        onChange={e => setNewContact(p => ({ ...p, city: e.target.value }))}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Tags (koma)</label>
                                    <input 
                                        type="text"
                                        placeholder="customer, vip"
                                        value={newContact.tags}
                                        onChange={e => setNewContact(p => ({ ...p, tags: e.target.value }))}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit"
                                    disabled={createLoading}
                                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {createLoading && <Loader2 size={18} className="animate-spin" />}
                                    Simpan Kontak
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Add to List Modal */}
            {showBulkAddModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Tambahkan ke List</h3>
                            <button onClick={() => setShowBulkAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-500">
                                Anda akan menambahkan <span className="font-bold text-slate-800">{selectedContactIds.length} kontak</span> ke dalam list.
                            </p>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Pilih List Tujuan</label>
                                <select
                                    value={bulkTargetListId}
                                    onChange={e => setBulkTargetListId(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                >
                                    <option value="">Pilih List...</option>
                                    {contactLists.map(l => (
                                        <option key={l.id} value={l.id}>{l.name} ({l._count.members} anggota)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button 
                                    onClick={() => setShowBulkAddModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={handleBulkAddToList}
                                    disabled={bulkLoading || !bulkTargetListId}
                                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {bulkLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                    Tambahkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
