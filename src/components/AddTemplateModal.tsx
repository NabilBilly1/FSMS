import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import { X, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface AddTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onUnauthorized: () => void;
}

const AddTemplateModal: React.FC<AddTemplateModalProps> = ({ isOpen, onClose, onSuccess, onUnauthorized }) => {
  const [templateType, setTemplateType] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet',
    'link'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          template_type: templateType,
          content: content,
        }),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to create template");
      }

      onSuccess();
      onClose();
      setTemplateType('');
      setContent('');
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <MessageSquare size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Add SMS Template</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
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

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Template Type / Label</label>
            <input
              required
              type="text"
              placeholder="e.g. Promotion, Reminder, Welcome"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Message Content</label>
            <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 mb-2">
              <p className="text-[10px] text-blue-600 leading-tight">
                <strong>Tip:</strong> Use <code>{'{name}'}</code> for Customer Name and <code>{'{branch}'}</code> for Branch Name.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <ReactQuill
                theme="snow"
                modules={quillModules}
                formats={quillFormats}
                value={content}
                onChange={setContent}
                placeholder="Hi {name}, thank you for shopping at {branch}..."
                className="h-48 mb-12"
              />
            </div>
            <p className="text-[10px] text-right text-gray-400 mt-1">Rich Content Enabled</p>
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
                padding: 8px !important;
              }
              .ql-container {
                border: none !important;
                font-family: inherit !important;
                font-size: 0.875rem !important;
              }
              .ql-editor {
                min-height: 150px !important;
                padding: 12px !important;
              }
              .ql-editor.ql-blank::before {
                font-style: normal !important;
                color: #9ca3af !important;
                left: 12px !important;
              }
            `}</style>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center p-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                Creating Template...
              </>
            ) : (
              'Save Template'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTemplateModal;
