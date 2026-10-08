import React, { useState, useEffect } from 'react';
import { reelApi } from '../../api/reelApi';
import { X, Save, Loader2, Edit3, Clock, Scale } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

const inputClass = 'w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1';

export const EditReelEventModal = ({ isOpen = true, event, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    station: 'E-Flute',
    previous_weight: '',
    current_weight_entered: '',
    used_this_time: '',
    max_weight: '',
    performed_at: '',
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (event) {
      const payload = event.payload || {};
      const perfAt = event.performed_at || event.created_at;
      let isoDateStr = '';
      if (perfAt) {
        const d = new Date(perfAt);
        if (!isNaN(d.getTime())) {
          // Format for datetime-local input: YYYY-MM-DDTHH:mm
          const tzOffset = d.getTimezoneOffset() * 60000;
          isoDateStr = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        }
      }

      setFormData({
        station: payload.station || event.station || 'E-Flute',
        previous_weight: payload.previous_weight ?? event.previous_weight ?? '',
        current_weight_entered: payload.current_weight_entered ?? event.current_weight_entered ?? '',
        used_this_time: payload.used_this_time ?? event.used_this_time ?? '',
        max_weight: payload.max_weight ?? '',
        performed_at: isoDateStr,
        reason: event.decline_reason || payload.reason || payload.correction_reason || '',
      });
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const eventId = event.id || event._id;
  const eventType = event.event_type || event.type || 'ENTRY';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {};
      if (formData.station) payload.station = formData.station;
      if (formData.previous_weight !== '') payload.previous_weight = Number(formData.previous_weight);
      if (formData.current_weight_entered !== '') payload.current_weight_entered = Number(formData.current_weight_entered);
      if (formData.used_this_time !== '') payload.used_this_time = Number(formData.used_this_time);
      if (formData.max_weight !== '') payload.max_weight = Number(formData.max_weight);
      if (formData.performed_at) payload.performed_at = new Date(formData.performed_at).toISOString();
      if (formData.reason) payload.reason = formData.reason.trim();

      const res = await reelApi.updateEvent(eventId, payload);
      setSubmitting(false);

      if (res.success) {
        onSuccess && onSuccess('Reel entry updated successfully!');
        onClose && onClose();
      }
    } catch (err) {
      setSubmitting(false);
      setError(err.message || 'Failed to update reel entry.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="bg-indigo-600 px-5 py-4 flex justify-between items-center shrink-0 text-white">
          <div className="flex items-center gap-2">
            <Edit3 size={18} />
            <div>
              <h3 className="text-base font-bold" style={{ fontFamily: 'var(--font-family-display)' }}>
                Edit Reel Entry ({eventType.replace(/_/g, ' ')})
              </h3>
              <p className="text-[11px] text-indigo-100">
                Admin edit for Reel #{event.reel_no || 'N/A'} • Log ID: {eventId.slice(-6)}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-indigo-700 transition">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Station Selector */}
          <div>
            <label className={labelClass}>Machine / Assigned Station</label>
            <select
              className={inputClass}
              value={formData.station}
              onChange={(e) => setFormData({ ...formData, station: e.target.value })}
            >
              <option value="E-Flute">E-Flute</option>
              <option value="Narrow-Flute">Narrow-Flute</option>
              <option value="Sheater">Sheater</option>
              <option value="Sold to Revati">Sold to Revati</option>
              <option value="Return">Return</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Date & Time */}
          <div>
            <label className={`${labelClass} flex items-center gap-1`}>
              <Clock size={13} className="text-indigo-500" />
              Event Date & Time
            </label>
            <input
              type="datetime-local"
              className={inputClass}
              value={formData.performed_at}
              onChange={(e) => setFormData({ ...formData, performed_at: e.target.value })}
            />
          </div>

          {/* Weights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            {formData.previous_weight !== '' && (
              <div>
                <label className={labelClass}>Previous Balance (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={formData.previous_weight}
                  onChange={(e) => setFormData({ ...formData, previous_weight: e.target.value })}
                />
              </div>
            )}

            {formData.current_weight_entered !== '' && (
              <div>
                <label className={labelClass}>Entered Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={formData.current_weight_entered}
                  onChange={(e) => setFormData({ ...formData, current_weight_entered: e.target.value })}
                />
              </div>
            )}

            {formData.used_this_time !== '' && (
              <div>
                <label className={labelClass}>Consumed Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={formData.used_this_time}
                  onChange={(e) => setFormData({ ...formData, used_this_time: e.target.value })}
                />
              </div>
            )}

            {formData.max_weight !== '' && (
              <div>
                <label className={labelClass}>Max / Initial Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={formData.max_weight}
                  onChange={(e) => setFormData({ ...formData, max_weight: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Reason / Notes */}
          <div>
            <label className={labelClass}>Reason Note / Admin Comment</label>
            <textarea
              rows={2}
              className={inputClass}
              placeholder="e.g. Corrected machine station selection and weight discrepancy."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditReelEventModal;
