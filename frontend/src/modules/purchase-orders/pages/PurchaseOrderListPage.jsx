import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText, Plus, Search, Filter, RefreshCw, Eye, Edit3, Send, CheckCircle2,
  XCircle, Clock, AlertTriangle, Building2, Calendar, Layers, ChevronRight, X
} from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { purchaseOrderApi } from '../api/purchaseOrderApi';
import { PO_STATUS, PO_STATUS_CONFIG } from '../constants/poConstants';
import { formatDate, formatWeight } from '../../../utils/formatters';
import { Pagination } from '../../../components/Common/Pagination';

export default function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const { user, isRoleAdmin, isRoleSupervisor } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [submittingId, setSubmittingId] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filter options for dropdowns
  const [filterOptions, setFilterOptions] = useState({ suppliers: [] });

  const fetchFilterOptions = async () => {
    try {
      const res = await purchaseOrderApi.getFilterOptions();
      if (res.success && res.data) {
        setFilterOptions(res.data);
      }
    } catch (_err) {
      // Non-blocking
    }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        supplier: supplierFilter || undefined,
        search: searchTerm.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };

      const res = await purchaseOrderApi.list(params);
      if (res.success) {
        setOrders(res.data || []);
        setMeta(res.meta || null);
        if (res.summary) setSummary(res.summary);
      } else {
        throw new Error(res.error?.message || 'Failed to load purchase orders');
      }
    } catch (err) {
      setError(err.message || 'Error fetching purchase orders');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, supplierFilter, searchTerm, dateFrom, dateTo]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setSupplierFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleSubmitForApproval = async (e, po) => {
    e.stopPropagation();
    if (!window.confirm(`Submit Purchase Order "${po.po_no}" for Supervisor authorization?`)) return;

    const poId = po.id || po._id;
    setSubmittingId(poId);
    setActionSuccess('');
    try {
      const res = await purchaseOrderApi.submitForApproval(poId);
      if (res.success) {
        setActionSuccess(`PO ${po.po_no} submitted for approval.`);
        setTimeout(() => setActionSuccess(''), 4000);
        await fetchOrders();
      } else {
        throw new Error(res.error?.message || 'Submission failed');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <h1
              className="text-xl font-bold text-gray-900"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              Sheet / Board Purchase Orders
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Create, track, authorize, and fulfill procurement orders matching the company board format.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl border border-gray-200 transition cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/sheets/purchase-orders/create"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </Link>
        </div>
      </div>

      {/* ── Success Alert ───────────────────────────────────────────── */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between animate-fade-in font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Error Alert ─────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Summary Metric Cards ────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Orders</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{summary.total_pos || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs bg-amber-50/20">
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Pending Approval
            </p>
            <p className="text-xl font-bold text-amber-900 mt-1">{summary.pending_approval_count || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Approved Active</p>
            <p className="text-xl font-bold text-emerald-900 mt-1">
              {(summary.approved_count || 0) + (summary.partially_received_count || 0)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Drafts</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{summary.draft_count || 0}</p>
          </div>
        </div>
      )}

      {/* ── Filters & Search Control Bar ────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-200 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search box */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search PO #, supplier, client, or job name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Supplier dropdown */}
          <div className="w-full md:w-56">
            <select
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-gray-700"
            >
              <option value="">All Suppliers</option>
              {filterOptions.suppliers?.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              title="From PO Date"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              title="To PO Date"
            />
          </div>

          {(searchTerm || supplierFilter || statusFilter !== 'ALL' || dateFrom || dateTo) && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-xl transition cursor-pointer shrink-0 font-medium"
            >
              Reset
            </button>
          )}
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-gray-100 text-xs custom-scrollbar">
          {['ALL', ...Object.values(PO_STATUS)].map((st) => {
            const isSelected = statusFilter === st;
            const label = st === 'ALL' ? 'All Statuses' : PO_STATUS_CONFIG[st]?.label || st;
            return (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Purchase Orders Table ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5">PO Number</th>
                <th className="px-4 py-3.5">PO Date</th>
                <th className="px-4 py-3.5">Supplier</th>
                <th className="px-4 py-3.5">Delivery Date</th>
                <th className="px-4 py-3.5 text-center">Items</th>
                <th className="px-4 py-3.5 text-right">Quantity</th>
                <th className="px-4 py-3.5 text-right">Total Weight</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5">Prepared By</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={10} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded-md w-full" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
                    <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-600">No Purchase Orders found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {searchTerm || supplierFilter || statusFilter !== 'ALL'
                        ? 'Try clearing active filters to see all records.'
                        : 'Click "Create Purchase Order" above to generate your first board procurement order.'}
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((po) => {
                  const statusConf = PO_STATUS_CONFIG[po.status] || {
                    label: po.status,
                    bg: 'bg-gray-100',
                    text: 'text-gray-700',
                    border: 'border-gray-300',
                    dot: 'bg-gray-400',
                  };

                  const poId = po.id || po._id;
                  const isEditable = po.status === PO_STATUS.DRAFT || po.status === PO_STATUS.REJECTED;
                  const canSubmit = po.status === PO_STATUS.DRAFT || po.status === PO_STATUS.REJECTED;

                  return (
                    <tr
                      key={poId}
                      onClick={() => navigate(`/sheets/purchase-orders/${poId}`)}
                      className="hover:bg-emerald-50/30 transition cursor-pointer group"
                    >
                      {/* PO Number */}
                      <td className="px-5 py-3.5 font-bold text-gray-900 group-hover:text-emerald-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{po.po_no}</span>
                        </div>
                      </td>

                      {/* PO Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-gray-600">
                        {formatDate(po.po_date)}
                      </td>

                      {/* Supplier */}
                      <td className="px-4 py-3.5 font-semibold text-gray-800 max-w-[180px] truncate" title={po.supplier_name}>
                        {po.supplier_name}
                      </td>

                      {/* Delivery Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-gray-600">
                        {formatDate(po.delivery_date)}
                      </td>

                      {/* Item Count */}
                      <td className="px-4 py-3.5 text-center font-medium text-gray-700">
                        {po.total_items}
                      </td>

                      {/* Total Quantity */}
                      <td className="px-4 py-3.5 text-right font-medium text-gray-800">
                        {po.total_ordered_quantity?.toLocaleString() || 0}
                      </td>

                      {/* Total Weight */}
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900 whitespace-nowrap">
                        {formatWeight(po.total_ordered_weight)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Prepared By */}
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                        {po.prepared_by_name}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/sheets/purchase-orders/${poId}`)}
                            className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="View PO Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isEditable && (
                            <button
                              onClick={() => navigate(`/sheets/purchase-orders/create?editId=${poId}`)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit PO"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {canSubmit && (
                            <button
                              onClick={(e) => handleSubmitForApproval(e, po)}
                              disabled={submittingId === poId}
                              className="p-1.5 text-amber-600 hover:text-white hover:bg-amber-600 rounded-lg transition"
                              title="Submit for Supervisor Approval"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && (
          <Pagination
            meta={meta}
            page={page}
            limit={limit}
            onPageChange={(newPage) => setPage(newPage)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}

