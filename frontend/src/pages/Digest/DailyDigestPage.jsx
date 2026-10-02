import React, { useState, useEffect } from 'react';
import { Calendar, FileSpreadsheet, RefreshCw, Scale, ArrowDownRight, Package, Send, CheckCircle2, Clock, Mail, AlertTriangle, Activity } from 'lucide-react';
import { digestApi } from '../../api/digestApi';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import { formatWeight, formatDate } from '../../utils/formatters';

export default function DailyDigestPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [digestData, setDigestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sending, setSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState(null);

  const fetchDigest = async (selectedDate) => {
    setLoading(true);
    setError(null);
    setSendSuccessMessage(null);
    try {
      const response = await digestApi.getDailyDigest(selectedDate);
      setDigestData(response.data || null);
    } catch (err) {
      setError(err.message || 'Failed to fetch daily digest report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDigest(date);
  }, [date]);

  const handleSendDigest = async () => {
    if (!window.confirm(`Trigger daily email digest send for ${date}?`)) return;
    setSending(true);
    setSendSuccessMessage(null);
    setError(null);
    try {
      await digestApi.sendDigest(date);
      setSendSuccessMessage(`Daily digest successfully dispatched to administrator recipients!`);
    } catch (err) {
      setError(err.message || 'Failed to send daily digest email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Daily Inventory & Usage Digest
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Summary report of total paper consumption, newly added stock, and depleted reels by date.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium shadow-sm"
            />
          </div>
          <button
            onClick={() => fetchDigest(date)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition"
            title="Refresh Report"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleSendDigest}
            disabled={sending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send Digest Now'}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && <ErrorAlert message={error} onRetry={() => fetchDigest(date)} />}

      {/* Success banner */}
      {sendSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{sendSuccessMessage}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingState message="Calculating daily digest breakdown..." />
      ) : !digestData ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-slate-500 dark:text-slate-400">No digest data available for {date}.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Consumption */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase">Total Paper Used Today</span>
                <Scale className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {formatWeight(digestData.total_weight_consumed_kg || 0)}
              </div>
              <p className="text-xs text-slate-400">Recorded across active production shifts</p>
            </div>

            {/* Reels Issued */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase">New Reels Created</span>
                <Package className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {digestData.reels_created_count || 0}
              </div>
              <p className="text-xs text-slate-400">Reels checked into warehouse</p>
            </div>

            {/* Depleted Reels */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase">Fully Depleted Reels</span>
                <ArrowDownRight className="w-5 h-5 text-rose-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {digestData.reels_depleted_count || 0}
              </div>
              <p className="text-xs text-slate-400">Reels consumed down to core balance</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Breakdown by Paper Quality */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Consumption Breakdown by Quality
              </h3>
              {digestData.quality_breakdown && Object.keys(digestData.quality_breakdown).length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {Object.entries(digestData.quality_breakdown).map(([quality, weight]) => (
                    <div key={quality} className="py-3 flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{quality}</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                        {formatWeight(weight)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic py-4">No paper usage recorded on this date.</p>
              )}
            </div>

            {/* Operational Event Counts */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                Shift Activity Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <span className="text-xs text-slate-500 uppercase block font-semibold mb-1">Usage Logs</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                    {digestData.counts?.usage || 0}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <span className="text-xs text-slate-500 uppercase block font-semibold mb-1">Confirmed</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {digestData.counts?.confirmed || 0}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <span className="text-xs text-slate-500 uppercase block font-semibold mb-1">Declined</span>
                  <span className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
                    {digestData.counts?.declined || 0}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <span className="text-xs text-slate-500 uppercase block font-semibold mb-1">Pending Review</span>
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {digestData.counts?.still_pending || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recipient Distribution List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-500" />
              Digest Email Recipients
            </h3>
            {digestData.recipients && digestData.recipients.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {digestData.recipients.map((email) => (
                  <span
                    key={email}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-mono font-medium"
                  >
                    {email}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No admin recipient email addresses configured.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
