export interface SystemFeature {
  id: string;
  name: string;
  description: string;
  category: "Utama" | "CRM & Messaging" | "Sistem";
}

export const ALL_SYSTEM_FEATURES: SystemFeature[] = [
  { id: "dashboard", name: "Dashboard Utama", description: "Ringkasan statistik & aktivitas sistem", category: "Utama" },
  { id: "forms", name: "My Forms & Builder", description: "Membuat, edit, dan mengelola form", category: "Utama" },
  { id: "responses", name: "Respon Form", description: "Melihat data jawaban dari publik", category: "Utama" },
  { id: "analytics", name: "Analitik Form", description: "Grafik & visualisasi statistik form", category: "Utama" },
  { id: "polls", name: "Polling System", description: "Mengelola fitur polling & voting", category: "Utama" },
  { id: "forecast", name: "Forecast Reservasi", description: "Estimasi pendapatan reservasi & grup Sales", category: "Utama" },
  
  { id: "blast-email", name: "Blast Email", description: "Pengiriman email masal & kampanye", category: "CRM & Messaging" },
  { id: "blast-wa", name: "Blast WhatsApp", description: "Pengiriman pesan WA masal", category: "CRM & Messaging" },
  { id: "contacts", name: "Contacts CRM", description: "Database kontak & audiens", category: "CRM & Messaging" },
  { id: "whatsapp", name: "WA CRM & Live Chat", description: "Fitur percakapan & inbox WA", category: "CRM & Messaging" },
  { id: "wa-analytics", name: "Analitik WhatsApp", description: "Laporan performa chat WhatsApp", category: "CRM & Messaging" },
  { id: "quick-replies", name: "Balasan Cepat WA", description: "Template teks balasan instant WA", category: "CRM & Messaging" },
  { id: "wa-chatbot", name: "Chatbot FAQ WA", description: "Otomatisasi balasan FAQ bot WA", category: "CRM & Messaging" },
  { id: "wa-templates", name: "Template WA Meta", description: "Manajemen template resmi Meta", category: "CRM & Messaging" },
  { id: "campaigns", name: "Email Campaigns", description: "Kampanye pemasaran email", category: "CRM & Messaging" },
  { id: "email-logs", name: "Histori Email", description: "Log pengiriman email", category: "CRM & Messaging" },

  { id: "users", name: "Kelola User & Akses", description: "Manajemen pengguna & hak akses role", category: "Sistem" },
  { id: "settings", name: "Pengaturan Sistem", description: "Konfigurasi token, API, & profil", category: "Sistem" },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ALL_SYSTEM_FEATURES.map((f) => f.id),
  SALES: ["forecast"],
  CASHIER: ["contacts"],
  CUSTOM: [],
};

export function isFeatureAllowed(
  featureId: string,
  userRole?: string | null,
  userPermissions?: string[] | string | null
): boolean {
  if (!userRole) return false;
  if (userRole === "ADMIN") return true;
  if (userRole === "SALES") return featureId === "forecast";
  if (userRole === "CASHIER") return featureId === "contacts";

  let permList: string[] = [];
  if (Array.isArray(userPermissions)) {
    permList = userPermissions;
  } else if (typeof userPermissions === "string") {
    try {
      permList = JSON.parse(userPermissions);
    } catch (e) {
      permList = [];
    }
  }

  return permList.includes(featureId);
}

