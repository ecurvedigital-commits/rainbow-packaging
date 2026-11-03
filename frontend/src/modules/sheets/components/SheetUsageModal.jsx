import React, { useState } from 'react';
import { X, Scale, AlertCircle, CheckCircle2 } from 'lucide-react';
import { calculateConsumedWeight, calculateRemainingWeight } from '../utils/sheetCalculations';

export default function SheetUsageModal({ isOpen, onClose, sheet, onSubmit }) {
  if (!isOpen || !sheet) return null;

  const [consumedQty, setConsumedQty] = useState('');
  const [station, setStation] = useState('Offset Printing');
  const [jobCardNo, setJobCardNo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const availableQty = sheet.current_quantity || 0;
  const numConsumed = parseInt(consumedQty, 10) || 0;
  const remainingQty = Math.max(0, availableQty - numConsumed);

  const consumedWt = calculateConsumedWeight(sheet.deckle, sheet.cutting, sheet.gsm, numConsumed);
  const remainingWt = calculateRemainingWeight(sheet.deckle, sheet.cutting, sheet.gsm, remainingQty);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (numConsumed <= 0) {
      setError('Please enter a valid consumed quantity greater than 0.');
      return;
    }

    if (numConsumed > availableQty) {
      setError(`Cannot consume ${numConsumed} sheets. Only ${availableQty} sheets available.`);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        consumed_quantity: numConsumed,
        station,
        job_card_no: jobCardNo.trim(),
        notes: notes.trim(),
        expected_current_quantity: availableQty,
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to record consumption');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Record Sheet Consumption</h3>
              <p className="text-xs text-gray-500">
                Lot #{sheet.sr_no} — {sheet.party_name} ({sheet.job_name || 'General'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Stock Banner */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-gray-500 font-medium">Current Balance:</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{availableQty.toLocaleString()} pcs</p>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Current Weight:</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{sheet.current_weight} kg</p>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Quantity to Consume (Pieces) *
              </label>
              <input
                type="number"
                min="1"
                max={availableQty}
                required
                value={consumedQty}
                onChange={(e) => setConsumedQty(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-sm font-medium text-gray-900 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Machine Station
                </label>
                <select
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
                >
                  <option value="Offset Printing">Offset Printing</option>
                  <option value="Die Cutting">Die Cutting</option>
                  <option value="Pasting">Pasting</option>
                  <option value="Corrugation Liner">Corrugation Liner</option>
                  <option value="Scrap/Trim">Scrap/Trim</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Job Card / Order #
                </label>
                <input
                  type="text"
                  value={jobCardNo}
                  onChange={(e) => setJobCardNo(e.target.value)}
                  placeholder="e.g. JC-8021"
                  className="w-full px-3 py-2 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Notes / Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional operational details"
                className="w-full px-3 py-2 bg-white border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
              />
            </div>
          </div>

          {/* Live Calculated Impact Preview */}
          {numConsumed > 0 && numConsumed <= availableQty && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-2">
              <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-700" />
                Projected Balance After Deduction:
              </span>
              <div className="grid grid-cols-2 gap-2 text-emerald-800">
                <div>
                  <span className="text-emerald-600">Consumed:</span> {numConsumed.toLocaleString()} pcs ({consumedWt} kg)
                </div>
                <div>
                  <span className="text-emerald-600">Remaining:</span> {remainingQty.toLocaleString()} pcs ({remainingWt} kg)
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || numConsumed <= 0 || numConsumed > availableQty}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {submitting ? 'Recording...' : 'Confirm Consumption'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

