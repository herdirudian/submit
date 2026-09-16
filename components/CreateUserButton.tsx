"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createUser } from "@/actions/user";
import { toast } from "sonner";
import { Loader2, Plus, X, User, Mail, Lock, Shield } from "lucide-react";

import { ALL_SYSTEM_FEATURES, DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import { Check } from "lucide-react";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "CASHIER", "SALES", "CUSTOM"]),
});

type UserValues = z.infer<typeof userSchema>;

export default function CreateUserButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    DEFAULT_ROLE_PERMISSIONS["ADMIN"]
  );
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UserValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: "ADMIN"
    }
  });

  const selectedRole = watch("role");

  const handleRoleChange = (role: "ADMIN" | "CASHIER" | "SALES" | "CUSTOM") => {
    setValue("role", role);
    if (role === "ADMIN") {
      setSelectedPermissions(ALL_SYSTEM_FEATURES.map((f) => f.id));
    } else if (role === "SALES") {
      setSelectedPermissions(["forecast"]);
    } else if (role === "CASHIER") {
      setSelectedPermissions(["contacts"]);
    } else if (role === "CUSTOM") {
      // Default to empty or keep previous if custom
      if (selectedPermissions.length === ALL_SYSTEM_FEATURES.length) {
        setSelectedPermissions(["forecast"]);
      }
    }
  };

  const togglePermission = (featureId: string) => {
    if (selectedPermissions.includes(featureId)) {
      setSelectedPermissions(selectedPermissions.filter((id) => id !== featureId));
    } else {
      setSelectedPermissions([...selectedPermissions, featureId]);
    }
  };

  const onSubmit = async (data: UserValues) => {
    try {
      await createUser({
        ...data,
        permissions: selectedPermissions,
      });
      toast.success("User created successfully");
      setIsOpen(false);
      reset();
      setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS["ADMIN"]);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create user");
    }
  };

  // Group features by category
  const categories = ["Utama", "CRM & Messaging", "Sistem"] as const;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 flex items-center gap-2"
      >
        <Plus size={18} />
        Add New User
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Add New User</h2>
                <p className="text-xs text-slate-500 mt-0.5">Buat user baru dan atur hak akses fitur sistem.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                      {...register("name")}
                      type="text"
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all text-sm"
                      placeholder="Nama Lengkap"
                      />
                  </div>
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                      {...register("email")}
                      type="email"
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all text-sm"
                      placeholder="email@example.com"
                      />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">User Role</label>
                  <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select
                      value={selectedRole}
                      onChange={(e) => handleRoleChange(e.target.value as any)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all appearance-none bg-white text-sm font-medium"
                      >
                          <option value="ADMIN">Admin (Akses Penuh Semua Fitur)</option>
                          <option value="SALES">Sales (Khusus Forecast Reservasi)</option>
                          <option value="CASHIER">Cashier (Khusus Contacts CRM)</option>
                          <option value="CUSTOM">Role Custom (Pilih Checklist Fitur)</option>
                      </select>
                  </div>
                  {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                      {...register("password")}
                      type="password"
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all text-sm"
                      placeholder="••••••••"
                      />
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
              </div>

              {/* Granular Permission Checklist Section */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Checklist Fitur & Hak Akses User</h3>
                    <p className="text-xs text-slate-500">
                      {selectedRole === "CUSTOM"
                        ? "Pilih modul/fitur yang dapat diakses oleh user ini."
                        : `Otomatis diset untuk role ${selectedRole}. Pilih "Role Custom" untuk kustomisasi.`}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100">
                    {selectedPermissions.length} Fitur Terpilih
                  </span>
                </div>

                <div className="space-y-4">
                  {categories.map((cat) => {
                    const catFeatures = ALL_SYSTEM_FEATURES.filter((f) => f.category === cat);
                    return (
                      <div key={cat} className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                          {cat}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catFeatures.map((feature) => {
                            const isChecked = selectedPermissions.includes(feature.id);
                            return (
                              <label
                                key={feature.id}
                                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                  isChecked
                                    ? "bg-white border-primary-500/60 shadow-2xs text-slate-800"
                                    : "bg-white/50 border-slate-200/60 text-slate-500 hover:bg-white"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={selectedRole !== "CUSTOM" && selectedRole !== "ADMIN"}
                                  onChange={() => togglePermission(feature.id)}
                                  className="mt-0.5 rounded text-primary-600 focus:ring-primary-500"
                                />
                                <div>
                                  <span className="text-xs font-bold block leading-tight">{feature.name}</span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">{feature.description}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
