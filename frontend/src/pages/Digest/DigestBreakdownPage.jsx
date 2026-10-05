import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Scale, Layers, Activity, Sparkles, RefreshCw, ExternalLink
} from 'lucide-react';
import ReelMark from '../../components/ReelMark';
import { digestApi } from '../../api/digestApi';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import { formatWeight } from '../../utils/formatters';

export default function DigestBreakdownPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().split('T')[0];
  const fromDate = searchParams.get('fromDate') || todayStr;
  const toDate = searchParams.get('toDate') || fromDate;

  const [digestData, setDigestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');

  const fetchDigest = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await digestApi.getDailyDigest({ fromDate, toDate });
      setDigestData(response.data || null);
    } catch (err) {
      setError(err.message || 'Failed to fetch paper consumption breakdown.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDigest();
  }, [fromDate, toDate]);

  if (loading) {
    return <LoadingState message="Loading paper quality consumption breakdown..." />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/digest')}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inventory Digest</span>
        </button>
        <ErrorAlert message={error} onRetry={fetchDigest} />
      </div>
    );
  }

  const dateDisplay = digestData?.date || (fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`);
  const totalWeight = digestData?.total_weight_consumed_kg || 0;
  const breakdownMap = digestData?.quality_breakdown || {};
  const detailsMap = digestData?.quality_details || {};

  const entriesList = Object.entries(breakdownMap).map(([quality, weight]) => {
    const details = detailsMap[quality] || {};
    const percent = totalWeight > 0 ? Math.round((weight / totalWeight) * 1000) / 10 : 0;
    return {
      quality,
      weight,
      percent,
      details,
    };
  });

  const totalLogsCount = entriesList.reduce((acc, item) => acc + (item.details.entries?.length || 0), 0);

  const filtered = entriesList.filter((item) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      item.quality.toLowerCase().includes(q) ||
      (item.details.entries &&
        item.details.entries.some(
          (e) =>
            e.reel_no.toLowerCase().includes(q) ||
            e.supplier_name.toLowerCase().includes(q) ||
            e.master_code.toLowerCase().includes(q) ||
            e.station.toLowerCase().includes(q) ||
            e.performed_by.toLowerCase().includes(q)
        ))
    );
  });

  const handleReelClick = (reelId) => {
    if (reelId) {
      navigate(`/reels/${reelId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/digest')}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 transition"
            title="Back to Inventory Digest"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-family-display)' }}>
                <ReelMark size={28} />
                Paper Consumption Breakdown
              </h1>
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs font-mono font-bold">
                {dateDisplay}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Detailed paper quality grade consumption metrics, share percentages, and individual reel log entries.
            </p>
          </div>
        </div>

        <button
          onClick={fetchDigest}
          className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 transition shadow-sm flex items-center gap-2 self-start sm:self-auto text-xs font-semibold"
          title="Refresh Report"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Consumed</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              {formatWeight(totalWeight)}
            </p>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Quality Grades</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              {entriesList.length} Grades
            </p>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Usage Entries Logged</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              {totalLogsCount} Logs
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search quality spec, reel #, master code, supplier, station..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>
        {filterQuery && (
          <button
            onClick={() => setFilterQuery('')}
            className="px-3 py-2 text-xs text-rose-600 font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Content Breakdown List */}
      <div className="space-y-6">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm italic bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            No matching paper quality records found for {dateDisplay}.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.quality}
              className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
            >
              {/* Quality Header & Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-family-display)' }}>
                    <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 inline-block ring-4 ring-indigo-100 dark:ring-indigo-950" />
                    {item.quality}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {item.details.entries?.length || 0} production usage entries recorded for {dateDisplay}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="bg-indigo-50 dark:bg-indigo-950/60 px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Total Weight</span>
                    <span className="font-mono font-extrabold text-indigo-700 dark:text-indigo-300 text-lg">
                      {formatWeight(item.weight)}
                    </span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Share</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-lg">
                      {item.percent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700/60">
                <div
                  className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400 h-full rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.min(100, Math.max(2, item.percent))}%` }}
                />
              </div>

              {/* Reel Logs Table */}
              {item.details.entries && item.details.entries.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Individual Reel Logged Entries (Click any row to view full Reel Detail page):
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <th className="py-3 px-4 font-bold">Reel #</th>
                          <th className="py-3 px-4 font-bold">Master Code</th>
                          <th className="py-3 px-4 font-bold">Supplier</th>
                          <th className="py-3 px-4 font-bold">Station</th>
                          <th className="py-3 px-4 font-bold text-right">Used Weight</th>
                          <th className="py-3 px-4 font-bold">Operator</th>
                          <th className="py-3 px-4 font-bold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
                        {item.details.entries.map((log) => (
                          <tr
                            key={log.id}
                            onClick={() => handleReelClick(log.reel_id)}
                            className="hover:bg-indigo-50/60 dark:hover:bg-slate-700/60 cursor-pointer transition group"
                            title={`Click to view Reel #${log.reel_no} detail page`}
                          >
                            <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-1.5">
                              #{log.reel_no}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px] rounded-md border border-indigo-200 dark:border-indigo-800">
                                {log.master_code}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium">{log.supplier_name}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-semibold rounded-md text-[10px]">
                                {log.station}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-right">
                              {formatWeight(log.weight_used)}
                            </td>
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{log.performed_by}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition inline-block">
                                View Reel &rarr;
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
