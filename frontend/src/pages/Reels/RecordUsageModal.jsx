import React, { useState, useEffect } from 'react';
import { reelApi } from '../../api/reelApi';
import { Search, Save, X, AlertTriangle, Loader2, Weight } from 'lucide-react';
import { formatWeight, formatDate } from '../../utils/formatters';
import CustomDatePicker from '../../components/Common/CustomDatePicker';

const inputClass = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue transition-shadow';
const labelClass = 'block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1';

export const RecordUsageModal = ({ isOpen = true, onClose, onSuccess, reel }) => {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedReel, setSelectedReel] = useState(reel || null);
  const [station, setStation] = useState('E-Flute');
  const [currentWeight, setCurrentWeight] = useState('');
  const [usageDate, setUsageDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setError('');
    setSelectedReel(null);

    try {
      const res = await reelApi.search(search.trim(), 1, 5);
      setSearching(false);

      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        // Find exact match or first result
        const exact = res.data.find((r) => r.reel_no === search.trim()) || res.data[0];
        if (exact.status === 'NILL') {
          setError(`Reel #${exact.reel_no} is already NILL (0 kg remaining).`);
          return;
        }
        if (exact.status === 'VOIDED') {
          setError(`Reel #${exact.reel_no} has been voided.`);
          return;
        }
        if (exact.pending_count > 0 || exact.approval_status === 'PENDING') {
          const dateStr = exact.created_at || exact.purchase_date ? formatDate(exact.created_at || exact.purchase_date) : '';
          setError(`Reel #${exact.reel_no} is awaiting Admin approval${dateStr ? ` (created on ${dateStr})` : ''} and cannot be used until approved.`);
          return;
        }
        setSelectedReel(exact);
      } else {
        setError(`No active reel found with Reel No "${search.trim()}".`);
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
        onSuccess(res.data?.message || `Usage recorded for Reel #${selectedReel.reel_no}.`);
        onClose();
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

          {!selectedReel ? (
            <div className="space-y-4">
              <label className={labelClass}>Search Reel Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. 1002"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                />
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
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center gap-3">
                <div>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Selected Reel</p>
                  <p className="text-xl font-bold text-blue-950">#{selectedReel.reel_no}</p>
                  <p className="text-xs text-blue-700">
                    Quality: {selectedReel.quality || '-'} · Supplier: {selectedReel.supplier_name || 'N/A'}
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
                  onClick={() => setSelectedReel(null)}
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

