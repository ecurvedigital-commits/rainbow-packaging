import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Weight, Search, RefreshCw, Plus, Clock, CheckCircle2, XCircle, ArrowRight, Filter
} from 'lucide-react';
import { reelApi } from '../../api/reelApi';
import { RecordUsageModal } from './RecordUsageModal';
import Pagination from '../../components/Common/Pagination';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import { formatWeight, formatDate } from '../../utils/formatters';

export default function UsageLogsPage() {
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    q: '',
    approval_status: '',
    station: '',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (filters.q.trim()) params.q = filters.q.trim();
      if (filters.approval_status) params.approval_status = filters.approval_status;
      if (filters.station) params.station = filters.station;

      const res = await reelApi.getUsageLogs(params);
      const items = res.data || res.items || [];
      setLogs(items);

      const meta = res.meta?.pagination || res.meta || {};
      setPagination((prev) => ({
        ...prev,
        page: meta.page || prev.page,
        limit: meta.limit || prev.limit,
        total: meta.total !== undefined ? meta.total : items.length,
        totalPages: meta.totalPages || 1,
      }));
    } catch (err) {
      setError(err.message || 'Failed to fetch usage logs.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Weight className="w-6 h-6 text-emerald-600" />
            <span>Record Reel Usage & Logs</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Record weight consumption on active reels and track real-time approval status across all machinery stations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowUsageModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Reel Usage</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="q"
              value={filters.q}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, q: e.target.value }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              placeholder="Search reel #, operator name, station, supplier, key..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
          </div>

          <div>
            <select
              value={filters.approval_status}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, approval_status: e.target.value }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:text-white font-medium"
            >
              <option value="">All Approval Statuses</option>
              <option value="CONFIRMED">CONFIRMED (Approved)</option>
              <option value="PENDING">PENDING (Waiting Approval)</option>
              <option value="DECLINED">DECLINED (Reverted)</option>
            </select>
          </div>

          <div>
            <button
              onClick={() => {
                setFilters({ q: '', approval_status: '', station: '' });
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition border border-dashed border-slate-300 dark:border-slate-700"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && <ErrorAlert message={error} onRetry={fetchLogs} />}

      {/* Main Content */}
      {loading ? (
        <LoadingState message="Loading reel usage logs..." />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No Usage Logs Found"
          message="No reel weight consumption entries match your current search parameters."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {logs.map((item) => {
              const status = item.approval_status || 'CONFIRMED';
              const isConfirmed = status === 'CONFIRMED' || status === 'APPROVED';
              const isPending = status === 'PENDING';
              const isDeclined = status === 'DECLINED';

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link
                        to={`/reels/${item.reel_id}`}
                        className="font-mono font-bold text-base text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        #{item.reel_no}
                      </Link>

                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {item.station}
                      </span>

                      {item.master_key && (
                        <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded">
                          {item.master_key}
                        </span>
                      )}

                      {/* Approval Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          isConfirmed
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : isPending
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                        }`}
                      >
                        {isConfirmed && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {isPending && <Clock className="w-3.5 h-3.5" />}
                        {isDeclined && <XCircle className="w-3.5 h-3.5" />}
                        <span>{isConfirmed ? 'APPROVED' : isPending ? 'PENDING APPROVAL' : 'DECLINED'}</span>
                      </span>
                    </div>

                    {/* Weight Consumption Row */}
                    <div className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                      <span>Prev Balance: <strong>{formatWeight(item.previous_weight)}</strong></span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <span>Entered Weight: <strong>{formatWeight(item.current_weight_entered)}</strong></span>
                      {item.used_this_time !== undefined && (
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          Consumed: {formatWeight(item.used_this_time)}
                        </span>
                      )}
                    </div>

                    {/* Operator & Date Info */}
                    <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                      <span>Logged by: <strong className="text-slate-600 dark:text-slate-300">{item.performed_by_name || 'Operator'}</strong> ({item.performed_by_role || 'OPERATOR'})</span>
                      <span>•</span>
                      <span>Date: {formatDate(item.performed_at)}</span>
                      {item.supplier_name && (
                        <>
                          <span>•</span>
                          <span>Supplier: <strong className="text-slate-700 dark:text-slate-300">{item.supplier_name}</strong></span>
                        </>
                      )}
                    </div>

                    {/* Decline Reason notice */}
                    {isDeclined && item.decline_reason && (
                      <div className="mt-2 text-xs font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900/50">
                        Decline Reason: {item.decline_reason}
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

      {/* Record Usage Modal */}
      {showUsageModal && (
        <RecordUsageModal
          isOpen={showUsageModal}
          onClose={() => setShowUsageModal(false)}
          onSuccess={() => {
            setShowUsageModal(false);
            fetchLogs();
          }}
        />
      )}
    </div>
  );
}
