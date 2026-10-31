import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, ArrowLeft, RefreshCw, Layers } from 'lucide-react';

export default function UpdateSheetPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-xs">
            <Scale size={24} />
          </div>
          <div>
            <h1
              className="text-2xl font-black text-gray-900 tracking-tight"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              Update Sheet Stock & Usage
            </h1>
            <p className="text-sm text-gray-500">
              Record sheet consumption, die-cutting yield adjustments, and trim loss
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/sheets/inventory')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Sheet Inventory</span>
        </button>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xs max-w-2xl text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
          <RefreshCw size={24} />
        </div>
        <h3 className="text-base font-bold text-gray-900">
          Sheet Consumption & Cutting Logs (In Design)
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">
          Stock deduction, slit cuts, job order linking, and operator usage forms will be connected once sheet cutting workflows are configured.
        </p>
        <div className="pt-2">
          <button
            onClick={() => navigate('/sheets/inventory')}
            className="px-5 py-2.5 bg-brand-blue hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Return to Sheet Inventory
          </button>
        </div>
      </div>
    </div>
  );
}
