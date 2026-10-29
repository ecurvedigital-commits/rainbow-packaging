import React, { useEffect, useState } from 'react';
import { Package, Truck, Ruler, CheckCircle2, Factory, BarChart3 } from 'lucide-react';
import { boxApi } from '../api/boxApi';

export default function FinishedBoxesPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    boxApi.getSummary()
      .then((res) => {
        if (isMounted && res.success) {
          setSummary(res.data);
        }
      })
      .catch(() => {
        // Fallback placeholder data if backend endpoint is in setup
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-700">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-family-display)' }}>
                Finished Boxes Inventory
              </h1>
              <p className="text-sm text-gray-500">
                Corrugated box stock, customer orders, pallets, and dispatch management
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Module Scaffold Active
          </span>
        </div>
      </div>

      {/* Module Overview Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Finished Boxes Domain Module Scaffold</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              This module handles finished goods packaging. In contrast to raw material reels (measured in kilograms and weight consumed),
              box inventory tracks discrete unit counts, dimensional sizing (Length × Width × Height), flute specifications (B, C, E, 3-ply, 5-ply),
              customer purchase orders, and pallet dispatch logistics.
            </p>
          </div>
        </div>

        {/* Planned Workflow Specs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-2">
              <Ruler size={18} className="text-indigo-600" />
              Box Specifications
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Box dimensions (L × W × H in mm/inches), flute type, bursting strength, compression strength (BCT), and print artwork revisions.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-2">
              <Factory size={18} className="text-cyan-600" />
              Pallet & Bundle Tracking
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Strapping bundle counts, palletization tags, warehouse bay locations, and finished goods stock receipts from corrugation lines.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-2">
              <Truck size={18} className="text-violet-600" />
              Dispatch & Order Fulfillment
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Customer sales orders, delivery challans, vehicle loading checklists, and dispatch quantity verification.
            </p>
          </div>
        </div>

        {/* Backend Connectivity Status */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Backend Endpoint: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">/api/finished-boxes</code></span>
          <span>Status: {loading ? 'Checking...' : (summary?.status || 'Scaffold Mounted')}</span>
        </div>
      </div>
    </div>
  );
}

