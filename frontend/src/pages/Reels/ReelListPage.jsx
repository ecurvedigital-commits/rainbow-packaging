import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, RefreshCw, Eye, Scale, Edit3, Trash2,
  X, RotateCcw, Check, ChevronDown, ChevronUp, Calendar, IndianRupee
} from 'lucide-react';
import { reelApi } from '../../api/reelApi';
import { useAuth } from '../../auth/AuthContext';
import CreateReelModal from './CreateReelModal';
import RecordUsageModal from './RecordUsageModal';
import MasterCorrectionModal from './MasterCorrectionModal';
import VoidReelModal from './VoidReelModal';
import Pagination from '../../components/Common/Pagination';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import { formatWeight, formatDate, formatCurrency, getStatusBadgeClass } from '../../utils/formatters';

const formatMasterCodeBadge = (code) => {
  if (!code) return '';
  const str = String(code).trim();
  if (/^master code/i.test(str)) {
    return str;
  }
  if (/^\d+$/.test(str)) {
    return `Master Code ${str}`;
  }
  return `Master Code: ${str}`;
};

const BASE_FIELDS = [
  { key: 'supplier',       label: 'Supplier Name',        apiKey: 'supplier' },
  { key: 'master_code',    label: 'Master Code',          apiKey: 'master_code' },
  { key: 'paper_quality',  label: 'Paper Quality',        apiKey: 'quality' },
  { key: 'gsm',            label: 'GSM',                  apiKey: 'gsm' },
  { key: 'bf',             label: 'Bursting Factor (BF)', apiKey: 'bf' },
  { key: 'width_mm',       label: 'Size / Width (cm)',    apiKey: 'size' },
  { key: 'status',         label: 'Reel Status',          apiKey: 'status' },
  { key: 'station',        label: 'Station Used',         apiKey: 'station' },
];

const EMPTY_FILTER_VALUES = {
  supplier: [], master_code: [], paper_quality: [], gsm: [],
  bf: [], width_mm: [], status: [], station: [],
};

