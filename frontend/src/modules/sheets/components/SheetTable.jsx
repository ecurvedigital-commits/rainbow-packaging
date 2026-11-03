import React from 'react';
import { Link } from 'react-router-dom';
import {
  Scissors,
  History,
  CornerUpLeft,
  RefreshCw,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { formatDate } from '../../../utils/formatters';

export default function SheetTable({
  sheets = [],
  loading = false,
  sortConfig = [],
  sortBy = 'sr_no',
  sortOrder = 'desc',
  onSort,
  onRecordUsage,
  onViewJourney,
  onAdjustStock,
  onReturnStock,
  onVoidSheet,
  isAdmin = false,
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-8 h-8 mx-auto border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-gray-500 font-medium">Loading sheet inventory lots...</p>
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
          <Layers size={24} />
        </div>
        <h4 className="text-sm font-bold text-gray-900">No Sheet Lots Found</h4>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          No board stock lots match the current filter criteria or the register has not been imported yet.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'PARTIALLY_CONSUMED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'DEPLETED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'VOIDED':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const renderSortIcon = (field) => {
    if (!onSort) return null;
    if (sortConfig && Array.isArray(sortConfig) && sortConfig.length > 0) {
      const idx = sortConfig.findIndex((c) => c.key === field);
      if (idx === -1) {
        return <ArrowUpDown size={12} className="text-gray-300 ml-1 inline opacity-0 group-hover:opacity-100" />;
      }
      const isAsc = sortConfig[idx].dir === 'asc';
      return (
        <span className="inline-flex items-center gap-0.5 text-emerald-700 ml-1 font-bold">
          {isAsc ? <ChevronUp size={13} className="inline" /> : <ChevronDown size={13} className="inline" />}
          {sortConfig.length > 1 && (
            <span className="text-[9px] font-bold leading-none bg-emerald-100 text-emerald-800 rounded-full px-1 py-0.5">
              {idx + 1}
            </span>
          )}
        </span>
      );
    }

    if (sortBy !== field) {
      return <ArrowUpDown size={12} className="text-gray-300 ml-1 inline opacity-0 group-hover:opacity-100" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp size={13} className="text-emerald-700 ml-1 inline" />
    ) : (
      <ChevronDown size={13} className="text-emerald-700 ml-1 inline" />
    );
  };

  const handleHeaderClick = (field) => {
    if (!onSort) return;
    onSort(field);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] font-bold select-none">
            <tr>
              <th
                onClick={() => handleHeaderClick('sr_no')}
                className="px-4 py-3 cursor-pointer group hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Sr #</span>
                {renderSortIcon('sr_no')}
              </th>
              <th
                onClick={() => handleHeaderClick('party_name')}
                className="px-4 py-3 cursor-pointer group hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Party Name</span>
                {renderSortIcon('party_name')}
              </th>
              <th
                onClick={() => handleHeaderClick('job_name')}
                className="px-4 py-3 cursor-pointer group hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Job Name</span>
                {renderSortIcon('job_name')}
              </th>
              <th
                onClick={() => handleHeaderClick('quality')}
                className="px-3 py-3 cursor-pointer group hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Quality</span>
                {renderSortIcon('quality')}
              </th>
              <th
                onClick={() => handleHeaderClick('deckle')}
                className="px-3 py-3 cursor-pointer group hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Deckle (cm)</span>
                {renderSortIcon('deckle')}
              </th>
              <th
                onClick={() => handleHeaderClick('cutting')}
                className="px-3 py-3 cursor-pointer group hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Cutting (cm)</span>
                {renderSortIcon('cutting')}
              </th>
              <th
                onClick={() => handleHeaderClick('gsm')}
                className="px-3 py-3 cursor-pointer group hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>GSM</span>
                {renderSortIcon('gsm')}
              </th>
              <th
                onClick={() => handleHeaderClick('initial_quantity')}
                className="px-4 py-3 text-right cursor-pointer group hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Initial Qty</span>
                {renderSortIcon('initial_quantity')}
              </th>
              <th
                onClick={() => handleHeaderClick('current_quantity')}
                className="px-4 py-3 text-right cursor-pointer group hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Balance Qty</span>
                {renderSortIcon('current_quantity')}
              </th>
              <th
                onClick={() => handleHeaderClick('current_weight')}
                className="px-4 py-3 text-right cursor-pointer group hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Weight (kg)</span>
                {renderSortIcon('current_weight')}
              </th>
              <th
                onClick={() => handleHeaderClick('status')}
                className="px-3 py-3 text-center cursor-pointer group hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <span>Status</span>
                {renderSortIcon('status')}
              </th>
              <th className="px-4 py-3 text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800">
            {sheets.map((sheet) => {
              const isDepleted = sheet.status === 'DEPLETED';
              const isVoided = sheet.status === 'VOIDED';

              return (
                <tr
                  key={sheet.id || sheet.sr_no}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isVoided ? 'opacity-50 bg-gray-50/50' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono font-bold text-gray-600">
                    <Link
                      to={`/sheets/details/${sheet.id}`}
                      className="hover:text-emerald-700 hover:underline"
                    >
                      #{sheet.sr_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                    <Link
                      to={`/sheets/details/${sheet.id}`}
                      className="hover:text-emerald-700"
                    >
                      {sheet.party_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate" title={sheet.job_name}>
                    {sheet.job_name || <span className="text-gray-300 italic">None</span>}
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-700">
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[11px]">
                      {sheet.quality}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono">{sheet.deckle}</td>
                  <td className="px-3 py-3 font-mono">{sheet.cutting}</td>
                  <td className="px-3 py-3 font-mono font-semibold">{sheet.gsm}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">
                    {sheet.initial_quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-black text-gray-900">
                    {sheet.current_quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-black text-emerald-800">
                    {sheet.current_weight.toLocaleString()} kg
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                        sheet.status
                      )}`}
                    >
                      {sheet.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {/* Cut / Outward Action Button */}
                      {!isDepleted && !isVoided && (
                        <Link
                          to={`/sheets/cut?lotId=${sheet.id}`}
                          title="Cut / Issue Stock"
                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                        >
                          <Scissors size={15} />
                        </Link>
                      )}

                      {/* View Details / Journey Link */}
                      <Link
                        to={`/sheets/details/${sheet.id}`}
                        title="View Lot Details"
                        className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                      >
                        <Eye size={15} />
                      </Link>

                      {/* Stock History Link */}
                      <Link
                        to={`/sheets/history?sr_no=${sheet.sr_no}`}
                        title="View Stock Movement History"
                        className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                      >
                        <History size={15} />
                      </Link>

                      {/* Return Stock */}
                      {!isVoided && (
                        <button
                          onClick={() => onReturnStock && onReturnStock(sheet)}
                          title="Return Unused Sheets"
                          className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <CornerUpLeft size={15} />
                        </button>
                      )}

                      {/* Audit Adjustment */}
                      {!isVoided && (
                        <button
                          onClick={() => onAdjustStock && onAdjustStock(sheet)}
                          title="Stock Adjustment (Audit Count)"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <RefreshCw size={14} />
                        </button>
                      )}

                      {/* Admin Void */}
                      {isAdmin && !isVoided && (
                        <button
                          onClick={() => onVoidSheet && onVoidSheet(sheet)}
                          title="Void Sheet Lot"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
