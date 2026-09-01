import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import {
  X,
  Mail,
  Filter,
  Send,
  Loader2,
  AlertCircle,
  Users,
  Calendar,
} from "lucide-react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

interface Customer {
  id: number;
  full_name: string;
  phone_number: string;
  email: string | null;
}

interface Template {
  id: number;
  template_type: string;
  content: string;
}

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onUnauthorized: () => void;
}

const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onUnauthorized,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [recipientMode, setRecipientMode] = useState<"single" | "group">(
    "single",
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");

  const [subject, setSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      fetchTemplates();
    }
  }, [isOpen]);

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
        // Only show customers with emails for the 'single' dropdown
        setCustomers(customerList);
        setFilteredCustomers(
          customerList.filter((c: Customer) => c.email !== null),
        );
      }
    } catch (err) {
      setError("Failed to load customers.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id.toString() === templateId);
    if (template) {
      setMessageContent(template.content);
      // Pre-fill personalization if single customer is selected
      if (recipientMode === "single" && selectedCustomerId) {
        const customer = customers.find(
          (c) => c.id.toString() === selectedCustomerId,
        );
        if (customer) {
          const personalized = template.content.replace(
            "{name}",
            customer.full_name,
          );
          setMessageContent(personalized);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: Must select a template
    if (!selectedTemplateId) {
      setError("Please select an email template before sending.");
      return;
    }

    // Validation: Must select a schedule date
    if (!scheduledFor) {
      setError("Please select a schedule date and time.");
      return;
    }

    // Validation: Date cannot be in the past
    const selectedDate = new Date(scheduledFor);
    const now = new Date();
    now.setSeconds(0, 0); // Allow scheduling for the current minute

    if (selectedDate < now) {
      setError("Schedule date and time must be in the future or present.");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const isBulk = recipientMode === "group";
      const endpoint = isBulk
        ? `${API_BASE_URL}/email/send-bulk`
        : `${API_BASE_URL}/email/send`;

      const payload = isBulk
        ? {
          filter_type: filterType,
          subject,
          message_content: messageContent,
          scheduled_for: scheduledFor
            ? new Date(scheduledFor).toISOString()
            : null,
        }
        : {
          recipient_email: customers.find(
            (c) => c.id.toString() === selectedCustomerId,
          )?.email,
          subject,
          message_content: messageContent,
          scheduled_for: scheduledFor
            ? new Date(scheduledFor).toISOString()
            : new Date().toISOString(),
        };

      if (!isBulk && !payload.recipient_email) {
        throw new Error("Selected customer does not have an email address.");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) return onUnauthorized();

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to send email");

      onSuccess();
      onClose();
      // Reset
      setSubject("");
      setMessageContent("");
      setSelectedTemplateId("");
      setScheduledFor("");
      setRecipientMode("single");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [
        { list: "ordered" },
        { list: "bullet" },
        { indent: "-1" },
        { indent: "+1" },
      ],
      ["link", "clean"],
    ],
  };

  const quillFormats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "bullet",
    "indent",
    "link",
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-y-auto max-h-[90vh] transform transition-all animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Mail size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Send Email Campaign
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Recipient Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-50">
            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
                Recipient Mode
              </label>
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRecipientMode("single")}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-bold rounded-lg transition-all ${recipientMode === "single"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  <Users size={16} />
                  <span>Single</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode("group")}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-bold rounded-lg transition-all ${recipientMode === "group"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  <Filter size={16} />
                  <span>Group</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {recipientMode === "single" ? (
                <>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
                    Select Customer
                  </label>
                  <div className="relative">
                    <select
                      required
                      disabled={filteredCustomers.length === 0}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all appearance-none"
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                      <option value="">
                        {filteredCustomers.length === 0
                          ? "No customers with emails..."
                          : "Choose a customer..."}
                      </option>
                      {filteredCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name} ({c.email})
                        </option>
                      ))}
                    </select>
                    {filteredCustomers.length === 0 && customers.length > 0 && (
                      <p className="text-[10px] text-amber-500 mt-1 font-medium px-1 italic">
                        * You have customers, but none of them have email
                        addresses.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
                    Customer Filter
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Customers</option>
                    <option value="today">Registered Today</option>
                    <option value="week">Past 7 Days</option>
                    <option value="month">Current Month</option>
                  </select>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
                Message Content
              </label>
              <select
                required
                className={`text-[10px] font-bold px-2 py-1 rounded-lg border-none transition-colors cursor-pointer outline-none ${!selectedTemplateId
                    ? "bg-amber-50 text-amber-600 ring-1 ring-amber-200"
                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                  }`}
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                <option value="">Select Template (Required)...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id.toString()}>
                    {t.template_type}
                  </option>
                ))}
              </select>
            </div>

            <input
              required
              type="text"
              placeholder="Email Subject"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
              <ReactQuill
                theme="snow"
                modules={quillModules}
                formats={quillFormats}
                value={messageContent}
                onChange={setMessageContent}
                placeholder="Compose your professional email here... Use {name} for personalization."
                className="h-64 mb-12"
              />
            </div>
            <style>{`
              .quill {
                border: none !important;
              }
              .ql-toolbar {
                border-top: none !important;
                border-left: none !important;
                border-right: none !important;
                border-bottom: 1px solid #f3f4f6 !important;
                background: #f9fafb !important;
                padding: 12px !important;
              }
              .ql-container {
                border: none !important;
                font-family: inherit !important;
                font-size: 0.875rem !important;
              }
              .ql-editor {
                min-height: 200px !important;
                padding: 16px !important;
              }
              .ql-editor.ql-blank::before {
                font-style: normal !important;
                color: #9ca3af !important;
                left: 16px !important;
              }
            `}</style>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 flex items-center space-x-1">
                <Calendar size={14} className="text-indigo-500" />
                <span>Schedule (Optional)</span>
              </label>
              <div className="relative">
                <Calendar
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  required
                  type="datetime-local"
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium cursor-pointer ${!scheduledFor ? "border-amber-200" : "border-gray-200"
                    }`}
                  value={scheduledFor}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border border-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isFetching}
              className="flex-[2] flex items-center justify-center px-6 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={22} />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={20} className="mr-2" />
                  Dispatch Email
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendEmailModal;
