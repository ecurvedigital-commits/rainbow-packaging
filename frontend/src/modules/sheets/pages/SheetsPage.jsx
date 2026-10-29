import React, { useEffect, useState } from 'react';
import { Layers, FileSpreadsheet, ArrowRight, Clock, ShieldCheck, Box } from 'lucide-react';
import { sheetApi } from '../api/sheetApi';

export default function SheetsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    sheetApi.getSummary()
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
            <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700">
              <Layers size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-family-display)' }}>
                Sheets Inventory
              </h1>
              <p className="text-sm text-gray-500">
                Paper and corrugated sheet stock management & cutting conversions
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Module Scaffold Active
          </span>
        </div>
      </div>

      {/* Module Overview Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Sheet Domain Module Scaffold</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              This module represents the independent inventory domain for sheet-fed paper and corrugated boards.
              Its architecture is decoupled from reel-specific attributes, supporting dimension-based calculations (Length × Width), GSM, sheet count, ream conversions, and cutting yields.
            </p>
          </div>
        </div>

        {/* Planned Workflow Specs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-2">
              <FileSpreadsheet size={18} className="text-emerald-600" />
              Dimension Attributes
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tracking length, width, grain direction, caliper thickness, sheet weight, and ream count (500 sheets/ream) without polluting reel data models.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-2">
              <Clock size={18} className="text-amber-600" />
              Cutting Workflows
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Converting full parent sheets into slit blanks or cut pieces with dedicated trim waste calculations and batch traceability.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-2">
              <ShieldCheck size={18} className="text-blue-600" />
              Shared Enterprise Core
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Seamlessly reuses the common authentication, role-based authorization, supervisor approvals, and audit log framework.
            </p>
          </div>
        </div>

        {/* Backend Connectivity Status */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Backend Endpoint: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">/api/sheets</code></span>
          <span>Status: {loading ? 'Checking...' : (summary?.status || 'Scaffold Mounted')}</span>
        </div>
      </div>
    </div>
  );
}

