import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, History, Clock, ArrowRight, ShieldCheck, User, 
  MapPin, Scale, Layers, Calendar, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { reelApi } from '../../api/reelApi';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import Pagination from '../../components/Common/Pagination';
import { formatWeight, formatDate, formatDateTime, getStatusBadgeStyle } from '../../utils/formatters';

export default function ReelJourneyModal({ reelId, reelNo: initialReelNo, onClose }) {
  const [reel, setReel] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const fetchJourney = useCallback(async () => {
    if (!reelId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await reelApi.getJourney(reelId, {
        page: pagination.page,
        limit: pagination.limit,
      });

      const payload = res.data || res;
      setReel(payload.reel || null);
      setEvents(payload.events || []);

      const meta = res.meta || payload.meta || {};
      setPagination((prev) => ({
        ...prev,
        page: meta.page || prev.page,
        limit: meta.limit || prev.limit,
        total: meta.total !== undefined ? meta.total : (payload.events?.length || 0),
        totalPages: meta.totalPages || 1,
      }));
    } catch (err) {
      setError(err.message || 'Failed to load reel journey history.');
    } finally {
      setLoading(false);
    }
  }, [reelId, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchJourney();
  }, [fetchJourney]);

  const displayReelNo = reel?.reel_no || initialReelNo || 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-4xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/30">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                Complete Reel Journey: Reel #{displayReelNo}
              </h2>
              <p className="text-xs text-slate-400">
                Full chronological history from creation to current status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Reel Overview Header Card */}
          {reel && (
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                    Reel #{reel.reel_no}
                  </span>
                  {/* {reel.master_key && (
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 font-mono font-bold text-xs rounded-lg">
                      {reel.master_key}
                    </span>
                  )} */}
                  {reel.master_code && (
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 font-mono font-bold text-xs rounded-lg">
                      {reel.master_code}
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeStyle(reel.status)}`}>
                    {reel.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  SR NO: #{reel.sr_no} | Purchased: {formatDate(reel.purchase_date)}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <div>
                  <span className="text-slate-500 block">Initial Max Weight</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold">
                    {formatWeight(reel.max_weight)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Weight</span>
                  <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {formatWeight(reel.previous_weight ?? reel.max_weight)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Consumed Weight</span>
                  <strong className="text-amber-600 dark:text-amber-400 font-bold">
                    {formatWeight((reel.max_weight || 0) - (reel.previous_weight != null ? reel.previous_weight : (reel.max_weight || 0)))}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Supplier</span>
                  <strong className="text-slate-800 dark:text-slate-200 truncate block">
                    {reel.supplier_name || 'N/A'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Loading / Error States */}
          {loading ? (
            <LoadingState message="Loading reel timeline events..." />
          ) : error ? (
            <ErrorAlert message={error} onRetry={fetchJourney} />
          ) : events.length === 0 ? (
            <EmptyState
              title="No Timeline Events Recorded"
              message="No history logs found for this reel."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  Chronological Event Timeline ({pagination.total} Total Events)
                </h3>
                <span className="text-xs text-slate-400">
                  Showing Page {pagination.page} of {pagination.totalPages}
                </span>
              </div>

              {/* Timeline Items */}
              <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700 space-y-6">
                {events.map((ev, index) => {
                  const evId = ev.id || ev._id;
                  const isUsage = ev.event_type === 'USAGE_LOGGED';
                  const isCreated = ev.event_type === 'CREATED';
                  const payload = ev.payload || {};
                  const decision = ev.decision;

                  const prevW = payload.previous_weight;
                  const currW = payload.current_weight_entered;
                  const usedW = payload.used_this_time;

                  return (
                    <div key={evId || index} className="relative group">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white dark:bg-slate-900 ${
                        isCreated
                          ? 'border-blue-500 text-blue-500'
                          : isUsage
                          ? 'border-amber-500 text-amber-500'
                          : 'border-purple-500 text-purple-500'
                      }`} />

                      {/* Event Card */}
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                              isCreated
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                : isUsage
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                            }`}>
                              {ev.event_type}
                            </span>

                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              ev.approval_status === 'CONFIRMED' || ev.approval_status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : ev.approval_status === 'DECLINED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}>
                              {ev.approval_status || 'PENDING'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 font-medium">
                            {formatDateTime(ev.performed_at)}
                          </div>
                        </div>

                        {/* Event Details */}
                        <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>Operator: <strong className="text-slate-900 dark:text-white font-semibold">{ev.performed_by_name || 'System Operator'}</strong></span>
                            {payload.station && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                  <MapPin className="w-3 h-3 text-rose-500" />
                                  Station: <strong>{payload.station}</strong>
                                </span>
                              </>
                            )}
                          </div>

                          {isUsage && (
                            <div className="flex items-center gap-2 mt-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs">
                              <span>Prev: <strong>{formatWeight(prevW)}</strong></span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <span>Entered: <strong>{formatWeight(currW)}</strong></span>
                              {usedW !== undefined && (
                                <span className="ml-auto font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                  Consumed: {formatWeight(usedW)}
                                </span>
                              )}
                            </div>
                          )}

                          {isCreated && (
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 text-xs">
                              Initial Registration Max Weight: <strong>{formatWeight(payload.max_weight)}</strong>
                            </div>
                          )}

                          {/* Decision / Reviewer Details */}
                          {decision && (
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                              <div>
                                Reviewed by: <strong className="text-slate-700 dark:text-slate-300">{decision.by_name}</strong> on {formatDate(decision.at)}
                              </div>
                              {decision.reason && (
                                <div className="text-rose-600 font-mono bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                                  Reason: {decision.reason}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
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

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition"
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
}
