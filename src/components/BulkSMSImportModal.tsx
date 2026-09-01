import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import { stripHtml } from "../utils/helpers";
import {
  X,
  Upload,
  Calendar,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface BulkSMSImportModalProps {
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

const BulkSMSImportModal: React.FC<BulkSMSImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onUnauthorized,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [messageType, setMessageType] = useState("custom");
  const [messageContent, setMessageContent] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
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

  const handleTemplateChange = (val: string) => {
    setMessageType(val);
    if (val === "custom") {
      setMessageContent("");
    } else {
      const template = templates.find((t) => t.id.toString() === val);
      if (template) {
        // Strip HTML tags and replace branch name helper
        let newContent = stripHtml(template.content);
        const branchName = localStorage.getItem("branchName") || "Class House";
        newContent = newContent.replace(/{branch}/g, branchName);
        setMessageContent(newContent);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: Must select template (not custom)
    if (messageType === "custom") {
      setError("Please select an SMS template before sending.");
      return;
    }

    // Validation: Must select file
    if (!file) {
      setError("Please upload a CSV or Excel file containing recipient numbers.");
      return;
    }

    // Validation: Must select schedule time
    if (!scheduledTime) {
      setError("Please select a schedule date and time.");
      return;
    }

    // Validation: Date cannot be in past
    const selectedDate = new Date(scheduledTime);
    const now = new Date();
    now.setSeconds(0, 0);

    if (selectedDate < now) {
      setError("Schedule date and time must be in the future or present.");
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append("message_content", messageContent);
    formData.append("scheduled_for", new Date(scheduledTime).toISOString());
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/sms/bulk-import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to process bulk import request");
      }

      onSuccess();
      onClose();
      // Reset state
      setFile(null);
      setMessageContent("");
      setMessageType("custom");
      setScheduledTime("");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during bulk import");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-gray-100 transform transition-all animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk SMS Import</h2>
            <p className="text-gray-500 text-xs mt-0.5">Send mass messages via Excel or CSV list</p>
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
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* File Upload Zone */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Recipients File (.csv, .xlsx, .xls)</label>
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                file ? "border-blue-500/40 bg-blue-500/[0.02]" : "border-gray-200 hover:border-gray-300 bg-gray-50/50"
              }`}
            >
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required
              />
              <div className={`p-3 rounded-full mb-3 ${file ? "bg-blue-100 text-blue-600" : "bg-gray-200/50 text-gray-400"}`}>
                <Upload size={24} />
              </div>
              {file ? (
                <div className="text-center">
                  <p className="text-gray-900 text-sm font-bold">{file.name}</p>
                  <p className="text-gray-500 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB • Click to change</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-500 text-sm font-medium">Click or drag file to upload</p>
                  <p className="text-gray-400 text-[10px] mt-1.5 uppercase tracking-widest font-bold">CSV or Excel (Max 5MB)</p>
                </div>
              )}
            </div>
            <div className="flex items-start gap-1.5 mt-2 px-1 text-gray-500">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <p className="text-[10px] leading-snug">
                First column must contain **Phone Number** (duplication will be auto-removed). Second column is optionally for **Name**.
              </p>
            </div>
          </div>

          {/* Template Select */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
              Template / Type
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                required
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none ${
                  messageType === "custom" ? "border-amber-200 ring-1 ring-amber-100" : "border-gray-200"
                }`}
                value={messageType}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                <option value="custom">Select Template (Required)...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id.toString()}>
                    {t.template_type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Message Content */}
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Message Content</label>
              <span className="text-[10px] text-gray-400 font-mono">{messageContent.length} characters</span>
            </div>
            <textarea
              required
              rows={4}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              placeholder="Select a template above to generate content..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Use **{'{name}'}** for personalization and **{'{branch}'}** for the branch name.
            </p>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <Calendar size={14} className="text-blue-500" />
              Schedule Date & Time
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              <input
                required
                type="datetime-local"
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium cursor-pointer ${
                  !scheduledTime ? "border-amber-200" : "border-gray-200"
                }`}
                value={scheduledTime}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setScheduledTime(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !file || messageType === "custom"}
              className="w-full flex items-center justify-center p-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Processing Import...
                </>
              ) : (
                "Launch Campaign"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkSMSImportModal;
