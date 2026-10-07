import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders, Plus, Search, CheckCircle, RefreshCw, Eye,
  AlertTriangle, Loader2, FileText, Check, Tag, Edit3, Trash2, X, Weight
} from 'lucide-react';
import { fieldDefinitionApi } from '../../api/fieldDefinitionApi';
import { reelApi } from '../../api/reelApi';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import EmptyState from '../../components/Common/EmptyState';
import ConfirmModal from '../../components/Common/ConfirmModal';
import Toast from '../../components/Common/Toast';
import { formatWeight, formatDate, getStatusBadgeClass } from '../../utils/formatters';

const inputClass = 'w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white transition';
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1';

export default function CustomFieldsPage() {
  const navigate = useNavigate();
  const [fieldDefs, setFieldDefs] = useState([]);
  const [reelsWithCustomFields, setReelsWithCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Modal State for custom field / remark creation
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedReel, setSelectedReel] = useState(null);

  // Custom Field Form Inputs
  const [fieldName, setFieldName] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchPageData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [defsRes, reelsRes] = await Promise.all([
        fieldDefinitionApi.getFieldDefinitions(),
        reelApi.getReels({ limit: 100 }),
      ]);

      if (defsRes.success) {
        setFieldDefs(defsRes.data || []);
      }

      if (reelsRes.success) {
        const allReels = reelsRes.data || [];
        const customReels = allReels.filter(
          (r) => r.custom_fields && Object.keys(r.custom_fields).length > 0
        );
        setReelsWithCustomFields(customReels.length > 0 ? customReels : allReels.slice(0, 15));
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch custom field records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const handleOpenCreateModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedReel(null);
    const defaultName = fieldDefs[0]?.label || fieldDefs[0]?.name || 'QC Remark';
    setFieldName(defaultName);
    setFieldValue('');
    setModalError('');
    setShowModal(true);
  };

  // Real-time live search while typing
  useEffect(() => {
    if (!showModal) return;
    const queryStr = searchQuery.trim();
    if (!queryStr) {
      setSearchResults([]);
      setModalError('');
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await reelApi.search(queryStr, 1, 10);
        setSearching(false);
        if (res.success && Array.isArray(res.data)) {
          setSearchResults(res.data);
          if (res.data.length === 0) {
            setModalError(`No active reel matching "${queryStr}".`);
          } else {
            setModalError('');
          }
        }
      } catch (err) {
        setSearching(false);
        setSearchResults([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, showModal]);

  const handleSearchReel = async () => {
    if (!searchQuery.trim()) {
      setModalError('Please enter a Reel Number to search.');
      return;
    }
    setSearching(true);
    setModalError('');
    try {
      const res = await reelApi.search(searchQuery.trim(), 1, 10);
      setSearching(false);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setSearchResults(res.data);
      } else {
        setSearchResults([]);
        setModalError(`No active reel found with Reel Number "${searchQuery.trim()}".`);
      }
    } catch (err) {
      setSearching(false);
      setModalError(err.message || 'Failed to search reel.');
    }
  };

  const handleSelectReel = (reel) => {
    setSelectedReel(reel);
    setModalError('');
  };

  const handleSaveCustomField = async (e) => {
    e.preventDefault();
    if (!selectedReel) {
      setModalError('Please select a reel first.');
      return;
    }
    if (!fieldName.trim() || !fieldValue.trim()) {
      setModalError('Both Field Name and Remark/Update Value are required.');
      return;
    }

    setSubmitting(true);
    setModalError('');
    try {
      const cleanKey = fieldName.trim();
      const updatedCustomFields = {
        ...(selectedReel.custom_fields || {}),
        [cleanKey]: fieldValue.trim(),
      };

      const reelId = selectedReel.id || selectedReel._id;
      await reelApi.masterCorrection(reelId, {
        custom_fields: updatedCustomFields,
      });

      setSubmitting(false);
      setShowModal(false);
      setToast({
        type: 'success',
        message: `Custom field remark saved for Reel #${selectedReel.reel_no}.`,
      });
      fetchPageData();
    } catch (err) {
      setSubmitting(false);
      setModalError(err.message || 'Failed to save custom field remark.');
    }
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-family-display)' }}>
            <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Custom Fields & Reel Remarks
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Search reel by number, inspect reel details, and attach custom field remarks or batch updates.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={fetchPageData}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition"
            title="Refresh Page Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Field Remark</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && <ErrorAlert message={error} onRetry={fetchPageData} />}

      {/* Reels Custom Field Remarks Table */}
      {loading ? (
        <LoadingState message="Loading reel custom field records..." />
      ) : reelsWithCustomFields.length === 0 ? (
        <EmptyState
          title="No Custom Field Remarks Recorded"
          message="Enter a Reel Number to select a reel and add custom remarks or dynamic field attributes."
          actionText="Add Custom Field Remark"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <FileText size={16} className="text-indigo-500" />
              Reel Remarks & Custom Field Entries
            </h2>
            <span className="text-[11px] font-semibold text-slate-500 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              {reelsWithCustomFields.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-3.5">Reel No</th>
                  <th className="px-6 py-3.5">Reel Specifications</th>
                  <th className="px-6 py-3.5">Supplier</th>
                  <th className="px-6 py-3.5">Current Balance</th>
                  <th className="px-6 py-3.5">Custom Field Remarks / Updates</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {reelsWithCustomFields.map((reel) => {
                  const reelId = reel.id || reel._id;
                  const currentWeight = reel.previous_weight ?? reel.current_weight_kg ?? reel.max_weight;
                  const customFieldsObj = reel.custom_fields || {};
                  const fieldEntries = Object.entries(customFieldsObj);

                  return (
                    <tr
                      key={reelId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                      onClick={() => navigate(`/reels/${reelId}`)}
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        #{reel.reel_no}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {reel.quality}
                        </div>
                        <div className="text-xs text-slate-500">
                          {reel.gsm} GSM • {reel.bf} BF • {reel.size} cm
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {reel.supplier_name || 'N/A'}
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {formatWeight(currentWeight)}
                      </td>

                      <td className="px-6 py-4">
                        {fieldEntries.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No custom remark attached</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {fieldEntries.map(([key, val]) => (
                              <span
                                key={key}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800"
                              >
                                <Tag size={11} className="text-indigo-500 shrink-0" />
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{key}:</span>
                                <span>{String(val)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(reel.status)}`}>
                          {reel.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedReel(reel);
                              setFieldName(fieldDefs[0]?.label || fieldDefs[0]?.name || 'QC Remark');
                              setFieldValue('');
                              setModalError('');
                              setShowModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            title="Add / Update Remark for this Reel"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/reels/${reelId}`)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            title="View Reel Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Custom Field / Reel Remark Workflow Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-scale-in my-8">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
                  Add Custom Field Remark to Reel
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-red-600" />
                <span>{modalError}</span>
              </div>
            )}

            {/* STEP 1: Enter Reel Number */}
            <div className="space-y-3">
              <label className={labelClass}>Step 1: Enter Reel Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Enter Reel Number e.g. 1001"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchReel())}
                />
                <button
                  type="button"
                  onClick={handleSearchReel}
                  disabled={searching}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
                >
                  {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  Search
                </button>
              </div>
            </div>

            {/* STEP 2: Show Result & Select Reel */}
            {searchResults.length > 0 && !selectedReel && (
              <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-900">
                <label className={labelClass}>Step 2: Select Reel from Results</label>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {searchResults.map((r) => (
                    <div
                      key={r.id || r._id}
                      onClick={() => handleSelectReel(r)}
                      className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center hover:border-indigo-500 cursor-pointer transition"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">#{r.reel_no}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          {r.quality} ({r.gsm} GSM • {r.bf} BF) · {r.supplier_name || 'N/A'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectReel(r)}
                        className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg hover:bg-indigo-100 flex items-center gap-1"
                      >
                        <Check size={14} /> Select
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3 & 4: Selected Reel Details + Custom Field Remark Entry */}
            {selectedReel && (
              <form onSubmit={handleSaveCustomField} className="space-y-4">
                {/* Step 3: Selected Reel Details Summary */}
                <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl flex justify-between items-center gap-3">
                  <div>
                    <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Step 3: Selected Reel Details</span>
                    <p className="text-lg font-bold text-indigo-950 dark:text-indigo-200">Reel #{selectedReel.reel_no}</p>
                    <p className="text-xs text-indigo-800 dark:text-indigo-300">
                      {selectedReel.quality} ({selectedReel.gsm} GSM • {selectedReel.bf} BF • {selectedReel.size} cm)
                    </p>
                    <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                      {/* Supplier: {selectedReel.supplier_name || 'N/A'} · */} Balance: {formatWeight(selectedReel.current_weight ?? selectedReel.previous_weight ?? selectedReel.max_weight)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedReel(null)}
                    className="text-xs font-bold text-indigo-600 hover:underline shrink-0"
                  >
                    Change Reel
                  </button>
                </div>

                {/* Step 4: Custom Field Name & Remark Value Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className={labelClass}>Custom Field / Remark Name *</label>
                    {fieldDefs.length > 0 ? (
                      <select
                        className={inputClass}
                        value={fieldName}
                        onChange={(e) => setFieldName(e.target.value)}
                      >
                        {fieldDefs.map((def) => (
                          <option key={def._id} value={def.label || def.name}>
                            {def.label || def.name}
                          </option>
                        ))}
                        <option value="Quality Note">Quality Note</option>
                        <option value="Core Condition">Core Condition</option>
                        <option value="Moisture Content">Moisture Content</option>
                        <option value="Batch QC Remark">Batch QC Remark</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="e.g. Moisture Content / Core QC"
                        value={fieldName}
                        onChange={(e) => setFieldName(e.target.value)}
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>New Remark / Updated Field Value *</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. 6.5% Moisture - Edge Intact"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    <span>{submitting ? 'Saving Remark...' : 'Save Remark / Update'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
