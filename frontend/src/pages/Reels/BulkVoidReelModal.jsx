import React, { useState } from 'react';
import { reelApi } from '../../api/reelApi';
import { AlertTriangle, X, Loader2, Trash2 } from 'lucide-react';

export const BulkVoidReelModal = ({ isOpen = true, selectedReels = [], onClose, onSuccess }) => {
  const [reason, setReason] = useState('Bulk deleted by Admin');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !selectedReels.length) return null;

  const reelIds = selectedReels.map((r) => r.id || r._id);
  const reelNumbers = selectedReels.map((r) => r.reel_no || r.reel_number).filter(Boolean);

  const handleBulkVoid = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Voiding reason is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await reelApi.bulkVoid(reelIds, reason.trim());
      setSubmitting(false);

      if (res.success) {
        const voidedCount = res.data?.voided_count || reelIds.length;
        onSuccess(`Successfully deleted ${voidedCount} reel${voidedCount === 1 ? '' : 's'} from active inventory.`);
        onClose();
      } else {
        throw new Error(res.message || 'Failed to void selected reels');
      }
    } catch (err) {
      setSubmitting(false);
      setError(err.message || 'Failed to void selected reels.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-scale-in">
        <div className="bg-red-50 dark:bg-red-950/40 px-6 py-4 border-b border-red-200 dark:border-red-900/50 flex justify-between items-center">
          <div className="flex items-center gap-2 text-red-900 dark:text-red-300 font-bold text-base">
            <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
            <span>Delete {selectedReels.length} Selected Reels</span>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleBulkVoid} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Deleting these <strong>{selectedReels.length} reels</strong> will mark their status as <strong className="text-red-600 font-mono">VOIDED</strong>, cancel any pending approvals on them, and remove them from active inventory calculations.
          </p>

          {/* List of selected reel numbers */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Reels to be deleted ({reelNumbers.length})
            </label>
            <div className="max-h-28 overflow-y-auto p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-1.5">
              {reelNumbers.slice(0, 30).map((rNo, idx) => (
                <span key={`${rNo}-${idx}`} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] font-semibold">
                  #{rNo}
                </span>
              ))}
              {reelNumbers.length > 30 && (
                <span className="px-2 py-0.5 text-[11px] text-slate-400 font-medium self-center">
                  +{reelNumbers.length - 30} more
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
              Reason for Deletion *
            </label>
            <textarea
              required
              rows={3}
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="e.g. Duplicate entries / Upload mistake / Damaged consignment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              <span>Confirm Delete ({selectedReels.length})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkVoidReelModal;
