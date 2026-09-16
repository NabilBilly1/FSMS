import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import {
  X,
  Folder,
  FolderPlus,
  Users,
  Search,
  Plus,
  Trash2,
  Pencil,
  Send,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  UserCheck,
  UserMinus,
} from "lucide-react";

interface Customer {
  id: number;
  full_name: string;
  phone_number: string;
  email: string | null;
}

interface FolderCustomer {
  id: number;
  full_name: string;
  phone_number: string;
  email: string | null;
}

export interface ContactFolder {
  id: number;
  branch_id: number;
  name: string;
  description: string | null;
  created_at: string;
  total_contacts: number;
  customers: FolderCustomer[];
}

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnauthorized: () => void;
  onSendSMSWithFolder?: (folder: ContactFolder) => void;
  onSendEmailWithFolder?: (folder: ContactFolder) => void;
}

const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onUnauthorized,
  onSendSMSWithFolder,
  onSendEmailWithFolder,
}) => {
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [folders, setFolders] = useState<ContactFolder[]>([]);
  const [branchCustomers, setBranchCustomers] = useState<Customer[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search states
  const [folderSearch, setFolderSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  // Create / Edit Form states
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);

  // Expanded folders in list view
  const [expandedFolderId, setExpandedFolderId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
      fetchBranchCustomers();
      setViewMode("list");
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const fetchFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/folders/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return onUnauthorized();
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || "Failed to load folders.");
      }
    } catch (err: any) {
      console.error("Fetch folders error:", err);
      setError("Network error loading folders.");
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const fetchBranchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/customers?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return onUnauthorized();
      if (res.ok) {
        const data = await res.json();
        setBranchCustomers(data.items || []);
      }
    } catch (err) {
      console.error("Fetch customers error:", err);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleOpenCreateForm = () => {
    setEditingFolderId(null);
    setFolderName("");
    setFolderDescription("");
    setSelectedCustomerIds([]);
    setCustomerSearch("");
    setError(null);
    setSuccessMessage(null);
    setViewMode("form");
  };

  const handleOpenEditForm = (f: ContactFolder) => {
    setEditingFolderId(f.id);
    setFolderName(f.name);
    setFolderDescription(f.description || "");
    setSelectedCustomerIds(f.customers.map((c) => c.id));
    setCustomerSearch("");
    setError(null);
    setSuccessMessage(null);
    setViewMode("form");
  };

  const handleToggleCustomer = (customerId: number) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredCustomers.map((c) => c.id);
    const allSelected = filteredIds.every((id) =>
      selectedCustomerIds.includes(id)
    );

    if (allSelected) {
      // Unselect filtered
      setSelectedCustomerIds((prev) =>
        prev.filter((id) => !filteredIds.includes(id))
      );
    } else {
      // Add all filtered
      setSelectedCustomerIds((prev) => [
        ...prev,
        ...filteredIds.filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError("Please enter a folder name.");
      return;
    }
    if (selectedCustomerIds.length < 2) {
      setError("Please select at least 2 contacts for this folder.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const token = localStorage.getItem("token");

    try {
      const payload = {
        name: folderName.trim(),
        description: folderDescription.trim() || null,
        customer_ids: selectedCustomerIds,
      };

      const url = editingFolderId
        ? `${API_BASE_URL}/folders/${editingFolderId}`
        : `${API_BASE_URL}/folders/`;

      const method = editingFolderId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) return onUnauthorized();

      if (res.ok) {
        setSuccessMessage(
          editingFolderId
            ? "Folder updated successfully!"
            : "Folder created successfully!"
        );
        fetchFolders();
        setTimeout(() => {
          setViewMode("list");
          setSuccessMessage(null);
        }, 800);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Failed to save folder.");
      }
    } catch (err: any) {
      console.error("Save folder error:", err);
      setError("Network error while saving folder.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFolder = async (folderId: number, folderName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the folder "${folderName}"? (Contacts will remain in your branch database).`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return onUnauthorized();
      if (res.ok) {
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        if (expandedFolderId === folderId) setExpandedFolderId(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "Failed to delete folder.");
      }
    } catch (err) {
      console.error("Delete folder error:", err);
      alert("Error deleting folder.");
    }
  };

  const handleRemoveContactFromFolder = async (
    folderId: number,
    customerId: number
  ) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE_URL}/folders/${folderId}/contacts/${customerId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.status === 401) return onUnauthorized();
      if (res.ok) {
        const updated = await res.json();
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? updated : f))
        );
      }
    } catch (err) {
      console.error("Remove contact error:", err);
    }
  };

  if (!isOpen) return null;

  const filteredFolders = folders.filter(
    (f) =>
      f.name.toLowerCase().includes(folderSearch.toLowerCase()) ||
      (f.description &&
        f.description.toLowerCase().includes(folderSearch.toLowerCase()))
  );

  const filteredCustomers = branchCustomers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone_number.includes(customerSearch) ||
      (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-violet-600/10 text-violet-600 rounded-2xl">
              <Folder size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Contact Folders & Groups
              </h2>
              <p className="text-xs font-medium text-gray-500">
                Organize branch customers into custom folders for targeted bulk messaging.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-600 text-sm">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center space-x-3 text-green-600 text-sm">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {viewMode === "list" ? (
            <div className="space-y-6">
              {/* Top Controls: Search & Create Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search folders by name..."
                    value={folderSearch}
                    onChange={(e) => setFolderSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                  />
                </div>
                <button
                  onClick={handleOpenCreateForm}
                  className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-all shadow-sm"
                >
                  <FolderPlus size={18} />
                  <span>Create Folder</span>
                </button>
              </div>

              {/* Folders List */}
              {isLoadingFolders ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 space-y-3">
                  <Loader2 className="animate-spin text-violet-600" size={32} />
                  <p className="text-sm font-medium">Loading folders...</p>
                </div>
              ) : filteredFolders.length === 0 ? (
                <div className="text-center py-16 bg-gray-50/70 border border-dashed border-gray-200 rounded-2xl p-8">
                  <Folder
                    size={48}
                    className="mx-auto text-gray-300 mb-3 stroke-1"
                  />
                  <h3 className="text-base font-bold text-gray-800">
                    {folderSearch ? "No matching folders found" : "No folders created yet"}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
                    Create contact folders (e.g. "VIP Customers", "Wholesale Clients") to easily group contacts and send bulk SMS/Email campaigns.
                  </p>
                  <button
                    onClick={handleOpenCreateForm}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold hover:bg-violet-700 transition-all"
                  >
                    <Plus size={16} />
                    <span>Create Your First Folder</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFolders.map((f) => {
                    const isExpanded = expandedFolderId === f.id;
                    return (
                      <div
                        key={f.id}
                        className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-gray-200 transition-all overflow-hidden"
                      >
                        {/* Folder Main Row */}
                        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="p-3 bg-violet-50 text-violet-600 rounded-xl mt-0.5">
                              <Folder size={22} />
                            </div>
                            <div>
                              <div className="flex items-center space-x-3">
                                <h4 className="text-base font-bold text-gray-900">
                                  {f.name}
                                </h4>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                                  <Users size={12} className="mr-1" />
                                  {f.total_contacts} contacts
                                </span>
                              </div>
                              {f.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                  {f.description}
                                </p>
                              )}
                              <p className="text-[11px] text-gray-400 mt-1">
                                Created {new Date(f.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {/* Quick Actions for Folder */}
                          <div className="flex items-center space-x-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                            {onSendSMSWithFolder && (
                              <button
                                onClick={() => onSendSMSWithFolder(f)}
                                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                                title="Send SMS to this folder"
                              >
                                <Send size={14} />
                                <span>Send SMS</span>
                              </button>
                            )}
                            {onSendEmailWithFolder && (
                              <button
                                onClick={() => onSendEmailWithFolder(f)}
                                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors"
                                title="Send Email to this folder"
                              >
                                <Mail size={14} />
                                <span>Send Email</span>
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setExpandedFolderId(isExpanded ? null : f.id)
                              }
                              className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                                isExpanded
                                  ? "bg-gray-200 text-gray-800"
                                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                              }`}
                              title={isExpanded ? "Hide Contacts" : "View Contacts"}
                            >
                              {isExpanded ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenEditForm(f)}
                              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit Folder & Members"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteFolder(f.id, f.name)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Folder"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Contact List for Folder */}
                        {isExpanded && (
                          <div className="bg-gray-50/80 border-t border-gray-100 p-4 animate-fadeIn">
                            <div className="flex items-center justify-between mb-3 px-1">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Contacts in this folder ({f.customers.length})
                              </h5>
                              <button
                                onClick={() => handleOpenEditForm(f)}
                                className="text-xs font-semibold text-violet-600 hover:text-violet-700"
                              >
                                + Add / Manage Contacts
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                              {f.customers.map((c) => (
                                <div
                                  key={c.id}
                                  className="bg-white border border-gray-200/70 p-2.5 rounded-xl flex items-center justify-between text-xs"
                                >
                                  <div className="min-w-0 flex-1 pr-2">
                                    <p className="font-semibold text-gray-900 truncate">
                                      {c.full_name}
                                    </p>
                                    <p className="text-[11px] text-gray-500">
                                      {c.phone_number}
                                    </p>
                                    {c.email && (
                                      <p className="text-[10px] text-gray-400 truncate">
                                        {c.email}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleRemoveContactFromFolder(f.id, c.id)
                                    }
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Remove from folder"
                                  >
                                    <UserMinus size={14} />
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
              )}
            </div>
          ) : (
            /* Create / Edit Form View */
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingFolderId ? "Edit Folder & Members" : "Create New Contact Folder"}
                </h3>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  &larr; Back to Folders List
                </button>
              </div>

              {/* Folder Info Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Folder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIP Customers, Weekend Regulars"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Description <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. High-value clients for special promotions"
                    value={folderDescription}
                    onChange={(e) => setFolderDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Contact Selection Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                      Select Branch Contacts <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-gray-500">
                      Select 2 or more contacts from your branch list to group into this folder.
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        selectedCustomerIds.length >= 2
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      <UserCheck size={13} className="mr-1" />
                      Selected: {selectedCustomerIds.length} contact(s)
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-xs font-semibold text-violet-600 hover:text-violet-700"
                    >
                      {filteredCustomers.every((c) =>
                        selectedCustomerIds.includes(c.id)
                      )
                        ? "Deselect Filtered"
                        : "Select All Filtered"}
                    </button>
                  </div>
                </div>

                {/* Filter / Search contacts */}
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search contacts by name, phone, or email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                  />
                </div>

                {/* Contacts List Box */}
                {isLoadingCustomers ? (
                  <div className="flex items-center justify-center py-10 text-gray-400 space-x-2">
                    <Loader2 className="animate-spin text-violet-600" size={20} />
                    <span className="text-xs">Loading branch contacts...</span>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl text-xs text-gray-500">
                    No contacts found matching your search.
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-2xl max-h-64 overflow-y-auto divide-y divide-gray-100 bg-white">
                    {filteredCustomers.map((c) => {
                      const isSelected = selectedCustomerIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center justify-between p-3 cursor-pointer hover:bg-violet-50/40 transition-colors ${
                            isSelected ? "bg-violet-50/60" : ""
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCustomer(c.id)}
                              className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">
                                {c.full_name}
                              </p>
                              <div className="flex items-center space-x-2 text-[11px] text-gray-500">
                                <span>{c.phone_number}</span>
                                {c.email && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="truncate text-gray-400">
                                      {c.email}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              isSelected
                                ? "text-violet-700 bg-violet-100"
                                : "text-gray-400"
                            }`}
                          >
                            {isSelected ? "Selected" : "Add"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className="px-5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !folderName.trim() ||
                    selectedCustomerIds.length < 2
                  }
                  className="flex items-center space-x-2 px-6 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Folder...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>
                        {editingFolderId ? "Update Folder" : "Create Folder"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FolderModal;
