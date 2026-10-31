import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import ReelMark from '../../components/ReelMark';

export default function OthersDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-white border-b border-gray-200 px-6 sm:px-8 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <ReelMark size={24} />
          <span className="font-bold text-gray-900 text-sm" style={{ fontFamily: 'var(--font-family-display)' }}>
            Rainbow Packages
          </span>
          <span className="text-gray-300">/</span>
          <span className="text-xs font-semibold text-gray-500">Other Modules</span>
        </div>

        <button
          onClick={() => navigate('/modules')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>Switch Module</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-xs">
            <LayoutGrid size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            Other Modules & Categories
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            This module space is reserved for future packaging categories and workflows. Additional inventory domains can be integrated here in future updates.
          </p>
          <div className="pt-3">
            <button
              onClick={() => navigate('/modules')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-700 shadow-xs transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Module Selection</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

