import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import { X, User, Phone, Mail, Loader2, AlertCircle } from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onUnauthorized: () => void;
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, onSuccess, onUnauthorized }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatPhoneNumber = (phone: string): string | null => {
    if (!phone) return null;
    const raw = phone.trim();
    const hasPlus = raw.startsWith("+");
    const digits = raw.replace(/\D/g, "");
    if (!digits) return null;

    // Official Ghana 10-digit prefixes: 020, 023, 024, 025, 026, 027, 028, 050, 053, 054, 055, 056, 057, 059, 030-039
    const ghanaLocalRegex = /^0(2[0345678]|5[0345679]|3[0-9])\d{7}$/;
    const ghanaE164Regex = /^\+233(2[0345678]|5[0345679]|3[0-9])\d{7}$/;
    const foreignE164Regex = /^\+(?!233)[1-9]\d{7,14}$/;

    // 1. Explicit + country code
    if (hasPlus) {
      const candidate = "+" + digits;
      if (candidate.startsWith("+233")) {
        return ghanaE164Regex.test(candidate) ? candidate : null;
      }
      return foreignE164Regex.test(candidate) ? candidate : null;
    }

    // 2. 00 international prefix
    if (raw.startsWith("00") && digits.length > 4) {
      const candidate = "+" + digits.slice(2);
      if (candidate.startsWith("+233")) {
        return ghanaE164Regex.test(candidate) ? candidate : null;
      }
      return foreignE164Regex.test(candidate) ? candidate : null;
    }

    // 3. Local Ghana number: MUST be strictly 10 digits starting with 0 and an official Ghana prefix
    if (digits.startsWith("0")) {
      return ghanaLocalRegex.test(digits) ? "+233" + digits.slice(1) : null;
    }

    // 4. Ghana with 233 prefix (12 digits total corresponding to 10-digit official Ghana number)
    if (digits.startsWith("233")) {
      const candidate = "+" + digits;
      return ghanaE164Regex.test(candidate) ? candidate : null;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formattedPhone = formatPhoneNumber(formData.phone_number);
    if (!formattedPhone) {
      setError(
        "Please enter a valid 10-digit official Ghana number (e.g. 024XXXXXXX, 055XXXXXXX, 020XXXXXXX) or a foreign number with '+' country code (e.g. +234..., +1..., +44...)."
      );
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('token');

    const payload = {
      full_name: formData.full_name,
      phone_number: formattedPhone,
      email: formData.email.trim() === '' ? null : formData.email,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      // Handle session expiry
      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = 'Failed to add customer.';
        if (data && data.detail) {
          if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map((err: any) => `${err.msg}`).join(', ');
          }
        }
        throw new Error(errorMessage);
      }

      onSuccess();
      setFormData({ full_name: '', phone_number: '', email: '' });
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      console.error("Add customer error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Add New Customer</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  required
                  type="text"
                  placeholder="e.g. John Doe"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-700">Phone Number</label>
                <span className="text-[11px] text-gray-400">Ghana (024...) or Foreign (+234...)</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Phone size={18} />
                </div>
                <input
                  required
                  type="tel"
                  placeholder="e.g. 024 123 4567 or +234 803 123 4567"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  placeholder="e.g. john@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Saving...
                </>
              ) : (
                'Add Customer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCustomerModal;
