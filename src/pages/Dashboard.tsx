import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import { useNavigate, useParams } from "react-router-dom";
import {
  Users,
  Send,
  Clock,
  LogOut,
  UserPlus,
  MessageSquare,
  ChevronRight,
  Loader2,
  AlertCircle,
  Circle,
  Plus,
  Trash2,
  Mail,
  Pencil,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  Upload,
} from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
        {icon}
      </div>
      <ChevronRight
        size={16}
        className="text-gray-300 group-hover:text-gray-500 transition-colors"
      />
    </div>
    <p className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">
      {value}
    </p>
    <p className="text-sm font-medium text-gray-500">{label}</p>
  </div>
);

const QuickAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}> = ({ icon, label, onClick, color }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-6 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 transition-all duration-300 gap-3 group shadow-sm`}
  >
    <div
      className={`p-4 rounded-full ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}
    >
      {icon}
    </div>
    <span className="text-sm font-semibold text-gray-700">{label}</span>
  </button>
);

import AddCustomerModal from "../components/AddCustomerModal";
import SendSMSModal from "../components/SendSMSModal";
import SendEmailModal from "../components/SendEmailModal";
import AddTemplateModal from "../components/AddTemplateModal";
import EditCustomerModal from "../components/EditCustomerModal";
import RescheduleModal from "../components/RescheduleModal";
import BulkSMSImportModal from "../components/BulkSMSImportModal";
import { stripHtml } from "../utils/helpers";

