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
  CreditCard,
  Eye,
  EyeOff,
  Wallet,
  RefreshCw,
  Search,
  Download,
  Clock,
  TrendingUp,
  BarChart3,
  Layers,
  ChevronDown,
  Key,
  Lock,
  FileText,
  Database,
  ShieldCheck,
} from "lucide-react";

// ── Types ──
interface SendingStats {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  success_rate: number;
}

interface CompanySendingBreakdown {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at?: string;
  branches_count: number;
  customers_count: number;
  sms: SendingStats;
  email: SendingStats;
  last_activity?: string | null;
  gateways: {
    hubtel: boolean;
    brevo: boolean;
    paystack: boolean;
  };
}

interface DashboardTotals {
  total_companies: number;
  total_branches: number;
  total_customers: number;
  total_sms: number;
  sms_sent: number;
  sms_failed: number;
  sms_queued: number;
  sms_success_rate: number;
  total_email: number;
  email_sent: number;
  email_failed: number;
  email_queued: number;
  email_success_rate: number;
  sms_today: number;
  email_today: number;
  total_messages: number;
}

interface DailyTrendPoint {
  date: string;
  label: string;
  sms: number;
  email: number;
  total: number;
}

interface CompanyBreakdownResponse {
  timeframe: string;
  totals: DashboardTotals;
  companies: CompanySendingBreakdown[];
  daily_trend?: DailyTrendPoint[];
}

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
  paystack_public_key?: string;
  paystack_secret_key?: string;
}

interface Branch {
  id: number;
  name: string;
  branch_code: string;
  company_id: number;
}

interface AdminTemplate {
  id: number;
  template_type: string;
  content: string;
  branch_id?: number | null;
  branch_name?: string;
  company_id?: number | null;
  company_name?: string;
  created_at: string;
}

interface BackupSummary {
  companies: number;
  branches: number;
  customers: number;
  contact_folders: number;
  folder_links: number;
  templates: number;
  sms_logs: number;
  email_logs: number;
  system_settings: number;
  payment_transactions: number;
  generated_at: string;
}

