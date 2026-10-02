import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, Filter, RefreshCw, Eye, Scale, Edit3, Trash2, ShieldAlert,
  ArrowUpDown, FileSpreadsheet 
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
import { formatWeight, formatDate, getStatusBadgeClass } from '../../utils/formatters';

export default function ReelListPage() {
  const { user, isRoleAdmin, isRoleSupervisor, isRoleOperator } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [usageReel, setUsageReel] = useState(null);
  const [correctionReel, setCorrectionReel] = useState(null);
  const [voidReel, setVoidReel] = useState(null);

  // Data states
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '15', 10),
    total: 0,
    totalPages: 1
  });

  // Dynamic field filter picker state
  const [selectedField, setSelectedField] = useState('');
  const [selectedValue, setSelectedValue] = useState('');

  // Filter options loaded from backend
  const [filterOptions, setFilterOptions] = useState({
    qualities: [],
    gsms: [],
    bfs: [],
    sizes: [],
    suppliers: [],
    master_keys: [],
    statuses: [],
    stations: [],
    custom_fields: []
  });

  // Filter state
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    status: searchParams.get('status') || '',
    paper_quality: searchParams.get('paper_quality') || '',
    gsm: searchParams.get('gsm') || '',
    bf: searchParams.get('bf') || '',
    width_mm: searchParams.get('width_mm') || '',
    supplier: searchParams.get('supplier') || '',
    master_key: searchParams.get('master_key') || '',
    station: searchParams.get('station') || ''
  });

  // Fetch all distinct filter options across ALL reels in DB
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const res = await reelApi.getFilterOptions();
        if (res.success && res.data) {
          setFilterOptions({
            qualities: res.data.qualities || [],
            gsms: res.data.gsms || [],
            bfs: res.data.bfs || [],
            sizes: res.data.sizes || [],
            suppliers: res.data.suppliers || [],
            master_keys: res.data.master_keys || [],
            statuses: res.data.statuses || [],
            stations: res.data.stations || [],
            custom_fields: res.data.custom_fields || []
          });
        }
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    fetchDropdowns();
  }, []);

  // Fetch Reels
  const fetchReels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (filters.q?.trim()) params.q = filters.q.trim();
      if (filters.status) params.status = filters.status;
      if (filters.paper_quality) params.quality = filters.paper_quality;
      if (filters.gsm) params.gsm = filters.gsm;
      if (filters.bf) params.bf = filters.bf;
      if (filters.width_mm) params.size = filters.width_mm;
      if (filters.supplier?.trim()) params.supplier = filters.supplier.trim();
      if (filters.master_key?.trim()) params.master_key = filters.master_key.trim();
      if (filters.station?.trim()) params.station = filters.station.trim();

      Object.keys(filters).forEach((k) => {
        if (k.startsWith('cf.') && filters[k]) {
          params[k] = filters[k];
        }
      });

      const response = await reelApi.getReels(params);
      const items = response.data || [];
      setReels(items);

      const meta = response.meta?.pagination || response.meta || {};
      if (meta) {
        setPagination(prev => ({
          ...prev,
          page: meta.page || prev.page,
          limit: meta.limit || prev.limit,
          total: meta.total !== undefined ? meta.total : items.length,
          totalPages: meta.totalPages || 1
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch reels.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  const handleApplyFieldFilter = (fieldKey, value) => {
    if (!fieldKey) return;
    setFilters(prev => ({ ...prev, [fieldKey]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRemoveFilter = (fieldKey) => {
    setFilters(prev => {
      const updated = { ...prev };
      delete updated[fieldKey];
      return updated;
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setSelectedField('');
    setSelectedValue('');
    setFilters({
      q: '',
      status: '',
      paper_quality: '',
      gsm: '',
      bf: '',
      width_mm: '',
      supplier: '',
      master_key: '',
      station: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getOptionsForField = (fieldKey) => {
    switch (fieldKey) {
      case 'paper_quality': return filterOptions.qualities;
      case 'gsm': return filterOptions.gsms;
      case 'bf': return filterOptions.bfs;
      case 'width_mm': return filterOptions.sizes;
      case 'supplier': return filterOptions.suppliers;
      case 'master_key': return filterOptions.master_keys;
      case 'status': return filterOptions.statuses;
      case 'station': return filterOptions.stations;
      default:
        if (fieldKey.startsWith('cf.')) {
          const keyName = fieldKey.replace('cf.', '');
          const cf = filterOptions.custom_fields.find(c => c.key === keyName);
          return cf?.options || [];
        }
        return [];
    }
  };

  const canAction = isRoleAdmin || isRoleSupervisor || isRoleOperator;

  // Active filter count
  const activeFilterCount = Object.keys(filters).filter(k => k !== 'q' && Boolean(filters[k])).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reel Inventory</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Manage paper reels, track weights, record usage, and apply master corrections across database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReels}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {canAction && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Reel</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Database Field Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Quick Search Input */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="q"
              value={filters.q}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, q: e.target.value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              placeholder="Search reel #, barcode, supplier, key..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          {/* Step 1: Select Field to Filter */}
          <div>
            <select
              value={selectedField}
              onChange={(e) => {
                setSelectedField(e.target.value);
                setSelectedValue('');
              }}
              className="w-full px-3 py-2 text-sm bg-indigo-50/50 dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold text-indigo-900 dark:text-indigo-300"
            >
              <option value="">1. Filter by Field...</option>
              <option value="supplier">Supplier Name</option>
              <option value="master_key">Master Product Key</option>
              <option value="paper_quality">Paper Quality</option>
              <option value="gsm">GSM</option>
              <option value="bf">Bursting Factor (BF)</option>
              <option value="width_mm">Size / Width (cm)</option>
              <option value="status">Reel Status</option>
              <option value="station">Station Used</option>
              {filterOptions.custom_fields.map((cf) => (
                <option key={cf.key} value={`cf.${cf.key}`}>{cf.name} (Custom)</option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Registered Value from Database */}
          <div>
            <select
              disabled={!selectedField}
              value={selectedValue}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedValue(val);
                if (selectedField) {
                  handleApplyFieldFilter(selectedField, val);
                }
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50"
            >
              <option value="">
                {!selectedField ? '2. Select Field First' : `2. Select Value (${getOptionsForField(selectedField).length} in DB)...`}
              </option>
              {selectedField && getOptionsForField(selectedField).map((opt) => (
                <option key={String(opt)} value={String(opt)}>
                  {String(opt)}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-center">
            <button
              onClick={handleResetFilters}
              className="w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition border border-dashed border-slate-300 dark:border-slate-700"
            >
              Reset All Filters
            </button>
          </div>
        </div>

        {/* Active Filter Badges / Pills */}
        {activeFilterCount > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Filters ({activeFilterCount}):</span>
            {Object.keys(filters).map((k) => {
              if (k === 'q' || !filters[k]) return null;
              const fieldNames = {
                supplier: 'Supplier',
                master_key: 'Master Key',
                paper_quality: 'Quality',
                gsm: 'GSM',
                bf: 'BF',
                width_mm: 'Size',
                status: 'Status',
                station: 'Station',
              };
              const label = fieldNames[k] || k.replace('cf.', '');
              return (
                <span
                  key={k}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full border border-indigo-200 dark:border-indigo-800"
                >
                  <span>{label}: {filters[k]}</span>
                  <button
                    onClick={() => handleRemoveFilter(k)}
                    className="hover:text-indigo-900 dark:hover:text-white p-0.5 rounded-full hover:bg-indigo-200/50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && <ErrorAlert message={error} onRetry={fetchReels} />}

      {/* Main Table */}
      {loading ? (
        <LoadingState message="Loading reel inventory..." />
      ) : reels.length === 0 ? (
        <EmptyState
          title="No Reels Found"
          message="No paper reels match your current filter criteria or search query."
          actionText={canAction ? "Create Reel" : null}
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
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {reels.map((reel) => {
                  const reelId = reel.id || reel._id;
                  const isVoided = reel.status === 'VOIDED' || reel.record_status === 'VOIDED';
                  const currentWeight = reel.previous_weight ?? reel.current_weight_kg ?? reel.max_weight;
                  const initialWeight = reel.max_weight ?? reel.initial_weight_kg;

                  return (
                    <tr 
                      key={reelId || reel.sr_no} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                      onClick={() => navigate(`/reels/${reelId}`)}
                    >
                      {/* Reel / Barcode / Master Key */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Reel #{reel.reel_no || reel.reel_number}</span>
                        </div>
                        {reel.master_key && (
                          <div className="mt-1">
                            <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue dark:bg-indigo-950 dark:text-indigo-300 font-mono font-bold text-[10px] rounded-md tracking-wider">
                              {reel.master_key}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Specifications */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {reel.quality || reel.paper_quality}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {reel.gsm} GSM • {reel.size || reel.width_mm} cm
                        </div>
                      </td>

                      {/* Supplier & Location */}
                      <td className="px-6 py-4">
                        <div className="text-slate-800 dark:text-slate-200">
                          {reel.supplier_name || reel.supplier || 'N/A'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          SRNO: #{reel.sr_no}
                        </div>
                      </td>

                      {/* Weight */}
                      <td className="px-6 py-4 text-right">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {formatWeight(currentWeight)}
                        </div>
                        <div className="text-xs text-slate-400">
                          Orig: {formatWeight(initialWeight)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(reel.status)}`}>
                          {reel.status}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(reel.purchase_date || reel.created_at || reel.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {/* View Detail */}
                          <button
                            onClick={() => navigate(`/reels/${reelId}`)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            title="View Reel Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Record Usage */}
                          {!isVoided && canAction && reel.status !== 'NILL' && reel.status !== 'DEPLETED' && (
                            <button
                              onClick={() => setUsageReel(reel)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              title="Record Weight Usage"
                            >
                              <Scale className="w-4 h-4" />
                            </button>
                          )}

                          {/* Master Correction (Admin only) */}
                          {isRoleAdmin && !isVoided && (
                            <button
                              onClick={() => setCorrectionReel(reel)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              title="Master Correction"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Void Reel (Admin only) */}
                          {isRoleAdmin && !isVoided && (
                            <button
                              onClick={() => setVoidReel(reel)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              title="Void Reel"
                            >
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

          {/* Pagination Footer */}
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

      {/* Modals */}
      {showCreateModal && (
        <CreateReelModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchReels();
          }}
        />
      )}

      {usageReel && (
        <RecordUsageModal
          isOpen={Boolean(usageReel)}
          reel={usageReel}
          onClose={() => setUsageReel(null)}
          onSuccess={() => {
            setUsageReel(null);
            fetchReels();
          }}
        />
      )}

      {correctionReel && (
        <MasterCorrectionModal
          isOpen={Boolean(correctionReel)}
          reel={correctionReel}
          onClose={() => setCorrectionReel(null)}
          onSuccess={() => {
            setCorrectionReel(null);
            fetchReels();
          }}
        />
      )}

      {voidReel && (
        <VoidReelModal
          isOpen={Boolean(voidReel)}
          reel={voidReel}
          onClose={() => setVoidReel(null)}
          onSuccess={() => {
            setVoidReel(null);
            fetchReels();
          }}
        />
      )}
    </div>
  );
}
