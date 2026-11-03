import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Scale, ArrowLeft, RefreshCw, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { sheetApi } from '../api/sheetApi';
import { calculateTotalWeight, calculateRemainingWeight } from '../utils/sheetCalculations';

export default function UpdateSheetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';

  const [lookupId, setLookupId] = useState(initialId);
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    party_name: '',
    job_name: '',
    quality: '',
    deckle: '',
    cutting: '',
    gsm: '',
    supplier_name: '',
    lot_no: '',
    notes: '',
    reason: '',
  });

  const loadSheet = (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    sheetApi
      .getById(id)
      .then((res) => {
        if (res.success && res.data) {
          setSheet(res.data);
          setFormData({
            party_name: res.data.party_name || '',
            job_name: res.data.job_name || '',
            quality: res.data.quality || '',
            deckle: res.data.deckle || '',
            cutting: res.data.cutting || '',
            gsm: res.data.gsm || '',
            supplier_name: res.data.supplier_name || '',
            lot_no: res.data.lot_no || '',
            notes: res.data.notes || '',
            reason: '',
          });
        }
      })
      .catch((err) => {
        setError(err?.message || 'Sheet lot not found.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (initialId) {
      loadSheet(initialId);
    }
  }, [initialId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!sheet) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        party_name: formData.party_name.trim(),
        job_name: formData.job_name.trim(),
        quality: formData.quality.trim().toUpperCase(),
        deckle: parseFloat(formData.deckle) || sheet.deckle,
        cutting: parseFloat(formData.cutting) || sheet.cutting,
        gsm: parseFloat(formData.gsm) || sheet.gsm,
        supplier_name: formData.supplier_name.trim(),
        lot_no: formData.lot_no.trim() || undefined,
        notes: formData.notes.trim(),
        reason: formData.reason.trim() || 'Updated via Admin interface',
      };

      const res = await sheetApi.update(sheet.id, payload);
      if (res.success) {
        setSuccess('Sheet lot updated successfully!');
        setSheet(res.data);
      }
    } catch (err) {
      setError(err?.message || 'Failed to update sheet lot.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-100 shadow-xs">
            <Scale size={24} />
          </div>
          <div>
            <h1
              className="text-2xl font-black text-gray-900 tracking-tight"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              Update Sheet Lot Details
            </h1>
            <p className="text-sm text-gray-500">
              Modify specifications, party assignments, or batch metadata
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/sheets/inventory')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Sheet Inventory</span>
        </button>
      </div>

      {/* Lookup Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-3">
        <input
          type="text"
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          placeholder="Enter Sheet Lot ID or Serial Number (e.g. 1, 10, or MongoID)..."
          className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
        />
        <button
          onClick={() => loadSheet(lookupId)}
          disabled={loading || !lookupId.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Search size={14} />
          <span>{loading ? 'Searching...' : 'Find Lot'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {sheet && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">
                Editing Lot #{sheet.sr_no} — {sheet.party_name}
              </h3>
              <p className="text-xs text-gray-500">
                Current Balance: <strong>{sheet.current_quantity?.toLocaleString()} pcs</strong> ({sheet.current_weight} kg)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {sheet.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Party Name *
              </label>
              <input
                type="text"
                name="party_name"
                required
                value={formData.party_name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Job Name
              </label>
              <input
                type="text"
                name="job_name"
                value={formData.job_name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Quality
              </label>
              <input
                type="text"
                name="quality"
                value={formData.quality}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Deckle (cm)
              </label>
              <input
                type="number"
                step="0.01"
                name="deckle"
                value={formData.deckle}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono font-medium text-gray-900 outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Cutting (cm)
              </label>
              <input
                type="number"
                step="0.01"
                name="cutting"
                value={formData.cutting}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono font-medium text-gray-900 outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                GSM
              </label>
              <input
                type="number"
                name="gsm"
                value={formData.gsm}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono font-medium text-gray-900 outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Lot / Batch Tag
              </label>
              <input
                type="text"
                name="lot_no"
                value={formData.lot_no}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Supplier
              </label>
              <input
                type="text"
                name="supplier_name"
                value={formData.supplier_name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Update Reason / Justification
            </label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="e.g. Corrected job description per customer request"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {saving ? 'Saving Changes...' : 'Save Updates'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
