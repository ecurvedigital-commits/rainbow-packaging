import React, { useState, useEffect } from 'react';
import { reelApi } from '../../api/reelApi';
import { Search, Save, X, AlertTriangle, Loader2, Weight, CheckCircle2 } from 'lucide-react';
import { formatWeight, formatDate } from '../../utils/formatters';
import CustomDatePicker from '../../components/Common/CustomDatePicker';

const inputClass = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue transition-shadow';
const labelClass = 'block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1';

export const RecordUsageModal = ({ isOpen = true, onClose, onSuccess, reel }) => {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchDone, setSearchDone] = useState(false);
  const [selectedReel, setSelectedReel] = useState(reel || null);
  const [station, setStation] = useState('E-Flute');
  const [currentWeight, setCurrentWeight] = useState('');
  const [usageDate, setUsageDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (reel) {
      if (reel.pending_count > 0 || reel.approval_status === 'PENDING') {
        const dateStr = reel.created_at || reel.purchase_date ? formatDate(reel.created_at || reel.purchase_date) : '';
        setError(`Reel #${reel.reel_no} is awaiting Admin approval${dateStr ? ` (created on ${dateStr})` : ''} and cannot be used until approved.`);
      } else {
        setSelectedReel(reel);
      }
    }
  }, [reel]);

  // Live search effect as user types search query
  useEffect(() => {
    if (selectedReel) return;
    if (!search.trim()) {
      setSearchResults([]);
      setSearchDone(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setError('');
      try {
        const res = await reelApi.search(search.trim(), 1, 10);
        setSearching(false);
        if (res.success && Array.isArray(res.data)) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
        setSearchDone(true);
      } catch (err) {
        setSearching(false);
        setSearchResults([]);
        setSearchDone(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, selectedReel]);

  if (!isOpen) return null;

  const handleSelectReel = (r) => {
    if (r.status === 'NILL') {
      setError(`Reel #${r.reel_no} is already NILL (0 kg remaining).`);
      return;
    }
    if (r.status === 'VOIDED') {
      setError(`Reel #${r.reel_no} has been voided.`);
      return;
    }
    if (r.pending_count > 0 || r.approval_status === 'PENDING') {
      const dateStr = r.created_at || r.purchase_date ? formatDate(r.created_at || r.purchase_date) : '';
      setError(`Reel #${r.reel_no} is awaiting Admin approval${dateStr ? ` (created on ${dateStr})` : ''} and cannot be used until approved.`);
      return;
    }
    setError('');
    setSelectedReel(r);
    setSearchResults([]);
    setSearchDone(false);
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await reelApi.search(search.trim(), 1, 10);
      setSearching(false);
      setSearchDone(true);

      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setSearchResults(res.data);
        const exact = res.data.find((r) => r.reel_no.toLowerCase() === search.trim().toLowerCase());
        if (exact) {
          handleSelectReel(exact);
        }
      } else {
        setSearchResults([]);
        setError(`No active reel found matching "${search.trim()}".`);
      }
    } catch (err) {
      setSearching(false);
      setError(err.message || 'Search failed.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReel) return;

    if (selectedReel.pending_count > 0 || selectedReel.approval_status === 'PENDING') {
      const dateStr = selectedReel.created_at || selectedReel.purchase_date ? formatDate(selectedReel.created_at || selectedReel.purchase_date) : '';
      setError(`Reel #${selectedReel.reel_no} is awaiting Admin approval${dateStr ? ` (created on ${dateStr})` : ''} and cannot be used until approved.`);
      return;
    }

    setError('');
    const weightVal = Number(currentWeight);
    const prevWeight = selectedReel.current_weight ?? selectedReel.previous_weight ?? selectedReel.max_weight;

    if (isNaN(weightVal) || weightVal < 0 || weightVal > prevWeight) {
      setError(`Weight must be between 0 and ${prevWeight} kg (current balance).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        station,
        current_weight_entered: weightVal,
        expected_previous_weight: prevWeight,
        usage_date: usageDate || new Date().toISOString().slice(0, 10),
      };

      const reelId = selectedReel.id || selectedReel._id;
      const res = await reelApi.recordUsage(reelId, payload);
      setSubmitting(false);

      if (res.success) {
        const recordedMsg = res.data?.message || `Usage recorded for Reel #${selectedReel.reel_no}.`;
        const updatedReelNo = selectedReel.reel_no;
        const usedAmount = Math.max(prevWeight - weightVal, 0);

        setSuccessMessage(`Successfully updated Reel #${updatedReelNo}! Recorded usage of ${usedAmount} kg (Remaining: ${weightVal} kg). Search for another reel below.`);
        setSelectedReel(null);
        setSearch('');
        setSearchResults([]);
        setSearchDone(false);
        setCurrentWeight('');
        setError('');

        if (onSuccess) {
          onSuccess(recordedMsg);
        }
      }
    } catch (err) {
      setSubmitting(false);
      if (err.code === 'STALE_WEIGHT' || err.status === 409) {
        setError('STALE WEIGHT ERROR: Reel weight balance changed since loading. Please search again to get latest balance.');
      } else {
        setError(err.message || 'Failed to record usage.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8 animate-scale-in relative overflow-visible">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Weight size={20} className="text-brand-green" />
            <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
              Record Reel Usage
            </h2>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2.5 animate-fade-in shadow-xs">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {!selectedReel ? (
            <div className="space-y-4">
              <label className={labelClass}>Search Reel Number</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. 1002, R-7801, or supplier name..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      if (error) setError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                    autoFocus
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setSearchResults([]);
                        setSearchDone(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching}
                  className="bg-brand-navy hover:bg-slate-800 text-white px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
                >
                  {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  Search
                </button>
              </div>

              {/* Live Search Results List */}
              {searching && (
                <div className="p-6 text-center text-gray-400 text-xs font-medium flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-brand-blue" />
                  <span>Searching active reels...</span>
                </div>
              )}

              {!searching && searchDone && searchResults.length === 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                  <span>No active reel found matching "{search}". Please check the reel number or supplier name.</span>
                </div>
              )}

              {!searching && searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Matching Reels ({searchResults.length})
                  </p>
                  {searchResults.map((r) => {
                    const rId = r.id || r._id;
                    const bal = r.current_weight ?? r.previous_weight ?? r.max_weight;
                    const isPending = r.pending_count > 0 || r.approval_status === 'PENDING';
                    const isNill = r.status === 'NILL';
                    const isVoided = r.status === 'VOIDED';
                    const disabled = isPending || isNill || isVoided;

                    return (
                      <div
                        key={rId}
                        onClick={() => handleSelectReel(r)}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between shadow-xs ${
                          disabled
                            ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                            : 'bg-white border-gray-200 hover:border-brand-blue hover:bg-blue-50/40 cursor-pointer group'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm group-hover:text-brand-blue transition-colors">
                              #{r.reel_no}
                            </span>
                            {r.master_code && (
                              <span className="px-2 py-0.5 bg-blue-50 text-brand-blue text-[10px] font-mono font-bold rounded border border-blue-200">
                                {r.master_code}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                isNill
                                  ? 'bg-red-100 text-red-700'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isPending ? 'PENDING APPROVAL' : r.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Quality: {r.quality || '-'} · Size: {r.size || '-'} · GSM: {r.gsm || '-'}
                            · Supplier: <strong className="text-gray-700">{r.supplier_name || 'N/A'}</strong>
                            {r.mill_name ? ` · Mill: ${r.mill_name}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Balance</p>
                          <p className="text-sm font-bold text-gray-900">{formatWeight(bal)}</p>
                          {!disabled && (
                            <span className="text-[11px] font-bold text-brand-green group-hover:underline block mt-0.5">
                              Select →
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center gap-3">
                <div>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Selected Reel</p>
                  <p className="text-xl font-bold text-blue-950">#{selectedReel.reel_no}</p>
                  <p className="text-xs text-blue-700">
                    Quality: {selectedReel.quality || '-'} · Size: {selectedReel.size || '-'} · GSM: {selectedReel.gsm || '-'}
                    · Supplier: {selectedReel.supplier_name || 'N/A'}
                    {selectedReel.mill_name ? ` · Mill: ${selectedReel.mill_name}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Current Balance</p>
                  <p className="text-xl font-bold text-blue-950">
                    {formatWeight(selectedReel.current_weight ?? selectedReel.previous_weight ?? selectedReel.max_weight)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReel(null);
                    setError('');
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline shrink-0"
                >
                  Change
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Machine Station *</label>
                  <select className={inputClass} value={station} onChange={(e) => setStation(e.target.value)}>
                    <option value="E-Flute">E-Flute</option>
                    <option value="Narrow-Flute">Narrow-Flute</option>
                    <option value="Sheater">Sheater</option>
                    <option value="Sold to Revati">Sold to Revati</option>
                    <option value="Return">Return</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Usage / Recording Date *</label>
                  <CustomDatePicker
                    date={usageDate}
                    onChange={(d) => setUsageDate(d || new Date().toISOString().slice(0, 10))}
                    allowClear={false}
                    align="right"
                    className="w-full"
                    iconColor="text-brand-blue"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Weight Right Now (After Usage) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  max={selectedReel.current_weight ?? selectedReel.previous_weight ?? selectedReel.max_weight}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  placeholder="e.g. 750"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(e.target.value)}
                />
                {currentWeight !== '' && (
                  <p className="text-xs mt-2 font-medium text-gray-600">
                    Reporting usage of{' '}
                    <span className="text-amber-700 font-bold">
                      {Math.max(
                        (selectedReel.current_weight ?? selectedReel.previous_weight ?? selectedReel.max_weight) - Number(currentWeight),
                        0
                      )}{' '}
                      kg
                    </span>
                  </p>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-green hover:bg-emerald-700 flex items-center gap-2 shadow-xs">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {submitting ? 'Submitting…' : 'Submit Usage'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordUsageModal;