export default function ReelListPage() {
  const { isRoleAdmin, isRoleSupervisor, isRoleOperator } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [usageReel,      setUsageReel]        = useState(null);
  const [correctionReel, setCorrectionReel]   = useState(null);
  const [voidReel,       setVoidReel]         = useState(null);

  const [reels,   setReels]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [pagination, setPagination] = useState({
    page:       parseInt(searchParams.get('page')  || '1',  10),
    limit:      parseInt(searchParams.get('limit') || '15', 10),
    total:      0,
    totalPages: 1,
  });

  // Set of field keys that are currently "open" (expanded) — multiple allowed
  const [openFields, setOpenFields] = useState(new Set(['supplier']));

  // Per-field selected values (each is an array)
  const [filterValues, setFilterValues] = useState(() => {
    const statusParam = searchParams.get('status');
    const initialStatus = statusParam ? statusParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : [];
    return { ...EMPTY_FILTER_VALUES, status: initialStatus };
  });

  // Free-text search
  const [searchQ, setSearchQ] = useState(searchParams.get('q') || '');

  // Creation Date Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  // Dropdown options from backend
  const [filterOptions, setFilterOptions] = useState({
    qualities: [], gsms: [], bfs: [], sizes: [],
    suppliers: [], master_codes: [], statuses: [], stations: [],
    custom_fields: [],
  });

  // Date preset helpers
  const handleTodayFilter = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateFrom(today);
    setDateTo(today);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handle7DaysFilter = () => {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(end.toISOString().split('T')[0]);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleMonthFilter = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(end.toISOString().split('T')[0]);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  // ── Fetch filter options ────────────────────────────────────────────────
  useEffect(() => {
    reelApi.getFilterOptions()
      .then((res) => {
        console.log('[ReelListPage] Loaded Filter Options:', res?.data);
        if (res.success && res.data) {
          setFilterOptions({
            qualities:     res.data.qualities     || [],
            gsms:          res.data.gsms          || [],
            bfs:           res.data.bfs           || [],
            sizes:         res.data.sizes         || [],
            suppliers:     res.data.suppliers     || [],
            master_codes:  (res.data.master_codes || [])
              .filter((code) => Boolean(code) && !/^[A-Z]+-G\d+-BF\d+-S\d+/.test(code)),
            statuses:      res.data.statuses      || [],
            stations:      res.data.stations      || [],
            custom_fields: res.data.custom_fields || [],
          });
        }
      })
      .catch((err) => console.error('[ReelListPage] Failed to load filter options:', err));
  }, []);

  // ── Build API params ────────────────────────────────────────────────────
  const buildApiParams = useCallback(() => {
    const params = { page: pagination.page, limit: pagination.limit };
    if (searchQ.trim()) params.q = searchQ.trim();
    if (dateFrom) params.purchase_date_from = dateFrom;
    if (dateTo)   params.purchase_date_to   = dateTo;

    const csv = (arr) => (Array.isArray(arr) && arr.length ? arr.join(',') : undefined);

    if (csv(filterValues.supplier))       params.supplier     = csv(filterValues.supplier);
    if (csv(filterValues.master_code))    params.master_code  = csv(filterValues.master_code);
    if (csv(filterValues.paper_quality))  params.quality      = csv(filterValues.paper_quality);
    if (csv(filterValues.gsm))            params.gsm          = csv(filterValues.gsm);
    if (csv(filterValues.bf))             params.bf           = csv(filterValues.bf);
    if (csv(filterValues.width_mm))       params.size         = csv(filterValues.width_mm);
    if (csv(filterValues.status))         params.status       = csv(filterValues.status);
    if (csv(filterValues.station))        params.station      = csv(filterValues.station);

    if (searchParams.get('aging')) {
      params.aging_days = searchParams.get('aging');
    }

    // Custom fields
    Object.keys(filterValues).forEach((k) => {
      if (k.startsWith('cf.') && csv(filterValues[k])) {
        params[k] = csv(filterValues[k]);
      }
    });
    return params;
  }, [pagination.page, pagination.limit, filterValues, searchQ, dateFrom, dateTo]);

  // ── Fetch reels ────────────────────────────────────────────────────────
  const fetchReels = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = buildApiParams();
    console.log('[ReelListPage] Fetching Reels with API Params:', params);
    try {
      const response = await reelApi.getReels(params);
      const items    = response.data || [];
      console.log(`[ReelListPage] Received ${items.length} Reels:`, items);
      setReels(items);
      const meta = response.meta?.pagination || response.meta || {};
      if (meta) {
        console.log('[ReelListPage] Pagination Meta:', meta);
        setPagination((prev) => ({
          ...prev,
          page:       meta.page       || prev.page,
          limit:      meta.limit      || prev.limit,
          total:      meta.total      !== undefined ? meta.total : items.length,
          totalPages: meta.totalPages || 1,
        }));
      }
    } catch (err) {
      console.error('[ReelListPage] Error fetching reels:', err);
      setError(err.message || 'Failed to fetch reels.');
    } finally {
      setLoading(false);
    }
  }, [buildApiParams]);

  useEffect(() => { fetchReels(); }, [fetchReels]);

  // ── Field chip toggle (open/close the sub-value panel) ─────────────────
  const toggleFieldOpen = (fieldKey) => {
    setOpenFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  // ── Sub-value toggle ───────────────────────────────────────────────────
  const toggleValue = (fieldKey, value) => {
    console.log(`[ReelListPage] Toggling Filter [${fieldKey}]:`, value);
    setFilterValues((prev) => {
      const current = Array.isArray(prev[fieldKey]) ? prev[fieldKey] : [];
      const exists  = current.includes(String(value));
      return {
        ...prev,
        [fieldKey]: exists ? current.filter((v) => v !== String(value)) : [...current, String(value)],
      };
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFieldFilter = (fieldKey) => {
    setFilterValues((prev) => ({ ...prev, [fieldKey]: [] }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetAll = () => {
    setSearchQ('');
    setFilterValues(EMPTY_FILTER_VALUES);
    setOpenFields(new Set(['supplier']));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // ── Option lists ────────────────────────────────────────────────────────
  const getOptionsForField = (fieldKey) => {
    switch (fieldKey) {
      case 'paper_quality': return filterOptions.qualities;
      case 'gsm':           return filterOptions.gsms;
      case 'bf':            return filterOptions.bfs;
      case 'width_mm':      return filterOptions.sizes;
      case 'supplier':      return filterOptions.suppliers;
      case 'master_code':   return filterOptions.master_codes;
      case 'status':        return filterOptions.statuses;
      case 'station':       return filterOptions.stations;
      default:
        if (fieldKey.startsWith('cf.')) {
          const cf = filterOptions.custom_fields.find((c) => c.key === fieldKey.replace('cf.', ''));
          return cf?.options || [];
        }
        return [];
    }
  };

  const allFields = [
    ...BASE_FIELDS,
    ...filterOptions.custom_fields.map((cf) => ({
      key:    `cf.${cf.key}`,
      label:  `${cf.name} (Custom)`,
      apiKey: `cf.${cf.key}`,
    })),
  ];

  const canAction = isRoleAdmin || isRoleSupervisor || isRoleOperator;

  const totalActiveCount = Object.values(filterValues)
    .reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const filteredTotalWeight = reels.reduce((sum, r) => sum + (r.previous_weight ?? r.current_weight_kg ?? r.max_weight ?? 0), 0);
  const filteredTotalPrice = Math.round(filteredTotalWeight * 55);

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reel Inventory</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Manage paper reels, track weights, record usage, and apply master corrections across database.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchReels}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition"
            title="Refresh list">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canAction && (
            <button onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition">
              <Plus className="w-4 h-4" />
              Create New Reel
            </button>
          )}
        </div>
      </div>

      {/* ── Inventory Live Summary Card ───────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6 sm:gap-10">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Reels in View</p>
            <p className="text-2xl font-extrabold text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
              {pagination.total || reels.length}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-700/60 hidden sm:block" />
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Stock Weight</p>
            <p className="text-2xl font-extrabold text-indigo-300" style={{ fontFamily: 'var(--font-family-display)' }}>
              {formatWeight(filteredTotalWeight)}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-700/60 hidden sm:block" />
          <div>
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" /> Total Stock Price Value
            </p>
            <p className="text-2xl font-extrabold text-emerald-400" style={{ fontFamily: 'var(--font-family-display)' }}>
              {formatCurrency(filteredTotalPrice)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Panel ───────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">

        {/* Search + Reset */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
              placeholder="Search reel #, barcode, supplier, master code..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>
          {(totalActiveCount > 0 || searchQ || dateFrom || dateTo) && (
            <button onClick={() => { handleResetAll(); clearDateFilter(); }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          )}
        </div>

        {/* Creation Date Filter Row */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
              <Calendar className="w-4 h-4 text-indigo-500" /> Filter by Creation Date:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                title="From Date"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                title="To Date"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={handleTodayFilter} className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition">Today</button>
            <button onClick={handle7DaysFilter} className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition">Last 7 Days</button>
            <button onClick={handleMonthFilter} className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition">This Month</button>
            {(dateFrom || dateTo) && (
              <button onClick={clearDateFilter} className="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline">Clear Date</button>
            )}
          </div>
        </div>

        {/* Step 1 — Field chips (multi-selectable) */}
        <div className="px-4 pt-3 pb-2 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Select filter fields — click one or more, then pick values below
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {allFields.map((f) => {
              const isOpen    = openFields.has(f.key);
              const vals      = Array.isArray(filterValues[f.key]) ? filterValues[f.key] : [];
              const hasFilter = vals.length > 0;

              return (
                <button
                  key={f.key}
                  onClick={() => toggleFieldOpen(f.key)}
                  className={`
                    px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5
                    ${isOpen && hasFilter
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow ring-2 ring-indigo-200 dark:ring-indigo-800'
                      : isOpen
                        ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700 shadow ring-1 ring-indigo-200 dark:ring-indigo-800'
                        : hasFilter
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <span>{f.label}</span>
                  {hasFilter && (
                    <span className={`
                      inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full
                      ${isOpen ? 'bg-white/30 text-white' : 'bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-100'}
                    `}>
                      {vals.length}
                    </span>
                  )}
                  {isOpen
                    ? <ChevronUp   className="w-3 h-3 opacity-60" />
                    : <ChevronDown className="w-3 h-3 opacity-40" />
                  }
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 — Sub-value panels (one per open field) */}
        {openFields.size > 0 && (
          <div className="px-4 pb-4 space-y-3 mt-1">
            {allFields
              .filter((f) => openFields.has(f.key))
              .map((f) => {
                const options  = getOptionsForField(f.key);
                const selected = Array.isArray(filterValues[f.key]) ? filterValues[f.key] : [];

                return (
                  <div key={f.key}
                    className="p-3 bg-indigo-50/60 dark:bg-slate-900/60 rounded-xl border border-indigo-100 dark:border-slate-700/60 space-y-2">

                    {/* Panel header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                        {f.label}
                        <span className="text-indigo-400 font-normal">
                          ({options.length} in DB{selected.length > 0 ? `, ${selected.length} selected` : ''})
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        {selected.length > 0 && (
                          <button onClick={() => clearFieldFilter(f.key)}
                            className="text-[11px] text-rose-500 hover:underline flex items-center gap-0.5">
                            <X className="w-3 h-3" /> Clear
                          </button>
                        )}
                        <button onClick={() => toggleFieldOpen(f.key)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Value chips */}
                    {options.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* "All" chip */}
                        <button
                          onClick={() => clearFieldFilter(f.key)}
                          className={`
                            px-2.5 py-1 text-xs font-semibold rounded-lg border transition
                            ${selected.length === 0
                              ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900'
                              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}
                          `}
                        >
                          All
                        </button>

                        {options.map((opt) => {
                          const strOpt  = String(opt);
                          const isChosen = selected.includes(strOpt);
                          return (
                            <button
                              key={strOpt}
                              onClick={() => toggleValue(f.key, strOpt)}
                              className={`
                                px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5
                                ${isChosen
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-slate-700/60'}
                              `}
                            >
                              {isChosen && <Check className="w-3 h-3 shrink-0" />}
                              <span>{f.key === 'master_code' ? formatMasterCodeBadge(strOpt) : strOpt}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No registered values found in database for this field.
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Active filter tag summary */}
        {totalActiveCount > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Filters ({totalActiveCount}):
            </span>
            {allFields.map((f) => {
              const vals = Array.isArray(filterValues[f.key]) ? filterValues[f.key] : [];
              if (!vals.length) return null;
              return vals.map((v) => (
                <span key={`${f.key}:${v}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full border border-indigo-200 dark:border-indigo-800">
                  <span className="text-indigo-400 font-medium">{f.label}:</span>
                  <strong>{v}</strong>
                  <button onClick={() => toggleValue(f.key, v)}
                    className="hover:text-indigo-900 dark:hover:text-white p-0.5 rounded-full hover:bg-indigo-200/50">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ));
            })}
          </div>
        )}
      </div>

      {/* Error */}
      {error && <ErrorAlert message={error} onRetry={fetchReels} />}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingState message="Loading reel inventory..." />
      ) : reels.length === 0 ? (
        <EmptyState
          title="No Reels Found"
          message="No paper reels match your current filter criteria or search query."
          actionText={canAction ? 'Create Reel' : null}
          onAction={canAction ? () => setShowCreateModal(true) : null}
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-3">Reel / Barcode</th>
                  <th className="px-6 py-3">Specifications</th>
                  <th className="px-6 py-3">Supplier / Location</th>
                  <th className="px-6 py-3 text-right">Net Weight</th>
                  <th className="px-6 py-3 text-right">Stock Price</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {reels.map((reel) => {
                  const reelId        = reel.id || reel._id;
                  const isVoided      = reel.status === 'VOIDED' || reel.record_status === 'VOIDED';
                  const currentWeight = reel.previous_weight ?? reel.current_weight_kg ?? reel.max_weight;
                  const initialWeight = reel.max_weight ?? reel.initial_weight_kg;
                  const itemPrice     = Math.round((currentWeight || 0) * 55);

                  return (
                    <tr key={reelId || reel.sr_no}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                      onClick={() => navigate(`/reels/${reelId}`)}>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          Reel #{reel.reel_no || reel.reel_number}
                        </div>
                        {reel.master_code && (
                          <div className="mt-1">
                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px] rounded-md tracking-wider border border-indigo-200 dark:border-indigo-800">
                              {formatMasterCodeBadge(reel.master_code)}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {reel.quality || reel.paper_quality}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {reel.gsm} GSM • {reel.bf} BF • {reel.size || reel.width_mm} cm
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-slate-800 dark:text-slate-200">
                          {reel.supplier_name || reel.supplier || 'N/A'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          SRNO: #{reel.sr_no}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {formatWeight(currentWeight)}
                        </div>
                        <div className="text-xs text-slate-400">
                          Orig: {formatWeight(initialWeight)}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(itemPrice)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(reel.status)}`}>
                          {reel.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(reel.purchase_date || reel.created_at || reel.createdAt)}
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => navigate(`/reels/${reelId}`)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            title="View Reel Details">
                            <Eye className="w-4 h-4" />
                          </button>

                          {!isVoided && canAction && reel.status !== 'NILL' && reel.status !== 'DEPLETED' && (
                            <button onClick={() => setUsageReel(reel)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              title="Record Weight Usage">
                              <Scale className="w-4 h-4" />
                            </button>
                          )}

                          {isRoleAdmin && !isVoided && (
                            <button onClick={() => setCorrectionReel(reel)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              title="Master Correction">
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {isRoleAdmin && !isVoided && (
                            <button onClick={() => setVoidReel(reel)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              title="Void Reel">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateReelModal isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); fetchReels(); }} />
      )}
      {usageReel && (
        <RecordUsageModal isOpen={Boolean(usageReel)} reel={usageReel}
          onClose={() => setUsageReel(null)}
          onSuccess={() => { setUsageReel(null); fetchReels(); }} />
      )}
      {correctionReel && (
        <MasterCorrectionModal isOpen={Boolean(correctionReel)} reel={correctionReel}
          onClose={() => setCorrectionReel(null)}
          onSuccess={() => { setCorrectionReel(null); fetchReels(); }} />
      )}
      {voidReel && (
        <VoidReelModal isOpen={Boolean(voidReel)} reel={voidReel}
          onClose={() => setVoidReel(null)}
          onSuccess={() => { setVoidReel(null); fetchReels(); }} />
      )}
    </div>
  );
}
