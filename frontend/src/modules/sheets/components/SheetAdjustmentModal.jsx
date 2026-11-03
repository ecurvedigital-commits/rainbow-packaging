import React, { useState } from 'react';
import { X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { calculateRemainingWeight } from '../utils/sheetCalculations';

export default function SheetAdjustmentModal({ isOpen, onClose, sheet, onSubmit }) {
  if (!isOpen || !sheet) return null;

  const [newQty, setNewQty] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const parsedNewQty = newQty === '' ? sheet.current_quantity : parseInt(newQty, 10);
  const delta = (parsedNewQty || 0) - sheet.current_quantity;
  const newWeight = calculateRemainingWeight(sheet.deckle, sheet.cutting, sheet.gsm, parsedNewQty || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newQty === '' || isNaN(parsedNewQty) || parsedNewQty < 0) {
      setError('Please enter a valid non-negative integer for adjusted quantity.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for this stock adjustment.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        new_quantity: parsedNewQty,
        reason: reason.trim(),
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
              <RefreshCw size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Adjust Sheet Stock</h3>
              <p className="text-xs text-gray-500">
                Lot #{sheet.sr_no} — {sheet.party_name}
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

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-gray-500">Recorded Balance:</span>
              <p className="font-bold text-gray-900 mt-0.5">{sheet.current_quantity.toLocaleString()} pcs</p>
            </div>
            <div>
              <span className="text-gray-500">Recorded Weight:</span>
              <p className="font-bold text-gray-900 mt-0.5">{sheet.current_weight} kg</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Actual Physical Count (Sheets) *
            </label>
            <input
              type="number"
              min="0"
              required
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder={`Current: ${sheet.current_quantity}`}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl text-sm font-medium text-gray-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Audit Reason *
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical inventory cycle count adjustment"
              className="w-full px-3 py-2 bg-white border border-gray-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
            />
          </div>

          {newQty !== '' && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1 text-amber-900">
              <div className="flex justify-between">
                <span>Variance:</span>
                <strong>{delta > 0 ? `+${delta}` : delta} pcs</strong>
              </div>
              <div className="flex justify-between">
                <span>Recomputed Weight:</span>
                <strong>{newWeight} kg</strong>
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
              disabled={submitting || newQty === ''}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {submitting ? 'Applying...' : 'Apply Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

