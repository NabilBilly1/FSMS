import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import {
  Building2,
  Users,
  Contact,
  Send,
  Mail,
  Plus,
  X,
  Activity,
  ArrowUpRight,
  Zap,
  Hash,
  Globe,
  Menu,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  Calendar,
  Settings as SettingsIcon,
} from "lucide-react";

// ── Types ──
interface GlobalStats {
  total_companies: number;
  total_branches: number;
  total_sms: number;
  total_emails: number;
  total_customers: number;
}
interface ServiceHealth {
  status: "connected" | "disconnected";
  latency_ms?: number;
  error?: string;
  active_workers?: number;
  workers?: string[];
}
interface HealthData {
  redis: ServiceHealth;
  celery_worker: ServiceHealth;
  database: ServiceHealth;
  overall: string;
}
interface Company {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  hubtel_client_id: string;
  hubtel_client_secret: string;
  hubtel_sender_id?: string;
  brevo_api_key: string;
  brevo_sender_email: string;
  brevo_sender_name: string;
}
interface Branch {
  id: number;
  name: string;
  branch_code: string;
  company_id: number;
}

// ── Main Component ──
const MasterAdmin: React.FC = () => {
  const BASE = `${API_BASE_URL}/admin`;
  const [view, setView] = useState<"overview" | "companies" | "manage-companies" | "sms" | "email" | "settings" | "bulk-sms" | "contacts">(
    (sessionStorage.getItem("masterAdminView") as any) || "overview"
  );

  useEffect(() => {
    sessionStorage.setItem("masterAdminView", view);
  }, [view]);

  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactTotal, setContactTotal] = useState(0);
  const [contactPage, setContactPage] = useState(1);
  const [contactSearch, setContactSearch] = useState("");
  const contactLimit = 15;
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "company" | "branch" | "delete-company" | "import-contacts">(null);
  const [targetCompany, setTargetCompany] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  // Selection states
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  
  // Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Desktop: expanded/collapsed
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile: open/closed overlay

  // Infrastructure Health
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthExpanded, setHealthExpanded] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);

  const [cf, setCf] = useState({
    name: "",
    slug: "",
    hubtel_client_id: "",
    hubtel_client_secret: "",
    hubtel_sender_id: "",
    brevo_api_key: "",
    brevo_sender_email: "",
    brevo_sender_name: "",
  });
  const [bf, setBf] = useState({ name: "", branch_code: "", pin: "" });
  
  // Bulk SMS state
  const [bulkForm, setBulkForm] = useState({
    company_id: "",
    branch_id: "",
    message_content: "",
    scheduled_for: "",
  });
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkBranches, setBulkBranches] = useState<Branch[]>([]);
  const [loadingBulkBranches, setLoadingBulkBranches] = useState(false);

  // Import contacts state
  const [importForm, setImportForm] = useState({
    company_id: "",
    branch_id: "",
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importBranches, setImportBranches] = useState<Branch[]>([]);
  const [loadingImportBranches, setLoadingImportBranches] = useState(false);


  useEffect(() => {
    load();
    // Close mobile menu on view change
    setIsMobileMenuOpen(false);
  }, [view]);

  // Health polling — every 30 seconds
  const fetchHealth = async () => {
    try {
      setHealthLoading(true);
      const r = await fetch(`${BASE}/health`);
      if (r.ok) {
        setHealth(await r.json());
        setLastHealthCheck(new Date());
      }
    } catch (e) {
      setHealth({
        redis: { status: "disconnected", error: "API unreachable" },
        celery_worker: { status: "disconnected", error: "API unreachable", active_workers: 0 },
        database: { status: "disconnected", error: "API unreachable" },
        overall: "Critical: API Unreachable",
      });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      const company = companies.find(c => c.id === selectedCompanyId);
      if (company) {
        fetchBranches(company.slug);
      }
    } else {
      setBranches([]);
    }
  }, [selectedCompanyId, companies]);

  useEffect(() => {
    if (bulkForm.company_id) {
      const company = companies.find(c => c.id === Number(bulkForm.company_id));
      if (company) {
        setLoadingBulkBranches(true);
        fetch(`${BASE}/public/companies/${company.slug}/branches`)
          .then(r => r.json())
          .then(data => setBulkBranches(data))
          .catch(e => console.error(e))
          .finally(() => setLoadingBulkBranches(false));
      }
    } else {
      setBulkBranches([]);
    }
  }, [bulkForm.company_id, companies]);

  useEffect(() => {
    if (importForm.company_id) {
      const company = companies.find(c => c.id === Number(importForm.company_id));
      if (company) {
        setLoadingImportBranches(true);
        fetch(`${BASE}/public/companies/${company.slug}/branches`)
          .then(r => r.json())
          .then(data => setImportBranches(data))
          .catch(e => console.error(e))
          .finally(() => setLoadingImportBranches(false));
      }
    } else {
      setImportBranches([]);
    }
  }, [importForm.company_id, companies]);

  const fetchBranches = async (slug: string) => {
    setLoadingBranches(true);
    try {
      const r = await fetch(`${BASE}/public/companies/${slug}/branches`);
      if (r.ok) {
        setBranches(await r.json());
      }
    } catch (e) {
      console.error("Error fetching branches:", e);
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchContacts = async (page: number, searchVal: string) => {
    setLoading(true);
    try {
      const skip = (page - 1) * contactLimit;
      const url = `${BASE}/contacts?skip=${skip}&limit=${contactLimit}${searchVal ? `&search=${encodeURIComponent(searchVal)}` : ""}`;
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        setContacts(data.items || []);
        setContactTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Error fetching contacts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === "contacts") {
      fetchContacts(contactPage, contactSearch);
    }
  }, [view, contactPage, contactSearch]);

  const load = async () => {
    setLoading(true);
    try {
      if (view === "overview") {
        const r = await fetch(`${BASE}/stats`);
        setStats(await r.json());
      } else if (view === "companies") {
        const r = await fetch(`${BASE}/companies`);
        const data = await r.json();
        setCompanies(Array.isArray(data) ? data : []);
      } else if (view === "manage-companies" || view === "settings" || view === "bulk-sms") {
        const r = await fetch(`${BASE}/companies`);
        const data = await r.json();
        setCompanies(Array.isArray(data) ? data : []);
      } else if (view === "sms") {
        const r = await fetch(`${BASE}/logs/sms`);
        setLogs((await r.json()).items || []);
      } else if (view === "email") {
        const r = await fetch(`${BASE}/logs/email`);
        setLogs((await r.json()).items || []);
      } else if (view === "contacts") {
        await fetchContacts(contactPage, contactSearch);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatError = (detail: any): string => {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map(err => {
        const loc = Array.isArray(err.loc) ? err.loc.join('.') : 'error';
        return `${loc}: ${err.msg}`;
      }).join(', ');
    }
    if (typeof detail === 'object' && detail !== null) {
      return JSON.stringify(detail);
    }
    return "An unexpected error occurred";
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const submitCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const isUpdate = !!targetCompany && modal === "company";
    const url = isUpdate ? `${BASE}/companies/${targetCompany}` : `${BASE}/companies`;
    const method = isUpdate ? "PUT" : "POST";

    const r = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cf),
    });
    if (r.ok) {
      setModal(null);
      setCf({
        name: "",
        slug: "",
        hubtel_client_id: "",
        hubtel_client_secret: "",
        hubtel_sender_id: "",
        brevo_api_key: "",
        brevo_sender_email: "",
        brevo_sender_name: "",
      });
      flash(isUpdate ? "Company updated successfully" : "Company created successfully");
      load();
    } else {
      const d = await r.json();
      flash(formatError(d.detail));
    }
  };

  const submitBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCompany) return;
    const r = await fetch(`${BASE}/companies/${targetCompany}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bf),
    });
    if (r.ok) {
      setModal(null);
      setBf({ name: "", branch_code: "", pin: "" });
      flash("Branch created successfully");
      
      // Refresh branches if the selected company is the one we just added a branch to
      if (selectedCompanyId === targetCompany) {
        const company = companies.find(c => c.id === targetCompany);
        if (company) fetchBranches(company.slug);
      }
    } else {
      const d = await r.json();
      flash(formatError(d.detail));
    }
  };

  const deleteCompany = async () => {
    if (!targetCompany) return;
    const r = await fetch(`${BASE}/companies/${targetCompany}`, { method: "DELETE" });
    if (r.ok) {
      setModal(null);
      setSelectedCompanyId(null);
      flash("Company and all associated data cleared");
      load();
    } else {
      const d = await r.json();
      flash(formatError(d.detail));
    }
  };

  const submitBulkSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) {
      flash("Please select a CSV or Excel file");
      return;
    }
    if (!bulkForm.company_id || !bulkForm.branch_id) {
      flash("Please select both company and branch");
      return;
    }
    if (!bulkForm.message_content.trim()) {
      flash("Please enter message content");
      return;
    }

    setIsSendingBulk(true);
    const formData = new FormData();
    formData.append("company_id", bulkForm.company_id);
    formData.append("branch_id", bulkForm.branch_id);
    formData.append("message_content", bulkForm.message_content);
    if (bulkForm.scheduled_for) {
      formData.append("scheduled_for", bulkForm.scheduled_for);
    }
    formData.append("file", bulkFile);

    try {
      const r = await fetch(`${API_BASE_URL}/admin/bulk-sms-import`, {
        method: "POST",
        body: formData,
      });
      const d = await r.json();
      if (r.ok) {
        flash(`Successfully queued ${d.queued_count} messages`);
        setBulkForm({
          company_id: "",
          branch_id: "",
          message_content: "",
          scheduled_for: "",
        });
        setBulkFile(null);
        sessionStorage.setItem("masterAdminView", "sms");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        flash(formatError(d.detail));
      }
    } catch (e) {
      flash("Failed to process bulk import. Check connection.");
    } finally {
      setIsSendingBulk(false);
    }
  };

  const submitImportContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      flash("Please select a CSV or Excel file");
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", importFile);
    if (importForm.company_id) {
      formData.append("default_company_id", importForm.company_id);
    }
    if (importForm.branch_id) {
      formData.append("default_branch_id", importForm.branch_id);
    }

    try {
      const r = await fetch(`${BASE}/contacts/import`, {
        method: "POST",
        body: formData,
      });
      const d = await r.json();
      if (r.ok) {
        flash(`Successfully imported ${d.imported_count} contacts (Skipped ${d.skipped_count})`);
        setImportForm({
          company_id: "",
          branch_id: "",
        });
        setImportFile(null);
        setModal(null);
        fetchContacts(contactPage, contactSearch);
      } else {
        flash(formatError(d.detail));
      }
    } catch (e) {
      flash("Failed to process contact import. Check connection.");
    } finally {
      setIsImporting(false);
    }
  };


  const tabs = [
    { id: "overview" as const, label: "Overview", icon: <Activity size={18} /> },
    { id: "companies" as const, label: "Companies", icon: <Building2 size={18} /> },
    { id: "manage-companies" as const, label: "Manage Companies", icon: <Users size={18} /> },
    { id: "contacts" as const, label: "Contacts", icon: <Contact size={18} /> },
    { id: "sms" as const, label: "SMS Activity", icon: <Send size={18} /> },
    { id: "bulk-sms" as const, label: "Bulk SMS", icon: <Upload size={18} /> },
    { id: "email" as const, label: "Email Activity", icon: <Mail size={18} /> },
    { id: "settings" as const, label: "Settings", icon: <SettingsIcon size={18} /> },
  ];

  return (
    <div className="flex min-h-screen bg-[#050508] text-gray-200 overflow-x-hidden relative">
      
      {/* ── Mobile Sidebar Overlay ── */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-[60] bg-[#0a0a0f] border-r border-white/5 flex flex-col transition-all duration-300
          ${isSidebarOpen ? "w-64" : "w-20"}
          ${isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Zap size={18} className="text-white" />
            </div>
            {(isSidebarOpen || isMobileMenuOpen) && (
              <span className="text-lg font-bold tracking-tight text-white animate-in fade-in duration-300">
                Nexus<span className="text-indigo-500">Admin</span>
              </span>
            )}
          </div>
          
          {/* Desktop Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-md hover:bg-white/5 text-gray-500 hover:text-white transition-colors lg:flex hidden"
          >
            {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
          
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-md hover:bg-white/5 text-gray-500 hover:text-white transition-colors lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-0 space-y-1 mt-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-200 group ${
                view === t.id
                  ? "bg-indigo-600/10 text-indigo-400 border-r-2 border-indigo-500"
                  : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
              }`}
            >
              <div className={`${view === t.id ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-300"}`}>
                {t.icon}
              </div>
              {(isSidebarOpen || isMobileMenuOpen) && (
                <span className="text-sm font-medium animate-in fade-in duration-300">{t.label}</span>
              )}
              {view === t.id && (isSidebarOpen || isMobileMenuOpen) && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-glow" />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto w-full">
          <div
            className={`border-t border-white/5 w-full bg-white/[0.02] ${
              (!isSidebarOpen && !isMobileMenuOpen) ? "p-4 flex justify-center" : "p-4"
            }`}
          >
            {(!isSidebarOpen && !isMobileMenuOpen) ? (
              /* Collapsed: Single dot indicator */
              <button onClick={() => { setIsSidebarOpen(true); setHealthExpanded(true); }} className="relative group" title="Infrastructure Status">
                <div className={`w-3 h-3 rounded-full transition-colors ${
                  healthLoading ? "bg-yellow-500 animate-pulse" :
                  !health ? "bg-gray-600" :
                  health.redis.status === "connected" && health.celery_worker.status === "connected" && health.database.status === "connected"
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"
                    : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"
                }`} />
              </button>
            ) : (
              /* Expanded: Full health panel */
              <div>
                <button
                  onClick={() => setHealthExpanded(!healthExpanded)}
                  className="w-full flex items-center justify-between mb-3 group"
                >
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Infrastructure</span>
                  <div className="flex items-center gap-2">
                    {healthLoading && <Loader2 size={10} className="animate-spin text-gray-500" />}
                    <ChevronRight size={12} className={`text-gray-600 transition-transform ${healthExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Service Status Dots - Always visible */}
                <div className="space-y-2">
                  {[
                    { key: "redis", label: "Redis", data: health?.redis },
                    { key: "celery_worker", label: "Celery Worker", data: health?.celery_worker },
                    { key: "database", label: "Database", data: health?.database },
                  ].map(({ key, label, data }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          !data ? "bg-gray-600" :
                          data.status === "connected"
                            ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]"
                            : "bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.5)]"
                        }`} />
                        <span className="text-[11px] text-gray-400 font-medium">{label}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${
                        !data ? "text-gray-600" :
                        data.status === "connected" ? "text-emerald-500" : "text-red-400"
                      }`}>
                        {!data ? "..." :
                         data.status === "connected"
                          ? (data.latency_ms ? `${data.latency_ms}ms` : data.active_workers ? `${data.active_workers} up` : "OK")
                          : "Down"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Expanded Details */}
                {healthExpanded && health && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Error details for any down services */}
                    {["redis", "celery_worker", "database"].map((key) => {
                      const data = health[key as keyof HealthData] as ServiceHealth;
                      if (data?.status === "disconnected" && data.error) {
                        return (
                          <div key={key} className="p-2 rounded-lg bg-red-500/10 border border-red-500/10">
                            <p className="text-[9px] text-red-400 font-mono leading-relaxed break-all">
                              {key}: {data.error}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })}

                    {/* Celery worker names */}
                    {health.celery_worker.status === "connected" && health.celery_worker.workers && (
                      <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <p className="text-[9px] text-emerald-400/70 font-mono">
                          Workers: {health.celery_worker.workers.join(", ")}
                        </p>
                      </div>
                    )}

                    {/* Last check + refresh */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] text-gray-600">
                        {lastHealthCheck ? `Checked ${Math.round((Date.now() - lastHealthCheck.getTime()) / 1000)}s ago` : "Checking..."}
                      </span>
                      <button
                        onClick={fetchHealth}
                        disabled={healthLoading}
                        className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold disabled:opacity-50 transition-colors"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                )}

                {/* Overall status label */}
                <div className={`mt-3 pt-2 border-t border-white/5 text-[10px] font-bold ${
                  !health ? "text-gray-600" :
                  health.overall.includes("Operational") ? "text-emerald-400" :
                  health.overall.includes("Critical") ? "text-red-400" :
                  "text-amber-400"
                }`}>
                  {health?.overall || "Checking..."}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main
        className={`flex-1 transition-all duration-300 w-full min-h-screen !max-w-none ${
          isSidebarOpen ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        {/* Mobile Header */}
        <div className="lg:hidden h-16 bg-[#0a0a0f] border-b border-white/5 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">Nexus<span className="text-indigo-500">Admin</span></span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-white/5 text-gray-400"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="w-full p-6 md:p-10 !max-w-none">
          {/* Desktop Header Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight capitalize">
                {view.replace("-", " ")}
              </h1>
              <p className="text-gray-500 mt-1 text-sm font-medium">
                {view === "overview" && "Global metrics and performance overview"}
                {view === "companies" && "Overview of all registered companies"}
                {view === "manage-companies" && "Manage company branches and infrastructure"}
                {view === "contacts" && "System-wide contact (customer) records database"}
                {view === "settings" && "Advanced system configurations and data management"}
                {(view === "sms" || view === "email") && "System-wide activity monitoring"}
              </p>
            </div>
            
            {view === "settings" && (
              <button
                onClick={() => {
                  setTargetCompany(null);
                  setCf({
                    name: "",
                    slug: "",
                    hubtel_client_id: "",
                    hubtel_client_secret: "",
                    hubtel_sender_id: "",
                    brevo_api_key: "",
                    brevo_sender_email: "",
                    brevo_sender_name: "",
                  });
                  setModal("company");
                }}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                <Plus size={18} />
                <span>Add Company</span>
              </button>
            )}
            
            {view === "contacts" && (
              <div className="flex items-center gap-3">
                {/* Export Dropdown */}
                <div className="relative group">
                  <button
                    className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border border-white/5 cursor-pointer"
                  >
                    <Upload size={16} className="rotate-180" />
                    <span>Export</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-40 bg-[#0d0d12] border border-white/10 rounded-xl shadow-xl py-1 hidden group-hover:block z-50">
                    <a
                      href={`${BASE}/contacts/export?format=csv`}
                      download
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                      Export to CSV
                    </a>
                    <a
                      href={`${BASE}/contacts/export?format=xlsx`}
                      download
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                      Export to Excel
                    </a>
                  </div>
                </div>

                {/* Import Button */}
                <button
                  onClick={() => {
                    setTargetCompany(null);
                    setImportForm({
                      company_id: "",
                      branch_id: "",
                    });
                    setImportFile(null);
                    setModal("import-contacts");
                  }}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
                >
                  <Plus size={18} />
                  <span>Import Contacts</span>
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 size={40} className="text-indigo-500 animate-spin" />
              <span className="text-gray-500 text-sm font-medium">Synchronizing data...</span>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Overview View */}
              {view === "overview" && stats && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard label="Companies" val={stats.total_companies} icon={<Building2 size={20} />} color="blue" />
                    <StatCard label="Branches" val={stats.total_branches} icon={<Hash size={20} />} color="purple" />
                    <StatCard label="SMS Sent" val={stats.total_sms} icon={<Send size={20} />} color="cyan" />
                    <StatCard label="Emails" val={stats.total_emails} icon={<Mail size={20} />} color="pink" />
                    <StatCard label="Customers" val={stats.total_customers} icon={<Users size={20} />} color="emerald" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuickActionCard
                      title="Manage Tenants"
                      desc="Configure company details, API gateways, and manage branch infrastructure."
                      onClick={() => setView("companies")}
                      icon={<Building2 size={24} />}
                      hoverColor="indigo"
                    />
                    <QuickActionCard
                      title="Bulk SMS Import"
                      desc="Launch mass SMS campaigns by importing recipient lists via CSV or Excel."
                      onClick={() => setView("bulk-sms")}
                      icon={<Upload size={24} />}
                      hoverColor="indigo"
                    />
                    <QuickActionCard
                      title="Monitor Logs"
                      desc="View real-time delivery reports and message traffic across the entire platform."
                      onClick={() => setView("sms")}
                      icon={<Activity size={24} />}
                      hoverColor="emerald"
                    />
                  </div>
                </div>
              )}

              {/* Companies View (Card Grid) */}
              {view === "companies" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {companies.map((c) => (
                    <div key={c.id} className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.02] transition-all group">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 font-bold text-lg">
                          {(c.name || "C").charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-white font-bold">{c.name || "Unnamed"}</h3>
                          <span className="text-gray-500 text-xs font-mono">/{c.slug}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${c.is_active ? 'text-emerald-500' : 'text-gray-500'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button 
                          onClick={() => {
                            setSelectedCompanyId(c.id);
                            setView("manage-companies");
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                        >
                          Manage Branches <ArrowUpRight size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Manage Companies View (Dropdown + Branches) */}
              {view === "manage-companies" && (
                <div className="space-y-8">
                  {/* Company Dropdown Selection */}
                  <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-col space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                        Select Company
                      </label>
                      <div className="relative">
                        <select
                          value={selectedCompanyId || ""}
                          onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                          className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" disabled className="bg-[#0a0a0f]">Choose a company...</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id} className="bg-[#0a0a0f]">
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          <ChevronLeft size={18} className="-rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selected Company Details & Branches */}
                  {selectedCompanyId ? (
                    (() => {
                      const c = companies.find(comp => comp.id === selectedCompanyId);
                      if (!c) return null;
                      return (
                        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                          {/* Company Main Info */}
                          <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/20 to-indigo-900/40 flex items-center justify-center text-indigo-400 font-bold text-lg border border-indigo-500/20 shadow-inner">
                                  {(c.name || "C").charAt(0)}
                                </div>
                                <div>
                                  <h3 className="text-white font-semibold text-lg">{c.name || "Unnamed"}</h3>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-gray-500 text-xs font-mono">/{c.slug}</span>
                                    <div className="w-1 h-1 rounded-full bg-gray-700" />
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${c.is_active ? 'text-emerald-500' : 'text-gray-500'}`}>
                                      {c.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex gap-2 mr-4">
                                    <GatewayStatus label="Hubtel" active={!!c.hubtel_client_id} />
                                    <GatewayStatus label="Brevo" active={!!c.brevo_api_key} />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setTargetCompany(c.id);
                                        setModal("branch");
                                      }}
                                      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                                    >
                                      <Plus size={14} />
                                      <span>Register Branch</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
 
                            {/* Branches List Section */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between px-2">
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                  <Hash size={16} className="text-indigo-500" />
                                  Registered Branches
                                </h4>
                                <span className="text-xs text-gray-500 font-medium">{branches.length} total</span>
                              </div>
 
                              {loadingBranches ? (
                                <div className="flex items-center gap-3 py-10 justify-center text-gray-500">
                                  <Loader2 size={20} className="animate-spin text-indigo-500" />
                                  <span className="text-sm font-medium">Loading branches...</span>
                                </div>
                              ) : branches.length === 0 ? (
                                <div className="bg-[#0a0a0f] border border-white/5 border-dashed rounded-2xl py-12 flex flex-col items-center justify-center text-gray-600">
                                  <AlertCircle size={24} className="mb-2 opacity-20" />
                                  <p className="text-sm font-medium">No branches found for this company</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {branches.map((b) => (
                                    <div
                                      key={b.id}
                                      className="bg-[#0a0a0f] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all group"
                                    >
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="p-2 rounded-lg bg-white/5 text-indigo-400 group-hover:bg-indigo-600/10 transition-colors">
                                          <Building2 size={18} />
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-600 group-hover:text-gray-400">ID: {b.id}</span>
                                      </div>
                                      <h5 className="text-white font-bold text-sm mb-1">{b.name}</h5>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 font-medium">Code:</span>
                                        <span className="text-xs text-indigo-400 font-mono font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                                          {b.branch_code}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="bg-[#0a0a0f] border border-white/5 border-dashed rounded-3xl py-32 flex flex-col items-center justify-center space-y-4">
                        <div className="p-4 rounded-full bg-white/5 text-gray-700">
                          <Building2 size={40} />
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500 font-semibold text-lg">Select a company to manage</p>
                          <p className="text-gray-600 text-sm mt-1">Choose a company from the dropdown above to view details and branches</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
 
                {/* Bulk SMS View */}
                {view === "bulk-sms" && (
                  <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-8 shadow-sm">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/10">
                          <Upload size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white tracking-tight">Bulk SMS Import</h2>
                          <p className="text-gray-500 text-sm mt-0.5">Import Excel or CSV to send mass messages via a specific branch</p>
                        </div>
                      </div>

                      <form onSubmit={submitBulkSMS} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Company Select */}
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Target Company</label>
                            <select
                              value={bulkForm.company_id}
                              onChange={(e) => setBulkForm({...bulkForm, company_id: e.target.value, branch_id: ""})}
                              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
                              required
                            >
                              <option value="">Select Company...</option>
                              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>

                          {/* Branch Select */}
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Sending Branch</label>
                            <select
                              value={bulkForm.branch_id}
                              onChange={(e) => setBulkForm({...bulkForm, branch_id: e.target.value})}
                              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-all cursor-pointer disabled:opacity-50"
                              disabled={!bulkForm.company_id || loadingBulkBranches}
                              required
                            >
                              <option value="">{loadingBulkBranches ? "Loading..." : "Select Branch..."}</option>
                              {bulkBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Recipients File (.csv, .xlsx)</label>
                          <div 
                            className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${
                              bulkFile ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-white/5 hover:border-white/10 bg-black/20'
                            }`}
                          >
                            <input 
                              type="file" 
                              accept=".csv, .xlsx, .xls"
                              onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className={`p-4 rounded-full mb-4 ${bulkFile ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-600'}`}>
                              <Upload size={32} />
                            </div>
                            {bulkFile ? (
                              <div className="text-center">
                                <p className="text-white font-bold">{bulkFile.name}</p>
                                <p className="text-gray-500 text-xs mt-1">{(bulkFile.size / 1024).toFixed(1)} KB • Click to change</p>
                              </div>
                            ) : (
                              <div className="text-center">
                                <p className="text-gray-400 font-medium">Click or drag file to upload</p>
                                <p className="text-gray-600 text-[10px] mt-2 uppercase tracking-widest font-bold">CSV or Excel (Max 5MB)</p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 px-1">
                            <AlertCircle size={14} className="text-indigo-500/50" />
                            <p className="text-[10px] text-gray-600 leading-tight">
                              First column must be <strong>Phone Number</strong>. Optional second column for <strong>Name</strong>.
                            </p>
                          </div>
                        </div>

                        {/* Message Content */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-end px-1">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Message Content</label>
                            <span className="text-[10px] text-gray-600 font-mono">{bulkForm.message_content.length} characters</span>
                          </div>
                          <textarea
                            value={bulkForm.message_content}
                            onChange={(e) => setBulkForm({...bulkForm, message_content: e.target.value})}
                            placeholder="Hello {name}, welcome to our service!"
                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-700 outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all min-h-[120px] resize-none"
                            required
                          />
                          <p className="text-[10px] text-gray-600 mt-1 px-1">
                            Use <strong>{'{name}'}</strong> for personalization and <strong>{'{branch}'}</strong> for the branch name.
                          </p>
                        </div>

                        {/* Schedule */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                           <div className="space-y-2">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                              <Calendar size={12} />
                              Schedule Delivery (Optional)
                            </label>
                            <input
                              type="datetime-local"
                              value={bulkForm.scheduled_for}
                              onChange={(e) => setBulkForm({...bulkForm, scheduled_for: e.target.value})}
                              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                            />
                          </div>
                          
                          <button
                            type="submit"
                            disabled={isSendingBulk}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-3"
                          >
                            {isSendingBulk ? (
                              <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Processing Import...</span>
                              </>
                            ) : (
                              <>
                                <Send size={18} />
                                <span>Launch Bulk SMS Campaign</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Settings View (CRUD) */}
                {view === "settings" && (
                  <div className="space-y-8 max-w-4xl">
                    <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-8 shadow-sm">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/10">
                          <SettingsIcon size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white tracking-tight">Company Administration</h2>
                          <p className="text-gray-500 text-sm mt-0.5">Manage configurations and system-wide deletions</p>
                        </div>
                      </div>
 
                      <div className="grid grid-cols-1 gap-4">
                        {companies.map((c) => (
                          <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 font-bold group-hover:bg-indigo-600/10 group-hover:text-indigo-400 transition-colors">
                                {(c.name || "C").charAt(0)}
                              </div>
                              <div>
                                <h3 className="text-white font-semibold text-sm">{c.name || "Unnamed"}</h3>
                                <p className="text-gray-500 text-[10px] font-mono mt-0.5 tracking-wider">ID: {c.id} • SLUG: /{c.slug}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-4 sm:mt-0">
                              <button
                                onClick={() => {
                                  setTargetCompany(c.id);
                                  setCf({
                                    name: c.name,
                                    slug: c.slug,
                                    hubtel_client_id: c.hubtel_client_id || "",
                                    hubtel_client_secret: c.hubtel_client_secret || "",
                                    hubtel_sender_id: c.hubtel_sender_id || "",
                                    brevo_api_key: c.brevo_api_key || "",
                                    brevo_sender_email: c.brevo_sender_email || "",
                                    brevo_sender_name: c.brevo_sender_name || "",
                                  });
                                  setModal("company");
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5 transition-all text-[11px] font-bold uppercase tracking-wider"
                              >
                                <Pencil size={12} />
                                <span>Edit Details</span>
                              </button>
                              <button
                                onClick={() => {
                                  setTargetCompany(c.id);
                                  setModal("delete-company");
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/20 transition-all text-[11px] font-bold uppercase tracking-wider"
                              >
                                <Trash2 size={12} />
                                <span>Clear Data</span>
                              </button>
                            </div>
                          </div>
                        ))}
 
                        {companies.length === 0 && (
                          <div className="py-20 text-center text-gray-600 italic border border-white/5 border-dashed rounded-2xl">
                            No companies found to manage
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Logs View (SMS/Email) */}
              {(view === "sms" || view === "email") && (
                <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          {["Company", "Branch", view === "sms" ? "Recipient" : "Subject", "Status", "Timestamp"].map((h) => (
                            <th key={h} className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-20 text-center text-gray-600 italic">
                              No activity logs recorded yet
                            </td>
                          </tr>
                        ) : (
                          logs.map((l) => (
                            <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-medium text-sm group-hover:text-indigo-400 transition-colors">{l.company_name}</span>
                                  {l.is_bulk && (
                                    <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-black px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase tracking-tighter shadow-[0_0_8px_rgba(129,140,248,0.2)]">
                                      Bulk
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-gray-400 text-sm">{l.branch_name}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-gray-300 text-sm line-clamp-1 max-w-[200px]">
                                  {view === "sms" ? l.phone_number : l.subject}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <StatusBadge status={l.status} deliveryReport={l.delivery_report} />
                                  {l.status === "failed" && l.delivery_report && (
                                    <span 
                                      className="text-[10px] text-red-400/70 max-w-[200px] truncate block hover:text-red-400 cursor-help font-medium" 
                                      title={l.delivery_report}
                                    >
                                      {l.delivery_report.toLowerCase().includes("insufficient balance") 
                                        ? "Gateway error: Insufficient balance" 
                                        : l.delivery_report.replace(/^Error:\s*/, "")}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-xs font-medium">
                                {new Date(l.scheduled_for || l.created_at).toLocaleString([], {
                                  dateStyle: 'medium',
                                  timeStyle: 'short'
                                })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Contacts View */}
              {view === "contacts" && (
                <div className="space-y-6">
                  {/* Search Bar */}
                  <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:w-96">
                      <input
                        type="text"
                        placeholder="Search contacts by name, email, phone, branch, company..."
                        value={contactSearch}
                        onChange={(e) => {
                          setContactSearch(e.target.value);
                          setContactPage(1);
                        }}
                        className="w-full bg-black/40 border border-white/5 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white placeholder-gray-700 outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all"
                      />
                      {contactSearch && (
                        <button
                          onClick={() => {
                            setContactSearch("");
                            setContactPage(1);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      Found {contactTotal} contacts
                    </span>
                  </div>

                  {/* Table */}
                  <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.02]">
                            {["Name", "Phone Number", "Email", "Company", "Branch", "Signup Date"].map((h) => (
                              <th key={h} className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {contacts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-20 text-center text-gray-600 italic">
                                No contacts found matching your search.
                              </td>
                            </tr>
                          ) : (
                            contacts.map((c) => (
                              <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
                                      {(c.full_name || "U").charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-white font-semibold text-sm group-hover:text-indigo-400 transition-colors">
                                      {c.full_name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-gray-300 font-mono text-sm">{c.phone_number}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-gray-400 text-sm">{c.email || <span className="text-gray-700 italic text-xs">None</span>}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="bg-indigo-500/5 text-indigo-400 text-xs px-2.5 py-1 rounded-lg border border-indigo-500/10 font-bold uppercase tracking-wider">
                                    {c.company_name}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-gray-400 text-sm font-medium">{c.branch_name}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-xs font-medium">
                                  {new Date(c.created_at).toLocaleString([], {
                                    dateStyle: 'medium',
                                    timeStyle: 'short'
                                  })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {contactTotal > contactLimit && (
                      <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Showing {Math.min((contactPage - 1) * contactLimit + 1, contactTotal)} to{" "}
                          {Math.min(contactPage * contactLimit, contactTotal)} of {contactTotal} contacts
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setContactPage(prev => Math.max(prev - 1, 1))}
                            disabled={contactPage === 1}
                            className="p-1.5 rounded-lg border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-xs text-gray-400 px-2 font-mono">
                            Page {contactPage} of {Math.ceil(contactTotal / contactLimit)}
                          </span>
                          <button
                            onClick={() => setContactPage(prev => Math.min(prev + 1, Math.ceil(contactTotal / contactLimit)))}
                            disabled={contactPage === Math.ceil(contactTotal / contactLimit)}
                            className="p-1.5 rounded-lg border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ── */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setModal(null)} />
          
          <div className="relative bg-[#0d0d12] border border-white/10 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {modal === "company" ? (targetCompany ? "Update Company" : "New Company") : 
                   modal === "branch" ? "Register Branch" : 
                   modal === "import-contacts" ? "Import Contacts List" :
                   "Clear Company Data"}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {modal === "delete-company" ? "This action is irreversible" : 
                   modal === "import-contacts" ? "Select a CSV/Excel file to register multiple customers" :
                   "Fill in the required information below"}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
 
            <div className="p-8 overflow-y-auto custom-scrollbar">
              {modal === "delete-company" ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-4">
                    <AlertCircle className="text-red-500 shrink-0" size={24} />
                    <div className="space-y-2">
                      <h3 className="text-red-500 font-bold">Critical Warning</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        All details and information of this company will be totally cleared from the database. 
                        Every record, branch, and info will be removed. 
                        <strong> Are you sure?</strong>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      onClick={() => setModal(null)}
                      className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                      No, Keep Data
                    </button>
                    <button
                      onClick={deleteCompany}
                      className="bg-red-600 hover:bg-red-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-600/20 active:scale-95"
                    >
                      Yes, Clear Everything
                    </button>
                  </div>
                </div>
              ) : modal === "import-contacts" ? (
                <form onSubmit={submitImportContacts} className="space-y-8">
                  {/* Company Select */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Default Company (Optional)</label>
                    <select
                      value={importForm.company_id}
                      onChange={(e) => setImportForm({...importForm, company_id: e.target.value, branch_id: ""})}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
                    >
                      <option value="">Select Company...</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Branch Select */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Default Branch (Optional)</label>
                    <select
                      value={importForm.branch_id}
                      onChange={(e) => setImportForm({...importForm, branch_id: e.target.value})}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-all cursor-pointer disabled:opacity-50"
                      disabled={!importForm.company_id || loadingImportBranches}
                    >
                      <option value="">{loadingImportBranches ? "Loading..." : "Select Branch..."}</option>
                      {importBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Contacts File (.csv, .xlsx)</label>
                    <div 
                      className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${
                        importFile ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-white/5 hover:border-white/10 bg-black/20'
                      }`}
                    >
                      <input 
                        type="file" 
                        accept=".csv, .xlsx, .xls"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                      />
                      <div className={`p-4 rounded-full mb-4 ${importFile ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-600'}`}>
                        <Upload size={32} />
                      </div>
                      {importFile ? (
                        <div className="text-center">
                          <p className="text-white font-bold">{importFile.name}</p>
                          <p className="text-gray-500 text-xs mt-1">{(importFile.size / 1024).toFixed(1)} KB • Click to change</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-gray-400 font-medium">Click or drag file to upload</p>
                          <p className="text-gray-600 text-[10px] mt-2 uppercase tracking-widest font-bold">CSV or Excel (Max 5MB)</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 px-1">
                      <AlertCircle size={14} className="text-indigo-500/50" />
                      <p className="text-[10px] text-gray-600 leading-tight">
                        File should have columns like <strong>Phone</strong> (or phone number), <strong>Name</strong> (or full name), <strong>Email</strong>, <strong>Company</strong> (slug/name), and <strong>Branch</strong> (code/name).
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isImporting}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Importing...</span>
                        </>
                      ) : (
                        <span>Upload & Import</span>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={modal === "company" ? submitCompany : submitBranch} className="space-y-8">
                  {modal === "company" ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Company Name" placeholder="Classhouse Electronics" value={cf.name} onChange={v => setCf({ ...cf, name: v })} />
                        <InputField label="Unique Slug" placeholder="classhouse" value={cf.slug} onChange={v => setCf({ ...cf, slug: v })} />
                      </div>
 
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                          <Globe size={14} />
                          <span>SMS Gateway (Hubtel)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <InputField label="Client ID" value={cf.hubtel_client_id} onChange={v => setCf({ ...cf, hubtel_client_id: v })} />
                          <InputField label="Client Secret" type="password" value={cf.hubtel_client_secret} onChange={v => setCf({ ...cf, hubtel_client_secret: v })} />
                        </div>
                        <div className="w-full sm:w-1/2">
                          <InputField label="Sender ID (Max 11 chars)" placeholder="e.g. ClassHouse" value={cf.hubtel_sender_id} onChange={v => setCf({ ...cf, hubtel_sender_id: v })} />
                        </div>
                      </div>
 
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase tracking-widest">
                          <Mail size={14} />
                          <span>Email Gateway (Brevo)</span>
                        </div>
                        <div className="space-y-4">
                          <InputField label="API Key" type="password" value={cf.brevo_api_key} onChange={v => setCf({ ...cf, brevo_api_key: v })} />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="Sender Email" value={cf.brevo_sender_email} onChange={v => setCf({ ...cf, brevo_sender_email: v })} />
                            <InputField label="Sender Name" value={cf.brevo_sender_name} onChange={v => setCf({ ...cf, brevo_sender_name: v })} />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <InputField label="Branch Name" placeholder="Accra Mall Branch" value={bf.name} onChange={v => setBf({ ...bf, name: v })} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Branch Code" placeholder="ACCRA01" value={bf.branch_code} onChange={v => setBf({ ...bf, branch_code: v })} />
                        <InputField label="Access PIN" type="password" placeholder="4-digit PIN" value={bf.pin} onChange={v => setBf({ ...bf, pin: v })} />
                      </div>
                    </div>
                  )}
 
                  <div className="pt-6 border-t border-white/5 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
                    >
                      {modal === "company" ? (targetCompany ? "Save Changes" : "Register Company") : "Confirm Branch"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[200] animate-in slide-in-from-right-10 fade-in duration-300">
          <div className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-indigo-900/20 flex items-center gap-3 border border-indigo-400/30">
            <CheckCircle2 size={20} />
            <span className="text-sm font-bold tracking-wide">{toast}</span>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .shadow-glow {
          box-shadow: 0 0 10px rgba(129, 140, 248, 0.5);
        }
      `}</style>
    </div>
  );
};

// ── Sub-components ──

const StatCard = ({ label, val, icon, color }: { label: string; val: number; icon: any; color: string }) => {
  const themes: any = {
    blue: "from-blue-600/20 text-blue-400 border-blue-500/20",
    purple: "from-purple-600/20 text-purple-400 border-purple-500/20",
    cyan: "from-cyan-600/20 text-cyan-400 border-cyan-500/20",
    pink: "from-pink-600/20 text-pink-400 border-pink-500/20",
    emerald: "from-emerald-600/20 text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className={`bg-[#0a0a0f] border rounded-2xl p-6 transition-all duration-300 hover:bg-gradient-to-br ${themes[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
        <div className="p-2 rounded-lg bg-white/5">{icon}</div>
      </div>
      <div className="text-3xl font-black text-white tracking-tight">{val.toLocaleString()}</div>
    </div>
  );
};

const QuickActionCard = ({ title, desc, onClick, icon, hoverColor }: { title: string; desc: string; onClick: () => void; icon: any; hoverColor: string }) => {
  const themes: any = {
    indigo: "hover:border-indigo-500/40 hover:bg-indigo-600/5 group-hover:text-indigo-400",
    emerald: "hover:border-emerald-500/40 hover:bg-emerald-600/5 group-hover:text-emerald-400",
  };

  return (
    <button
      onClick={onClick}
      className={`bg-[#0a0a0f] border border-white/5 rounded-2xl p-8 flex items-center justify-between group transition-all duration-300 text-left ${themes[hoverColor]}`}
    >
      <div className="flex items-center gap-6">
        <div className={`p-4 rounded-2xl bg-white/5 transition-colors ${themes[hoverColor]}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm">{desc}</p>
        </div>
      </div>
      <ArrowUpRight size={24} className="text-gray-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
    </button>
  );
};

const InputField = ({ label, type = "text", placeholder = "", value, onChange }: { label: string; type?: string; placeholder?: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-2 group">
    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1 group-focus-within:text-indigo-400 transition-colors">
      {label}
    </label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all"
    />
  </div>
);

const GatewayStatus = ({ label, active }: { label: string; active: boolean }) => (
  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tighter ${
    active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
  }`}>
    <div className={`w-1 h-1 rounded-full ${active ? 'bg-emerald-400' : 'bg-red-400'}`} />
    {label}
  </div>
);

const StatusBadge = ({ status, deliveryReport }: { status: string; deliveryReport?: string }) => {
  const isSent = status === "sent";
  const isQueued = status === "queued";
  const isInsufficientBalance = status === "failed" && deliveryReport && deliveryReport.toLowerCase().includes("insufficient balance");
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
      isSent ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
      isQueued ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
      isInsufficientBalance ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse" :
      "bg-red-500/10 text-red-500 border-red-500/20"
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${isSent ? "bg-emerald-500" : isQueued ? "bg-blue-500" : isInsufficientBalance ? "bg-amber-400" : "bg-red-500"}`} />
      {isInsufficientBalance ? "Insufficient Balance" : status}
    </div>
  );
};


export default MasterAdmin;
