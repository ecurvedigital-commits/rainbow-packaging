import React from 'react';
import { History, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '../../../utils/formatters';

export default function SheetHistoryTable({
  transactions = [],
  loading = false,
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-8 h-8 mx-auto border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-gray-500 font-medium">Loading stock movement history...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
          <History size={24} />
        </div>
        <h4 className="text-sm font-bold text-gray-900">No Transaction History Found</h4>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          No stock movements match the specified filters or date range.
        </p>
      </div>
    );
  }

  const getEventBadge = (eventType) => {
    switch (eventType) {
      case 'CREATED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CONSUMED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'RETURNED':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'ADJUSTED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'VOIDED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'CONFIRMED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DECLINED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getEventLabel = (eventType) => {
    switch (eventType) {
      case 'CREATED':
        return 'INWARD';
      case 'CONSUMED':
        return 'CUT / OUTWARD';
      case 'RETURNED':
        return 'RETURN';
      case 'ADJUSTED':
        return 'ADJUSTMENT';
      case 'VOIDED':
        return 'VOID';
      case 'CONFIRMED':
        return 'CONFIRMED';
      case 'DECLINED':
        return 'DECLINED';
      default:
        return eventType;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
            <tr>
              <th className="px-3.5 py-3">Txn #</th>
              <th className="px-3.5 py-3">Date & Time</th>
              <th className="px-3 py-3">Lot Sr #</th>
              <th className="px-3.5 py-3">Party Name</th>
              <th className="px-3.5 py-3">Job Name</th>
              <th className="px-3 py-3">Txn Type</th>
              <th className="px-3 py-3 text-right">Qty In</th>
              <th className="px-3 py-3 text-right">Qty Out</th>
              <th className="px-3 py-3 text-right">Previous Bal</th>
              <th className="px-3 py-3 text-right">New Bal</th>
              <th className="px-3.5 py-3 text-right">Weight (kg)</th>
              <th className="px-3.5 py-3">Performed By</th>
              <th className="px-3 py-3 text-center">Approval</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800 font-medium">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-3.5 py-2.5 font-mono text-gray-500 text-[11px]">
                  #{t.id.slice(-6)}
                </td>
                <td className="px-3.5 py-2.5 text-gray-600 whitespace-nowrap text-[11px]">
                  {formatDateTime(t.performed_at)}
                </td>
                <td className="px-3 py-2.5 font-mono font-bold text-gray-700">
                  #{t.sr_no}
                </td>
                <td className="px-3.5 py-2.5 font-bold text-gray-900 whitespace-nowrap">
                  {t.party_name}
                </td>
                <td className="px-3.5 py-2.5 text-gray-500 max-w-[140px] truncate" title={t.job_name}>
                  {t.job_name || '-'}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getEventBadge(
                      t.event_type
                    )}`}
                  >
                    {getEventLabel(t.event_type)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                  {t.qty_in > 0 ? `+${t.qty_in.toLocaleString()}` : '-'}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-700">
                  {t.qty_out > 0 ? `-${t.qty_out.toLocaleString()}` : '-'}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-gray-500">
                  {t.previous_balance.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900">
                  {t.new_balance.toLocaleString()}
                </td>
                <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-800">
                  {t.weight_impact_kg > 0 ? `${t.weight_impact_kg.toLocaleString()} kg` : '-'}
                </td>
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  <span className="font-semibold text-gray-800">{t.performed_by_name}</span>
                  <span className="text-[10px] text-gray-400 block uppercase tracking-wider">
                    {t.performed_by_role}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                  {t.approval_status === 'CONFIRMED' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                      <CheckCircle2 size={13} /> Approved
                    </span>
                  ) : t.approval_status === 'PENDING' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-bold">
                      <Clock size={13} /> Pending
                    </span>
                  ) : t.approval_status === 'DECLINED' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-bold">
                      <XCircle size={13} /> Declined
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

