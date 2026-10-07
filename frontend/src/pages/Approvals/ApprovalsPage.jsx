import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, Clock, Check, X, ShieldCheck, 
  RefreshCw, ArrowRight, Search, Eye, History,
  Wrench, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Loader2, Sparkles, ExternalLink
} from 'lucide-react';
import { approvalApi } from '../../api/approvalApi';
import { correctionApi } from '../../api/correctionApi';
import { useAuth } from '../../auth/AuthContext';
import DeclineReasonModal from './DeclineReasonModal';
import ReelJourneyModal from './ReelJourneyModal';
import MasterCorrectionModal from '../Reels/MasterCorrectionModal';
import Pagination from '../../components/Common/Pagination';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import Toast from '../../components/Common/Toast';
import { formatWeight, formatDate, formatDateTime } from '../../utils/formatters';

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const { isRoleAdmin, isRoleSupervisor } = useAuth();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'corrections' | 'history'

  const [pendingItems, setPendingItems] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [correctionItems, setCorrectionItems] = useState([]);
  const [pendingCorrectionCount, setPendingCorrectionCount] = useState(0);

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
  const [journeyTarget, setJourneyTarget] = useState(null); // { reelId, reelNo }
  const [toast, setToast] = useState(null);

  // Correction specific modal & prompt state
  const [selectedCorrectionForEdit, setSelectedCorrectionForEdit] = useState(null);
  const [correctionRejectTarget, setCorrectionRejectTarget] = useState(null);
  const [correctionRejectReason, setCorrectionRejectReason] = useState('');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
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
      setPagination((prev) => ({
        ...prev,
        page: meta.page || prev.page,
        limit: meta.limit || prev.limit,
        total: meta.total !== undefined ? meta.total : items.length,
        totalPages: meta.totalPages || 1,
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
      setPagination((prev) => ({
        ...prev,
        page: meta.page || prev.page,
        limit: meta.limit || prev.limit,
        total: meta.total !== undefined ? meta.total : items.length,
        totalPages: meta.totalPages || 1,
      }));
    } catch (err) {
      setError(err.message || 'Failed to load approval history.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchCorrections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (filters.q.trim()) params.reel_no = filters.q.trim();
      if (filters.status) params.status = filters.status;

      const response = await correctionApi.list(params);
      const items = response.data || response.items || [];
      setCorrectionItems(items);
      const meta = response.meta?.pagination || response.meta || {};
      setPagination((prev) => ({
        ...prev,
        page: meta.page || prev.page,
        limit: meta.limit || prev.limit,
        total: meta.total !== undefined ? meta.total : items.length,
        totalPages: meta.totalPages || 1,
      }));

      // Also refresh pending correction badge count
      const countRes = await correctionApi.getPendingCount();
      if (countRes.success) {
        setPendingCorrectionCount(countRes.data?.count || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to load reel correction requests.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  // Global badge update
  useEffect(() => {
    correctionApi.getPendingCount().then((res) => {
      if (res.success) setPendingCorrectionCount(res.data?.count || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPending();
    } else if (activeTab === 'corrections') {
      fetchCorrections();
    } else {
      fetchHistory();
    }
  }, [activeTab, fetchPending, fetchCorrections, fetchHistory]);

  const handleApprove = async (approvalId) => {
    if (!canApprove) return;
    setActionLoadingId(approvalId);
    try {
      await approvalApi.approve(approvalId);
      setToast({ type: 'success', message: 'Approval request confirmed successfully!' });
      setSelectedDetailItem(null);
      fetchPending();
    } catch (err) {
      if (err.message?.toLowerCase().includes('already been decided')) {
        setToast({ type: 'info', message: 'This entry has already been decided. Refreshing list...' });
        fetchPending();
      } else {
        setToast({ type: 'error', message: err.message || 'Failed to confirm request.' });
      }
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
      if (err.message?.toLowerCase().includes('already been decided')) {
        setToast({ type: 'info', message: 'This entry has already been decided. Refreshing list...' });
        fetchPending();
      } else {
        setToast({ type: 'error', message: err.message || 'Failed to decline request.' });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApplyCorrectionDirect = async (corrId, messageNote) => {
    if (!isRoleAdmin) return;
    setActionLoadingId(corrId);
    try {
      const res = await correctionApi.resolve(corrId, {
        reason: messageNote || 'Operator Correction Applied',
      });
      if (res.success) {
        setToast({ type: 'success', message: 'Reel correction applied directly to master database!' });
        fetchCorrections();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to apply correction.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectCorrectionSubmit = async () => {
    if (!correctionRejectTarget || !correctionRejectReason.trim()) return;
    const targetId = correctionRejectTarget.id || correctionRejectTarget._id;
    setActionLoadingId(targetId);
    try {
      const res = await correctionApi.reject(targetId, {
        reason: correctionRejectReason.trim(),
      });
      if (res.success) {
        setToast({ type: 'success', message: 'Correction request declined.' });
        setCorrectionRejectTarget(null);
        setCorrectionRejectReason('');
        fetchCorrections();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to decline correction.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenReel = (item) => {
    const reelId = item.reel_id || item.reel?.id || item.reel?._id;
    if (reelId) {
      navigate(`/reels/${reelId}`);
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-family-display)' }}>
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Approvals & Correction Queue
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Review FIFO reel creations, machine consumption entries, and operator correction requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeTab === 'pending') fetchPending();
              else if (activeTab === 'corrections') fetchCorrections();
              else fetchHistory();
            }}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 transition"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Reel # or Operator..."
              value={filters.q}
              onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              {activeTab === 'corrections' ? (
                <>
                  <option value="PENDING">PENDING</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REJECTED">REJECTED</option>
                </>
              ) : (
                <>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="DECLINED">DECLINED</option>
                </>
              )}
            </select>
          </div>

          <div>
            <select
              value={filters.sort}
              onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 flex-wrap">
        <button
          onClick={() => {
            setActiveTab('pending');
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className={`px-4 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'pending'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Reel Approvals</span>
          {pendingItems.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-full font-bold">
              {pendingItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('corrections');
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className={`px-4 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
            activeTab === 'corrections'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Wrench className="w-4 h-4 text-amber-600" />
          <span>Operator Correction Requests</span>
          {pendingCorrectionCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full font-bold animate-pulse">
              {pendingCorrectionCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            setPagination((prev) => ({ ...prev, page: 1 }));
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
          onRetry={activeTab === 'pending' ? fetchPending : activeTab === 'corrections' ? fetchCorrections : fetchHistory}
        />
      )}

      {/* Tab Content */}
      {loading ? (
        <LoadingState message="Loading items..." />
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
                  className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                    item.has_pending_correction
                      ? 'border-amber-400 dark:border-amber-700 bg-amber-50/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  {/* Clickable Content */}
                  <div
                    onClick={() => handleOpenReel(item)}
                    className="space-y-2 flex-1 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        item.event_type === 'CREATED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        {item.event_type || 'ENTRY'}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center gap-1">
                        <span>Reel #{reelNo}</span>
                        <ExternalLink size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                      {item.waiting_hours !== undefined && (
                        <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded font-mono">
                          Waiting {item.waiting_hours}h
                        </span>
                      )}

                      {/* CORRECTION WARNING BADGE */}
                      {item.has_pending_correction && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white flex items-center gap-1 shadow-xs animate-pulse">
                          <AlertTriangle size={12} />
                          Correction Requested (Hold Review)
                        </span>
                      )}
                    </div>

                    {/* Correction banner note if present */}
                    {item.has_pending_correction && item.pending_correction && (
                      <div className="p-2.5 bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Correction requested by {item.pending_correction.requested_by_name} ({item.pending_correction.category}):</strong>
                          <p className="mt-0.5 italic">&ldquo;{item.pending_correction.message}&rdquo;</p>
                        </div>
                      </div>
                    )}

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
                        {/* {item.payload?.fields?.supplier_name && (
                          <span className="ml-3 text-xs text-slate-500">Supplier: {item.payload.fields.supplier_name}</span>
                        )}
                        {item.payload?.fields?.mill_name && (
                          <span className="ml-3 text-xs text-slate-500">Mill: {item.payload.fields.mill_name}</span>
                        )} */}
                      </div>
                    )}

                    <div className="text-xs text-slate-400 flex items-center gap-4 flex-wrap">
                      <span>Submitted by: <strong className="text-slate-600 dark:text-slate-300">{performedBy}</strong></span>
                      <span>•</span>
                      <span>Date: {formatDate(dateStr)}</span>
                      {/* {(item.reel?.master_key || item.payload?.fields?.master_key) && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                            Master Key: {item.reel?.master_key || item.payload?.fields?.master_key}
                          </span>
                        </>
                      )} */}
                      {(item.reel?.master_code || item.payload?.fields?.master_code) && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                            Master Code: {item.reel?.master_code || item.payload?.fields?.master_code}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => handleOpenReel(item)}
                      className="px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-xl border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Reel</span>
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
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
              onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
            />
          </div>
        )
      ) : activeTab === 'corrections' ? (
        /* CORRECTIONS TAB */
        correctionItems.length === 0 ? (
          <EmptyState
            title="No Correction Requests"
            message="There are no active or past operator correction requests."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {correctionItems.map((corr) => {
              const corrId = corr.id || corr._id;
              const isPending = corr.status === 'PENDING';
              const reqChanges = corr.requested_changes || {};
              const snapshot = corr.current_snapshot || {};

              return (
                <div
                  key={corrId}
                  className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border shadow-sm flex flex-col gap-4 transition ${
                    isPending
                      ? 'border-amber-300 dark:border-amber-700/80'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {corr.reel_id ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/reels/${corr.reel_id}`)}
                            className="font-extrabold text-base text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1 group"
                            title="Open Reel Details"
                          >
                            <span>Reel #{corr.reel_no}</span>
                            <ExternalLink size={13} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                          </button>
                        ) : (
                          <span className="font-extrabold text-base text-slate-900 dark:text-white">
                            Reel #{corr.reel_no}
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          {corr.category?.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            corr.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : corr.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-500 text-white font-bold'
                          }`}
                        >
                          {corr.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Requested by <strong className="text-slate-700 dark:text-slate-200">{corr.requested_by_name}</strong> on {formatDateTime(corr.created_at)}
                      </p>
                    </div>

                    {/* Action buttons */}
                    {isPending && (
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {isRoleSupervisor && (
                          <button
                            type="button"
                            onClick={() => setCorrectionRejectTarget(corr)}
                            disabled={actionLoadingId === corrId}
                            className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition"
                          >
                            Decline
                          </button>
                        )}

                        {isRoleAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedCorrectionForEdit(corr)}
                              disabled={actionLoadingId === corrId}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1"
                            >
                              <Wrench size={13} />
                              <span>Review & Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApplyCorrectionDirect(corrId, corr.message)}
                              disabled={actionLoadingId === corrId}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1"
                            >
                              {actionLoadingId === corrId ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                              <span>Apply Correction</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reason Note */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-200">
                    <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Reason / Note:</span>
                    <p className="leading-relaxed">&ldquo;{corr.message}&rdquo;</p>
                  </div>

                  {/* Comparison Diff */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-gray-50 dark:bg-slate-900/40 rounded-xl border border-gray-200 dark:border-slate-800 space-y-1">
                      <span className="font-bold text-gray-400 uppercase text-[10px]">Current Snapshot</span>
                      <p>Balance Weight: <strong>{formatWeight(snapshot.previous_weight)}</strong></p>
                      <p>Master Code: <strong>{snapshot.master_code || 'None'}</strong></p>
                      <p>Specs: {snapshot.quality} • {snapshot.gsm}GSM • {snapshot.size}cm • BF {snapshot.bf}</p>
                    </div>

                    <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-1">
                      <span className="font-bold text-amber-700 dark:text-amber-400 uppercase text-[10px]">Requested Changes</span>
                      {reqChanges.previous_weight !== undefined && (
                        <p className="text-emerald-700 dark:text-emerald-400 font-bold">New Weight: {formatWeight(reqChanges.previous_weight)}</p>
                      )}
                      {reqChanges.master_code_name && (
                        <p className="text-indigo-700 dark:text-indigo-300 font-bold">New Master Code: {reqChanges.master_code_name}</p>
                      )}
                      {(reqChanges.gsm || reqChanges.size || reqChanges.bf || reqChanges.quality) && (
                        <p className="font-bold">Specs: {reqChanges.quality || snapshot.quality} • {reqChanges.gsm || snapshot.gsm}GSM • {reqChanges.size || snapshot.size}cm • BF {reqChanges.bf || snapshot.bf}</p>
                      )}
                      {reqChanges.reel_no && (
                        <p className="font-bold">New Reel #: #{reqChanges.reel_no}</p>
                      )}
                    </div>
                  </div>

                  {/* Resolution Footnote */}
                  {corr.status !== 'PENDING' && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {corr.status === 'RESOLVED' ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={13} /> Applied by {corr.resolved_by_name || 'Admin'} on {formatDateTime(corr.resolved_at)}
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <XCircle size={13} /> Declined by {corr.resolved_by_name || 'Reviewer'} on {formatDateTime(corr.resolved_at)}: {corr.resolution_note}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
              onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
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
                        onClick={() => handleOpenReel(item)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition group"
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
                        <td className="px-6 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
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
                              handleOpenReel(item);
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Reel</span>
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
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
              onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
            />
          </div>
        )
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

      {/* Correction Reject Reason Prompt */}
      {correctionRejectTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Decline Reel Correction Request</h3>
            <p className="text-xs text-gray-500">Please provide a reason note for declining this operator correction request.</p>
            <textarea
              rows={3}
              required
              className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              placeholder="e.g. Physical inventory verified; original weight is correct."
              value={correctionRejectReason}
              onChange={(e) => setCorrectionRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCorrectionRejectTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectCorrectionSubmit}
                disabled={actionLoadingId === (correctionRejectTarget.id || correctionRejectTarget._id) || !correctionRejectReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                {actionLoadingId && <Loader2 size={14} className="animate-spin" />}
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Correction Edit Modal (Admin) */}
      {selectedCorrectionForEdit && (
        <MasterCorrectionModal
          isOpen={!!selectedCorrectionForEdit}
          reel={{
            id: selectedCorrectionForEdit.reel_id,
            _id: selectedCorrectionForEdit.reel_id,
            reel_no: selectedCorrectionForEdit.requested_changes?.reel_no || selectedCorrectionForEdit.current_snapshot?.reel_no || selectedCorrectionForEdit.reel_no,
            master_code_id: selectedCorrectionForEdit.requested_changes?.master_code_id || selectedCorrectionForEdit.current_snapshot?.master_code_id,
            master_code: selectedCorrectionForEdit.requested_changes?.master_code || selectedCorrectionForEdit.current_snapshot?.master_code,
            quality: selectedCorrectionForEdit.requested_changes?.quality || selectedCorrectionForEdit.current_snapshot?.quality,
            gsm: selectedCorrectionForEdit.requested_changes?.gsm || selectedCorrectionForEdit.current_snapshot?.gsm,
            bf: selectedCorrectionForEdit.requested_changes?.bf || selectedCorrectionForEdit.current_snapshot?.bf,
            size: selectedCorrectionForEdit.requested_changes?.size || selectedCorrectionForEdit.current_snapshot?.size,
            previous_weight: selectedCorrectionForEdit.requested_changes?.previous_weight ?? selectedCorrectionForEdit.current_snapshot?.previous_weight,
            max_weight: selectedCorrectionForEdit.requested_changes?.max_weight ?? selectedCorrectionForEdit.current_snapshot?.max_weight,
            supplier_name: selectedCorrectionForEdit.requested_changes?.supplier_name || selectedCorrectionForEdit.current_snapshot?.supplier_name,
            mill_name: selectedCorrectionForEdit.requested_changes?.mill_name || selectedCorrectionForEdit.current_snapshot?.mill_name,
          }}
          onClose={() => setSelectedCorrectionForEdit(null)}
          onSuccess={async (msg) => {
            setToast({ type: 'success', message: msg });
            try {
              await correctionApi.resolve(selectedCorrectionForEdit.id || selectedCorrectionForEdit._id, {
                reason: 'Master correction executed',
              });
            } catch (_e) {}
            setSelectedCorrectionForEdit(null);
            fetchCorrections();
          }}
        />
      )}
    </div>
  );
}
