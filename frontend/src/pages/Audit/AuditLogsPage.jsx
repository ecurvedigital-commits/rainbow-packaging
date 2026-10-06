import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { History, Search, RefreshCw, Filter, ShieldCheck, User, Calendar, Tag, AlertCircle, CheckCircle2, XCircle, Clock, Eye, X, Code, ExternalLink, ArrowRight } from 'lucide-react';
import { auditApi } from '../../api/auditApi';
import { masterCodeApi } from '../../api/masterCodeApi';
import Pagination from '../../components/Common/Pagination';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import CustomDatePicker from '../../components/Common/CustomDatePicker';
import { formatDate } from '../../utils/formatters';

const formatMasterCodeBadge = (code, payload = null, map = {}) => {
  if (payload?.master_code_name) return payload.master_code_name;
  if (!code) return '';
  const str = String(code).trim();
  if (map && map[str]) return map[str];
  const numOnly = str.replace(/^(master\s*code|code|mc)\s*:?\s*/i, '').trim();
  if (map && map[numOnly]) return map[numOnly];
  return str;
};

const EVENT_TYPE_LABELS = {
  CREATED: { label: 'Reel Created', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  USAGE_LOGGED: { label: 'Usage Logged', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  CONFIRMED: { label: 'Approved', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  DECLINED_REVERTED: { label: 'Declined', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  ADMIN_CORRECTED: { label: 'Admin Corrected', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' }
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [showJsonRaw, setShowJsonRaw] = useState(false);
  const [masterCodeMap, setMasterCodeMap] = useState({});

  useEffect(() => {
    masterCodeApi.list({ status: 'ACTIVE' })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          const map = {};
          res.data.forEach((mc) => {
            const nameOrCode = mc.master_code_name || mc.master_code;
            if (mc.master_code) {
              map[String(mc.master_code).trim()] = nameOrCode;
              map[`Master Code ${mc.master_code}`] = nameOrCode;
            }
            if (mc.master_code_id || mc.id || mc._id) {
              map[String(mc.master_code_id || mc.id || mc._id).trim()] = nameOrCode;
            }
          });
          setMasterCodeMap(map);
        }
      })
      .catch((err) => console.error('[AuditLogsPage] Failed to load master codes:', err));
  }, []);

  const [filters, setFilters] = useState({
    action: '',
    user: '',
    reel_no: '',
    master_code: '',
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
      if (filters.reel_no.trim()) params.reel_no = filters.reel_no.trim();
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
  }, [pagination.page, pagination.limit, filters.action, filters.user, filters.reel_no, filters.startDate, filters.endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      action: '',
      user: '',
      reel_no: '',
      master_code: '',
      startDate: '',
      endDate: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const openAuditDetails = (log) => {
    setSelectedAudit(log);
    setShowJsonRaw(false);
  };

  const displayedLogs = logs.filter(log => {
    if (!filters.master_code.trim()) return true;
    const rawMc = log.master_code || log.payload?.master_code || log.payload?.master_key || '';
    const formattedMc = formatMasterCodeBadge(rawMc, log.payload, masterCodeMap);
    const target = (String(rawMc) + ' ' + String(formattedMc)).toLowerCase();
    return target.includes(filters.master_code.trim().toLowerCase());
  });

  const renderPayloadSummary = (log) => {
    const payload = log.payload || {};
    const parts = [];

    // Reversion / Weight changes
    if (payload.reverted_from !== undefined && payload.reverted_to !== undefined) {
      parts.push(`Reverted: ${payload.reverted_from} kg → ${payload.reverted_to} kg`);
    } else if (payload.previous_weight !== undefined && payload.current_weight_entered !== undefined) {
      parts.push(`Bal: ${payload.previous_weight} kg → ${payload.current_weight_entered} kg`);
    } else if (payload.previous_weight !== undefined && payload.new_weight !== undefined) {
      parts.push(`Adj: ${payload.previous_weight} kg → ${payload.new_weight} kg`);
    }

    if (payload.reel_voided) {
      parts.push(`Reel Voided`);
    }

    if (payload.station) {
      parts.push(`Station: ${payload.station}`);
    }
    if (payload.used_this_time !== undefined) {
      parts.push(`Used: ${payload.used_this_time} kg`);
    }

    if (payload.quality) {
      const specs = [
        payload.quality,
        payload.gsm ? `${payload.gsm} GSM` : null,
        payload.bf ? `${payload.bf} BF` : null,
        payload.size ? `${payload.size} cm` : null,
      ].filter(Boolean).join(' · ');
      parts.push(`Specs: ${specs}`);
    }

    if (payload.supplier_name) {
      parts.push(`Supplier: ${payload.supplier_name}`);
    }

    if (payload.initial_weight !== undefined || payload.max_weight !== undefined) {
      parts.push(`Initial: ${payload.initial_weight ?? payload.max_weight} kg`);
    }

    const reason = log.decline_reason || payload.decline_reason || payload.reason || payload.notes;
    if (reason) {
      parts.push(`Reason: ${reason}`);
    }

    // Keys handled explicitly above
    const handledKeys = new Set([
      'reverted_from', 'reverted_to', 'previous_weight', 'current_weight_entered',
      'new_weight', 'reel_voided', 'station', 'used_this_time', 'quality',
      'gsm', 'bf', 'size', 'supplier_name', 'initial_weight', 'max_weight',
      'decline_reason', 'reason', 'notes', 'master_code', 'master_key'
    ]);

    // Format any remaining payload keys cleanly as "Key: Value"
    Object.entries(payload).forEach(([k, v]) => {
      if (!handledKeys.has(k) && v !== null && v !== undefined && v !== '') {
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
        parts.push(`${label}: ${valStr}`);
      }
    });

    if (parts.length > 0) {
      return (
        <div className="flex flex-wrap gap-1.5 max-w-md">
          {parts.map((part, idx) => (
            <span key={idx} className="inline-block px-2.5 py-1 text-[11px] font-mono rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium shadow-xs">
              {part}
            </span>
          ))}
        </div>
      );
    }

    return <span className="text-slate-400 text-xs italic">-</span>;
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
            Immutable log of all user actions, weight updates, approvals, and inventory changes. Click on any record to view complete details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetFilters}
            className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition"
          >
            Clear Filters
          </button>
          <button
            onClick={fetchLogs}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reel Number</label>
          <input
            type="text"
            name="reel_no"
            value={filters.reel_no}
            onChange={handleFilterChange}
            placeholder="e.g. R-1001"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Master Code</label>
          <input
            type="text"
            name="master_code"
            value={filters.master_code}
            onChange={handleFilterChange}
            placeholder="e.g. VK-20-20"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Action Type</label>
          <select
            name="action"
            value={filters.action}
            onChange={handleFilterChange}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          >
            <option value="">All Actions</option>
            <option value="CREATED">CREATED</option>
            <option value="USAGE_LOGGED">USAGE_LOGGED</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="DECLINED_REVERTED">DECLINED_REVERTED</option>
            <option value="ADMIN_CORRECTED">ADMIN_CORRECTED</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Performed By</label>
          <input
            type="text"
            name="user"
            value={filters.user}
            onChange={handleFilterChange}
            placeholder="Search by user..."
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Start Date</label>
          <CustomDatePicker
            date={filters.startDate}
            onChange={(newDate) => {
              setFilters((prev) => ({ ...prev, startDate: newDate }));
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Start Date"
            className="w-full"
            align="left"
            iconColor="text-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">End Date</label>
          <CustomDatePicker
            date={filters.endDate}
            onChange={(newDate) => {
              setFilters((prev) => ({ ...prev, endDate: newDate }));
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="End Date"
            className="w-full"
            align="right"
            iconColor="text-indigo-500"
          />
        </div>
      </div>

      {/* Error alert */}
      {error && <ErrorAlert message={error} onRetry={fetchLogs} />}

      {/* Audit Logs Table */}
      {loading ? (
        <LoadingState message="Loading audit trail events..." />
      ) : displayedLogs.length === 0 ? (
        <EmptyState
          title="No Audit Events Found"
          message="No activity records match your criteria. Try adjusting the search filters."
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Reel No</th>
                  <th className="px-6 py-3">Master Code</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Performed By</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Details</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {displayedLogs.map((log) => {
                  const eventMeta = EVENT_TYPE_LABELS[log.event_type] || {
                    label: log.event_type || 'UNKNOWN',
                    color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-200'
                  };
                  const rawMasterCode = log.master_code || log.payload?.master_code || log.payload?.master_key;
                  const masterCode = formatMasterCodeBadge(rawMasterCode, log.payload, masterCodeMap);

                  return (
                    <tr
                      key={log.id || log._id}
                      onClick={() => openAuditDetails(log)}
                      className="hover:bg-indigo-50/40 dark:hover:bg-slate-700/60 cursor-pointer transition"
                    >
                      <td className="px-6 py-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {formatDate(log.performed_at || log.created_at)}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {(log.reel_id || log.resource_id) ? (
                          <Link
                            to={`/reels/${log.reel_id || log.resource_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline"
                            title="Open reel details"
                          >
                            {log.reel_no || log.resource_id}
                          </Link>
                        ) : (log.reel_no || '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {masterCode ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                            {masterCode}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${eventMeta.color}`}>
                          {eventMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{log.performed_by_name || log.user?.username || log.user || 'System'}</span>
                          {log.performed_by_role && (
                            <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wide rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {log.performed_by_role}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.approval_status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        ) : log.approval_status === 'CONFIRMED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                          </span>
                        ) : log.approval_status === 'DECLINED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-3.5 h-3.5" /> Declined
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {renderPayloadSummary(log)}
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAuditDetails(log);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 rounded-md transition flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
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
      )}

      {/* Audit Detail Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Audit Event Details</h3>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${EVENT_TYPE_LABELS[selectedAudit.event_type]?.color || 'bg-slate-100 text-slate-800'}`}>
                      {EVENT_TYPE_LABELS[selectedAudit.event_type]?.label || selectedAudit.event_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {selectedAudit.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAudit(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Event Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-xs text-slate-500 uppercase font-semibold block">Reel Number</span>
                  <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-base">
                    {(selectedAudit.reel_id || selectedAudit.resource_id) ? (
                      <Link
                        to={`/reels/${selectedAudit.reel_id || selectedAudit.resource_id}`}
                        className="hover:underline"
                        title="Open reel details"
                      >
                        {selectedAudit.reel_no || selectedAudit.resource_id}
                      </Link>
                    ) : (selectedAudit.reel_no || '-')}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-xs text-slate-500 uppercase font-semibold block">Master Code</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs inline-block px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                    {formatMasterCodeBadge(
                      selectedAudit.master_code || selectedAudit.payload?.master_code || selectedAudit.payload?.master_key,
                      selectedAudit.payload,
                      masterCodeMap
                    ) || 'N/A'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-xs text-slate-500 uppercase font-semibold block">Timestamp</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200 text-xs">
                    {formatDate(selectedAudit.performed_at)}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-xs text-slate-500 uppercase font-semibold block">Performed By</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {selectedAudit.performed_by_name}
                    </span>
                    {selectedAudit.performed_by_role && (
                      <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {selectedAudit.performed_by_role}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-xs text-slate-500 uppercase font-semibold block">Approval Status</span>
                  <div>
                    {selectedAudit.approval_status === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    ) : selectedAudit.approval_status === 'CONFIRMED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                      </span>
                    ) : selectedAudit.approval_status === 'DECLINED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" /> Declined
                      </span>
                    ) : (
                      <span className="text-slate-500 italic text-xs">N/A</span>
                    )}
                  </div>
                </div>

                {selectedAudit.reel_specs && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <span className="text-xs text-slate-500 uppercase font-semibold block">Specifications</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                      {selectedAudit.reel_specs.quality} ({selectedAudit.reel_specs.gsm} GSM · {selectedAudit.reel_specs.bf} BF · {selectedAudit.reel_specs.size} cm)
                    </span>
                  </div>
                )}
              </div>

              {/* Reviewed By & Reasons */}
              {(selectedAudit.approved_by_name || selectedAudit.decline_reason) && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Review Metadata</h4>
                  {selectedAudit.approved_by_name && (
                    <div className="text-sm flex justify-between">
                      <span className="text-slate-500">Reviewed By:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedAudit.approved_by_name} {selectedAudit.approved_at && `(${formatDate(selectedAudit.approved_at)})`}
                      </span>
                    </div>
                  )}
                  {selectedAudit.decline_reason && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-800 dark:text-rose-200 text-xs">
                      <strong>Decline Reason:</strong> {selectedAudit.decline_reason}
                    </div>
                  )}
                </div>
              )}

              {/* Audit Payload Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-500" />
                    Payload & Operational Details
                  </h4>
                  <button
                    onClick={() => setShowJsonRaw(!showJsonRaw)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Code className="w-3.5 h-3.5" />
                    {showJsonRaw ? 'View Key-Value Summary' : 'View Raw JSON'}
                  </button>
                </div>

                {showJsonRaw ? (
                  <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto">
                    {JSON.stringify(selectedAudit.payload || {}, null, 2)}
                  </pre>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60 divide-y divide-slate-200 dark:divide-slate-700/60 overflow-hidden">
                    {Object.entries(selectedAudit.payload || {}).length > 0 ? (
                      Object.entries(selectedAudit.payload).map(([key, val]) => (
                        <div key={key} className="px-4 py-2.5 flex items-center justify-between text-sm">
                          <span className="font-mono text-xs text-slate-500 uppercase">{key.replace(/_/g, ' ')}</span>
                          <span className="font-mono font-semibold text-slate-900 dark:text-white">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-400 text-xs italic">No payload parameters attached to this audit event.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Event Chain Links */}
              {(selectedAudit.ref_event_id || selectedAudit.cascaded_from_event_id) && (
                <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-xs space-y-1 font-mono">
                  {selectedAudit.ref_event_id && (
                    <div className="flex justify-between">
                      <span className="text-indigo-600 dark:text-indigo-400">Reference Event ID:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{selectedAudit.ref_event_id}</span>
                    </div>
                  )}
                  {selectedAudit.cascaded_from_event_id && (
                    <div className="flex justify-between">
                      <span className="text-indigo-600 dark:text-indigo-400">Cascaded From Event ID:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{selectedAudit.cascaded_from_event_id}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={() => setSelectedAudit(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-sm font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