const Dashboard: React.FC = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  const [activeTab, setActiveTab] = useState<
    "Customers" | "SMS Logs" | "Email Logs" | "Templates" | "Pending"
  >((sessionStorage.getItem("activeTab") as any) || "Customers");

  useEffect(() => {
    sessionStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
  const [isBulkSMSImportModalOpen, setIsBulkSMSImportModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [rescheduleItem, setRescheduleItem] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;
  const [stats, setStats] = useState({
    total_customers: 0,
    total_transactions: 0,
    sms_sent_today: 0,
    pending_sms: 0,
  });
  const [tableData, setTableData] = useState<any[]>([]);
  const active_tab_log_is_sms = activeTab === "SMS Logs";
  const active_tab_log_is_email = activeTab === "Email Logs";
  const active_tab_is_pending = activeTab === "Pending";

  const branchName = localStorage.getItem("branchName") || "Branch";
  const navigate = useNavigate();

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");

    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`${API_BASE_URL}/customers/stats/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.status === 401) return handleLogout();
      if (statsRes.ok) setStats(await statsRes.json());

      // 2. Fetch Tab Content with Filters
      let endpoint = "customers";
      if (activeTab === "SMS Logs") endpoint = "sms";
      if (activeTab === "Email Logs") endpoint = "email";
      if (activeTab === "Templates") endpoint = "messages";
      if (activeTab === "Pending") endpoint = "messages/pending";

      // Build Query Params
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (
        statusFilter &&
        activeTab !== "Customers" &&
        activeTab !== "Templates"
      ) {
        params.append("status", statusFilter);
      }
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      // Add Pagination Params
      if (activeTab !== "Templates" && activeTab !== "Pending") {
        const skip = (currentPage - 1) * pageSize;
        params.append("skip", skip.toString());
        params.append("limit", pageSize.toString());
      }

      const qs = params.toString();
      const finalUrl = `${API_BASE_URL}/${endpoint}/${qs ? `?${qs}` : ""}`;

      const contentRes = await fetch(finalUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (contentRes.status === 401) return handleLogout();
      if (contentRes.ok) {
        const data = await contentRes.json();
        if (activeTab === "Templates" || activeTab === "Pending") {
          setTableData(data);
          setTotalItems(data.length);
        } else {
          setTableData(data.items);
          setTotalItems(data.total);
        }
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, startDate, endDate, activeTab]);

  useEffect(() => {
    fetchData();
  }, [
    activeTab,
    debouncedSearch,
    statusFilter,
    startDate,
    endDate,
    currentPage,
  ]);

  const handleLogout = () => {
    localStorage.clear();
    navigate(`/${companySlug}/login`);
  };

  const handleAddSuccess = () => {
    fetchData();
  };

  const handleSMSSuccess = () => {
    sessionStorage.setItem("activeTab", "SMS Logs");
    alert("Campaign/Message successfully queued and sent to dispatch!");
    window.location.reload();
  };

  const handleEmailSuccess = () => {
    sessionStorage.setItem("activeTab", "Email Logs");
    alert("Campaign/Email successfully queued and sent to dispatch!");
    window.location.reload();
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/messages/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchData();
      }
    } catch (err: any) {
      console.error("Delete template error:", err);
      setError("Failed to delete template. Please try again.");
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this customer? This will NOT delete their logs for history purposes.",
      )
    )
      return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchData();
      }
    } catch (err: any) {
      console.error("Delete customer error:", err);
      setError("Failed to delete customer. Please try again.");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-red-100 p-6 rounded-2xl max-w-md text-center shadow-lg">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
        onUnauthorized={handleLogout}
      />

      {/* Send SMS Modal */}
      <SendSMSModal
        isOpen={isSMSModalOpen}
        onClose={() => setIsSMSModalOpen(false)}
        onSuccess={handleSMSSuccess}
        onUnauthorized={handleLogout}
      />

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSuccess={handleEmailSuccess}
        onUnauthorized={handleLogout}
      />

      {/* Add Template Modal */}
      <AddTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSuccess={fetchData}
        onUnauthorized={handleLogout}
      />

      <EditCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchData}
        onUnauthorized={handleLogout}
        customer={selectedCustomer}
      />

      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        onSuccess={fetchData}
        onUnauthorized={handleLogout}
        pendingItem={rescheduleItem}
      />

      <BulkSMSImportModal
        isOpen={isBulkSMSImportModalOpen}
        onClose={() => setIsBulkSMSImportModalOpen(false)}
        onSuccess={handleSMSSuccess}
        onUnauthorized={handleLogout}
      />

      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Send size={18} className="text-white fill-current" />
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900">
            {companySlug?.toUpperCase()} | {branchName}
          </span>
          <div className="hidden sm:flex items-center space-x-2 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
            <Circle
              size={8}
              className="fill-current text-green-600 animate-pulse"
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">
              Online
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 transition-colors py-2 px-3 rounded-lg hover:bg-gray-100"
        >
          <LogOut size={18} />
          <span className="text-sm font-semibold hidden sm:inline">Logout</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="min-w-screen pt-24 pb-12 px-6 max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <header className="mb-2">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Dashboard Overview
          </h2>
          <p className="text-gray-500 mt-1">
            Real-time engagement and transaction metrics.
          </p>
        </header>

        {/* Summary Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon={<Users size={22} />}
            label="Total Customers"
            value={isLoading ? "..." : stats.total_customers}
            color="text-blue-600"
          />
          <StatCard
            icon={<Send size={22} />}
            label="SMS Sent Today"
            value={isLoading ? "..." : stats.sms_sent_today}
            color="text-violet-600"
          />
          <StatCard
            icon={<Clock size={22} />}
            label="Pending SMS"
            value={isLoading ? "..." : stats.pending_sms}
            color="text-amber-600"
          />
        </section>

        {/* Quick Actions */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 px-1">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            <QuickAction
              icon={<UserPlus size={24} />}
              label="Add Customer"
              onClick={() => setIsAddModalOpen(true)}
              color="text-blue-600"
            />
            <QuickAction
              icon={<Send size={24} />}
              label="Send SMS"
              onClick={() => setIsSMSModalOpen(true)}
              color="text-blue-600"
            />
            <QuickAction
              icon={<Upload size={24} />}
              label="Bulk Import"
              onClick={() => setIsBulkSMSImportModalOpen(true)}
              color="text-indigo-600"
            />
            <QuickAction
              icon={<Mail size={24} />}
              label="Send Email"
              onClick={() => setIsEmailModalOpen(true)}
              color="text-indigo-600"
            />
            <QuickAction
              icon={<Plus size={24} />}
              label="New Template"
              onClick={() => setIsTemplateModalOpen(true)}
              color="text-amber-600"
            />
            <QuickAction
              icon={<MessageSquare size={24} />}
              label="Logs"
              onClick={() => setActiveTab("SMS Logs")}
              color="text-violet-600"
            />
          </div>
        </section>

        {/* Recent Activity Section */}
        <section className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>

            {/* Tabs */}
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
              {[
                "Customers",
                "SMS Logs",
                "Email Logs",
                "Templates",
                "Pending",
              ].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-400 hover:text-gray-600"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder={`Search ${activeTab.toLowerCase()}...`}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Filter (Only for logs) */}
            {(activeTab === "SMS Logs" || activeTab === "Email Logs") && (
              <div className="relative min-w-[140px]">
                <Filter
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <select
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="sent">Sent</option>
                  <option value="queued">Queued</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            )}

            {/* Date Range */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="date"
                  className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  title="Start Date"
                />
              </div>
              <span className="text-gray-400 text-sm">to</span>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="date"
                  className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  title="End Date"
                />
              </div>
            </div>

            {/* Reset */}
            {(searchTerm || statusFilter || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 px-2 py-1 transition-colors"
                title="Clear all filters"
              >
                Reset
              </button>
            )}
          </div>

          <div className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <p className="text-gray-400 animate-pulse font-medium">
                  Fetching latest data...
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    {activeTab === "SMS Logs" ? (
                      <>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                          Recipient
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                          Message
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                          Type
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                          Status
                        </th>
                      </>
                    ) : activeTab === "Email Logs" ? (
                      <>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                          Recipient
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                          Subject
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                          Status
                        </th>
                      </>
                    ) : activeTab === "Pending" ? (
                      <>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                          Type
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                          Recipient(s)
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                          Message/Subject
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                          Scheduled Time
                        </th>
                      </>
                    ) : (
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                        {activeTab === "Customers" ? "Name" : "Template Type"}
                      </th>
                    )}

                    {activeTab === "Customers" && (
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                        Phone
                      </th>
                    )}
                    {activeTab === "Templates" && (
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                        Template Content
                      </th>
                    )}

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                      {activeTab === "SMS Logs" || activeTab === "Email Logs"
                        ? "Scheduled Date & Time"
                        : "Date"}
                    </th>
                    {(activeTab === "Templates" ||
                      activeTab === "Customers" ||
                      activeTab === "Pending") && (
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 text-right">
                          Actions
                        </th>
                      )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-400 italic"
                      >
                        No {activeTab.toLowerCase()} found for this branch.
                      </td>
                    </tr>
                  ) : (
                    tableData.map((item: any, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {active_tab_log_is_sms && (
                          <>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              <div className="flex items-center space-x-2">
                                <span>{item.phone_number}</span>
                                {item.is_bulk && (
                                  <span className="bg-blue-100 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                    Bulk
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {stripHtml(item.message_content || "").substring(
                                0,
                                40,
                              ) +
                                (stripHtml(item.message_content || "").length >
                                  40
                                  ? "..."
                                  : "")}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                              {item.message_type}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex flex-col">
                                <span
                                  className={`w-fit px-2 py-1 rounded-full text-[10px] font-bold uppercase ${item.status === "sent"
                                      ? "bg-green-100 text-green-700"
                                      : item.status === "failed"
                                        ? "bg-red-100 text-red-700"
                                        : item.status === "retrying"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-amber-100 text-amber-700"
                                    }`}
                                >
                                  {item.status}
                                </span>
                                {(item.status === "failed" ||
                                  item.status === "retrying") &&
                                  item.delivery_report && (
                                    <span
                                      className={`text-[9px] mt-1 max-w-[150px] truncate ${item.status === "failed"
                                          ? "text-red-400"
                                          : "text-blue-400"
                                        }`}
                                      title={item.delivery_report}
                                    >
                                      {item.delivery_report}
                                    </span>
                                  )}
                              </div>
                            </td>
                          </>
                        )}
                        {active_tab_log_is_email && (
                          <>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {item.recipient_email}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {item.subject}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex flex-col">
                                <span
                                  className={`w-fit px-2 py-1 rounded-full text-[10px] font-bold uppercase ${item.status === "sent"
                                      ? "bg-green-100 text-green-700"
                                      : item.status === "failed"
                                        ? "bg-red-100 text-red-700"
                                        : item.status === "retrying"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-amber-100 text-amber-700"
                                    }`}
                                >
                                  {item.status}
                                </span>
                                {(item.status === "failed" ||
                                  item.status === "retrying") &&
                                  item.delivery_report && (
                                    <span
                                      className={`text-[9px] mt-1 max-w-[150px] truncate ${item.status === "failed"
                                          ? "text-red-400"
                                          : "text-blue-400"
                                        }`}
                                      title={item.delivery_report}
                                    >
                                      {item.delivery_report}
                                    </span>
                                  )}
                              </div>
                            </td>
                          </>
                        )}
                        {active_tab_is_pending && (
                          <>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.type === "sms"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-indigo-100 text-indigo-700"
                                  }`}
                              >
                                {item.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <span>{item.recipient}</span>
                                {item.is_bulk && (
                                  <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                    BULK
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <span title={stripHtml(item.content)}>
                                {stripHtml(item.content).substring(0, 50)}
                                {stripHtml(item.content).length > 50
                                  ? "..."
                                  : ""}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 font-bold">
                              {new Date(item.scheduled_for).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                          </>
                        )}
                        {!active_tab_log_is_sms &&
                          !active_tab_log_is_email &&
                          !active_tab_is_pending && (
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {activeTab === "Customers"
                                ? item.full_name
                                : item.template_type}
                            </td>
                          )}
                        {activeTab === "Customers" && (
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {item.phone_number}
                          </td>
                        )}
                        {activeTab === "Templates" && (
                          <td className="px-6 py-4 text-sm text-gray-600 italic">
                            "{stripHtml(item.content)}"
                          </td>
                        )}

                        <td className="px-6 py-4 text-sm text-gray-500">
                          {activeTab === "SMS Logs" || activeTab === "Email Logs"
                            ? new Date(item.scheduled_for).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                            : new Date(item.created_at).toLocaleDateString()}
                        </td>
                        {activeTab === "Templates" && (
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteTemplate(item.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                              title="Delete Template"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                        {activeTab === "Customers" && (
                          <td className="px-6 py-4 text-right flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                setSelectedCustomer(item);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 text-blue-500 hover:text-blue-700 transition-colors bg-blue-50 rounded-lg"
                              title="Edit Customer"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(item.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 transition-colors bg-red-50 rounded-lg"
                              title="Delete Customer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}

                        {activeTab === "Pending" && (
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setRescheduleItem(item);
                                setIsRescheduleModalOpen(true);
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 rounded-lg flex items-center space-x-1 ml-auto"
                              title="Reschedule Message"
                            >
                              <Clock size={16} />
                              <span className="text-[10px] font-bold uppercase">
                                Reschedule
                              </span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {activeTab !== "Templates" &&
            activeTab !== "Pending" &&
            totalItems > 0 && (
              <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-500 font-medium">
                  Showing{" "}
                  <span className="text-gray-900 font-bold">
                    {Math.min((currentPage - 1) * pageSize + 1, totalItems)}
                  </span>{" "}
                  to{" "}
                  <span className="text-gray-900 font-bold">
                    {Math.min(currentPage * pageSize, totalItems)}
                  </span>{" "}
                  of{" "}
                  <span className="text-gray-900 font-bold">{totalItems}</span>{" "}
                  {activeTab.toLowerCase()}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-gray-400 mr-2 uppercase tracking-widest">
                    Page {currentPage} of{" "}
                    {Math.ceil(totalItems / pageSize) || 1}
                  </span>

                  <button
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <button
                    disabled={currentPage >= Math.ceil(totalItems / pageSize)}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
