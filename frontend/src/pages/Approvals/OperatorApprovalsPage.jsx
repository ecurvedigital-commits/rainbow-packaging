import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardCheck, Clock, CheckCircle2, XCircle, Search, 
  RefreshCw, ArrowRight, Scale, Layers, AlertCircle, FileText
} from 'lucide-react';
import { approvalApi } from '../../api/approvalApi';
import Pagination from '../../components/Common/Pagination';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import { formatWeight, formatDate } from '../../utils/formatters';

export default function OperatorApprovalsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState(''); // '' | 'PENDING' | 'CONFIRMED' | 'DECLINED'
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const [metrics, setMetrics] = useState({
    totalAppliedWeightKg: 0,
    pendingCount: 0,
    pendingWeightKg: 0,
    confirmedCount: 0,
    confirmedWeightKg: 0,
    declinedCount: 0,
  });

  const fetchMyApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (statusFilter) params.status = statusFilter;
      if (eventTypeFilter) params.event_type = eventTypeFilter;
      if (searchQ.trim()) params.q = searchQ.trim();

      const res = await approvalApi.getMine(params);
      const rawItems = res.data || res.items || [];
      setItems(rawItems);

      const meta = res.meta || {};
      setPagination((prev) => ({
        ...prev,
        page: meta.page || prev.page,
        limit: meta.limit || prev.limit,
        total: meta.total !== undefined ? meta.total : rawItems.length,
        totalPages: meta.totalPages || 1,
      }));

      // Compute summary metrics for operator's applied approvals
      let pendingCnt = meta.counts?.pending || 0;
      let confirmedCnt = meta.counts?.confirmed || 0;
      let declinedCnt = meta.counts?.declined || 0;

      let pendingW = 0;
      let confirmedW = 0;
      let totalW = 0;

      rawItems.forEach((item) => {
        const payload = item.payload || {};
        let w = 0;
        if (item.event_type === 'USAGE_LOGGED') {
          w = payload.used_this_time || Math.max(0, (payload.previous_weight || 0) - (payload.current_weight_entered || 0));
        } else if (item.event_type === 'CREATED') {
          w = payload.max_weight || 0;
        }

        totalW += w;
        if (item.approval_status === 'PENDING') {
          pendingW += w;
        } else if (item.approval_status === 'CONFIRMED') {
          confirmedW += w;
        }
      });

      setMetrics({
        totalAppliedWeightKg: Math.round(totalW * 100) / 100,
        pendingCount: pendingCnt,
        pendingWeightKg: Math.round(pendingW * 100) / 100,
        confirmedCount: confirmedCnt,
        confirmedWeightKg: Math.round(confirmedW * 100) / 100,
        declinedCount: declinedCnt,
      });
    } catch (err) {
      setError(err.message || 'Failed to load your submitted approvals.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, eventTypeFilter, searchQ]);

  useEffect(() => {
    fetchMyApprovals();
  }, [fetchMyApprovals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'var(--font-family-display)' }}>
            <ClipboardCheck className="w-6 h-6 text-brand-blue" />
            My Submitted Approvals
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Track all reel creation and weight usage entries you have submitted for supervisor confirmation.
          </p>
        </div>
        <button
          onClick={fetchMyApprovals}
          className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Cards: Showing how much the operator applied for */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex items-center gap-4">
          <div className="p-3 rounded-xl shrink-0 border bg-blue-50 text-blue-600 border-blue-100">
            <Scale size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-semibold truncate">Applied Weight (Current Page)</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5" style={{ fontFamily: 'var(--font-family-display)' }}>
              {formatWeight(metrics.totalAppliedWeightKg)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex items-center gap-4">
          <div className="p-3 rounded-xl shrink-0 border bg-amber-50 text-amber-600 border-amber-100">
            <Clock size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-semibold truncate">Pending Confirmation</p>
            <p className="text-xl font-bold text-amber-700 mt-0.5" style={{ fontFamily: 'var(--font-family-display)' }}>
              {metrics.pendingCount} <span className="text-xs font-normal text-gray-500">entries</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex items-center gap-4">
          <div className="p-3 rounded-xl shrink-0 border bg-emerald-50 text-emerald-600 border-emerald-100">
            <CheckCircle2 size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-semibold truncate">Confirmed Entries</p>
            <p className="text-xl font-bold text-emerald-700 mt-0.5" style={{ fontFamily: 'var(--font-family-display)' }}>
              {metrics.confirmedCount} <span className="text-xs font-normal text-gray-500">entries</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex items-center gap-4">
          <div className="p-3 rounded-xl shrink-0 border bg-red-50 text-red-600 border-red-100">
            <XCircle size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-semibold truncate">Declined Entries</p>
            <p className="text-xl font-bold text-red-700 mt-0.5" style={{ fontFamily: 'var(--font-family-display)' }}>
              {metrics.declinedCount} <span className="text-xs font-normal text-gray-500">entries</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Query */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              placeholder="Search by Reel #, supplier, or master key..."
              className="w-full pl-10 pr-3.5 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue font-semibold text-gray-700"
            >
              <option value="">All Approval Statuses</option>
              <option value="PENDING">PENDING Confirmation</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="DECLINED">DECLINED</option>
            </select>
          </div>

          {/* Event Type Filter */}
          <div>
            <select
              value={eventTypeFilter}
              onChange={(e) => {
                setEventTypeFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue font-semibold text-gray-700"
            >
              <option value="">All Action Types</option>
              <option value="CREATED">CREATED (Reel Creation)</option>
              <option value="USAGE_LOGGED">USAGE_LOGGED (Weight Usage)</option>
              <option value="ADMIN_CORRECTED">ADMIN_CORRECTED (Adjustment)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Submissions List */}
      {loading ? (
        <LoadingState message="Loading your submitted approval entries..." />
      ) : error ? (
        <ErrorAlert message={error} onRetry={fetchMyApprovals} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No Submitted Approval Requests"
          message="You have not submitted any approval requests matching the selected filters."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {items.map((item) => {
              const itemId = item.id || item._id;
              const reelNo = item.reel_no || item.payload?.fields?.reel_no || 'N/A';
              const status = item.approval_status || 'PENDING';
              const dateStr = item.performed_at || item.created_at;
              const isUsage = item.event_type === 'USAGE_LOGGED';

              const prevW = item.payload?.previous_weight;
              const currW = item.payload?.current_weight_entered;
              const usedW = item.payload?.used_this_time || (prevW !== undefined && currW !== undefined ? Math.max(0, prevW - currW) : null);

              return (
                <div
                  key={itemId}
                  className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-gray-300"
                >
                  <div className="space-y-2.5 min-w-0 flex-1">
                    {/* Top Row: Event Type + Status Badge + Reel No */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                        item.event_type === 'CREATED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.event_type || 'ENTRY'}
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : status === 'DECLINED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {status}
                      </span>

                      <span className="font-bold text-gray-900 text-sm" style={{ fontFamily: 'var(--font-family-display)' }}>
                        Reel #{reelNo}
                      </span>
                    </div>

                    {/* Weight Details Applied For */}
                    {isUsage ? (
                      <div className="text-xs text-gray-700 flex items-center gap-2 flex-wrap">
                        <span>Previous Weight: <strong className="text-gray-900">{formatWeight(prevW)}</strong></span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        <span>Entered Weight: <strong className="text-gray-900">{formatWeight(currW)}</strong></span>
                        {usedW !== null && (
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                            Consumed Applied: {formatWeight(usedW)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-700 flex items-center gap-3 flex-wrap">
                        <span>Initial Max Weight: <strong className="text-gray-900">{formatWeight(item.payload?.max_weight)}</strong></span>
                      </div>
                    )}

                    {/* Metadata & Decision details */}
                    <div className="text-xs text-gray-400 flex items-center gap-3 flex-wrap pt-1 border-t border-gray-100">
                      <span>Submitted: <strong className="text-gray-700">{formatDate(dateStr)}</strong></span>
                      {item.payload?.fields?.master_key && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-brand-blue font-bold bg-brand-blue/5 px-2 py-0.5 rounded-md">
                            Key: {item.payload.fields.master_key}
                          </span>
                        </>
                      )}
                      {item.payload?.fields?.supplier_name && (
                        <>
                          <span>•</span>
                          <span>Supplier: <strong className="text-gray-700">{item.payload.fields.supplier_name}</strong></span>
                        </>
                      )}
                    </div>

                    {/* Supervisor Decision Banner */}
                    {item.decision && status === 'CONFIRMED' && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>Confirmed by <strong>{item.decision.by_name}</strong> on {formatDate(item.decision.at)}</span>
                      </div>
                    )}

                    {item.decision && status === 'DECLINED' && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs space-y-1">
                        <div className="flex items-center gap-2 font-bold">
                          <XCircle size={16} className="text-red-600 shrink-0" />
                          <span>Declined by {item.decision.by_name} on {formatDate(item.decision.at)}</span>
                        </div>
                        {item.decision.reason && (
                          <p className="text-xs text-red-700 pl-6">
                            <strong>Reason:</strong> "{item.decision.reason}"
                          </p>
                        )}
                        {item.reverted_from !== undefined && (
                          <p className="text-[11px] text-red-600 pl-6">
                            Weight reverted back from {formatWeight(item.reverted_from)} to {formatWeight(item.reverted_to)}.
                          </p>
                        )}
                      </div>
                    )}

                    {status === 'PENDING' && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                        <Clock size={16} className="text-amber-600 shrink-0" />
                        <span>Awaiting supervisor review in FIFO queue.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
            onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
          />
        </div>
      )}
    </div>
  );
}
