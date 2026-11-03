import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  ArrowLeft,
  Layers,
  Scale,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { sheetApi } from '../api/sheetApi';
import {
  calculateSheetArea,
  calculateSingleSheetWeight,
  calculateTotalWeight,
} from '../utils/sheetCalculations';

export default function CreateSheetPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    party_name: '',
    job_name: '',
    quality: 'ULTRA',
    deckle: '',
    cutting: '',
    gsm: '',
    quantity: '',
    lot_no: '',
    supplier_name: '',
    received_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Live calculations
  const deckleNum = parseFloat(formData.deckle) || 0;
  const cuttingNum = parseFloat(formData.cutting) || 0;
  const gsmNum = parseFloat(formData.gsm) || 0;
  const qtyNum = parseInt(formData.quantity, 10) || 0;

  const areaM2 = calculateSheetArea(deckleNum, cuttingNum);
  const singleSheetKg = calculateSingleSheetWeight(deckleNum, cuttingNum, gsmNum);
  const singleSheetGrams = (singleSheetKg * 1000).toFixed(2);
  const totalWeightKg = calculateTotalWeight(deckleNum, cuttingNum, gsmNum, qtyNum);
  const totalWeightTons = (totalWeightKg / 1000).toFixed(3);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.party_name.trim()) {
      setError('Party Name is mandatory.');
      return;
    }

    if (deckleNum <= 0 || cuttingNum <= 0 || gsmNum <= 0 || qtyNum <= 0) {
      setError('Deckle, Cutting, GSM, and Quantity must all be positive numbers.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await sheetApi.create({
        party_name: formData.party_name.trim(),
        job_name: formData.job_name.trim(),
        quality: formData.quality.trim().toUpperCase(),
        deckle: deckleNum,
        cutting: cuttingNum,
        gsm: gsmNum,
        quantity: qtyNum,
        lot_no: formData.lot_no.trim() || undefined,
        supplier_name: formData.supplier_name.trim() || undefined,
        received_date: formData.received_date || undefined,
        notes: formData.notes.trim() || undefined,
      });

      if (res.success) {
        setSuccess(`Sheet lot created successfully (Sr #${res.data?.sr_no})!`);
        setTimeout(() => {
          navigate('/sheets/inventory');
        }, 1200);
      }
    } catch (err) {
      setError(err?.message || 'Failed to inward sheet lot.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shadow-xs">
            <PlusCircle size={24} />
          </div>
          <div>
            <h1
              className="text-2xl font-black text-gray-900 tracking-tight"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              Inward Sheet Stock Lot
            </h1>
            <p className="text-sm text-gray-500">
              Inward new paper and board sheet lots with live dimensional weight calculations
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form Fields */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-100">
            1. Party & Job Assignment
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Party / Customer Name *
              </label>
              <input
                type="text"
                name="party_name"
                required
                value={formData.party_name}
                onChange={handleChange}
                placeholder="e.g. MAHALAXMI, MILTON, LUMINOUS"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-sm font-medium text-gray-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Job / Carton Name
              </label>
              <input
                type="text"
                name="job_name"
                value={formData.job_name}
                onChange={handleChange}
                placeholder="e.g. NEO BUG ZAPPER, 5 LTR (Optional)"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-sm font-medium text-gray-900 outline-none"
              />
            </div>
          </div>

          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pt-3 pb-2 border-b border-gray-100">
            2. Board Physical Specifications
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Quality *
              </label>
              <select
                name="quality"
                value={formData.quality}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
              >
                <option value="ULTRA">ULTRA (Duplex)</option>
                <option value="ANAND">ANAND (Duplex)</option>
                <option value="FBB">FBB (Folding Box)</option>
                <option value="SBS">SBS (Solid Bleached)</option>
                <option value="DCB">DCB</option>
                <option value="SPECTRA">SPECTRA</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Deckle (cm) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                name="deckle"
                value={formData.deckle}
                onChange={handleChange}
                placeholder="e.g. 66.0"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-sm font-mono font-medium text-gray-900 outline-none"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Cutting (cm) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                name="cutting"
                value={formData.cutting}
                onChange={handleChange}
                placeholder="e.g. 100.0"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-sm font-mono font-medium text-gray-900 outline-none"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                GSM *
              </label>
              <input
                type="number"
                min="1"
                required
                name="gsm"
                value={formData.gsm}
                onChange={handleChange}
                placeholder="e.g. 240"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-sm font-mono font-medium text-gray-900 outline-none"
              />
            </div>
          </div>

          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pt-3 pb-2 border-b border-gray-100">
            3. Quantity & Receipt Metadata
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Quantity (Sheets) *
              </label>
              <input
                type="number"
                min="1"
                required
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="e.g. 8640"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-sm font-bold text-gray-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Receipt Date
              </label>
              <input
                type="date"
                name="received_date"
                value={formData.received_date}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Lot / Pallet Tag #
              </label>
              <input
                type="text"
                name="lot_no"
                value={formData.lot_no}
                onChange={handleChange}
                placeholder="Optional batch tag"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-sm font-medium text-gray-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Internal Notes / Remarks
            </label>
            <input
              type="text"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="e.g. Received via truck #HR55-4920, batch inspection passed"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/sheets/inventory')}
              className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {submitting ? 'Inwarding...' : 'Confirm Sheet Inwarding'}
            </button>
          </div>
        </form>

        {/* Live Calculation Cards Sidebar */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-2xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={16} />
              <span>Live Formula Calculations</span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[11px] text-gray-400">Surface Area per Sheet</span>
                <p className="text-lg font-mono font-bold text-white mt-0.5">
                  {areaM2 > 0 ? `${areaM2} m²` : '—'}
                </p>
                <span className="text-[10px] text-gray-500 font-mono">(Deckle × Cutting / 10,000)</span>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[11px] text-gray-400">Weight per Sheet</span>
                <p className="text-lg font-mono font-bold text-white mt-0.5">
                  {singleSheetKg > 0 ? `${singleSheetGrams} g (${singleSheetKg.toFixed(4)} kg)` : '—'}
                </p>
                <span className="text-[10px] text-gray-500 font-mono">(Area × GSM / 1,000)</span>
              </div>

              <div className="p-4 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">
                  Total Lot Weight (Authoritative)
                </span>
                <p className="text-2xl font-mono font-black text-emerald-400 mt-1">
                  {totalWeightKg > 0 ? `${totalWeightKg.toLocaleString()} kg` : '0 kg'}
                </p>
                {totalWeightKg > 0 && (
                  <span className="text-xs text-emerald-200/80 font-mono mt-0.5 block">
                    Equivalent to ~{totalWeightTons} Metric Tons
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
              Note: Weight is dynamically calculated from physical dimensions and GSM. Manual override of calculated weights is disabled to prevent inventory discrepancies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
