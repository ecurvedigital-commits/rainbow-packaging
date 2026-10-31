import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ArrowLeft, Layers } from 'lucide-react';

export default function CreateSheetPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-brand-blue rounded-xl border border-blue-100 shadow-xs">
            <PlusCircle size={24} />
          </div>
          <div>
            <h1
              className="text-2xl font-black text-gray-900 tracking-tight"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              Create Sheet Lot
            </h1>
            <p className="text-sm text-gray-500">
              Inward new paper and corrugated board sheet lots into inventory
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
        <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center border border-blue-100 shadow-xs">
          <Layers size={24} />
        </div>
        <h3 className="text-base font-bold text-gray-900">
          Sheet Inwarding Form (In Design)
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">
          The exact data-entry fields (sheet dimensions, GSM, ream count, bundle packaging, and flute profile) will be enabled when sheet business specifications are finalized.
        </p>
        <div className="pt-2">
          <button
            onClick={() => navigate('/sheets/inventory')}
            className="px-5 py-2.5 bg-brand-blue hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            View Existing Sheets List
          </button>
        </div>
      </div>
    </div>
  );
}
