import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Boxes,
  PlusCircle,
  Scale,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function SheetsDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-brand-blue rounded-xl border border-blue-100 shadow-xs">
            <Layers size={24} />
          </div>
          <div>
            <h1
              className="text-2xl font-black text-gray-900 tracking-tight"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              Sheets Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              Operational dashboard for cut paper & corrugated sheet stock
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/sheets/create')}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Create Sheet Lot</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid (Matches Reels Dashboard Pattern) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sheet Lots */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sheet Lots</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">0</h3>
            <span className="text-[11px] text-brand-blue font-medium">Ready for inwarding</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
            <Boxes size={22} />
          </div>
        </div>

        {/* Card 2: Sheet Balance Count */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available Sheets</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">0 pcs</h3>
            <span className="text-[11px] text-emerald-600 font-medium">Running balance</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
            <Layers size={22} />
          </div>
        </div>

        {/* Card 3: Weight Equivalent */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Calculated Weight</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">0 kg</h3>
            <span className="text-[11px] text-amber-600 font-medium">Derived from L × W × GSM</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-xs">
            <Scale size={22} />
          </div>
        </div>

        {/* Card 4: Module Status */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Module State</p>
            <h3 className="text-lg font-black text-brand-blue mt-1">Operational Shell</h3>
            <span className="text-[11px] text-purple-600 font-medium">Independent workspace</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-xs">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts Banner (Matches Reels Dashboard Banner) */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full text-blue-100">
            Workspace Actions
          </span>
          <h2 className="text-lg font-bold mt-2" style={{ fontFamily: 'var(--font-family-display)' }}>
            Sheets Inventory Operations
          </h2>
          <p className="text-xs text-blue-100 mt-1 max-w-xl">
            Fast shortcuts to inward sheet lots, record cutting consumption and trim loss, or explore current stock records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => navigate('/sheets/create')}
            className="px-4 py-2 bg-white text-brand-blue-dark font-bold text-xs rounded-xl shadow-sm hover:bg-blue-50 transition-all cursor-pointer"
          >
            + Create Sheet Lot
          </button>
          <button
            onClick={() => navigate('/sheets/update')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Update Usage / Cut
          </button>
          <button
            onClick={() => navigate('/sheets/inventory')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            View Inventory
          </button>
        </div>
      </div>

      {/* Workspace Operational Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => navigate('/sheets/create')}
          className="group bg-white p-6 rounded-2xl border border-gray-200 hover:border-brand-blue hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center border border-blue-100">
                <PlusCircle size={20} />
              </div>
              <span className="text-xs font-bold text-brand-blue bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Option 1
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-brand-blue transition-colors">
              1. Create Sheet Lot
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Inward new paper and corrugated board sheet lots into inventory with dimensional specs.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-brand-blue">
            <span>Inward Lot</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigate('/sheets/update')}
          className="group bg-white p-6 rounded-2xl border border-gray-200 hover:border-brand-blue hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Scale size={20} />
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                Option 2
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-brand-blue transition-colors">
              2. Update Stock & Cut
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Record sheet consumption, die-cutting yield adjustments, trim loss, and production usage.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Update Stock</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigate('/sheets/inventory')}
          className="group bg-white p-6 rounded-2xl border border-gray-200 hover:border-brand-blue hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-brand-blue-dark flex items-center justify-center border border-indigo-100">
                <Boxes size={20} />
              </div>
              <span className="text-xs font-bold text-brand-blue-dark bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Option 3
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-brand-blue transition-colors">
              3. Sheet Inventory
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Browse current sheets in stock, lot balances, dimensions, and filterable inventory records.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-brand-blue-dark">
            <span>Browse Lots</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
