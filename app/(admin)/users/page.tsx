import { getUsers } from "@/actions/user";
import { Mail, Calendar, Shield } from "lucide-react";
import { format } from "date-fns";
import CreateUserButton from "@/components/CreateUserButton";
import UserListActions from "@/components/UserListActions";
import Link from "next/link";

export default async function UsersPage() {
    const users = await getUsers();

    return (
        <div>
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2">
                        <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
                            Dashboard
                        </Link>
                        <span>/</span>
                        <span className="text-slate-500">Users</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Users</h1>
                    <p className="text-slate-500 mt-1">Kelola user dan akses di sistem.</p>
                </div>
                <CreateUserButton />
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                                                    {user.image ? (
                                                        <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
                                                    ) : (
                                                        (user.name?.[0] || user.email[0]).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800">{user.name || "Unknown"}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Mail size={12} />
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full w-fit">
                                                <Shield size={12} />
                                                Admin
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Calendar size={14} />
                                                {format(new Date(user.createdAt), "MMM d, yyyy")}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <UserListActions userId={user.id} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
