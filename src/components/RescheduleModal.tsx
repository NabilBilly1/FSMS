import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import { X, Calendar, Clock, Loader2, AlertCircle, Save } from 'lucide-react';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onUnauthorized: () => void;
  pendingItem: {
    type: 'sms' | 'email';
    recipient: string;
    content: string;
    count: number;
    ids: number[];
  } | null;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onUnauthorized,
  pendingItem,
}) => {
  const [newDate, setNewDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !pendingItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newDate) {
      setError("Please select a new date and time.");
      return;
    }

    const selectedDate = new Date(newDate);
    const now = new Date();
    now.setSeconds(0, 0); // Allow scheduling for the current minute
    
    if (selectedDate < now) {
      setError("New schedule time must be in the future or present.");
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        sms_ids: pendingItem.type === 'sms' ? pendingItem.ids : [],
        email_ids: pendingItem.type === 'email' ? pendingItem.ids : [],
        new_schedule: selectedDate.toISOString(),
      };

      const response = await fetch(`${API_BASE_URL}/messages/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to reschedule messages.");
      }

      onSuccess();
      onClose();
      setNewDate('');
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Reschedule Message</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                {pendingItem.type} • {pendingItem.count} {pendingItem.count === 1 ? 'Recipient' : 'Recipients'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
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

          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50 space-y-2">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-1">Target</span>
            <p className="text-sm font-bold text-gray-700 px-1 truncate">
              {pendingItem.recipient}
            </p>
            <p className="text-xs text-gray-500 px-1 italic line-clamp-2 leading-relaxed">
              "{pendingItem.content}"
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 flex items-center gap-1">
              <Calendar size={14} className="text-blue-500" />
              New Schedule Date & Time
            </label>
            <div className="relative">
              <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                required
                type="datetime-local"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium cursor-pointer"
                value={newDate}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setNewDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
              />
            </div>
          </div>

          <div className="pt-4 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] flex items-center justify-center px-4 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2" size={18} />
                  Save New Time
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RescheduleModal;
