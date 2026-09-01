import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import { stripHtml } from "../utils/helpers";
import {
  X,
  Search,
  Calendar,
  MessageSquare,
  Loader2,
  AlertCircle,
  User,
} from "lucide-react";

interface Customer {
  id: number;
  full_name: string;
  phone_number: string;
  created_at: string;
}

interface SendSMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onUnauthorized: () => void;
}

interface Template {
  id: number;
  template_type: string;
  content: string;
}

const SendSMSModal: React.FC<SendSMSModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onUnauthorized,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null,
  );
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [messageType, setMessageType] = useState("custom");
  const [messageContent, setMessageContent] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      fetchTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, dateFilter, customers]);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) return onUnauthorized();
      if (response.ok) {
        setTemplates(await response.json());
      }
    } catch (err) {
      console.error("Failed to fetch templates", err);
    }
  };

  const fetchCustomers = async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) return onUnauthorized();
      if (response.ok) {
        const data = await response.json();
        const customerList = data.items || [];
        setCustomers(customerList);
        setFilteredCustomers(customerList);
        // Extract unique registration dates for the filter
        const dates = [
          ...new Set(
            customerList.map((c: Customer) =>
              new Date(c.created_at).toLocaleDateString(),
            ),
          ),
        ];
        setAvailableDates(dates as string[]);
      }
    } catch (err) {
      console.error("Failed to fetch customers", err);
    } finally {
      setIsFetching(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone_number.includes(searchQuery),
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(
        (c) => new Date(c.created_at).toLocaleDateString() === dateFilter,
      );
    }

    setFilteredCustomers(filtered);
  };

  const applyPlaceholders = (content: string, customerId: number | null) => {
    let newContent = stripHtml(content);
    const branchName = localStorage.getItem("branchName") || "Class House";

    // Replace branch name
    newContent = newContent.replace(/{branch}/g, branchName);

    // Replace customer name if available
    if (customerId) {
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        newContent = newContent.replace(/{name}/g, customer.full_name);
      }
    }

    return newContent;
  };

  const handleTemplateChange = (val: string) => {
    setMessageType(val);
    if (val === "custom") {
      setMessageContent("");
    } else {
      const template = templates.find((t) => t.id.toString() === val);
      if (template) {
        setMessageContent(
          applyPlaceholders(template.content, selectedCustomerId),
        );
      }
    }
  };

  const handleCustomerSelect = (customerId: number) => {
    setSelectedCustomerId(customerId);

    // If a template is already selected (not custom), update the content with the new name
    if (messageType !== "custom") {
      const template = templates.find((t) => t.id.toString() === messageType);
      if (template) {
        setMessageContent(applyPlaceholders(template.content, customerId));
      }
    }
  };

  const [recipientMode, setRecipientMode] = useState<"single" | "group">(
    "single",
  );
  const [selectedGroup, setSelectedGroup] = useState("today");

  // Handle UX consistency when switching between Single and Group mode
  useEffect(() => {
    if (recipientMode === "group" && messageType !== "custom") {
      const template = templates.find((t) => t.id.toString() === messageType);
      if (template) {
        // Apply placeholders (branch only for group) and strip HTML for bulk sending preview
        setMessageContent(applyPlaceholders(template.content, null));
      }
    } else if (
      recipientMode === "single" &&
      messageType !== "custom" &&
      selectedCustomerId
    ) {
      const template = templates.find((t) => t.id.toString() === messageType);
      if (template) {
        setMessageContent(
          applyPlaceholders(template.content, selectedCustomerId),
        );
      }
    }
  }, [recipientMode, messageType, selectedCustomerId, templates]);

  const getGroupCount = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (selectedGroup === "custom_selection") return selectedCustomerIds.length;

    if (selectedGroup === "all") return customers.length;

    if (selectedGroup === "today") {
      const todayStr = now.toLocaleDateString();
      return customers.filter(
        (c) => new Date(c.created_at).toLocaleDateString() === todayStr,
      ).length;
    }

    if (selectedGroup === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return customers.filter((c) => new Date(c.created_at) >= weekAgo).length;
    }

    if (selectedGroup === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return customers.filter((c) => new Date(c.created_at) >= monthStart)
        .length;
    }

    if (selectedGroup === "year") {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return customers.filter((c) => new Date(c.created_at) >= yearStart)
        .length;
    }

    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: Must select a template (not "custom")
    if (messageType === "custom") {
      setError("Please select an SMS template before sending.");
      return;
    }

    // Validation: Must select a recipient
    if (recipientMode === "single" && !selectedCustomerId) {
      setError("Please select a customer.");
      return;
    }

    if (recipientMode === "group" && selectedGroup === "custom_selection" && selectedCustomerIds.length < 2) {
      setError("Please select at least two customers.");
      return;
    }

    // Validation: Must select a schedule date
    if (!scheduledTime) {
      setError("Please select a schedule date and time.");
      return;
    }

    // Validation: Date cannot be in the past
    const selectedDate = new Date(scheduledTime);
    const now = new Date();
    now.setSeconds(0, 0); // Allow scheduling for the current minute

    if (selectedDate < now) {
      setError("Schedule date and time must be in the future or present.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const isBulk = recipientMode === "group";
      const endpoint = isBulk
        ? `${API_BASE_URL}/sms/send-bulk`
        : `${API_BASE_URL}/sms/send`;

      const payload = isBulk
        ? {
          filter_type: selectedGroup,
          message_content: messageContent,
          message_type: messageType === "custom" ? "bulk_promo" : messageType,
          scheduled_for: new Date(scheduledTime).toISOString(),
          customer_ids: selectedGroup === "custom_selection" ? selectedCustomerIds : undefined,
        }
        : {
          customer_id: selectedCustomerId,
          message_content: messageContent,
          message_type: messageType === "custom" ? "adhoc" : messageType,
          scheduled_for: new Date(scheduledTime).toISOString(),
        };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to process SMS request");
      }

      onSuccess();
      onClose();
      // Reset form
      setSelectedCustomerId(null);
      setMessageContent("");
      setMessageType("custom");
      setRecipientMode("single");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-gray-100 transform transition-all animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Send New Message</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {error && (
            <div className="md:col-span-2 flex items-start space-x-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Left Column: Recipient Selection */}
          <div className="space-y-4 border-r border-gray-100 pr-0 md:pr-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 px-1">
              1. Recipient Selection
            </h3>

            <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setRecipientMode("single")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${recipientMode === "single"
                    ? "bg-white shadow text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                Single Customer
              </button>
              <button
                type="button"
                onClick={() => setRecipientMode("group")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${recipientMode === "group"
                    ? "bg-white shadow text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                Customer Group
              </button>
            </div>

            {recipientMode === "single" ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search name or phone..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <Calendar
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <select
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <option value="">Filter by Reg. Date (All)</option>
                    {availableDates.map((date) => (
                      <option key={date} value={date}>
                        {date}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="h-48 overflow-y-auto border border-gray-100 rounded-xl bg-gray-50/50">
                  {isFetching ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-2">
                      <Loader2
                        className="animate-spin text-blue-500"
                        size={24}
                      />
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 italic text-sm">
                      No customers found.
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleCustomerSelect(customer.id)}
                        className={`w-full text-left p-3 border-b border-gray-50 last:border-none transition-colors flex items-center space-x-3 ${selectedCustomerId === customer.id
                            ? "bg-blue-50 border-l-4 border-l-blue-600"
                            : "hover:bg-gray-100"
                          }`}
                      >
                        <div
                          className={`p-2 rounded-full ${selectedCustomerId === customer.id ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-500"}`}
                        >
                          <User size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">
                            {customer.full_name}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {customer.phone_number}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                    Select Target Group
                  </label>
                  <select
                    className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-blue-900"
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                  >
                    <option value="today">Registered Today</option>
                    <option value="week">Registered This Week</option>
                    <option value="month">Registered This Month</option>
                    <option value="year">Registered This Year</option>
                    <option value="all">All Customers</option>
                    <option value="custom_selection">Custom Selection</option>
                  </select>
                </div>

                {selectedGroup === "custom_selection" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search name or phone..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="h-48 overflow-y-auto border border-gray-100 rounded-xl bg-gray-50/50 p-2 space-y-1">
                      {isFetching ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-2">
                          <Loader2 className="animate-spin text-blue-500" size={24} />
                        </div>
                      ) : filteredCustomers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 italic text-sm">
                          No customers found.
                        </div>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <label key={customer.id} className="flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedCustomerIds.includes(customer.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCustomerIds(prev => [...prev, customer.id]);
                                } else {
                                  setSelectedCustomerIds(prev => prev.filter(id => id !== customer.id));
                                }
                              }}
                            />
                            <div>
                              <p className="text-xs font-bold text-gray-900">{customer.full_name}</p>
                              <p className="text-[10px] text-gray-500">{customer.phone_number}</p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-tighter">
                      Recipient Count
                    </span>
                    <span className="text-2xl font-black text-blue-600">
                      {getGroupCount()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block font-bold">
                      MODE
                    </span>
                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded-md font-black uppercase">
                      Bulk Blast
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Message & Schedule */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 px-1">
              2. Message Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Template / Type
                </label>
                <div className="relative">
                  <MessageSquare
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <select
                    required
                    className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none ${messageType === "custom"
                        ? "border-amber-200 ring-1 ring-amber-100"
                        : "border-gray-200"
                      }`}
                    value={messageType}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                  >
                    <option value="custom">
                      Select Template (Required)...
                    </option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id.toString()}>
                        {t.template_type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Message Content
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  placeholder="Type your message here..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                />
                <p className="text-[10px] text-right text-gray-400 mt-1">
                  {messageContent.length} characters
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                  <Calendar size={14} className="text-blue-500" />
                  Schedule Date & Time
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={18}
                  />
                  <input
                    required
                    type="datetime-local"
                    className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium cursor-pointer ${!scheduledTime ? "border-amber-200" : "border-gray-200"
                      }`}
                    value={scheduledTime}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    (recipientMode === "single" && !selectedCustomerId) ||
                    (recipientMode === "group" && getGroupCount() === 0)
                  }
                  className="w-full flex items-center justify-center p-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Scheduling...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendSMSModal;
