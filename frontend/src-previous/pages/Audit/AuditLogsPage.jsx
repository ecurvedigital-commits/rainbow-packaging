import React, { useState, useEffect, useCallback } from 'react';
import { History, Search, RefreshCw, Filter, ShieldCheck, User, Calendar } from 'lucide-react';
import { auditApi } from '../../api/auditApi';
import Pagination from '../../components/Common/Pagination';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import { formatDate } from '../../utils/formatters';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    action: '',
    user: '',
    startDate: '',
    endDate: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (filters.action.trim()) params.action = filters.action.trim();
      if (filters.user.trim()) params.user = filters.user.trim();
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await auditApi.getAuditLogs(params);
      setLogs(response.data || []);
      if (response.meta?.pagination) {
        setPagination(prev => ({
          ...prev,
          page: response.meta.pagination.page,
          limit: response.meta.pagination.limit,
          total: response.meta.pagination.total,
          totalPages: response.meta.pagination.totalPages
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch audit activity logs.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            System Audit Trail
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Immutable log of all user actions, weight updates, approvals, and inventory changes.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="self-start sm:self-auto p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition"
          title="Refresh Logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Action Type</label>
          <input
            type="text"
            name="action"
            value={filters.action}
            onChange={handleFilterChange}
            placeholder="e.g. REEL_CREATED, WEIGHT_RECORDED"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Username / ID</label>
          <input
            type="text"
            name="user"
            value={filters.user}
            onChange={handleFilterChange}
            placeholder="Filter by user..."
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Start Date</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">End Date</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>
      </div>

      {/* Error alert */}
      {error && <ErrorAlert message={error} onRetry={fetchLogs} />}

      {/* Audit Logs Table */}
      {loading ? (
        <LoadingState message="Loading audit trail..." />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No Audit Records Found"
          message="No system activity events match your filter options."
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Resource / Reel</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-6 py-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                      {formatDate(log.created_at || log.createdAt)}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {log.user?.username || log.user || 'System / Automated'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                      {log.resource_id || log.reel_number || log.target || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-md truncate">
                      {typeof log.details === 'object' 
                        ? JSON.stringify(log.details) 
                        : (log.details || log.description || '-')}
                    </td>
                  </tr>
                ))}
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
      )}
    </div>
  );
}
