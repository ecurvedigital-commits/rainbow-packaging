import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Boxes,
  PlusCircle,
  Scale,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  History,
} from 'lucide-react';
import { sheetApi } from '../api/sheetApi';
import SheetImportModal from '../components/SheetImportModal';
import { formatDateTime } from '../../../utils/formatters';

export default function SheetsDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchSummary = () => {
    setLoading(true);
    sheetApi
      .getSummary()
      .then((res) => {
        if (res.success) {
          setSummary(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch sheets summary:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Metrics Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shadow-xs">
            <Layers size={24} />
          </div>
          <div>
            <h1
              className="text-2xl font-black text-gray-900 tracking-tight"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              Sheets (Board Stock) Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              Operational overview of paper & corrugated board sheet lots, stock balances, and press consumption
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={() => navigate('/sheets/cut')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Scale size={15} />
            <span>Cut / Outward</span>
          </button>

          <button
            onClick={() => navigate('/sheets/inward')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Inward (Invert)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sheet Lots */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Stock Lots</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {loading ? '—' : (summary?.total_sheet_lots || 0)}
            </h3>
            <span className="text-[11px] text-emerald-700 font-medium">
              {summary?.available_lots || 0} active | {summary?.partially_consumed_lots || 0} in-use
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-xs">
            <Boxes size={22} />
          </div>
        </div>

        {/* Card 2: Sheet Balance Count */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available Sheets</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {loading ? '—' : (summary?.available_sheets?.toLocaleString() || 0)}
            </h3>
            <span className="text-[11px] text-teal-700 font-medium">
              {summary?.consumed_sheets?.toLocaleString() || 0} sheets consumed
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 shadow-xs">
            <Layers size={22} />
          </div>
        </div>

        {/* Card 3: Weight Equivalent */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Weight</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {loading ? '—' : `${summary?.total_weight_kg?.toLocaleString() || 0} kg`}
            </h3>
            <span className="text-[11px] text-amber-700 font-medium">
              ~{summary?.total_weight_tons || 0} Metric Tons
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 shadow-xs">
            <Scale size={22} />
          </div>
        </div>

        {/* Card 4: Approvals & Audit */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Approvals</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {loading ? '—' : (summary?.pending_confirmations || 0)}
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">Operator submissions</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 shadow-xs">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black tracking-tight">Active Sheet Stock Register</h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl leading-relaxed">
            Manage individual board stock lots, track consumption per job card, record press returns, or import the company's Excel opening register.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/sheets/inventory')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-50 transition-all cursor-pointer"
          >
            <span>Open Inventory Table</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Recent Movements Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-emerald-700" />
            <h3 className="text-sm font-bold text-gray-900">Recent Sheet Inventory Movements</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/sheets/history')}
              className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              Full Transaction History →
            </button>
            <button
              onClick={() => navigate('/sheets/inventory')}
              className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              View All Lots →
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400 py-6 text-center">Loading recent activity...</p>
        ) : !summary?.recent_movements || summary.recent_movements.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 space-y-2">
            <p>No recent movements recorded.</p>
            <button
              onClick={() => setShowImportModal(true)}
              className="text-emerald-700 font-bold hover:underline"
            >
              Click here to import opening stock from board-stock-sheet.xlsx
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-2">Sr #</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Operator</th>
                  <th className="px-3 py-2">Station / Details</th>
                  <th className="px-3 py-2">Impact</th>
                  <th className="px-3 py-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800 font-medium">
                {summary.recent_movements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-mono font-bold">#{m.sr_no}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 border border-slate-200">
                        {m.event_type}
                      </span>
                    </td>
                    <td className="px-3 py-2">{m.performed_by_name}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {m.payload?.station || m.payload?.party_name || '-'}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {m.payload?.consumed_quantity
                        ? `-${m.payload.consumed_quantity.toLocaleString()} sheets`
                        : m.payload?.initial_quantity
                        ? `+${m.payload.initial_quantity.toLocaleString()} sheets`
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-400">
                      {formatDateTime(m.performed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Excel Import Modal */}
      <SheetImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          fetchSummary();
        }}
      />
    </div>
  );
}
