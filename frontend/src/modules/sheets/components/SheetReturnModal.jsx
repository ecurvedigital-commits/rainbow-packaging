import React, { useState } from 'react';
import { X, CornerUpLeft, AlertCircle } from 'lucide-react';
import { calculateRemainingWeight } from '../utils/sheetCalculations';

export default function SheetReturnModal({ isOpen, onClose, sheet, onSubmit }) {
  if (!isOpen || !sheet) return null;

  const [returnQty, setReturnQty] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const numReturn = parseInt(returnQty, 10) || 0;
  const newBalance = (sheet.current_quantity || 0) + numReturn;
  const newWeight = calculateRemainingWeight(sheet.deckle, sheet.cutting, sheet.gsm, newBalance);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (numReturn <= 0) {
      setError('Please enter a valid return quantity greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        returned_quantity: numReturn,
        reason: reason.trim() || 'Unused sheets returned from press run',
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to record return');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-100">
              <CornerUpLeft size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Return Usable Sheets</h3>
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
              <span className="text-gray-500">Current Balance:</span>
              <p className="font-bold text-gray-900 mt-0.5">{sheet.current_quantity.toLocaleString()} pcs</p>
            </div>
            <div>
              <span className="text-gray-500">Current Weight:</span>
              <p className="font-bold text-gray-900 mt-0.5">{sheet.current_weight} kg</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Quantity to Return (Sheets) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={returnQty}
              onChange={(e) => setReturnQty(e.target.value)}
              placeholder="e.g. 250"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-xl text-sm font-medium text-gray-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Reason / Source
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Overprint balance returned to stock"
              className="w-full px-3 py-2 bg-white border border-gray-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
            />
          </div>

          {numReturn > 0 && (
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs space-y-1 text-teal-900">
              <div className="flex justify-between">
                <span>New Sheet Balance:</span>
                <strong>{newBalance.toLocaleString()} pcs</strong>
              </div>
              <div className="flex justify-between">
                <span>New Stock Weight:</span>
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
              disabled={submitting || numReturn <= 0}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {submitting ? 'Returning...' : 'Confirm Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

