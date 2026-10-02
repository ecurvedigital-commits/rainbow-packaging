import React, { useState, useEffect } from 'react';
import { Calendar, FileSpreadsheet, RefreshCw, Scale, AlertCircle, ArrowDownRight, Package } from 'lucide-react';
import { digestApi } from '../../api/digestApi';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import { formatWeight, formatDate } from '../../utils/formatters';

export default function DailyDigestPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [digestData, setDigestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDigest = async (selectedDate) => {
    setLoading(true);
    setError(null);
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
        </div>
      </div>

      {/* Error alert */}
      {error && <ErrorAlert message={error} onRetry={() => fetchDigest(date)} />}

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
                {formatWeight(digestData.total_weight_consumed_kg || digestData.total_consumed || 0)}
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
                {digestData.reels_created_count || digestData.reels_added || 0}
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
                {digestData.reels_depleted_count || digestData.depleted_reels || 0}
              </div>
              <p className="text-xs text-slate-400">Reels consumed down to core</p>
            </div>
          </div>

          {/* Breakdown by Paper Quality */}
          {digestData.quality_breakdown && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Consumption Breakdown by Paper Quality
              </h3>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {Object.entries(digestData.quality_breakdown).map(([quality, weight]) => (
                  <div key={quality} className="py-3 flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{quality}</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {formatWeight(weight)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
