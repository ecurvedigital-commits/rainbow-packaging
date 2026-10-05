import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, Clock, Check, X, ShieldCheck, 
  RefreshCw, ArrowRight, Search, Eye, History 
} from 'lucide-react';
import { approvalApi } from '../../api/approvalApi';
import { useAuth } from '../../auth/AuthContext';
import DeclineReasonModal from './DeclineReasonModal';
import ApprovalDetailModal from './ApprovalDetailModal';
import ReelJourneyModal from './ReelJourneyModal';
import Pagination from '../../components/Common/Pagination';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import Toast from '../../components/Common/Toast';
import { formatWeight, formatDate } from '../../utils/formatters';

export default function ApprovalsPage() {
  const { isRoleAdmin, isRoleSupervisor } = useAuth();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'

  const [pendingItems, setPendingItems] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);

  const [filters, setFilters] = useState({
    q: '',
    event_type: '',
    status: '',
    sort: 'newest',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [declineTarget, setDeclineTarget] = useState(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);
  const [journeyTarget, setJourneyTarget] = useState(null); // { reelId, reelNo }
  const [toast, setToast] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });

  const canApprove = isRoleAdmin || isRoleSupervisor;

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: filters.sort,
      };
      if (filters.q.trim()) params.q = filters.q.trim();
      if (filters.event_type) params.event_type = filters.event_type;

      const response = await approvalApi.getPending(params);
      const items = response.data || response.items || [];
      setPendingItems(items);

      const meta = response.meta || {};
      setPagination(prev => ({
        ...prev,
        page: meta.page || prev.page,
        limit: meta.limit || prev.limit,
        total: meta.total !== undefined ? meta.total : items.length,
        totalPages: meta.totalPages || 1
      }));
    } catch (err) {
      setError(err.message || 'Failed to load pending approvals.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: filters.sort,
      };
      if (filters.q.trim()) params.q = filters.q.trim();
      if (filters.event_type) params.event_type = filters.event_type;
      if (filters.status) params.status = filters.status;

      const response = await approvalApi.getHistory(params);
      const items = response.data || response.items || [];
      setHistoryItems(items);
      const meta = response.meta || {};
      setPagination(prev => ({
        ...prev,
        page: meta.page || prev.page,
        limit: meta.limit || prev.limit,
        total: meta.total !== undefined ? meta.total : items.length,
        totalPages: meta.totalPages || 1
      }));
    } catch (err) {
      setError(err.message || 'Failed to load approval history.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPending();
    } else {
      fetchHistory();
    }
  }, [activeTab, fetchPending, fetchHistory]);

  const handleApprove = async (approvalId) => {
    if (!canApprove) return;
    setActionLoadingId(approvalId);
    try {
      await approvalApi.approve(approvalId);
      setToast({ type: 'success', message: 'Approval request confirmed successfully!' });
      setSelectedDetailItem(null);
      fetchPending();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to confirm request.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineSubmit = async (reason) => {
    if (!declineTarget) return;
    const targetId = declineTarget.id || declineTarget._id;
    setActionLoadingId(targetId);
    try {
      await approvalApi.decline(targetId, reason);
      setToast({ type: 'success', message: 'Approval request declined.' });
      setDeclineTarget(null);
      setSelectedDetailItem(null);
      fetchPending();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to decline request.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenJourney = (reelId, reelNo) => {
    setJourneyTarget({ reelId, reelNo });
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Approval Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Review reel creations, usage logs, and weight adjustments submitted by operators. Click any row to view complete details.
          </p>
        </div>
        <button
          onClick={activeTab === 'pending' ? fetchPending : fetchHistory}
          className="self-start sm:self-auto p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition"
          title="Refresh List"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Query */}
          <div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="q"
                value={filters.q}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, q: e.target.value }));
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                placeholder="Search reel #, operator, supplier..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
          </div>

          {/* Event Type Filter */}
          <div>
            <select
              value={filters.event_type}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, event_type: e.target.value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
            >
              <option value="">All Event Types</option>
              <option value="CREATED">CREATED</option>
              <option value="USAGE_LOGGED">USAGE LOGGED</option>
              <option value="ADMIN_CORRECTED">ADMIN CORRECTED</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, status: e.target.value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
            >
              <option value="">All Statuses (Confirmed & Declined)</option>
              <option value="DECLINED">Declined Only</option>
              <option value="CONFIRMED">Confirmed Only</option>
              <option value="PENDING">Pending Only</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <select
              value={filters.sort}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, sort: e.target.value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => {
            setActiveTab('pending');
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          className={`px-4 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'pending'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Approvals</span>
          {pendingItems.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-full font-bold">
              {pendingItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          className={`px-4 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Approval & Decision History</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <ErrorAlert
          message={error}
          onRetry={activeTab === 'pending' ? fetchPending : fetchHistory}
        />
      )}

      {/* Tab Content */}
      {loading ? (
        <LoadingState message="Loading approval items..." />
      ) : activeTab === 'pending' ? (
        pendingItems.length === 0 ? (
          <EmptyState
            title="No Pending Approvals"
            message="All reel entries and weight usages have been reviewed."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingItems.map((item) => {
              const itemId = item.id || item._id;
              const reelNo = item.reel_no || item.reel?.reel_no || item.reel_number || 'N/A';
              const performedBy = item.performed_by_name || item.requested_by?.username || item.requested_by || 'Operator';
              const dateStr = item.performed_at || item.created_at || item.createdAt;

              const isUsage = item.event_type === 'USAGE_LOGGED';
              const prevW = item.payload?.previous_weight ?? item.previous_weight_kg;
              const currW = item.payload?.current_weight_entered ?? item.requested_weight_kg;
              const usedW = item.payload?.used_this_time;

              return (
                <div
                  key={itemId}
                  className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                >
                  {/* Clickable Content */}
                  <div
                    onClick={() => setSelectedDetailItem(item)}
                    className="space-y-2 flex-1 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        item.event_type === 'CREATED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        {item.event_type || 'ENTRY'}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        Reel #{reelNo}
                      </span>
                      {item.waiting_hours !== undefined && (
                        <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded font-mono">
                          Waiting {item.waiting_hours}h
                        </span>
                      )}
                    </div>

                    {/* Details Summary */}
                    {isUsage ? (
                      <div className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                        <span>Previous: <strong>{formatWeight(prevW)}</strong></span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <span>Entered: <strong>{formatWeight(currW)}</strong></span>
                        {usedW !== undefined && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            Consumed: {formatWeight(usedW)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        <span>Max Weight: <strong>{formatWeight(item.payload?.max_weight)}</strong></span>
                        {item.payload?.rate_per_kg > 0 && (
                          <span className="ml-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Rate: ₹{item.payload.rate_per_kg}/kg
                          </span>
                        )}
                        {item.payload?.fields?.supplier_name && (
                          <span className="ml-3 text-xs text-slate-500">Supplier: {item.payload.fields.supplier_name}</span>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-slate-400 flex items-center gap-4 flex-wrap">
                      <span>Submitted by: <strong className="text-slate-600 dark:text-slate-300">{performedBy}</strong></span>
                      <span>•</span>
                      <span>Date: {formatDate(dateStr)}</span>
                      {(item.reel?.master_key || item.payload?.fields?.master_key) && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                            Master Key: {item.reel?.master_key || item.payload?.fields?.master_key}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => setSelectedDetailItem(item)}
                      className="px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>

                    {canApprove && (
                      <>
                        <button
                          onClick={() => setDeclineTarget(item)}
                          disabled={actionLoadingId === itemId || item.can_confirm === false}
                          className="px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>

                        <button
                          onClick={() => handleApprove(itemId)}
                          disabled={actionLoadingId === itemId || item.can_confirm === false}
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                          title={item.can_confirm === false ? 'Older pending entry must be resolved first (FIFO)' : 'Confirm entry'}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
              onLimitChange={(l) => setPagination(prev => ({ ...prev, limit: l, page: 1 }))}
            />
          </div>
        )
      ) : (
        /* History Tab */
        historyItems.length === 0 ? (
          <EmptyState
            title="No Entry History"
            message="No past submitted entry decisions recorded."
          />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-3">Event Type</th>
                    <th className="px-6 py-3">Reel #</th>
                    <th className="px-6 py-3">Approval Status & Reason</th>
                    <th className="px-6 py-3">Submitted By</th>
                    <th className="px-6 py-3">Reviewed By</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                  {historyItems.map((item) => {
                    const itemId = item.id || item._id;
                    const reelNo = item.reel_no || item.reel_number || item.reel?.reel_no || 'N/A';
                    const status = item.approval_status || item.status || 'CONFIRMED';
                    const declineReason = item.decline_reason || item.decision?.reason;
                    const submittedBy = item.performed_by_name || item.requested_by?.username || 'Operator';
                    const reviewedBy = item.decision?.by_name || item.reviewed_by?.username || 'N/A';

                    return (
                      <tr 
                        key={itemId} 
                        onClick={() => setSelectedDetailItem(item)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition"
                      >
                        <td className="px-6 py-4 font-semibold text-xs uppercase">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.event_type === 'CREATED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                              : item.event_type === 'USAGE_LOGGED'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                          }`}>
                            {item.event_type || item.type || item.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          Reel #{reelNo}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            status === 'CONFIRMED' || status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                          }`}>
                            {status}
                          </span>
                          {status === 'DECLINED' && declineReason && (
                            <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 italic font-medium max-w-xs">
                              Reason: &ldquo;{declineReason}&rdquo;
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {submittedBy}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                          {reviewedBy}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(item.performed_at || item.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDetailItem(item);
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
              onLimitChange={(l) => setPagination(prev => ({ ...prev, limit: l, page: 1 }))}
            />
          </div>
        )
      )}

      {/* Detail Modal */}
      {selectedDetailItem && (
        <ApprovalDetailModal
          item={selectedDetailItem}
          canApprove={canApprove}
          loadingAction={!!actionLoadingId}
          onClose={() => setSelectedDetailItem(null)}
          onConfirm={handleApprove}
          onDecline={(item) => setDeclineTarget(item)}
          onViewJourney={(rId, rNo) => {
            handleOpenJourney(rId, rNo);
          }}
        />
      )}

      {/* Reel Journey Modal (Paginated timeline) */}
      {journeyTarget && (
        <ReelJourneyModal
          reelId={journeyTarget.reelId}
          reelNo={journeyTarget.reelNo}
          onClose={() => setJourneyTarget(null)}
        />
      )}

      {/* Decline Reason Modal */}
      {declineTarget && (
        <DeclineReasonModal
          title={`Decline Request for Reel #${declineTarget.reel_no || declineTarget.reel?.reel_no || declineTarget.reel_number || ''}`}
          onClose={() => setDeclineTarget(null)}
          onConfirm={handleDeclineSubmit}
          loading={actionLoadingId === (declineTarget.id || declineTarget._id)}
        />
      )}
    </div>
  );
}