// ── Main Component ──
const MasterAdmin: React.FC = () => {
  const BASE = `${API_BASE_URL}/admin`;
  const [view, setView] = useState<
    | "overview"
    | "companies"
    | "manage-companies"
    | "templates"
    | "sms"
    | "email"
    | "payments"
    | "settings"
    | "backup"
    | "bulk-sms"
    | "contacts"
  >((sessionStorage.getItem("masterAdminView") as any) || "overview");

  useEffect(() => {
    sessionStorage.setItem("masterAdminView", view);
    document.title = "PeakSend • Admin Dashboard";
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
  const [modal, setModal] = useState<
    | null
    | "company"
    | "branch"
    | "edit-branch"
    | "delete-company"
    | "import-contacts"
    | "template"
    | "delete-template"
    | "import-templates"
  >(null);
  const [targetCompany, setTargetCompany] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Selection states
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Admin branch password / details edit state
  const [allBranches, setAllBranches] = useState<
    (Branch & { company_name?: string; company_slug?: string })[]
  >([]);
  const [targetBranch, setTargetBranch] = useState<Branch | null>(null);
  const [branchEditForm, setBranchEditForm] = useState({
    name: "",
    branch_code: "",
    pin: "",
    confirm_pin: "",
  });
  const [showBranchPassword, setShowBranchPassword] = useState(false);
  const [isUpdatingBranch, setIsUpdatingBranch] = useState(false);

  // Admin Templates state
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateScopeFilter, setTemplateScopeFilter] = useState<"all" | "global" | "branch">("all");
  const [templateCompanyFilter, setTemplateCompanyFilter] = useState<string>("");
  const [targetTemplate, setTargetTemplate] = useState<AdminTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    template_type: "",
    content: "",
    branch_id: "",
  });
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateImportFile, setTemplateImportFile] = useState<File | null>(null);
  const [templateImportBranchId, setTemplateImportBranchId] = useState<string>("");
  const [isImportingTemplates, setIsImportingTemplates] = useState(false);

  // Full System Backup & Restore state
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupRestoreMode, setBackupRestoreMode] = useState<"merge" | "update">("merge");
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [lastRestoreResult, setLastRestoreResult] = useState<any | null>(null);

  // Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    paystack_public_key: "",
    paystack_secret_key: "",
  });
  const [bf, setBf] = useState({ name: "", branch_code: "", pin: "" });

  // Paystack Gateway state
  const [paystackSettings, setPaystackSettings] = useState({
    public_key: "",
    secret_key: "",
    currency: "GHS",
    is_configured: false,
  });
  const [loadingPaystack, setLoadingPaystack] = useState(false);
  const [savingPaystack, setSavingPaystack] = useState(false);
  const [showPaystackSecret, setShowPaystackSecret] = useState(false);

  // Payments transactions list state
  const [paymentTxs, setPaymentTxs] = useState<any[]>([]);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const paymentLimit = 15;
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Test Payment Checkout modal state
  const [testPayModalOpen, setTestPayModalOpen] = useState(false);
  const [testPayForm, setTestPayForm] = useState({
    amount: "50",
    customer_email: "",
    company_id: "",
    purpose: "sms_credits",
  });
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);

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

  // Overview Company Sending Breakdown state
  const [overviewTimeframe, setOverviewTimeframe] = useState<
    "all" | "today" | "7d" | "30d"
  >("all");
  const [breakdownData, setBreakdownData] =
    useState<CompanyBreakdownResponse | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [companyStatusFilter, setCompanyStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [companySortField, setCompanySortField] = useState<
    "total" | "sms" | "email" | "name"
  >("total");
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [chartMode, setChartMode] = useState<"channel" | "status">("channel");

  const fetchBreakdown = async (
    tf: "all" | "today" | "7d" | "30d" = overviewTimeframe
  ) => {
    try {
      setLoadingBreakdown(true);
      const res = await fetch(`${BASE}/stats/companies?timeframe=${tf}`);
      if (res.ok) {
        const data: CompanyBreakdownResponse = await res.json();
        setBreakdownData(data);
      }
    } catch (e) {
      console.error("Failed to fetch company breakdown:", e);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const handleExportCompanyReport = async () => {
    try {
      setIsExportingReport(true);
      const res = await fetch(
        `${BASE}/stats/companies/export?timeframe=${overviewTimeframe}`
      );
      if (!res.ok) throw new Error("Failed to export report");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `company_sending_report_${overviewTimeframe}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      flash("Company sending report exported successfully");
    } catch (err: any) {
      flash(err?.message || "Failed to export report");
    } finally {
      setIsExportingReport(false);
    }
  };

  // Clear logs state
  const [isClearingLogs, setIsClearingLogs] = useState(false);

  const handleClearLogs = async (type: "all" | "sms" | "email") => {
    const label =
      type === "all"
        ? "all SMS and Email logs"
        : type === "sms"
        ? "all SMS logs"
        : "all Email logs";
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${label} from the database? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setIsClearingLogs(true);
      const endpoint =
        type === "all"
          ? `${BASE}/logs/clear-all`
          : `${BASE}/logs/${type}/clear-all`;
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg = "Failed to clear logs";
        if (typeof data.detail === "string") msg = data.detail;
        else if (Array.isArray(data.detail))
          msg = data.detail
            .map((e: any) => e.msg || JSON.stringify(e))
            .join(", ");
        else if (data.detail) msg = JSON.stringify(data.detail);
        throw new Error(msg);
      }
      alert(data.message || "Logs cleared successfully!");
      setLogs([]);
      load();
    } catch (err: any) {
      alert(`Error: ${err?.message || "Failed to clear logs"}`);
    } finally {
      setIsClearingLogs(false);
    }
  };

  useEffect(() => {
    load();
    setIsMobileMenuOpen(false);
  }, [view]);

  useEffect(() => {
    if (view === "overview") {
      fetchBreakdown(overviewTimeframe);
    }
  }, [overviewTimeframe]);

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
        celery_worker: {
          status: "disconnected",
          error: "API unreachable",
          active_workers: 0,
        },
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
      const company = companies.find((c) => c.id === selectedCompanyId);
      if (company) {
        fetchBranches(company.slug);
      }
    } else {
      setBranches([]);
    }
  }, [selectedCompanyId, companies]);

  useEffect(() => {
    if (bulkForm.company_id) {
      const company = companies.find(
        (c) => c.id === Number(bulkForm.company_id)
      );
      if (company) {
        fetchBulkBranches(company.slug);
      }
    } else {
      setBulkBranches([]);
    }
  }, [bulkForm.company_id, companies]);

  useEffect(() => {
    if (importForm.company_id) {
      const company = companies.find(
        (c) => c.id === Number(importForm.company_id)
      );
      if (company) {
        fetchImportBranches(company.slug);
      }
    } else {
      setImportBranches([]);
    }
  }, [importForm.company_id, companies]);

  useEffect(() => {
    if (view === "contacts") {
      const delayDebounce = setTimeout(() => {
        fetchContacts(contactPage, contactSearch);
      }, 300);
      return () => clearTimeout(delayDebounce);
    }
  }, [contactPage, contactSearch]);

  useEffect(() => {
    if (view === "payments") {
      const delayDebounce = setTimeout(() => {
        fetchPayments(paymentPage, paymentSearch, paymentStatusFilter);
      }, 300);
      return () => clearTimeout(delayDebounce);
    }
  }, [paymentPage, paymentSearch, paymentStatusFilter]);

  const fetchPaystackSettings = async () => {
    setLoadingPaystack(true);
    try {
      const r = await fetch(`${BASE}/paystack/settings`);
      if (r.ok) {
        const data = await r.json();
        setPaystackSettings({
          public_key: data.public_key || "",
          secret_key: data.secret_key || "",
          currency: data.currency || "GHS",
          is_configured: !!data.is_configured,
        });
      }
    } catch (e) {
      console.error("Failed to fetch Paystack settings:", e);
    } finally {
      setLoadingPaystack(false);
    }
  };

  const fetchPayments = async (page: number, search: string, status: string) => {
    setLoadingPayments(true);
    try {
      const skip = (page - 1) * paymentLimit;
      const params = new URLSearchParams({
        skip: String(skip),
        limit: String(paymentLimit),
      });
      if (search.trim()) params.append("search", search.trim());
      if (status) params.append("status", status);

      const r = await fetch(`${BASE}/payments?${params.toString()}`);
      if (r.ok) {
        const data = await r.json();
        setPaymentTxs(data.items || []);
        setPaymentTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch payment transactions:", e);
    } finally {
      setLoadingPayments(false);
    }
  };

  const savePaystackSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPaystack(true);
    try {
      const r = await fetch(`${BASE}/paystack/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_key: paystackSettings.public_key,
          secret_key: paystackSettings.secret_key,
          currency: paystackSettings.currency,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        flash("Paystack gateway settings saved!");
        fetchPaystackSettings();
      } else {
        flash(formatError(d.detail));
      }
    } catch (err) {
      flash("Failed to save Paystack settings");
    } finally {
      setSavingPaystack(false);
    }
  };

  const handleInitializePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPayForm.customer_email || !testPayForm.amount) {
      flash("Please enter customer email and amount");
      return;
    }
    setIsInitializingPayment(true);
    try {
      const r = await fetch(`${API_BASE_URL}/payments/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(testPayForm.amount),
          customer_email: testPayForm.customer_email,
          currency: paystackSettings.currency,
          company_id: testPayForm.company_id
            ? Number(testPayForm.company_id)
            : null,
          purpose: testPayForm.purpose,
        }),
      });
      const d = await r.json();
      if (r.ok && d.authorization_url) {
        flash(`Redirecting to Paystack (${d.reference})...`);
        setTestPayModalOpen(false);
        window.open(d.authorization_url, "_blank", "noopener,noreferrer");
        setTimeout(
          () => fetchPayments(paymentPage, paymentSearch, paymentStatusFilter),
          2000
        );
      } else {
        flash(formatError(d.detail || "Could not initialize payment"));
      }
    } catch (err) {
      flash("Failed to initialize payment");
    } finally {
      setIsInitializingPayment(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      if (view === "overview") {
        const [statsRes, breakdownRes, compRes] = await Promise.all([
          fetch(`${BASE}/stats`),
          fetch(`${BASE}/stats/companies?timeframe=${overviewTimeframe}`),
          fetch(`${BASE}/companies`),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (breakdownRes.ok) setBreakdownData(await breakdownRes.json());
        if (compRes.ok) {
          const cData = await compRes.json();
          setCompanies(Array.isArray(cData) ? cData : []);
        }
      } else if (view === "companies") {
        const [r, breakdownRes] = await Promise.all([
          fetch(`${BASE}/companies`),
          fetch(`${BASE}/stats/companies?timeframe=${overviewTimeframe}`),
        ]);
        const data = await r.json();
        setCompanies(Array.isArray(data) ? data : []);
        if (breakdownRes.ok) setBreakdownData(await breakdownRes.json());
      } else if (
        view === "manage-companies" ||
        view === "settings" ||
        view === "bulk-sms"
      ) {
        const [r, bRes] = await Promise.all([
          fetch(`${BASE}/companies`),
          fetch(`${BASE}/branches`),
        ]);
        const data = await r.json();
        setCompanies(Array.isArray(data) ? data : []);
        if (bRes.ok) {
          const bData = await bRes.json();
          setAllBranches(Array.isArray(bData) ? bData : []);
        }
      } else if (view === "templates") {
        const [tRes, cRes, bRes] = await Promise.all([
          fetch(`${BASE}/templates`),
          fetch(`${BASE}/companies`),
          fetch(`${BASE}/branches`),
        ]);
        if (tRes.ok) {
          const tData = await tRes.json();
          setTemplates(Array.isArray(tData) ? tData : []);
        }
        if (cRes.ok) {
          const cData = await cRes.json();
          setCompanies(Array.isArray(cData) ? cData : []);
        }
        if (bRes.ok) {
          const bData = await bRes.json();
          setAllBranches(Array.isArray(bData) ? bData : []);
        }
      } else if (view === "backup") {
        const r = await fetch(`${BASE}/backup/summary`);
        if (r.ok) {
          setBackupSummary(await r.json());
        }
      } else if (view === "payments") {
        const r = await fetch(`${BASE}/companies`);
        const data = await r.json();
        setCompanies(Array.isArray(data) ? data : []);
        fetchPaystackSettings();
        fetchPayments(paymentPage, paymentSearch, paymentStatusFilter);
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
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((err) => {
          const loc = Array.isArray(err.loc) ? err.loc.join(".") : "error";
          return `${loc}: ${err.msg}`;
        })
        .join(", ");
    }
    if (typeof detail === "object" && detail !== null) {
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
    const url = isUpdate
      ? `${BASE}/companies/${targetCompany}`
      : `${BASE}/companies`;
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
        paystack_public_key: "",
        paystack_secret_key: "",
      });
      flash(
        isUpdate ? "Company updated successfully" : "Company created successfully"
      );
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

      if (selectedCompanyId === targetCompany) {
        const company = companies.find((c) => c.id === targetCompany);
        if (company) fetchBranches(company.slug);
      }
      load();
    } else {
      const d = await r.json();
      flash(formatError(d.detail));
    }
  };

  const submitBranchUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBranch) return;
    if (
      branchEditForm.pin &&
      branchEditForm.pin !== branchEditForm.confirm_pin
    ) {
      flash("New password / PIN and confirmation do not match");
      return;
    }

    setIsUpdatingBranch(true);
    try {
      const payload: any = {
        name: branchEditForm.name,
        branch_code: branchEditForm.branch_code,
      };
      if (branchEditForm.pin.trim()) {
        payload.pin = branchEditForm.pin.trim();
      }

      const r = await fetch(`${BASE}/branches/${targetBranch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.ok) {
        setModal(null);
        setTargetBranch(null);
        setBranchEditForm({
          name: "",
          branch_code: "",
          pin: "",
          confirm_pin: "",
        });
        flash("Branch password & details updated successfully!");
        if (selectedCompanyId) {
          const company = companies.find((c) => c.id === selectedCompanyId);
          if (company) fetchBranches(company.slug);
        }
        load();
      } else {
        flash(formatError(d.detail));
      }
    } catch (err) {
      flash("Failed to update branch password");
    } finally {
      setIsUpdatingBranch(false);
    }
  };

  const deleteCompany = async () => {
    if (!targetCompany) return;
    const r = await fetch(`${BASE}/companies/${targetCompany}`, {
      method: "DELETE",
    });
    if (r.ok) {
      setModal(null);
      setTargetCompany(null);
      if (selectedCompanyId === targetCompany) setSelectedCompanyId(null);
      flash("Company and all data cleared");
      load();
    } else {
      const d = await r.json();
      flash(formatError(d.detail));
    }
  };

  const fetchBranches = async (slug: string) => {
    setLoadingBranches(true);
    try {
      const r = await fetch(`${BASE}/public/companies/${slug}/branches`);
      if (r.ok) {
        setBranches(await r.json());
      } else {
        setBranches([]);
      }
    } catch (e) {
      console.error(e);
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchBulkBranches = async (slug: string) => {
    setLoadingBulkBranches(true);
    try {
      const r = await fetch(`${BASE}/public/companies/${slug}/branches`);
      if (r.ok) {
        setBulkBranches(await r.json());
      } else {
        setBulkBranches([]);
      }
    } catch (e) {
      console.error(e);
      setBulkBranches([]);
    } finally {
      setLoadingBulkBranches(false);
    }
  };

  const fetchImportBranches = async (slug: string) => {
    setLoadingImportBranches(true);
    try {
      const r = await fetch(`${BASE}/public/companies/${slug}/branches`);
      if (r.ok) {
        setImportBranches(await r.json());
      } else {
        setImportBranches([]);
      }
    } catch (e) {
      console.error(e);
      setImportBranches([]);
    } finally {
      setLoadingImportBranches(false);
    }
  };

  const fetchContacts = async (page: number, search: string) => {
    try {
      const skip = (page - 1) * contactLimit;
      const url = new URL(`${BASE}/contacts`);
      url.searchParams.append("skip", skip.toString());
      url.searchParams.append("limit", contactLimit.toString());
      if (search) url.searchParams.append("search", search);

      const r = await fetch(url.toString());
      if (r.ok) {
        const data = await r.json();
        setContacts(data.items || []);
        setContactTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitBulkSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !bulkFile ||
      !bulkForm.company_id ||
      !bulkForm.branch_id ||
      !bulkForm.message_content
    ) {
      flash("Please fill all required fields and upload a file");
      return;
    }

    setIsSendingBulk(true);
    const formData = new FormData();
    formData.append("company_id", bulkForm.company_id);
    formData.append("branch_id", bulkForm.branch_id);
    formData.append("message_content", bulkForm.message_content);
    if (bulkForm.scheduled_for) {
      formData.append(
        "scheduled_for",
        new Date(bulkForm.scheduled_for).toISOString()
      );
    }
    formData.append("file", bulkFile);

    try {
      const r = await fetch(`${BASE}/bulk-sms-import`, {
        method: "POST",
        body: formData,
      });
      const d = await r.json();
      if (r.ok) {
        flash(`Successfully queued ${d.queued_count} messages!`);
        setBulkForm({
          company_id: "",
          branch_id: "",
          message_content: "",
          scheduled_for: "",
        });
        setBulkFile(null);
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
      flash("Please select a file to upload");
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
        flash(
          `Successfully imported ${d.imported_count} contacts (Skipped ${d.skipped_count})`
        );
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

  const stripHtmlTags = (html: string) =>
    html
      .replace(/<[^>]*>?/gm, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .trim();

  const submitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.template_type.trim() || !templateForm.content.trim()) {
      flash("Please provide both template name/category and message content");
      return;
    }

    setIsSavingTemplate(true);
    try {
      const isEdit = !!targetTemplate && modal === "template";
      const url = isEdit
        ? `${BASE}/templates/${targetTemplate.id}`
        : `${BASE}/templates`;
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        template_type: templateForm.template_type.trim(),
        content: templateForm.content.trim(),
        branch_id: templateForm.branch_id
          ? Number(templateForm.branch_id)
          : null,
      };

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.ok) {
        setModal(null);
        setTargetTemplate(null);
        setTemplateForm({ template_type: "", content: "", branch_id: "" });
        flash(
          isEdit
            ? "Template updated successfully!"
            : "Template created successfully!"
        );
        load();
      } else {
        flash(formatError(d.detail));
      }
    } catch (err) {
      flash("Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const deleteTemplate = async () => {
    if (!targetTemplate) return;
    try {
      const r = await fetch(`${BASE}/templates/${targetTemplate.id}`, {
        method: "DELETE",
      });
      if (r.ok) {
        setModal(null);
        setTargetTemplate(null);
        flash("Template deleted successfully");
        load();
      } else {
        const d = await r.json();
        flash(formatError(d.detail));
      }
    } catch (err) {
      flash("Failed to delete template");
    }
  };

  const submitImportTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateImportFile) {
      flash("Please select a CSV, Excel, or JSON file to import");
      return;
    }

    setIsImportingTemplates(true);
    const formData = new FormData();
    formData.append("file", templateImportFile);
    if (templateImportBranchId) {
      formData.append("branch_id", templateImportBranchId);
    }

    try {
      const r = await fetch(`${BASE}/templates/import`, {
        method: "POST",
        body: formData,
      });
      const d = await r.json();
      if (r.ok) {
        const skippedMsg =
          d.skipped_count && d.skipped_count > 0
            ? ` (${d.skipped_count} duplicate/invalid skipped)`
            : "";
        flash(
          `Successfully imported ${d.imported_count} templates!${skippedMsg}`
        );
        setTemplateImportFile(null);
        setTemplateImportBranchId("");
        setModal(null);
        load();
      } else {
        flash(formatError(d.detail));
      }
    } catch (err) {
      flash("Failed to import templates");
    } finally {
      setIsImportingTemplates(false);
    }
  };

  const handleExportTemplates = (format: "csv" | "json") => {
    if (templates.length === 0) {
      flash("No templates available to export");
      return;
    }

    if (format === "json") {
      const exportPayload = templates.map((t) => ({
        id: t.id,
        template_type: t.template_type,
        content: t.content,
        branch_id: t.branch_id,
        branch_name: t.branch_name || "Global Template",
        company_name: t.company_name || "All Companies",
        created_at: t.created_at,
      }));
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `peaksend_templates_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flash("Templates exported as JSON!");
    } else {
      const headers = [
        "ID",
        "Template Name / Category",
        "Content",
        "Scope / Branch",
        "Company",
        "Created At",
      ];
      const escapeCsv = (val: string) =>
        `"${String(val ?? "").replace(/"/g, '""')}"`;
      const rows = templates.map((t) => [
        t.id,
        escapeCsv(t.template_type),
        escapeCsv(stripHtmlTags(t.content)),
        escapeCsv(t.branch_name || "Global Template"),
        escapeCsv(t.company_name || "All Companies"),
        escapeCsv(new Date(t.created_at).toISOString()),
      ]);
      const csvContent =
        headers.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `peaksend_templates_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flash("Templates exported as CSV!");
    }
  };

  const handleExportFullBackup = async () => {
    setIsExportingBackup(true);
    try {
      const r = await fetch(`${BASE}/backup/export`);
      if (!r.ok) {
        const d = await r.json();
        flash(formatError(d.detail || "Failed to export backup"));
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `peaksend_full_backup_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flash("Complete system backup downloaded successfully!");
    } catch (err) {
      flash("Failed to download system backup");
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleRestoreFullBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupFile) {
      flash("Please select a PeakSend backup (.json) file to restore");
      return;
    }

    setIsRestoringBackup(true);
    setLastRestoreResult(null);
    const formData = new FormData();
    formData.append("file", backupFile);
    formData.append("mode", backupRestoreMode);

    try {
      const r = await fetch(`${BASE}/backup/import`, {
        method: "POST",
        body: formData,
      });
      const d = await r.json();
      if (r.ok) {
        setLastRestoreResult(d.summary);
        setBackupFile(null);
        flash("System backup restored successfully!");
        load();
      } else {
        flash(formatError(d.detail || "Failed to restore backup"));
      }
    } catch (err) {
      flash("Failed to restore system backup");
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const navGroups = [
    {
      title: "Analytics & Insights",
      items: [
        { id: "overview" as const, label: "Executive Dashboard", icon: <BarChart3 size={18} /> },
      ],
    },
    {
      title: "Tenant Operations",
      items: [
        { id: "companies" as const, label: "Companies Summary", icon: <Building2 size={18} /> },
        { id: "manage-companies" as const, label: "Branches & Access", icon: <Layers size={18} /> },
        { id: "contacts" as const, label: "Global Contacts", icon: <Contact size={18} /> },
      ],
    },
    {
      title: "Messaging & Logs",
      items: [
        { id: "templates" as const, label: "Message Templates", icon: <FileText size={18} /> },
        { id: "bulk-sms" as const, label: "Bulk SMS Campaign", icon: <Upload size={18} /> },
        { id: "sms" as const, label: "SMS Delivery Logs", icon: <Send size={18} /> },
        { id: "email" as const, label: "Email Delivery Logs", icon: <Mail size={18} /> },
      ],
    },
    {
      title: "Platform & Billing",
      items: [
        { id: "payments" as const, label: "Paystack & Billing", icon: <CreditCard size={18} /> },
        { id: "settings" as const, label: "Tenant Settings", icon: <SettingsIcon size={18} /> },
        { id: "backup" as const, label: "System Backup & Restore", icon: <Database size={18} /> },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden relative font-sans">
      {/* ── Mobile Sidebar Overlay ── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[50] lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar (Deep Slate Executive Navigation) ── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-[60] bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-all duration-300 shadow-xl
          ${isSidebarOpen ? "w-64" : "w-20"}
          ${isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand Header */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
              <Zap size={20} className="text-white" />
            </div>
            {(isSidebarOpen || isMobileMenuOpen) && (
              <div>
                <span className="text-base font-extrabold tracking-tight text-white block leading-none">
                  Peak<span className="text-blue-400">Send</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-1 block">
                  Admin Dashboard
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors lg:flex hidden"
          >
            {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {(isSidebarOpen || isMobileMenuOpen) && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                  {group.title}
                </p>
              )}
              {group.items.map((t) => {
                const active = view === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setView(t.id)}
                    title={t.label}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer ${
                      active
                        ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/25"
                        : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    <div
                      className={`shrink-0 ${
                        active ? "text-white" : "text-slate-400 group-hover:text-white"
                      }`}
                    >
                      {t.icon}
                    </div>
                    {(isSidebarOpen || isMobileMenuOpen) && (
                      <span className="text-sm truncate">{t.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Infrastructure Health Footer */}
        <div className="mt-auto border-t border-slate-800 bg-slate-950/50 p-4">
          {!isSidebarOpen && !isMobileMenuOpen ? (
            <button
              onClick={() => {
                setIsSidebarOpen(true);
                setHealthExpanded(true);
              }}
              className="w-full flex justify-center"
              title="Infrastructure Status"
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  healthLoading
                    ? "bg-amber-400 animate-pulse"
                    : !health
                    ? "bg-slate-600"
                    : health.redis.status === "connected" &&
                      health.celery_worker.status === "connected" &&
                      health.database.status === "connected"
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                    : "bg-rose-500 animate-pulse"
                }`}
              />
            </button>
          ) : (
            <div>
              <button
                onClick={() => setHealthExpanded(!healthExpanded)}
                className="w-full flex items-center justify-between mb-2.5"
              >
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  System Health
                </span>
                <div className="flex items-center gap-1.5">
                  {healthLoading && (
                    <Loader2 size={11} className="animate-spin text-slate-400" />
                  )}
                  <ChevronRight
                    size={13}
                    className={`text-slate-500 transition-transform ${
                      healthExpanded ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </button>

              <div className="space-y-1.5">
                {[
                  { key: "redis", label: "Redis Broker", data: health?.redis },
                  { key: "celery_worker", label: "Celery Queue", data: health?.celery_worker },
                  { key: "database", label: "PostgreSQL", data: health?.database },
                ].map(({ key, label, data }) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          !data
                            ? "bg-slate-600"
                            : data.status === "connected"
                            ? "bg-emerald-400"
                            : "bg-rose-400"
                        }`}
                      />
                      <span className="text-slate-300 text-[11px]">{label}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        !data
                          ? "text-slate-500"
                          : data.status === "connected"
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {!data
                        ? "..."
                        : data.status === "connected"
                        ? data.latency_ms
                          ? `${data.latency_ms}ms`
                          : data.active_workers
                          ? `${data.active_workers} active`
                          : "Online"
                        : "Offline"}
                    </span>
                  </div>
                ))}
              </div>

              {healthExpanded && health && (
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>
                    {lastHealthCheck
                      ? `Updated ${Math.round(
                          (Date.now() - lastHealthCheck.getTime()) / 1000
                        )}s ago`
                      : "Checking..."}
                  </span>
                  <button
                    onClick={fetchHealth}
                    disabled={healthLoading}
                    className="text-blue-400 hover:text-blue-300 font-bold"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main
        className={`flex-1 transition-all duration-300 w-full min-h-screen ${
          isSidebarOpen ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        {/* Top Sticky Command Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <Menu size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight capitalize">
                  {view === "overview"
                    ? "PeakSend Admin Dashboard"
                    : `PeakSend • ${view.replace("-", " ")}`}
                </h1>
                <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Platform
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                {view === "overview" &&
                  "Visual charts, real-time delivery rates, and complete summary of messages sent by each company"}
                {view === "companies" &&
                  "Summary cards and message volume records for all registered companies"}
                {view === "manage-companies" &&
                  "Configure company branches, access PINs, and gateway connections"}
                {view === "contacts" &&
                  "Consolidated customer database across all companies and branches"}
                {view === "settings" &&
                  "Add or update company credentials, sender IDs, and API keys"}
                {view === "bulk-sms" &&
                  "Import CSV/Excel contact lists to launch targeted branch SMS campaigns"}
                {view === "payments" &&
                  "Paystack gateway configuration and payment transaction history"}
                {(view === "sms" || view === "email") &&
                  "Live platform-wide message delivery logs and status audit"}
                {view === "templates" &&
                  "Create, edit, delete, import, and export reusable message templates across all companies and branches"}
                {view === "backup" &&
                  "Export and import every single platform record (companies, branches, contacts, templates, logs, and settings) at once"}
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {view === "overview" && (
              <>
                {/* Timeframe Switcher */}
                <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(
                    [
                      { id: "all", label: "All Time" },
                      { id: "today", label: "Today" },
                      { id: "7d", label: "7 Days" },
                      { id: "30d", label: "30 Days" },
                    ] as const
                  ).map((tf) => (
                    <button
                      key={tf.id}
                      onClick={() => setOverviewTimeframe(tf.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        overviewTimeframe === tf.id
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    load();
                    fetchBreakdown(overviewTimeframe);
                  }}
                  disabled={loadingBreakdown}
                  className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Refresh analytics"
                >
                  <RefreshCw
                    size={16}
                    className={loadingBreakdown ? "animate-spin text-blue-600" : ""}
                  />
                </button>

                <button
                  onClick={handleExportCompanyReport}
                  disabled={isExportingReport}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isExportingReport ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span>Export CSV Report</span>
                </button>

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
                      paystack_public_key: "",
                      paystack_secret_key: "",
                    });
                    setModal("company");
                  }}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-600/20 active:scale-95 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>New Company</span>
                </button>
              </>
            )}

            {(view === "settings" || view === "companies") && (
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
                    paystack_public_key: "",
                    paystack_secret_key: "",
                  });
                  setModal("company");
                }}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Plus size={16} />
                <span>Add Company</span>
              </button>
            )}

            {view === "backup" && (
              <button
                onClick={handleExportFullBackup}
                disabled={isExportingBackup}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm shadow-blue-600/20 cursor-pointer"
              >
                {isExportingBackup ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Download size={15} />
                )}
                <span>Download Full System Backup (.json)</span>
              </button>
            )}

            {view === "templates" && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleExportTemplates("csv")}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 shadow-sm cursor-pointer"
                  title="Export all templates as CSV"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => handleExportTemplates("json")}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 shadow-sm cursor-pointer"
                  title="Export all templates as JSON"
                >
                  <Download size={14} />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={() => {
                    setTemplateImportFile(null);
                    setTemplateImportBranchId("");
                    setModal("import-templates");
                  }}
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Import</span>
                </button>
                <button
                  onClick={() => {
                    setTargetTemplate(null);
                    setTemplateForm({
                      template_type: "",
                      content: "",
                      branch_id: "",
                    });
                    setModal("template");
                  }}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm shadow-blue-600/20 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Add Template</span>
                </button>
              </div>
            )}

            {view === "contacts" && (
              <div className="flex items-center gap-2.5">
                <a
                  href={`${BASE}/contacts/export?format=csv`}
                  download
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 shadow-sm"
                >
                  <Download size={14} />
                  <span>CSV</span>
                </a>
                <a
                  href={`${BASE}/contacts/export?format=xlsx`}
                  download
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 shadow-sm"
                >
                  <Download size={14} />
                  <span>Excel</span>
                </a>
                <button
                  onClick={() => {
                    setTargetCompany(null);
                    setImportForm({ company_id: "", branch_id: "" });
                    setImportFile(null);
                    setModal("import-contacts");
                  }}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Import Contacts</span>
                </button>
              </div>
            )}

            {(view === "sms" || view === "email") && (
              <div className="flex items-center gap-2.5">
                <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
                  <button
                    onClick={() => setView("sms")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      view === "sms"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    SMS Logs
                  </button>
                  <button
                    onClick={() => setView("email")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      view === "email"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Email Logs
                  </button>
                </div>

                <button
                  disabled={isClearingLogs || logs.length === 0}
                  onClick={() => handleClearLogs(view as "sms" | "email")}
                  className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isClearingLogs ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  <span>Clear {view.toUpperCase()} Logs</span>
                </button>

                <button
                  disabled={isClearingLogs}
                  onClick={() => handleClearLogs("all")}
                  className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Clear All System Logs</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="w-full p-6 md:p-8 max-w-[1600px] mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-3">
              <Loader2 size={36} className="text-blue-600 animate-spin" />
              <span className="text-slate-500 text-sm font-medium">
                Loading platform analytics...
              </span>
            </div>
          ) : (
            <div className="space-y-8">
              {/* ════════════════════════════════════════════════════════════════
                  OVERVIEW VIEW: KPIs + CHARTS + PER-COMPANY SUMMARY + TABLE
              ════════════════════════════════════════════════════════════════ */}
              {view === "overview" &&
                (() => {
                  const totals = breakdownData?.totals || {
                    total_companies: stats?.total_companies || 0,
                    total_branches: stats?.total_branches || 0,
                    total_customers: stats?.total_customers || 0,
                    total_sms: stats?.total_sms || 0,
                    sms_sent: stats?.total_sms || 0,
                    sms_failed: 0,
                    sms_queued: 0,
                    sms_success_rate: 100,
                    total_email: stats?.total_emails || 0,
                    email_sent: stats?.total_emails || 0,
                    email_failed: 0,
                    email_queued: 0,
                    email_success_rate: 100,
                    sms_today: 0,
                    email_today: 0,
                    total_messages:
                      (stats?.total_sms || 0) + (stats?.total_emails || 0),
                  };

                  const companyList = breakdownData?.companies || [];
                  const dailyTrend = breakdownData?.daily_trend || [];

                  const filteredCompanies = companyList
                    .filter((c) => {
                      const matchesSearch =
                        !companySearch.trim() ||
                        c.name
                          .toLowerCase()
                          .includes(companySearch.toLowerCase()) ||
                        c.slug
                          .toLowerCase()
                          .includes(companySearch.toLowerCase());
                      const matchesStatus =
                        companyStatusFilter === "all" ||
                        (companyStatusFilter === "active"
                          ? c.is_active
                          : !c.is_active);
                      return matchesSearch && matchesStatus;
                    })
                    .sort((a, b) => {
                      if (companySortField === "total") {
                        return (
                          b.sms.total +
                          b.email.total -
                          (a.sms.total + a.email.total)
                        );
                      }
                      if (companySortField === "sms") {
                        return b.sms.sent - a.sms.sent;
                      }
                      if (companySortField === "email") {
                        return b.email.sent - a.email.sent;
                      }
                      if (companySortField === "name") {
                        return a.name.localeCompare(b.name);
                      }
                      return 0;
                    });

                  // Max message volume across companies for bar chart scaling
                  const maxCompanyVolume = Math.max(
                    1,
                    ...companyList.map((c) => c.sms.total + c.email.total)
                  );

                  // Donut Chart math
                  const totalDelivered = totals.sms_sent + totals.email_sent;
                  const totalFailed = totals.sms_failed + totals.email_failed;
                  const totalQueued = totals.sms_queued + totals.email_queued;
                  const grandTotal = Math.max(
                    1,
                    totalDelivered + totalFailed + totalQueued
                  );
                  const overallDeliveryRate =
                    totals.total_messages > 0
                      ? Math.round(
                          (totalDelivered / totals.total_messages) * 1000
                        ) / 10
                      : 0;

                  const circumference = 2 * Math.PI * 58; // r=58
                  const deliveredDash =
                    (totalDelivered / grandTotal) * circumference;
                  const failedDash = (totalFailed / grandTotal) * circumference;
                  const queuedDash = (totalQueued / grandTotal) * circumference;

                  const maxTrendVal = Math.max(
                    1,
                    ...dailyTrend.map((d) => d.total)
                  );

                  return (
                    <div className="space-y-8">
                      {/* ── 1. Executive KPI Strip (5 Cards) ── */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Total Messages */}
                        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                              Total Messages Sent
                            </span>
                            <div className="p-2 rounded-xl bg-white/10 text-blue-300">
                              <TrendingUp size={18} />
                            </div>
                          </div>
                          <div className="my-3">
                            <div className="text-3xl font-black tracking-tight">
                              {totals.total_messages.toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span>
                                Today:{" "}
                                <strong className="text-white">
                                  {totals.sms_today}
                                </strong>{" "}
                                SMS •{" "}
                                <strong className="text-white">
                                  {totals.email_today}
                                </strong>{" "}
                                Email
                              </span>
                            </div>
                          </div>
                          <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                            <span>Overall Success</span>
                            <span className="font-bold text-emerald-400">
                              {overallDeliveryRate}%
                            </span>
                          </div>
                        </div>

                        {/* SMS Sent Summary */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              SMS Volume
                            </span>
                            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                              <Send size={18} />
                            </div>
                          </div>
                          <div className="my-3 flex items-baseline justify-between">
                            <div className="text-3xl font-black text-slate-900 tracking-tight">
                              {totals.total_sms.toLocaleString()}
                            </div>
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              {totals.sms_success_rate}% Sent
                            </span>
                          </div>
                          <div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${totals.sms_success_rate}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                              <span className="text-emerald-600">
                                {totals.sms_sent} Sent
                              </span>
                              <span className="text-rose-600">
                                {totals.sms_failed} Failed
                              </span>
                              <span className="text-amber-600">
                                {totals.sms_queued} Queued
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Email Sent Summary */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Email Volume
                            </span>
                            <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                              <Mail size={18} />
                            </div>
                          </div>
                          <div className="my-3 flex items-baseline justify-between">
                            <div className="text-3xl font-black text-slate-900 tracking-tight">
                              {totals.total_email.toLocaleString()}
                            </div>
                            <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                              {totals.email_success_rate}% Sent
                            </span>
                          </div>
                          <div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                              <div
                                className="h-full bg-violet-600 rounded-full transition-all duration-500"
                                style={{
                                  width: `${totals.email_success_rate}%`,
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                              <span className="text-emerald-600">
                                {totals.email_sent} Sent
                              </span>
                              <span className="text-rose-600">
                                {totals.email_failed} Failed
                              </span>
                              <span className="text-amber-600">
                                {totals.email_queued} Queued
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Active Companies & Branches */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Registered Companies
                            </span>
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                              <Building2 size={18} />
                            </div>
                          </div>
                          <div className="my-3">
                            <div className="text-3xl font-black text-slate-900 tracking-tight">
                              {totals.total_companies.toLocaleString()}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Across{" "}
                              <strong className="text-slate-800">
                                {totals.total_branches}
                              </strong>{" "}
                              active branches
                            </p>
                          </div>
                          <button
                            onClick={() => setView("manage-companies")}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-2 border-t border-slate-100 cursor-pointer"
                          >
                            <span>Manage Branches</span>
                            <ArrowUpRight size={13} />
                          </button>
                        </div>

                        {/* Global Contacts */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Total Contacts
                            </span>
                            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                              <Users size={18} />
                            </div>
                          </div>
                          <div className="my-3">
                            <div className="text-3xl font-black text-slate-900 tracking-tight">
                              {totals.total_customers.toLocaleString()}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Verified customer recipients
                            </p>
                          </div>
                          <button
                            onClick={() => setView("contacts")}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 pt-2 border-t border-slate-100 cursor-pointer"
                          >
                            <span>View Address Book</span>
                            <ArrowUpRight size={13} />
                          </button>
                        </div>
                      </div>

                      {/* ── 2. Interactive Visual Charts Row ── */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left (7 cols): Messages Sent by Each Company Bar Chart */}
                        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                              <div>
                                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                  <BarChart3 size={18} className="text-blue-600" />
                                  <span>Messages Sent by Company (Visual Comparison)</span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Side-by-side comparison of SMS & Email volume sent by each tenant
                                </p>
                              </div>

                              {/* Chart Mode Toggle */}
                              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start">
                                <button
                                  onClick={() => setChartMode("channel")}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                    chartMode === "channel"
                                      ? "bg-white text-slate-900 shadow-sm"
                                      : "text-slate-500 hover:text-slate-900"
                                  }`}
                                >
                                  SMS vs Email
                                </button>
                                <button
                                  onClick={() => setChartMode("status")}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                    chartMode === "status"
                                      ? "bg-white text-slate-900 shadow-sm"
                                      : "text-slate-500 hover:text-slate-900"
                                  }`}
                                >
                                  Delivery Status
                                </button>
                              </div>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap items-center gap-4 py-3 text-xs font-semibold text-slate-600">
                              {chartMode === "channel" ? (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded bg-blue-600 inline-block" />
                                    <span>SMS Sent ({totals.total_sms.toLocaleString()})</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded bg-violet-500 inline-block" />
                                    <span>Email Sent ({totals.total_email.toLocaleString()})</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                                    <span>Delivered ({totalDelivered.toLocaleString()})</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded bg-amber-400 inline-block" />
                                    <span>Queued ({totalQueued.toLocaleString()})</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded bg-rose-500 inline-block" />
                                    <span>Failed ({totalFailed.toLocaleString()})</span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Horizontal Comparative Bars per Company */}
                            <div className="space-y-4 mt-2 max-h-[320px] overflow-y-auto pr-1">
                              {companyList.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-sm">
                                  No companies registered yet.
                                </div>
                              ) : (
                                companyList.map((c) => {
                                  const compTotal = c.sms.total + c.email.total;
                                  const smsPct =
                                    maxCompanyVolume > 0
                                      ? (c.sms.total / maxCompanyVolume) * 100
                                      : 0;
                                  const emailPct =
                                    maxCompanyVolume > 0
                                      ? (c.email.total / maxCompanyVolume) * 100
                                      : 0;

                                  const compSent = c.sms.sent + c.email.sent;
                                  const compQueued =
                                    c.sms.queued + c.email.queued;
                                  const compFailed =
                                    c.sms.failed + c.email.failed;

                                  const sentPct =
                                    maxCompanyVolume > 0
                                      ? (compSent / maxCompanyVolume) * 100
                                      : 0;
                                  const queuedPct =
                                    maxCompanyVolume > 0
                                      ? (compQueued / maxCompanyVolume) * 100
                                      : 0;
                                  const failedPct =
                                    maxCompanyVolume > 0
                                      ? (compFailed / maxCompanyVolume) * 100
                                      : 0;

                                  const shareOfPlatform =
                                    totals.total_messages > 0
                                      ? Math.round(
                                          (compTotal / totals.total_messages) *
                                            100
                                        )
                                      : 0;

                                  return (
                                    <div
                                      key={c.id}
                                      className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-blue-300 transition-all"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                                            {(c.name || "C")
                                              .charAt(0)
                                              .toUpperCase()}
                                          </span>
                                          <span className="font-bold text-slate-900 text-sm">
                                            {c.name}
                                          </span>
                                          <span className="text-[11px] text-slate-400 font-mono">
                                            /{c.slug}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="text-slate-500">
                                            <strong className="text-slate-900">
                                              {c.sms.total.toLocaleString()}
                                            </strong>{" "}
                                            SMS
                                          </span>
                                          <span className="text-slate-300">•</span>
                                          <span className="text-slate-500">
                                            <strong className="text-slate-900">
                                              {c.email.total.toLocaleString()}
                                            </strong>{" "}
                                            Email
                                          </span>
                                          <span className="ml-1 px-2 py-0.5 rounded-md bg-slate-900 text-white font-bold text-[11px]">
                                            {compTotal.toLocaleString()} total (
                                            {shareOfPlatform}%)
                                          </span>
                                        </div>
                                      </div>

                                      {/* Visual Bar Track */}
                                      <div className="w-full h-3.5 bg-slate-200/70 rounded-full overflow-hidden flex">
                                        {compTotal === 0 ? (
                                          <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-400 font-semibold">
                                            No messages sent in this timeframe
                                          </div>
                                        ) : chartMode === "channel" ? (
                                          <>
                                            <div
                                              style={{
                                                width: `${Math.max(
                                                  smsPct,
                                                  c.sms.total > 0 ? 3 : 0
                                                )}%`,
                                              }}
                                              className="h-full bg-blue-600 transition-all duration-500"
                                              title={`SMS: ${c.sms.total}`}
                                            />
                                            <div
                                              style={{
                                                width: `${Math.max(
                                                  emailPct,
                                                  c.email.total > 0 ? 3 : 0
                                                )}%`,
                                              }}
                                              className="h-full bg-violet-500 transition-all duration-500"
                                              title={`Email: ${c.email.total}`}
                                            />
                                          </>
                                        ) : (
                                          <>
                                            <div
                                              style={{
                                                width: `${Math.max(
                                                  sentPct,
                                                  compSent > 0 ? 3 : 0
                                                )}%`,
                                              }}
                                              className="h-full bg-emerald-500 transition-all duration-500"
                                              title={`Delivered: ${compSent}`}
                                            />
                                            <div
                                              style={{
                                                width: `${Math.max(
                                                  queuedPct,
                                                  compQueued > 0 ? 3 : 0
                                                )}%`,
                                              }}
                                              className="h-full bg-amber-400 transition-all duration-500"
                                              title={`Queued: ${compQueued}`}
                                            />
                                            <div
                                              style={{
                                                width: `${Math.max(
                                                  failedPct,
                                                  compFailed > 0 ? 3 : 0
                                                )}%`,
                                              }}
                                              className="h-full bg-rose-500 transition-all duration-500"
                                              title={`Failed: ${compFailed}`}
                                            />
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right (5 cols): Delivery Ring Chart + 7-Day Activity Trend */}
                        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
                          {/* Top Half: Delivery Donut Chart */}
                          <div>
                            <h2 className="text-base font-extrabold text-slate-900 pb-3 border-b border-slate-100">
                              Platform Delivery Breakdown
                            </h2>
                            <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
                              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                                <svg
                                  className="w-full h-full -rotate-90"
                                  viewBox="0 0 140 140"
                                >
                                  <circle
                                    cx="70"
                                    cy="70"
                                    r="58"
                                    fill="none"
                                    stroke="#f1f5f9"
                                    strokeWidth="14"
                                  />
                                  {totals.total_messages > 0 && (
                                    <>
                                      {/* Delivered segment */}
                                      <circle
                                        cx="70"
                                        cy="70"
                                        r="58"
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="14"
                                        strokeDasharray={`${deliveredDash} ${circumference}`}
                                        strokeDashoffset={0}
                                        strokeLinecap="round"
                                      />
                                      {/* Queued segment */}
                                      <circle
                                        cx="70"
                                        cy="70"
                                        r="58"
                                        fill="none"
                                        stroke="#f59e0b"
                                        strokeWidth="14"
                                        strokeDasharray={`${queuedDash} ${circumference}`}
                                        strokeDashoffset={-deliveredDash}
                                      />
                                      {/* Failed segment */}
                                      <circle
                                        cx="70"
                                        cy="70"
                                        r="58"
                                        fill="none"
                                        stroke="#f43f5e"
                                        strokeWidth="14"
                                        strokeDasharray={`${failedDash} ${circumference}`}
                                        strokeDashoffset={
                                          -(deliveredDash + queuedDash)
                                        }
                                      />
                                    </>
                                  )}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                  <span className="text-2xl font-black text-slate-900">
                                    {overallDeliveryRate}%
                                  </span>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Delivered
                                  </span>
                                </div>
                              </div>

                              <div className="flex-1 w-full space-y-2.5">
                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    <span className="text-xs font-bold text-slate-700">
                                      Sent / Delivered
                                    </span>
                                  </div>
                                  <span className="text-xs font-black text-emerald-700">
                                    {totalDelivered.toLocaleString()}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                    <span className="text-xs font-bold text-slate-700">
                                      Queued / Scheduled
                                    </span>
                                  </div>
                                  <span className="text-xs font-black text-amber-700">
                                    {totalQueued.toLocaleString()}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/60">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                    <span className="text-xs font-bold text-slate-700">
                                      Failed Delivery
                                    </span>
                                  </div>
                                  <span className="text-xs font-black text-rose-700">
                                    {totalFailed.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Half: 7-Day Daily Sending Trend Chart */}
                          {dailyTrend.length > 0 && (
                            <div className="pt-4 border-t border-slate-100">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                                  Last 7 Days Sending Activity
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">
                                  SMS + Email Daily Trend
                                </span>
                              </div>
                              <div className="grid grid-cols-7 gap-2 items-end h-24 pt-2">
                                {dailyTrend.map((pt) => {
                                  const barHeight =
                                    pt.total > 0
                                      ? Math.max(
                                          14,
                                          Math.round(
                                            (pt.total / maxTrendVal) * 100
                                          )
                                        )
                                      : 6;
                                  return (
                                    <div
                                      key={pt.date}
                                      className="flex flex-col items-center h-full justify-end group"
                                      title={`${pt.label}: ${pt.sms} SMS, ${pt.email} Email (${pt.total} total)`}
                                    >
                                      <span className="text-[10px] font-bold text-slate-600 mb-1">
                                        {pt.total}
                                      </span>
                                      <div className="w-full bg-slate-100 rounded-t-lg flex items-end justify-center overflow-hidden h-full">
                                        <div
                                          style={{ height: `${barHeight}%` }}
                                          className={`w-full rounded-t-lg transition-all duration-300 ${
                                            pt.total > 0
                                              ? "bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-700 group-hover:to-indigo-600"
                                              : "bg-slate-200"
                                          }`}
                                        />
                                      </div>
                                      <span className="text-[9px] font-semibold text-slate-400 mt-1.5 truncate w-full text-center">
                                        {pt.label.split(" ")[0]}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── 3. Per-Company Message Summary Cards Grid ── */}
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h2 className="text-lg font-extrabold text-slate-900">
                              Summary of Messages Sent by Each Company
                            </h2>
                            <p className="text-xs text-slate-500">
                              Dedicated per-company executive cards showing SMS & Email counts, delivery rates, and branch scale
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                          {filteredCompanies.map((c) => {
                            const combinedTotal = c.sms.total + c.email.total;
                            return (
                              <div
                                key={c.id}
                                className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between space-y-5"
                              >
                                {/* Card Top: Company Info + Total Messages Badge */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-sm shrink-0">
                                      {(c.name || "C").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-extrabold text-slate-900 text-base">
                                          {c.name}
                                        </h3>
                                        <span
                                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                            c.is_active
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : "bg-slate-100 text-slate-500 border-slate-200"
                                          }`}
                                        >
                                          {c.is_active ? "Active" : "Inactive"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-500 mt-0.5">
                                        <span className="font-mono text-slate-400">
                                          /{c.slug}
                                        </span>{" "}
                                        •{" "}
                                        <strong>{c.branches_count}</strong>{" "}
                                        {c.branches_count === 1
                                          ? "Branch"
                                          : "Branches"}{" "}
                                        •{" "}
                                        <strong>
                                          {c.customers_count.toLocaleString()}
                                        </strong>{" "}
                                        Contacts
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="text-xl font-black text-slate-900 block leading-none">
                                      {combinedTotal.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      Total Msgs
                                    </span>
                                  </div>
                                </div>

                                {/* Side-by-Side SMS & Email Summary Boxes */}
                                <div className="grid grid-cols-2 gap-3">
                                  {/* SMS Box */}
                                  <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                                        <Send size={13} className="text-blue-600" />
                                        SMS Sent
                                      </span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                        {c.sms.success_rate}%
                                      </span>
                                    </div>
                                    <div className="text-2xl font-black text-slate-900">
                                      {c.sms.total.toLocaleString()}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-bold pt-1 border-t border-blue-100/80">
                                      <span className="text-emerald-600">
                                        {c.sms.sent} Sent
                                      </span>
                                      <span className="text-rose-600">
                                        {c.sms.failed} Fail
                                      </span>
                                      <span className="text-amber-600">
                                        {c.sms.queued} Queue
                                      </span>
                                    </div>
                                  </div>

                                  {/* Email Box */}
                                  <div className="p-3.5 rounded-xl bg-violet-50/50 border border-violet-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-extrabold text-violet-900 flex items-center gap-1.5">
                                        <Mail
                                          size={13}
                                          className="text-violet-600"
                                        />
                                        Email Sent
                                      </span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                                        {c.email.success_rate}%
                                      </span>
                                    </div>
                                    <div className="text-2xl font-black text-slate-900">
                                      {c.email.total.toLocaleString()}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-bold pt-1 border-t border-violet-100/80">
                                      <span className="text-emerald-600">
                                        {c.email.sent} Sent
                                      </span>
                                      <span className="text-rose-600">
                                        {c.email.failed} Fail
                                      </span>
                                      <span className="text-amber-600">
                                        {c.email.queued} Queue
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Card Footer: Gateways & Quick Actions */}
                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <GatewayStatus
                                      label="Hubtel"
                                      active={c.gateways.hubtel}
                                    />
                                    <GatewayStatus
                                      label="Brevo"
                                      active={c.gateways.brevo}
                                    />
                                    <GatewayStatus
                                      label="Paystack"
                                      active={c.gateways.paystack}
                                    />
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        setSelectedCompanyId(c.id);
                                        setView("manage-companies");
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-colors cursor-pointer"
                                    >
                                      Branches
                                    </button>
                                    <button
                                      onClick={() => setView("sms")}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                      title="View SMS Logs"
                                    >
                                      <Send size={13} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── 4. Detailed Audit Table ── */}
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                          <div>
                            <h2 className="text-base font-extrabold text-slate-900">
                              Complete Company Sending Breakdown Table
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Search, filter, sort, or export the full audit record of every company
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5">
                            <div className="relative min-w-[220px]">
                              <Search
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                              />
                              <input
                                type="text"
                                placeholder="Search company..."
                                value={companySearch}
                                onChange={(e) =>
                                  setCompanySearch(e.target.value)
                                }
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                              />
                              {companySearch && (
                                <button
                                  onClick={() => setCompanySearch("")}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>

                            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                              {(
                                [
                                  { id: "all", label: "All" },
                                  { id: "active", label: "Active" },
                                  { id: "inactive", label: "Inactive" },
                                ] as const
                              ).map((st) => (
                                <button
                                  key={st.id}
                                  onClick={() => setCompanyStatusFilter(st.id)}
                                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                    companyStatusFilter === st.id
                                      ? "bg-white text-slate-900 shadow-sm"
                                      : "text-slate-500 hover:text-slate-900"
                                  }`}
                                >
                                  {st.label}
                                </button>
                              ))}
                            </div>

                            <div className="relative">
                              <select
                                value={companySortField}
                                onChange={(e: any) =>
                                  setCompanySortField(e.target.value)
                                }
                                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none pr-8 cursor-pointer"
                              >
                                <option value="total">Highest Messages</option>
                                <option value="sms">Most SMS Sent</option>
                                <option value="email">Most Email Sent</option>
                                <option value="name">Company Name (A-Z)</option>
                              </select>
                              <ChevronDown
                                size={14}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th className="py-3.5 px-4">Company</th>
                                <th className="py-3.5 px-4">SMS Breakdown</th>
                                <th className="py-3.5 px-4">Email Breakdown</th>
                                <th className="py-3.5 px-4 text-center">
                                  Total Sent
                                </th>
                                <th className="py-3.5 px-4">Gateways</th>
                                <th className="py-3.5 px-4">Last Activity</th>
                                <th className="py-3.5 px-4 text-right">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                              {filteredCompanies.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={7}
                                    className="py-12 text-center text-slate-400"
                                  >
                                    No companies matched your filter criteria.
                                  </td>
                                </tr>
                              ) : (
                                filteredCompanies.map((c) => {
                                  const combinedTotal =
                                    c.sms.total + c.email.total;
                                  return (
                                    <tr
                                      key={c.id}
                                      className="hover:bg-slate-50/80 transition-colors"
                                    >
                                      <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-bold text-sm flex items-center justify-center border border-blue-100">
                                            {(c.name || "C")
                                              .charAt(0)
                                              .toUpperCase()}
                                          </div>
                                          <div>
                                            <div className="font-bold text-slate-900">
                                              {c.name}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                              /{c.slug} • {c.branches_count}{" "}
                                              branches • {c.customers_count}{" "}
                                              contacts
                                            </div>
                                          </div>
                                        </div>
                                      </td>

                                      <td className="py-4 px-4">
                                        <div className="font-bold text-slate-900 text-xs">
                                          {c.sms.total.toLocaleString()} total (
                                          {c.sms.success_rate}%)
                                        </div>
                                        <div className="text-[11px] font-semibold mt-0.5">
                                          <span className="text-emerald-600">
                                            {c.sms.sent} sent
                                          </span>{" "}
                                          •{" "}
                                          <span className="text-rose-600">
                                            {c.sms.failed} failed
                                          </span>{" "}
                                          •{" "}
                                          <span className="text-amber-600">
                                            {c.sms.queued} queued
                                          </span>
                                        </div>
                                      </td>

                                      <td className="py-4 px-4">
                                        <div className="font-bold text-slate-900 text-xs">
                                          {c.email.total.toLocaleString()} total
                                          ({c.email.success_rate}%)
                                        </div>
                                        <div className="text-[11px] font-semibold mt-0.5">
                                          <span className="text-emerald-600">
                                            {c.email.sent} sent
                                          </span>{" "}
                                          •{" "}
                                          <span className="text-rose-600">
                                            {c.email.failed} failed
                                          </span>{" "}
                                          •{" "}
                                          <span className="text-amber-600">
                                            {c.email.queued} queued
                                          </span>
                                        </div>
                                      </td>

                                      <td className="py-4 px-4 text-center">
                                        <span className="inline-flex px-3 py-1 rounded-full bg-slate-100 text-slate-900 font-extrabold text-xs">
                                          {combinedTotal.toLocaleString()} msgs
                                        </span>
                                      </td>

                                      <td className="py-4 px-4">
                                        <div className="flex flex-wrap gap-1">
                                          <GatewayStatus
                                            label="Hubtel"
                                            active={c.gateways.hubtel}
                                          />
                                          <GatewayStatus
                                            label="Brevo"
                                            active={c.gateways.brevo}
                                          />
                                          <GatewayStatus
                                            label="Paystack"
                                            active={c.gateways.paystack}
                                          />
                                        </div>
                                      </td>

                                      <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                                        {c.last_activity ? (
                                          <div className="flex items-center gap-1.5">
                                            <Clock
                                              size={13}
                                              className="text-slate-400"
                                            />
                                            <span>
                                              {new Date(
                                                c.last_activity
                                              ).toLocaleString(undefined, {
                                                dateStyle: "short",
                                                timeStyle: "short",
                                              })}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 italic">
                                            No activity yet
                                          </span>
                                        )}
                                      </td>

                                      <td className="py-4 px-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            onClick={() => {
                                              setSelectedCompanyId(c.id);
                                              setView("manage-companies");
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                                          >
                                            Branches
                                          </button>
                                          <button
                                            onClick={() => setView("sms")}
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                                            title="SMS Logs"
                                          >
                                            <Send size={13} />
                                          </button>
                                          <button
                                            onClick={() => setView("email")}
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                                            title="Email Logs"
                                          >
                                            <Mail size={13} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* ════════════════════════════════════════════════════════════════
                  COMPANIES VIEW (Executive Cards with Message Breakdown)
              ════════════════════════════════════════════════════════════════ */}
              {view === "companies" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {companies.map((c) => {
                    const compStats = breakdownData?.companies.find(
                      (b) => b.id === c.id
                    );
                    return (
                      <div
                        key={c.id}
                        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">
                              {(c.name || "C").charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-slate-900 font-extrabold text-base">
                                {c.name || "Unnamed"}
                              </h3>
                              <span className="text-slate-400 text-xs font-mono">
                                /{c.slug}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                              c.is_active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {c.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        {compStats && (
                          <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                SMS Sent
                              </span>
                              <span className="text-lg font-black text-slate-900">
                                {compStats.sms.total.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                Emails Sent
                              </span>
                              <span className="text-lg font-black text-slate-900">
                                {compStats.email.total.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <div className="flex gap-1.5">
                            <GatewayStatus
                              label="Hubtel"
                              active={!!c.hubtel_client_id}
                            />
                            <GatewayStatus
                              label="Brevo"
                              active={!!c.brevo_api_key}
                            />
                          </div>
                          <button
                            onClick={() => {
                              setSelectedCompanyId(c.id);
                              setView("manage-companies");
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            Manage Branches <ArrowUpRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  MANAGE COMPANIES & BRANCHES VIEW
              ════════════════════════════════════════════════════════════════ */}
              {view === "manage-companies" && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                      Select Company to Manage
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCompanyId || ""}
                        onChange={(e) =>
                          setSelectedCompanyId(Number(e.target.value))
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold outline-none focus:border-blue-500 appearance-none cursor-pointer"
                      >
                        <option value="" disabled>
                          Choose a company...
                        </option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (/{c.slug})
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={18}
                        className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                      />
                    </div>
                  </div>

                  {selectedCompanyId ? (
                    (() => {
                      const c = companies.find(
                        (comp) => comp.id === selectedCompanyId
                      );
                      if (!c) return null;
                      return (
                        <div className="space-y-6">
                          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">
                                {(c.name || "C").charAt(0)}
                              </div>
                              <div>
                                <h3 className="text-slate-900 font-extrabold text-lg">
                                  {c.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-slate-500 text-xs font-mono">
                                    /{c.slug}
                                  </span>
                                  <span className="text-xs font-bold text-emerald-600">
                                    • {c.is_active ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <GatewayStatus
                                label="Hubtel"
                                active={!!c.hubtel_client_id}
                              />
                              <GatewayStatus
                                label="Brevo"
                                active={!!c.brevo_api_key}
                              />
                              <GatewayStatus
                                label="Paystack"
                                active={!!c.paystack_public_key}
                              />
                              <button
                                onClick={() => {
                                  setTargetCompany(c.id);
                                  setModal("branch");
                                }}
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                              >
                                <Plus size={15} />
                                <span>Register Branch</span>
                              </button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <Hash size={16} className="text-blue-600" />
                                Registered Branches ({branches.length})
                              </h4>
                            </div>

                            {loadingBranches ? (
                              <div className="flex items-center gap-2 py-12 justify-center text-slate-500">
                                <Loader2
                                  size={20}
                                  className="animate-spin text-blue-600"
                                />
                                <span className="text-sm">
                                  Loading branches...
                                </span>
                              </div>
                            ) : branches.length === 0 ? (
                              <div className="bg-white border border-slate-200 border-dashed rounded-2xl py-12 text-center text-slate-400">
                                No branches registered for this company yet.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {branches.map((b) => (
                                  <div
                                    key={b.id}
                                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between"
                                  >
                                    <div>
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                                          <Building2 size={18} />
                                        </div>
                                        <span className="text-[11px] font-mono text-slate-400">
                                          ID: {b.id}
                                        </span>
                                      </div>
                                      <h5 className="text-slate-900 font-bold text-base mb-1">
                                        {b.name}
                                      </h5>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">
                                          Branch Code:
                                        </span>
                                        <span className="text-xs text-blue-700 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                          {b.branch_code}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                                      <button
                                        onClick={() => {
                                          setTargetBranch(b);
                                          setBranchEditForm({
                                            name: b.name,
                                            branch_code: b.branch_code,
                                            pin: "",
                                            confirm_pin: "",
                                          });
                                          setShowBranchPassword(false);
                                          setModal("edit-branch");
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-colors cursor-pointer"
                                      >
                                        <Pencil size={12} />
                                        <span>Change Password / PIN</span>
                                      </button>
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
                    <div className="bg-white border border-slate-200 border-dashed rounded-2xl py-24 text-center space-y-2">
                      <Building2
                        size={36}
                        className="mx-auto text-slate-300"
                      />
                      <p className="text-slate-600 font-bold">
                        Select a company above to view and register branches
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  BULK SMS VIEW
              ════════════════════════════════════════════════════════════════ */}
              {view === "bulk-sms" && (
                <div className="max-w-4xl">
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                      <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                        <Upload size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-900">
                          Bulk SMS Campaign Import
                        </h2>
                        <p className="text-slate-500 text-xs mt-0.5">
                          Upload an Excel or CSV recipient list to dispatch SMS via a selected company branch
                        </p>
                      </div>
                    </div>

                    <form onSubmit={submitBulkSMS} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700">
                            Target Company
                          </label>
                          <select
                            value={bulkForm.company_id}
                            onChange={(e) =>
                              setBulkForm({
                                ...bulkForm,
                                company_id: e.target.value,
                                branch_id: "",
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
                            required
                          >
                            <option value="">Select Company...</option>
                            {companies.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700">
                            Sending Branch
                          </label>
                          <select
                            value={bulkForm.branch_id}
                            onChange={(e) =>
                              setBulkForm({
                                ...bulkForm,
                                branch_id: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
                            disabled={
                              !bulkForm.company_id || loadingBulkBranches
                            }
                            required
                          >
                            <option value="">
                              {loadingBulkBranches
                                ? "Loading..."
                                : "Select Branch..."}
                            </option>
                            {bulkBranches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700">
                          Recipients File (.csv, .xlsx)
                        </label>
                        <div
                          className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                            bulkFile
                              ? "border-blue-400 bg-blue-50/40"
                              : "border-slate-200 hover:border-blue-300 bg-slate-50/50"
                          }`}
                        >
                          <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            onChange={(e) =>
                              setBulkFile(e.target.files?.[0] || null)
                            }
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Upload
                            size={28}
                            className={
                              bulkFile ? "text-blue-600 mb-2" : "text-slate-400 mb-2"
                            }
                          />
                          {bulkFile ? (
                            <div className="text-center">
                              <p className="text-slate-900 font-bold text-sm">
                                {bulkFile.name}
                              </p>
                              <p className="text-slate-500 text-xs">
                                {(bulkFile.size / 1024).toFixed(1)} KB • Click
                                to change
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <p className="text-slate-700 font-semibold text-sm">
                                Click or drag CSV / Excel file here
                              </p>
                              <p className="text-slate-400 text-xs mt-1">
                                Column A: 10-digit Ghana phone (024XXXXXXX) or
                                +country code. Column B: Name.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-xs font-bold text-slate-700">
                            Message Content
                          </label>
                          <span className="text-xs text-slate-400 font-mono">
                            {bulkForm.message_content.length} chars
                          </span>
                        </div>
                        <textarea
                          value={bulkForm.message_content}
                          onChange={(e) =>
                            setBulkForm({
                              ...bulkForm,
                              message_content: e.target.value,
                            })
                          }
                          placeholder="Hello {name}, welcome to {branch}!"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-900 outline-none focus:border-blue-500 min-h-[120px]"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Calendar size={14} className="text-blue-600" />
                            Schedule Delivery (Optional)
                          </label>
                          <input
                            type="datetime-local"
                            value={bulkForm.scheduled_for}
                            onChange={(e) =>
                              setBulkForm({
                                ...bulkForm,
                                scheduled_for: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSendingBulk}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isSendingBulk ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <Send size={16} />
                              <span>Launch Bulk SMS Campaign</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  SETTINGS VIEW (Company Credentials, Branch Passwords & Deletion)
              ════════════════════════════════════════════════════════════════ */}
              {view === "settings" && (
                <div className="max-w-5xl space-y-8">
                  {/* Section 1: Company Gateway & Account Administration */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900">
                          Tenant Gateway & Account Administration
                        </h2>
                        <p className="text-xs text-slate-500">
                          Configure Hubtel SMS, Brevo Email, Paystack API keys, and branch passwords per company
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {companies.map((c) => {
                        const compBranches = allBranches.filter(
                          (b) => b.company_id === c.id
                        );
                        return (
                          <div
                            key={c.id}
                            className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                                  {(c.name || "C").charAt(0)}
                                </div>
                                <div>
                                  <h3 className="text-slate-900 font-bold text-sm">
                                    {c.name}
                                  </h3>
                                  <p className="text-slate-500 text-xs font-mono">
                                    ID: {c.id} • /{c.slug} •{" "}
                                    {compBranches.length}{" "}
                                    {compBranches.length === 1
                                      ? "Branch"
                                      : "Branches"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => {
                                    setTargetCompany(c.id);
                                    setBf({ name: "", branch_code: "", pin: "" });
                                    setModal("branch");
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold cursor-pointer"
                                >
                                  <Plus size={13} />
                                  <span>Add Branch</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setTargetCompany(c.id);
                                    setCf({
                                      name: c.name,
                                      slug: c.slug,
                                      hubtel_client_id:
                                        c.hubtel_client_id || "",
                                      hubtel_client_secret:
                                        c.hubtel_client_secret || "",
                                      hubtel_sender_id:
                                        c.hubtel_sender_id || "",
                                      brevo_api_key: c.brevo_api_key || "",
                                      brevo_sender_email:
                                        c.brevo_sender_email || "",
                                      brevo_sender_name:
                                        c.brevo_sender_name || "",
                                      paystack_public_key:
                                        c.paystack_public_key || "",
                                      paystack_secret_key:
                                        c.paystack_secret_key || "",
                                    });
                                    setModal("company");
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer"
                                >
                                  <Pencil size={13} />
                                  <span>Edit Credentials</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setTargetCompany(c.id);
                                    setModal("delete-company");
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>

                            {/* Branches list inside company settings card */}
                            {compBranches.length > 0 && (
                              <div className="pt-3 border-t border-slate-200/70">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                                  Branches & Password / Access PIN Settings
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {compBranches.map((b) => (
                                    <div
                                      key={b.id}
                                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200"
                                    >
                                      <div>
                                        <span className="font-bold text-slate-900 text-xs block">
                                          {b.name}
                                        </span>
                                        <span className="text-[11px] font-mono text-blue-600 font-semibold">
                                          Code: {b.branch_code}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setTargetBranch(b);
                                          setBranchEditForm({
                                            name: b.name,
                                            branch_code: b.branch_code,
                                            pin: "",
                                            confirm_pin: "",
                                          });
                                          setShowBranchPassword(false);
                                          setModal("edit-branch");
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-colors cursor-pointer"
                                      >
                                        <Pencil size={12} />
                                        <span>Change Password</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  PAYMENTS & BILLING VIEW
              ════════════════════════════════════════════════════════════════ */}
              {view === "payments" && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <Wallet size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-lg font-extrabold text-slate-900">
                            Paystack Payment Gateway
                          </h2>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              paystackSettings.is_configured
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-amber-50 border-amber-200 text-amber-700"
                            }`}
                          >
                            {paystackSettings.is_configured
                              ? "Active"
                              : "Setup Required"}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                          Manage platform payment keys and view live transaction history
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={fetchPaystackSettings}
                        disabled={loadingPaystack}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw
                          size={14}
                          className={loadingPaystack ? "animate-spin" : ""}
                        />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={() => setTestPayModalOpen(true)}
                        disabled={!paystackSettings.is_configured}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <CreditCard size={14} />
                        <span>Test Checkout</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <form onSubmit={savePaystackSettings} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            Paystack Public Key
                          </label>
                          <input
                            type="text"
                            placeholder="pk_test_..."
                            value={paystackSettings.public_key}
                            onChange={(e) =>
                              setPaystackSettings({
                                ...paystackSettings,
                                public_key: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            Paystack Secret Key
                          </label>
                          <div className="relative">
                            <input
                              type={showPaystackSecret ? "text" : "password"}
                              placeholder="sk_test_..."
                              value={paystackSettings.secret_key}
                              onChange={(e) =>
                                setPaystackSettings({
                                  ...paystackSettings,
                                  secret_key: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-900 font-mono outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowPaystackSecret(!showPaystackSecret)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                            >
                              {showPaystackSecret ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            Default Currency
                          </label>
                          <select
                            value={paystackSettings.currency}
                            onChange={(e) =>
                              setPaystackSettings({
                                ...paystackSettings,
                                currency: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold outline-none focus:border-blue-500"
                          >
                            <option value="GHS">GHS - Ghanaian Cedi (GH₵)</option>
                            <option value="NGN">NGN - Nigerian Naira (₦)</option>
                            <option value="USD">USD - US Dollar ($)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={savingPaystack}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                        >
                          {savingPaystack
                            ? "Saving..."
                            : "Save Paystack Settings"}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Transactions Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
                      <h3 className="font-extrabold text-slate-900 text-sm">
                        Payment Transactions Log
                      </h3>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="text"
                          placeholder="Search reference or email..."
                          value={paymentSearch}
                          onChange={(e) => {
                            setPaymentSearch(e.target.value);
                            setPaymentPage(1);
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500"
                        />
                        <select
                          value={paymentStatusFilter}
                          onChange={(e) => {
                            setPaymentStatusFilter(e.target.value);
                            setPaymentPage(1);
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                        >
                          <option value="">All Statuses</option>
                          <option value="success">Success</option>
                          <option value="pending">Pending</option>
                          <option value="failed">Failed</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {[
                              "Reference",
                              "Customer Email",
                              "Company",
                              "Amount",
                              "Channel",
                              "Status",
                              "Date",
                            ].map((h) => (
                              <th key={h} className="px-5 py-3.5">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {paymentTxs.length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-6 py-12 text-center text-slate-400"
                              >
                                No payment transactions recorded yet.
                              </td>
                            </tr>
                          ) : (
                            paymentTxs.map((tx) => (
                              <tr key={tx.id} className="hover:bg-slate-50">
                                <td className="px-5 py-3.5 font-mono text-xs font-bold text-blue-600">
                                  {tx.reference}
                                </td>
                                <td className="px-5 py-3.5 text-slate-700 text-xs">
                                  {tx.customer_email}
                                </td>
                                <td className="px-5 py-3.5 text-xs font-bold text-slate-800">
                                  {tx.company_name || "Platform"}
                                </td>
                                <td className="px-5 py-3.5 font-mono font-bold text-xs text-slate-900">
                                  {tx.currency} {Number(tx.amount).toFixed(2)}
                                </td>
                                <td className="px-5 py-3.5 text-xs text-slate-500 capitalize">
                                  {tx.channel || "Checkout"}
                                </td>
                                <td className="px-5 py-3.5">
                                  <StatusBadge status={tx.status} />
                                </td>
                                <td className="px-5 py-3.5 text-xs text-slate-500">
                                  {new Date(tx.created_at).toLocaleString([], {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  LOGS VIEW (SMS / EMAIL)
              ════════════════════════════════════════════════════════════════ */}
              {(view === "sms" || view === "email") && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          {[
                            "Company",
                            "Branch",
                            view === "sms" ? "Recipient Phone" : "Email Subject",
                            "Delivery Status",
                            "Timestamp",
                          ].map((h) => (
                            <th key={h} className="px-6 py-4">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {logs.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-16 text-center text-slate-400"
                            >
                              No {view.toUpperCase()} activity logs recorded yet.
                            </td>
                          </tr>
                        ) : (
                          logs.map((l) => (
                            <tr
                              key={l.id}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-900 font-bold text-sm">
                                    {l.company_name}
                                  </span>
                                  {l.is_bulk && (
                                    <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 uppercase">
                                      Bulk
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-sm">
                                {l.branch_name}
                              </td>
                              <td className="px-6 py-4 text-slate-800 font-medium text-sm">
                                {view === "sms" ? l.phone_number : l.subject}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <StatusBadge
                                    status={l.status}
                                    deliveryReport={l.delivery_report}
                                  />
                                  {l.status === "failed" &&
                                    l.delivery_report && (
                                      <span
                                        className="text-[11px] text-rose-600 max-w-[240px] truncate block"
                                        title={l.delivery_report}
                                      >
                                        {l.delivery_report.replace(
                                          /^Error:\s*/,
                                          ""
                                        )}
                                      </span>
                                    )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs">
                                {new Date(
                                  l.scheduled_for || l.created_at
                                ).toLocaleString([], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
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

              {/* ════════════════════════════════════════════════════════════════
                  GLOBAL CONTACTS VIEW
              ════════════════════════════════════════════════════════════════ */}
              {view === "contacts" && (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
                    <div className="relative w-full sm:w-96">
                      <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="Search contacts by name, phone, branch, company..."
                        value={contactSearch}
                        onChange={(e) => {
                          setContactSearch(e.target.value);
                          setContactPage(1);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                      />
                      {contactSearch && (
                        <button
                          onClick={() => {
                            setContactSearch("");
                            setContactPage(1);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-bold">
                      Total: {contactTotal.toLocaleString()} contacts
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            {[
                              "Full Name",
                              "Phone Number",
                              "Email",
                              "Company",
                              "Branch",
                              "Registered Date",
                            ].map((h) => (
                              <th key={h} className="px-6 py-3.5">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {contacts.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-6 py-16 text-center text-slate-400"
                              >
                                No contacts found.
                              </td>
                            </tr>
                          ) : (
                            contacts.map((c) => (
                              <tr key={c.id} className="hover:bg-slate-50/80">
                                <td className="px-6 py-3.5 font-bold text-slate-900">
                                  {c.full_name}
                                </td>
                                <td className="px-6 py-3.5 font-mono text-xs text-slate-700">
                                  {c.phone_number}
                                </td>
                                <td className="px-6 py-3.5 text-slate-500 text-xs">
                                  {c.email || "—"}
                                </td>
                                <td className="px-6 py-3.5">
                                  <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg border border-blue-200 font-bold">
                                    {c.company_name}
                                  </span>
                                </td>
                                <td className="px-6 py-3.5 text-slate-600 text-xs font-semibold">
                                  {c.branch_name}
                                </td>
                                <td className="px-6 py-3.5 text-slate-400 text-xs">
                                  {new Date(c.created_at).toLocaleString([], {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {contactTotal > contactLimit && (
                      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          Showing{" "}
                          {Math.min(
                            (contactPage - 1) * contactLimit + 1,
                            contactTotal
                          )}{" "}
                          to {Math.min(contactPage * contactLimit, contactTotal)}{" "}
                          of {contactTotal}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setContactPage((prev) => Math.max(prev - 1, 1))
                            }
                            disabled={contactPage === 1}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-xs text-slate-600 font-bold px-2">
                            Page {contactPage} of{" "}
                            {Math.ceil(contactTotal / contactLimit)}
                          </span>
                          <button
                            onClick={() =>
                              setContactPage((prev) =>
                                Math.min(
                                  prev + 1,
                                  Math.ceil(contactTotal / contactLimit)
                                )
                              )
                            }
                            disabled={
                              contactPage ===
                              Math.ceil(contactTotal / contactLimit)
                            }
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  MESSAGE TEMPLATES VIEW (ALL TEMPLATES, ADD, EDIT, DELETE, IMPORT, EXPORT)
              ════════════════════════════════════════════════════════════════ */}
              {view === "templates" && (() => {
                const filteredTemplates = templates.filter((t) => {
                  if (templateScopeFilter === "global" && t.branch_id !== null) {
                    return false;
                  }
                  if (templateScopeFilter === "branch" && t.branch_id === null) {
                    return false;
                  }
                  if (
                    templateCompanyFilter &&
                    String(t.company_id || "") !== templateCompanyFilter
                  ) {
                    return false;
                  }
                  if (templateSearch.trim()) {
                    const q = templateSearch.toLowerCase();
                    return (
                      t.template_type.toLowerCase().includes(q) ||
                      stripHtmlTags(t.content).toLowerCase().includes(q) ||
                      (t.branch_name || "").toLowerCase().includes(q) ||
                      (t.company_name || "").toLowerCase().includes(q)
                    );
                  }
                  return true;
                });

                const globalCount = templates.filter(
                  (t) => t.branch_id === null
                ).length;
                const branchCount = templates.filter(
                  (t) => t.branch_id !== null
                ).length;

                return (
                  <div className="space-y-6">
                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Total Templates
                          </span>
                          <p className="text-3xl font-extrabold text-slate-900 mt-1">
                            {templates.length}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Reusable SMS & Email templates
                          </p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <FileText size={22} />
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Global Templates
                          </span>
                          <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                            {globalCount}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Shared across all branches
                          </p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Globe size={22} />
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Branch-Specific Templates
                          </span>
                          <p className="text-3xl font-extrabold text-violet-600 mt-1">
                            {branchCount}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Assigned to individual branches
                          </p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                          <Layers size={22} />
                        </div>
                      </div>
                    </div>

                    {/* Search, Filter & Action Toolbar */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between shadow-sm">
                      <div className="flex flex-col sm:flex-row gap-3 flex-1">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                          <Search
                            size={16}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="text"
                            placeholder="Search templates by name, content, branch, or company..."
                            value={templateSearch}
                            onChange={(e) => setTemplateSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                          />
                          {templateSearch && (
                            <button
                              onClick={() => setTemplateSearch("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>

                        {/* Scope Filter Pills */}
                        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start">
                          {(
                            [
                              { id: "all", label: "All" },
                              { id: "global", label: "Global" },
                              { id: "branch", label: "Branch" },
                            ] as const
                          ).map((sc) => (
                            <button
                              key={sc.id}
                              onClick={() => setTemplateScopeFilter(sc.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                templateScopeFilter === sc.id
                                  ? "bg-white text-blue-600 shadow-sm"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              {sc.label}
                            </button>
                          ))}
                        </div>

                        {/* Company Filter Dropdown */}
                        <select
                          value={templateCompanyFilter}
                          onChange={(e) =>
                            setTemplateCompanyFilter(e.target.value)
                          }
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                        >
                          <option value="">All Companies</option>
                          {companies.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleExportTemplates("csv")}
                          className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Download size={13} />
                          <span>Export CSV</span>
                        </button>
                        <button
                          onClick={() => {
                            setTemplateImportFile(null);
                            setTemplateImportBranchId("");
                            setModal("import-templates");
                          }}
                          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Upload size={13} />
                          <span>Import</span>
                        </button>
                        <button
                          onClick={() => {
                            setTargetTemplate(null);
                            setTemplateForm({
                              template_type: "",
                              content: "",
                              branch_id: "",
                            });
                            setModal("template");
                          }}
                          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>New Template</span>
                        </button>
                      </div>
                    </div>

                    {/* Templates Cards Grid + Table View */}
                    {filteredTemplates.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-14 text-center space-y-3 shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                          <FileText size={24} />
                        </div>
                        <h3 className="text-base font-extrabold text-slate-800">
                          No message templates found
                        </h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Create a new global or branch-specific message template, or import templates from a CSV, Excel, or JSON file.
                        </p>
                        <div className="flex items-center justify-center gap-2.5 pt-2">
                          <button
                            onClick={() => {
                              setTargetTemplate(null);
                              setTemplateForm({
                                template_type: "",
                                content: "",
                                branch_id: "",
                              });
                              setModal("template");
                            }}
                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                          >
                            <Plus size={15} />
                            <span>Create First Template</span>
                          </button>
                          <button
                            onClick={() => {
                              setTemplateImportFile(null);
                              setTemplateImportBranchId("");
                              setModal("import-templates");
                            }}
                            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            <Upload size={14} />
                            <span>Import Templates</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredTemplates.map((t) => {
                          const cleanText = stripHtmlTags(t.content);
                          const isGlobal = t.branch_id === null;
                          return (
                            <div
                              key={t.id}
                              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between gap-4"
                            >
                              <div className="space-y-3">
                                {/* Top Badges & Actions */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-extrabold text-slate-900">
                                        {t.template_type}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                          isGlobal
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-violet-50 text-violet-700 border-violet-200"
                                        }`}
                                      >
                                        {isGlobal ? "Global" : "Branch"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                      {isGlobal
                                        ? "Available to all companies & branches"
                                        : `${t.company_name || "Company"} • ${t.branch_name || "Branch"}`}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => {
                                        setTargetTemplate(t);
                                        setTemplateForm({
                                          template_type: t.template_type,
                                          content: stripHtmlTags(t.content),
                                          branch_id: t.branch_id
                                            ? String(t.branch_id)
                                            : "",
                                        });
                                        setModal("template");
                                      }}
                                      className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                      title="Edit Template"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setTargetTemplate(t);
                                        setModal("delete-template");
                                      }}
                                      className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Delete Template"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>

                                {/* Content Box */}
                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words min-h-[84px] max-h-44 overflow-y-auto">
                                  {cleanText || t.content}
                                </div>
                              </div>

                              {/* Footer */}
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                <span>
                                  {cleanText.length} chars •{" "}
                                  {Math.max(1, Math.ceil(cleanText.length / 160))}{" "}
                                  SMS segment(s)
                                </span>
                                <span>
                                  {new Date(t.created_at).toLocaleDateString([], {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ════════════════════════════════════════════════════════════════
                  FULL SYSTEM BACKUP & RESTORE VIEW
              ════════════════════════════════════════════════════════════════ */}
              {view === "backup" && (
                <div className="space-y-6">
                  {/* Top Banner */}
                  <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
                        <ShieldCheck size={14} />
                        <span>Complete Disaster Recovery & Migration Vault</span>
                      </div>
                      <h2 className="text-2xl font-extrabold tracking-tight">
                        Export &amp; Restore Every Single Platform Detail at Once
                      </h2>
                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                        Generate a single encrypted-ready JSON snapshot containing all{" "}
                        <strong className="text-white">
                          Companies, Gateway Keys, Branches (with Password Hashes), Customers, Contact Folders, Message Templates, SMS &amp; Email Delivery Logs, System Settings, and Payment Records
                        </strong>
                        — or restore a backup file with automatic relational linking and duplicate protection.
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleExportFullBackup}
                        disabled={isExportingBackup}
                        className="inline-flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3.5 rounded-2xl text-sm font-extrabold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                      >
                        {isExportingBackup ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Download size={18} />
                        )}
                        <span>
                          {isExportingBackup
                            ? "Packaging Full Backup..."
                            : "Export Everything Now (.json)"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Live Database Inventory Grid */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                          <Database size={18} className="text-blue-600" />
                          <span>Live Platform Data Included in Backup</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Every table below is exported and restored in a single operation
                        </p>
                      </div>
                      <button
                        onClick={load}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                        title="Refresh counts"
                      >
                        <RefreshCw size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                      {[
                        {
                          label: "Companies & API Keys",
                          count: backupSummary?.companies ?? 0,
                          color: "text-blue-600 bg-blue-50 border-blue-100",
                        },
                        {
                          label: "Branches & PIN Hashes",
                          count: backupSummary?.branches ?? 0,
                          color: "text-indigo-600 bg-indigo-50 border-indigo-100",
                        },
                        {
                          label: "Customer Contacts",
                          count: backupSummary?.customers ?? 0,
                          color: "text-emerald-600 bg-emerald-50 border-emerald-100",
                        },
                        {
                          label: "Contact Folders",
                          count: backupSummary?.contact_folders ?? 0,
                          color: "text-amber-600 bg-amber-50 border-amber-100",
                        },
                        {
                          label: "Folder Memberships",
                          count: backupSummary?.folder_links ?? 0,
                          color: "text-cyan-600 bg-cyan-50 border-cyan-100",
                        },
                        {
                          label: "Message Templates",
                          count: backupSummary?.templates ?? 0,
                          color: "text-violet-600 bg-violet-50 border-violet-100",
                        },
                        {
                          label: "SMS Delivery Logs",
                          count: backupSummary?.sms_logs ?? 0,
                          color: "text-blue-700 bg-blue-50/70 border-blue-100",
                        },
                        {
                          label: "Email Delivery Logs",
                          count: backupSummary?.email_logs ?? 0,
                          color: "text-purple-600 bg-purple-50 border-purple-100",
                        },
                        {
                          label: "System Settings",
                          count: backupSummary?.system_settings ?? 0,
                          color: "text-slate-700 bg-slate-100 border-slate-200",
                        },
                        {
                          label: "Payment Transactions",
                          count: backupSummary?.payment_transactions ?? 0,
                          color: "text-emerald-700 bg-emerald-50/70 border-emerald-100",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={`p-4 rounded-2xl border ${item.color} flex flex-col justify-between`}
                        >
                          <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                            {item.label}
                          </span>
                          <span className="text-2xl font-extrabold mt-2">
                            {item.count.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Two-Column Export & Restore Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Export Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
                      <div className="space-y-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Download size={22} />
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900">
                          1. Export Complete System Backup
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Downloads a timestamped <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">.json</code> master archive containing every table, relationship, API credential, branch password hash, contact, folder, template, and message log.
                        </p>
                        <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            <span>Preserves Hubtel, Brevo &amp; Paystack credentials</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            <span>Preserves branch login codes and encrypted password hashes</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            <span>Preserves all contacts, folders, templates &amp; historical logs</span>
                          </li>
                        </ul>
                      </div>

                      <button
                        onClick={handleExportFullBackup}
                        disabled={isExportingBackup}
                        className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        {isExportingBackup ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                        <span>
                          {isExportingBackup
                            ? "Generating Backup File..."
                            : "Download Full Platform Backup (.json)"}
                        </span>
                      </button>
                    </div>

                    {/* Right: Import / Restore Card */}
                    <form
                      onSubmit={handleRestoreFullBackup}
                      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5"
                    >
                      <div className="space-y-4">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Upload size={22} />
                        </div>
                        <div>
                          <h3 className="text-lg font-extrabold text-slate-900">
                            2. Import &amp; Restore System Backup
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed mt-1">
                            Upload a previously exported PeakSend <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">.json</code> backup file. All relationships (Company &rarr; Branch &rarr; Contacts/Folders/Templates/Logs) are automatically re-linked and deduplicated.
                          </p>
                        </div>

                        {/* Restore Mode Selector */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 block">
                            Duplicate Handling Mode
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => setBackupRestoreMode("merge")}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                backupRestoreMode === "merge"
                                  ? "border-blue-500 bg-blue-50/60 text-blue-900"
                                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <p className="text-xs font-extrabold">
                                Safe Merge (Recommended)
                              </p>
                              <p className="text-[11px] opacity-80 mt-0.5">
                                Adds missing records &amp; skips existing duplicates without overwriting current keys.
                              </p>
                            </button>

                            <button
                              type="button"
                              onClick={() => setBackupRestoreMode("update")}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                backupRestoreMode === "update"
                                  ? "border-amber-500 bg-amber-50/60 text-amber-900"
                                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <p className="text-xs font-extrabold">
                                Merge + Update Credentials
                              </p>
                              <p className="text-[11px] opacity-80 mt-0.5">
                                Restores missing data and updates existing company keys &amp; branch PINs from backup.
                              </p>
                            </button>
                          </div>
                        </div>

                        {/* File Input */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 block">
                            Select Backup File (.json)
                          </label>
                          <input
                            type="file"
                            accept=".json"
                            onChange={(e) =>
                              setBackupFile(e.target.files?.[0] || null)
                            }
                            required
                            className="w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isRestoringBackup || !backupFile}
                        className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        {isRestoringBackup ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Upload size={16} />
                        )}
                        <span>
                          {isRestoringBackup
                            ? "Restoring All Platform Records..."
                            : "Upload & Restore Full Backup"}
                        </span>
                      </button>
                    </form>
                  </div>

                  {/* Restore Summary Report */}
                  {lastRestoreResult && (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-emerald-900">
                          <CheckCircle2 size={20} className="text-emerald-600" />
                          <h4 className="text-sm font-extrabold">
                            Backup Restore Summary Report
                          </h4>
                        </div>
                        <button
                          onClick={() => setLastRestoreResult(null)}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                        >
                          Dismiss
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {Object.entries(lastRestoreResult).map(
                          ([tableKey, counts]: [string, any]) => (
                            <div
                              key={tableKey}
                              className="bg-white border border-emerald-200/80 rounded-xl p-3.5"
                            >
                              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                                {tableKey.replace("_", " ")}
                              </p>
                              <div className="mt-2 space-y-0.5 text-xs">
                                <p className="text-emerald-700 font-bold">
                                  +{counts.imported || 0} imported
                                </p>
                                {counts.updated !== undefined &&
                                  counts.updated > 0 && (
                                    <p className="text-blue-600 font-bold">
                                      {counts.updated} updated
                                    </p>
                                  )}
                                <p className="text-slate-400">
                                  {counts.skipped || 0} duplicates skipped
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Modals (Clean Light Enterprise Modals) ── */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setModal(null)}
          />
          <div className="relative bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {modal === "company"
                    ? targetCompany
                      ? "Update Company"
                      : "Register New Company"
                    : modal === "branch"
                    ? "Register New Branch"
                    : modal === "edit-branch"
                    ? "Change Branch Password / PIN"
                    : modal === "template"
                    ? targetTemplate
                      ? "Edit Message Template"
                      : "Create Message Template"
                    : modal === "delete-template"
                    ? "Delete Message Template"
                    : modal === "import-templates"
                    ? "Import Message Templates"
                    : modal === "import-contacts"
                    ? "Import Contacts List"
                    : "Delete Company & Data"}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {modal === "delete-company"
                    ? "Warning: This permanently deletes the company and all branches"
                    : modal === "delete-template"
                    ? `Confirm deletion of "${targetTemplate?.template_type || "template"}"`
                    : modal === "template"
                    ? "Use placeholders like {name} and {branch} for personalized messages"
                    : modal === "import-templates"
                    ? "Upload a CSV, Excel (.xlsx), or JSON file containing templates"
                    : modal === "edit-branch"
                    ? `Update login password / access PIN or details for ${targetBranch?.name || "this branch"}`
                    : "Complete the details below"}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {modal === "delete-company" ? (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex gap-3">
                    <AlertCircle className="text-rose-600 shrink-0" size={22} />
                    <p className="text-rose-900 text-sm">
                      All branches, contacts, and logs belonging to this company
                      will be permanently removed. Are you sure?
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setModal(null)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={deleteCompany}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm"
                    >
                      Yes, Delete Everything
                    </button>
                  </div>
                </div>
              ) : modal === "delete-template" ? (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex gap-3">
                    <AlertCircle className="text-rose-600 shrink-0" size={22} />
                    <div className="text-rose-900 text-sm space-y-1">
                      <p className="font-bold">
                        Delete &ldquo;{targetTemplate?.template_type}&rdquo;?
                      </p>
                      <p className="text-xs text-rose-700">
                        This template will be permanently removed and will no longer be available to branches.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setModal(null)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={deleteTemplate}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                    >
                      Yes, Delete Template
                    </button>
                  </div>
                </div>
              ) : modal === "template" ? (
                <form onSubmit={submitTemplate} className="space-y-5">
                  <InputField
                    label="Template Name / Category"
                    placeholder="e.g. Welcome Message, Payment Reminder, Holiday Promo"
                    value={templateForm.template_type}
                    onChange={(v) =>
                      setTemplateForm({ ...templateForm, template_type: v })
                    }
                  />

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Template Scope / Branch Assignment
                    </label>
                    <select
                      value={templateForm.branch_id}
                      onChange={(e) =>
                        setTemplateForm({
                          ...templateForm,
                          branch_id: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    >
                      <option value="">
                        Global Template (Available to All Companies & Branches)
                      </option>
                      {allBranches.map((b) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.company_name ? `${b.company_name} — ` : ""}
                          {b.name} ({b.branch_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Template Message Content
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setTemplateForm({
                              ...templateForm,
                              content: `${templateForm.content}{name}`,
                            })
                          }
                          className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                        >
                          + &#123;name&#125;
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setTemplateForm({
                              ...templateForm,
                              content: `${templateForm.content}{branch}`,
                            })
                          }
                          className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200 cursor-pointer"
                        >
                          + &#123;branch&#125;
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={5}
                      required
                      placeholder="Hello {name}, thank you for visiting {branch}!..."
                      value={templateForm.content}
                      onChange={(e) =>
                        setTemplateForm({
                          ...templateForm,
                          content: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                    <p className="text-[11px] text-slate-400">
                      {templateForm.content.length} characters •{" "}
                      {Math.max(1, Math.ceil(templateForm.content.length / 160))}{" "}
                      SMS segment(s)
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingTemplate}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                    >
                      {isSavingTemplate
                        ? "Saving..."
                        : targetTemplate
                        ? "Update Template"
                        : "Create Template"}
                    </button>
                  </div>
                </form>
              ) : modal === "import-templates" ? (
                <form onSubmit={submitImportTemplates} className="space-y-5">
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-1">
                    <p className="font-bold">Supported Formats: CSV, Excel (.xlsx), or JSON</p>
                    <p className="text-blue-700">
                      Include columns/fields for <strong>template_type</strong> (or <em>name</em>/<em>category</em>) and <strong>content</strong> (or <em>message</em>/<em>body</em>).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Assign Imported Templates To (Optional)
                    </label>
                    <select
                      value={templateImportBranchId}
                      onChange={(e) => setTemplateImportBranchId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900"
                    >
                      <option value="">
                        Global Templates (Available to All Branches)
                      </option>
                      {allBranches.map((b) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.company_name ? `${b.company_name} — ` : ""}
                          {b.name} ({b.branch_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Templates File (.csv, .xlsx, .json)
                    </label>
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls, .json"
                      onChange={(e) =>
                        setTemplateImportFile(e.target.files?.[0] || null)
                      }
                      required
                      className="w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isImportingTemplates}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {isImportingTemplates
                        ? "Importing..."
                        : "Upload & Import Templates"}
                    </button>
                  </div>
                </form>
              ) : modal === "edit-branch" ? (
                <form onSubmit={submitBranchUpdate} className="space-y-5">
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
                    <Key className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-amber-900 space-y-1">
                      <p className="font-bold">Branch Login Security</p>
                      <p className="text-amber-700">
                        Enter a new password / access PIN below to reset this branch&apos;s login credentials, or leave the password fields blank to only update the branch name or code.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label="Branch Name"
                      placeholder="Accra Mall Branch"
                      value={branchEditForm.name}
                      onChange={(v) =>
                        setBranchEditForm({ ...branchEditForm, name: v })
                      }
                    />
                    <InputField
                      label="Branch Code (Login ID)"
                      placeholder="ACCRA01"
                      value={branchEditForm.branch_code}
                      onChange={(v) =>
                        setBranchEditForm({ ...branchEditForm, branch_code: v })
                      }
                    />
                  </div>

                  <div className="space-y-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock size={13} className="text-amber-600" />
                        New Branch Password / Access PIN
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setShowBranchPassword(!showBranchPassword)
                        }
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        {showBranchPassword ? (
                          <>
                            <EyeOff size={13} /> Hide Password
                          </>
                        ) : (
                          <>
                            <Eye size={13} /> Show Password
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField
                        label="New Password / PIN"
                        type={showBranchPassword ? "text" : "password"}
                        placeholder="Enter new password or PIN"
                        value={branchEditForm.pin}
                        onChange={(v) =>
                          setBranchEditForm({ ...branchEditForm, pin: v })
                        }
                      />
                      <InputField
                        label="Confirm New Password / PIN"
                        type={showBranchPassword ? "text" : "password"}
                        placeholder="Re-enter new password or PIN"
                        value={branchEditForm.confirm_pin}
                        onChange={(v) =>
                          setBranchEditForm({
                            ...branchEditForm,
                            confirm_pin: v,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingBranch}
                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-2"
                    >
                      <Key size={14} />
                      {isUpdatingBranch
                        ? "Updating..."
                        : "Update Password & Save"}
                    </button>
                  </div>
                </form>
              ) : modal === "import-contacts" ? (
                <form onSubmit={submitImportContacts} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Default Company (Optional)
                    </label>
                    <select
                      value={importForm.company_id}
                      onChange={(e) =>
                        setImportForm({
                          ...importForm,
                          company_id: e.target.value,
                          branch_id: "",
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900"
                    >
                      <option value="">Select Company...</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Default Branch (Optional)
                    </label>
                    <select
                      value={importForm.branch_id}
                      onChange={(e) =>
                        setImportForm({
                          ...importForm,
                          branch_id: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 disabled:opacity-50"
                      disabled={
                        !importForm.company_id || loadingImportBranches
                      }
                    >
                      <option value="">Select Branch...</option>
                      {importBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Contacts File (.csv, .xlsx)
                    </label>
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={(e) =>
                        setImportFile(e.target.files?.[0] || null)
                      }
                      required
                      className="w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isImporting}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold"
                    >
                      {isImporting ? "Importing..." : "Upload & Import"}
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={modal === "company" ? submitCompany : submitBranch}
                  className="space-y-5"
                >
                  {modal === "company" ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField
                          label="Company Name"
                          placeholder="Classhouse Electronics"
                          value={cf.name}
                          onChange={(v) => setCf({ ...cf, name: v })}
                        />
                        <InputField
                          label="Unique Slug"
                          placeholder="classhouse"
                          value={cf.slug}
                          onChange={(v) => setCf({ ...cf, slug: v })}
                        />
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase">
                          <Globe size={14} />
                          <span>SMS Gateway (Hubtel)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <InputField
                            label="Client ID"
                            value={cf.hubtel_client_id}
                            onChange={(v) =>
                              setCf({ ...cf, hubtel_client_id: v })
                            }
                          />
                          <InputField
                            label="Client Secret"
                            type="password"
                            value={cf.hubtel_client_secret}
                            onChange={(v) =>
                              setCf({ ...cf, hubtel_client_secret: v })
                            }
                          />
                          <InputField
                            label="Sender ID"
                            placeholder="ClassHouse"
                            value={cf.hubtel_sender_id}
                            onChange={(v) =>
                              setCf({ ...cf, hubtel_sender_id: v })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-violet-600 font-bold text-xs uppercase">
                          <Mail size={14} />
                          <span>Email Gateway (Brevo)</span>
                        </div>
                        <InputField
                          label="Brevo API Key"
                          type="password"
                          value={cf.brevo_api_key}
                          onChange={(v) => setCf({ ...cf, brevo_api_key: v })}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <InputField
                            label="Sender Email"
                            value={cf.brevo_sender_email}
                            onChange={(v) =>
                              setCf({ ...cf, brevo_sender_email: v })
                            }
                          />
                          <InputField
                            label="Sender Name"
                            value={cf.brevo_sender_name}
                            onChange={(v) =>
                              setCf({ ...cf, brevo_sender_name: v })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase">
                          <CreditCard size={14} />
                          <span>Paystack Keys (Optional)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <InputField
                            label="Public Key"
                            value={cf.paystack_public_key}
                            onChange={(v) =>
                              setCf({ ...cf, paystack_public_key: v })
                            }
                          />
                          <InputField
                            label="Secret Key"
                            type="password"
                            value={cf.paystack_secret_key}
                            onChange={(v) =>
                              setCf({ ...cf, paystack_secret_key: v })
                            }
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <InputField
                        label="Branch Name"
                        placeholder="Accra Mall Branch"
                        value={bf.name}
                        onChange={(v) => setBf({ ...bf, name: v })}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField
                          label="Branch Code"
                          placeholder="ACCRA01"
                          value={bf.branch_code}
                          onChange={(v) => setBf({ ...bf, branch_code: v })}
                        />
                        <InputField
                          label="Access PIN"
                          type="password"
                          placeholder="4-digit PIN"
                          value={bf.pin}
                          onChange={(v) => setBf({ ...bf, pin: v })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setModal(null)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                    >
                      {modal === "company"
                        ? targetCompany
                          ? "Save Changes"
                          : "Create Company"
                        : "Create Branch"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Test Payment Modal ── */}
      {testPayModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setTestPayModalOpen(false)}
          />
          <div className="relative bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">
                Test Paystack Checkout
              </h2>
              <button
                onClick={() => setTestPayModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInitializePayment} className="p-6 space-y-4">
              <InputField
                label="Customer Email"
                type="email"
                placeholder="customer@example.com"
                value={testPayForm.customer_email}
                onChange={(v) =>
                  setTestPayForm({ ...testPayForm, customer_email: v })
                }
              />
              <InputField
                label={`Amount (${paystackSettings.currency})`}
                type="number"
                value={testPayForm.amount}
                onChange={(v) => setTestPayForm({ ...testPayForm, amount: v })}
              />
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setTestPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInitializingPayment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold"
                >
                  {isInitializingPayment
                    ? "Initializing..."
                    : "Proceed to Paystack"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-xs font-bold">{toast}</span>
        </div>
      )}
    </div>
  );
};

// ── Sub-components ──
const InputField = ({
  label,
  type = "text",
  placeholder = "",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-700 block">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
    />
  </div>
);

const GatewayStatus = ({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${
      active
        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
        : "bg-slate-100 border-slate-200 text-slate-400"
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        active ? "bg-emerald-500" : "bg-slate-400"
      }`}
    />
    {label}
  </span>
);

const StatusBadge = ({
  status,
  deliveryReport,
}: {
  status: string;
  deliveryReport?: string;
}) => {
  const isSent = status === "sent" || status === "delivered" || status === "success";
  const isQueued = status === "queued" || status === "pending";
  const isInsufficientBalance =
    status === "failed" &&
    deliveryReport &&
    deliveryReport.toLowerCase().includes("insufficient balance");

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
        isSent
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : isQueued
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : isInsufficientBalance
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-rose-50 text-rose-700 border-rose-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isSent
            ? "bg-emerald-500"
            : isQueued
            ? "bg-blue-500"
            : isInsufficientBalance
            ? "bg-amber-500"
            : "bg-rose-500"
        }`}
      />
      {isInsufficientBalance ? "Insufficient Balance" : status}
    </span>
  );
};

export default MasterAdmin;
