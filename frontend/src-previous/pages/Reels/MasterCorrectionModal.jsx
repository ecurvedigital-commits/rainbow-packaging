import React, { useState, useEffect } from 'react';
import { reelApi } from '../../api/reelApi';
import { X, Save, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';

const inputClass = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue';
const labelClass = 'block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1';

export const MasterCorrectionModal = ({ isOpen = true, reel, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reel_no: '',
    quality: 'VK',
    bf: 18,
    supplier_name: '',
    size: 100,
    gsm: 150,
    max_weight: 1000,
    current_weight: 1000,
    correction_reason: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (reel) {
      setFormData({
        reel_no: reel.reel_no || '',
        quality: reel.quality || 'VK',
        bf: reel.bf || 18,
        supplier_name: reel.supplier_name || '',
        size: reel.size || 100,
        gsm: reel.gsm || 150,
        max_weight: reel.max_weight || 1000,
        current_weight: reel.current_weight ?? reel.previous_weight ?? 1000,
        correction_reason: '',
      });
    }
  }, [reel]);

  if (!isOpen || !reel) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.correction_reason.trim()) {
      setError('Administrative correction reason is required.');
      return;
    }

    setSubmitting(true);
    try {
      const reelId = reel.id || reel._id;
      const res = await reelApi.masterCorrection(reelId, {
        reel_no: formData.reel_no.trim(),
        quality: formData.quality,
        bf: Number(formData.bf),
        supplier_name: formData.supplier_name.trim(),
        size: Number(formData.size),
        gsm: Number(formData.gsm),
        max_weight: Number(formData.max_weight),
        current_weight: Number(formData.current_weight),
        correction_reason: formData.correction_reason.trim(),
      });
      setSubmitting(false);

      if (res.success) {
        onSuccess(res.data?.message || `Master correction applied to Reel #${formData.reel_no}.`);
        onClose();
      }
    } catch (err) {
      setSubmitting(false);
      setError(err.message || 'Correction failed.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-amber-700" />
            <div>
              <h2 className="text-base font-bold text-amber-950" style={{ fontFamily: 'var(--font-family-display)' }}>
                Master Reel Correction (ADMIN ONLY)
              </h2>
              <p className="text-[11px] text-amber-800">Direct database override for master specs or weight error fix.</p>
            </div>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-amber-100">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Reel Number</label>
              <input required type="text" className={inputClass} value={formData.reel_no} onChange={(e) => setFormData({ ...formData, reel_no: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Quality</label>
              <select className={inputClass} value={formData.quality} onChange={(e) => setFormData({ ...formData, quality: e.target.value })}>
                {['VK', 'SPECTRA', 'ULTRA', 'SK', 'IMPORTANT', 'SBS', 'FBB', 'DCB'].map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Supplier Name</label>
              <input required type="text" className={inputClass} value={formData.supplier_name} onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Max / Initial Weight (kg)</label>
              <input required type="number" min="1" className={inputClass} value={formData.max_weight} onChange={(e) => setFormData({ ...formData, max_weight: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Current Weight Balance (kg)</label>
              <input required type="number" min="0" className={inputClass} value={formData.current_weight} onChange={(e) => setFormData({ ...formData, current_weight: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>GSM</label>
              <input required type="number" min="1" className={inputClass} value={formData.gsm} onChange={(e) => setFormData({ ...formData, gsm: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Size / Width</label>
              <input required type="number" min="1" className={inputClass} value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Bursting Factor (BF)</label>
              <input required type="number" min="1" className={inputClass} value={formData.bf} onChange={(e) => setFormData({ ...formData, bf: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Correction Reason (Mandatory Audit Trail Note) *</label>
            <textarea
              required
              rows={2}
              className={inputClass}
              placeholder="e.g. Corrected supplier typo and updated initial scale tare error."
              value={formData.correction_reason}
              onChange={(e) => setFormData({ ...formData, correction_reason: e.target.value })}
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Apply Correction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MasterCorrectionModal;

