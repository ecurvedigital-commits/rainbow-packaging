import React, { useState } from 'react';
import { reelApi } from '../../api/reelApi';
import { AlertTriangle, X, Loader2, Trash2 } from 'lucide-react';

export const VoidReelModal = ({ isOpen = true, reel, reelId, reelNo, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const targetId = reelId || reel?.id || reel?._id;
  const targetReelNo = reelNo || reel?.reel_no || targetId;

  if (!isOpen || !targetId) return null;

  const handleVoid = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Voiding reason is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await reelApi.voidReel(targetId, reason.trim());
      setSubmitting(false);

      if (res.success) {
        onSuccess(res.data?.message || `Reel #${targetReelNo} voided successfully.`);
        onClose();
      }
    } catch (err) {
      setSubmitting(false);
      setError(err.message || 'Failed to void reel.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex justify-between items-center">
          <div className="flex items-center gap-2 text-red-900 font-bold text-base">
            <AlertTriangle size={20} className="text-red-600" />
            <span>Void Reel #{targetReelNo}</span>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-red-100">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-200 text-red-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVoid} className="p-6 space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            Voiding a reel marks it as invalid and removes it from active inventory statistics. This is a protected administrative action.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Reason for Voiding *
            </label>
            <textarea
              required
              rows={3}
              className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="e.g. Reel damaged upon receipt / Duplicate serial entry."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Confirm Void
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VoidReelModal;

