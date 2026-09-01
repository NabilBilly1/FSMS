import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, Store, Loader2, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface Branch {
  name: string;
  branch_code: string;
}

const LoginPage: React.FC = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Format slug for display (e.g. "classhouse" -> "Classhouse")
  const companyNameDisplay = companySlug
    ? companySlug.charAt(0).toUpperCase() + companySlug.slice(1)
    : 'System';

  useEffect(() => {
    const fetchBranches = async () => {
      if (!companySlug) return;

      setIsPageLoading(true);
      setPageError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/admin/public/companies/${companySlug}/branches`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Company not found');
        }
        const data = await response.json();
        setBranches(data);
      } catch (err: any) {
        setPageError(err.message || 'Could not load company branches.');
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchBranches();
  }, [companySlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || pin.length !== 4) {
      setError('Please select a branch and enter a 4-digit PIN.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_slug: companySlug,
          branch_code: selectedBranch,
          pin: pin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid login credentials. Please try again.');
      }

      // Store JWT and branch info
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('branchId', data.branch_id.toString());
      localStorage.setItem('branchName', data.branch_name);
      localStorage.setItem('companySlug', companySlug || '');

      navigate(`/${companySlug}/dashboard`);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
        <p className="text-gray-400 animate-pulse">Initializing {companyNameDisplay} Portal...</p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-900 border border-red-500/30 p-8 rounded-2xl max-w-md text-center shadow-2xl">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-6">{pageError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#282828]">
      {/* Left side: Login Form */}
      <div className="w-full lg:w-[450px] flex flex-col justify-center px-10 py-12 bg-[#060913] relative z-10 shrink-0 border-r border-black/20">

        <div className="w-full max-w-[360px] mx-auto">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
              {companyNameDisplay === 'Classhouse' ? 'Class House' : companyNameDisplay} <span className="text-blue-500">SMS System</span>
            </h1>
            <p className="text-gray-400 mt-1.5 text-sm">Branch Portal Login</p>
          </div>

          <div className="bg-[#121624] border border-white/5 rounded-2xl p-6 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Branch Selection */}
              <div>
                <label className="block text-[13px] font-medium text-gray-200 mb-2">
                  Select Branch
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-400 transition-colors">
                    <Store size={16} />
                  </div>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 bg-[#1F2533] border border-transparent rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-[#1F2533] transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="bg-[#1F2533]">Select your branch</option>
                    {branches.map((b) => (
                      <option key={b.branch_code} value={b.branch_code} className="bg-[#1F2533]">
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PIN Input */}
              <div>
                <label className="block text-[13px] font-medium text-gray-200 mb-2">
                  Access Code (PIN)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-400 transition-colors">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter 4-digit PIN"
                    className="block w-full pl-10 pr-4 py-2.5 bg-[#1F2533] border border-transparent rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-[#1F2533] transition-all tracking-widest font-mono"
                  />
                </div>
              </div>

              {/* Error Feedback */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center py-2.5 mt-2 bg-[#1d4ed8] hover:bg-[#2563eb] text-white text-sm font-semibold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : (
                  'Login'
                )}
              </button>
            </form>
          </div>

          <p className="text-left text-gray-500 text-[12px] mt-12 pl-2">
            &copy; {new Date().getFullYear()} {companyNameDisplay === 'Classhouse' ? 'Classhouse' : companyNameDisplay} Electronics. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side: Blank background */}
      <div className="hidden lg:block flex-1 bg-[#242424]" />
    </div>
  );
};

export default LoginPage;
