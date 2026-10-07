import React, { useState, useEffect } from 'react';
import { reelApi } from '../../api/reelApi';
import { masterCodeApi } from '../../api/masterCodeApi';
import { extractMasterCodeSpecs } from '../../utils/formatters';
import { X, Save, Loader2, AlertTriangle, ShieldAlert, Layers } from 'lucide-react';

const inputClass = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue';
const labelClass = 'block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1';

export const MasterCorrectionModal = ({ isOpen = true, reel, onClose, onSuccess }) => {
  const [masterCodes, setMasterCodes] = useState([]);
  const [formData, setFormData] = useState({
    reel_no: '',
    master_code_id: '',
    master_code: '',
    quality: 'VK',
    bf: 18,
    supplier_name: '',
    mill_name: '',
    size: 100,
    gsm: 150,
    max_weight: 1000,
    current_weight: 1000,
    station: '',
    correction_reason: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    masterCodeApi.list({ status: 'ACTIVE' })
      .then((res) => {
        if (mounted && res.success && Array.isArray(res.data)) {
          setMasterCodes(res.data);
        }
      })
      .catch((err) => console.error('Failed to load master codes in edit modal', err));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (reel) {
      let matchedCodeId = '';
      let matchedCode = reel.master_code || '';

      if (masterCodes.length > 0) {
        // 1. By ID
        if (reel.master_code_id) {
          const byId = masterCodes.find(mc => String(mc.master_code_id || mc.id || mc._id) === String(reel.master_code_id));
          if (byId) {
            matchedCodeId = byId.master_code_id || byId.id;
            matchedCode = byId.master_code;
          }
        }
        // 2. By Code
        if (!matchedCodeId && reel.master_code) {
          const clean = String(reel.master_code).replace(/^(master\s*code|code|mc)\s*:?\s*/i, '').trim();
          const byCode = masterCodes.find(mc => 
            String(mc.master_code).trim() === clean || 
            String(mc.master_code).trim() === String(reel.master_code).trim() ||
            String(mc.master_code_name).trim().toLowerCase() === String(reel.master_code).trim().toLowerCase()
          );
          if (byCode) {
            matchedCodeId = byCode.master_code_id || byCode.id;
            matchedCode = byCode.master_code;
          }
        }
        // 3. By Name
        if (!matchedCodeId && reel.master_code_name) {
          const byName = masterCodes.find(mc => String(mc.master_code_name).trim().toLowerCase() === String(reel.master_code_name).trim().toLowerCase());
          if (byName) {
            matchedCodeId = byName.master_code_id || byName.id;
            matchedCode = byName.master_code;
          }
        }
        // 4. By Physical Specifications
        if (!matchedCodeId) {
          const reelQ = String(reel.quality || '').trim().toUpperCase();
          const reelGsm = Number(reel.gsm);
          const reelBf = Number(reel.bf);
          const reelSize = Number(reel.size);
          const bySpecs = masterCodes.find(mc => {
            const specs = extractMasterCodeSpecs(mc);
            if (specs.quality && specs.quality !== reelQ) return false;
            if (specs.bf && specs.bf !== reelBf) return false;
            if (specs.gsm && specs.gsm !== reelGsm) return false;
            if (specs.size && specs.size !== reelSize) return false;
            return true;
          });
          if (bySpecs) {
            matchedCodeId = bySpecs.master_code_id || bySpecs.id;
            matchedCode = bySpecs.master_code;
          }
        }
      }

      setFormData({
        reel_no: reel.reel_no || '',
        master_code_id: matchedCodeId,
        master_code: matchedCode,
        quality: reel.quality || 'VK',
        bf: reel.bf || 18,
        supplier_name: reel.supplier_name || '',
        mill_name: reel.mill_name || '',
        size: reel.size || 100,
        gsm: reel.gsm || 150,
        max_weight: reel.max_weight || 1000,
        current_weight: reel.current_weight ?? reel.previous_weight ?? 1000,
        station: (reel.stations_used && reel.stations_used.length > 0) ? reel.stations_used[reel.stations_used.length - 1] : '',
        correction_reason: '',
      });
    }
  }, [reel, masterCodes]);

  if (!isOpen || !reel) return null;

  const handleMasterCodeChange = (e) => {
    const selectedId = e.target.value;
    const selected = masterCodes.find(mc => (mc.master_code_id || mc.id) === selectedId);
    
    if (selected) {
      const specs = extractMasterCodeSpecs(selected);
      setFormData(prev => ({
        ...prev,
        master_code_id: selectedId,
        master_code: selected.master_code,
        quality: specs.quality !== undefined ? specs.quality : prev.quality,
        gsm: specs.gsm !== undefined ? specs.gsm : prev.gsm,
        bf: specs.bf !== undefined ? specs.bf : prev.bf,
        size: specs.size !== undefined ? specs.size : prev.size,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        master_code_id: '',
        master_code: '',
      }));
    }
  };

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
      const payload = {
        reel_no: formData.reel_no.trim(),
        master_code_id: formData.master_code_id || null,
        master_code: formData.master_code || null,
        quality: formData.quality,
        bf: isNaN(Number(formData.bf)) || String(formData.quality || '').trim().toUpperCase() === 'ULTRA' || String(formData.bf).trim().toUpperCase() === 'ULTRA' ? String(formData.bf).trim() : Number(formData.bf),
        supplier_name: formData.supplier_name.trim(),
        mill_name: formData.mill_name ? formData.mill_name.trim() : '',
        size: Number(formData.size),
        gsm: Number(formData.gsm),
        max_weight: Number(formData.max_weight),
        previous_weight: Number(formData.current_weight),
        reason: formData.correction_reason.trim(),
        correction_reason: formData.correction_reason.trim(),
      };
      if (formData.station) {
        payload.station = formData.station;
      }
      const res = await reelApi.masterCorrection(reelId, payload);
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
              <p className="text-[11px] text-amber-800">Direct database override for master specs, master code, or weight error fix.</p>
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
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 mb-2">
            <label className={`${labelClass} text-indigo-900 flex items-center gap-1.5`}>
              <Layers size={14} className="text-indigo-600" />
              Master Code (Business Classification)
            </label>
            <select
              className={inputClass}
              value={formData.master_code_id || ''}
              onChange={handleMasterCodeChange}
            >
              <option value="">(None / Direct Specification)</option>
              {masterCodes.map((mc) => {
                const specs = [
                  mc.quality ? `Quality: ${mc.quality}` : null,
                  mc.bf ? `BF: ${mc.bf}` : null,
                  mc.gsm ? `GSM: ${mc.gsm}` : null,
                  mc.size ? `Size: ${mc.size} cm` : null,
                ].filter(Boolean).join(', ');
                return (
                  <option key={mc.master_code_id || mc.id} value={mc.master_code_id || mc.id}>
                    {mc.master_code} — {mc.master_code_name}{specs ? ` (${specs})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Reel Number</label>
              <input required type="text" className={inputClass} value={formData.reel_no} onChange={(e) => setFormData({ ...formData, reel_no: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Quality</label>
              <select className={inputClass} value={formData.quality} onChange={(e) => {
                const qVal = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  quality: qVal,
                  bf: qVal.trim().toUpperCase() === 'ULTRA' ? 'ULTRA' : prev.bf,
                }));
              }}>
                {['VK', 'SPECTRA', 'ULTRA', 'SK', 'IMPORTANT', 'SBS', 'FBB', 'DCB'].map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            {/* <div>
              <label className={labelClass}>Supplier Name</label>
              <input required type="text" className={inputClass} value={formData.supplier_name} onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Mill Name</label>
              <input type="text" className={inputClass} placeholder="e.g. Century Paper Mill" value={formData.mill_name} onChange={(e) => setFormData({ ...formData, mill_name: e.target.value })} />
            </div> */}
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
              <input required type="text" className={inputClass} value={formData.bf} onChange={(e) => setFormData({ ...formData, bf: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Machine / Assigned Station</label>
              <select className={inputClass} value={formData.station} onChange={(e) => setFormData({ ...formData, station: e.target.value })}>
                <option value="">(None / Keep Existing)</option>
                <option value="E-Flute">E-Flute</option>
                <option value="Narrow-Flute">Narrow-Flute</option>
                <option value="Sheater">Sheater</option>
                <option value="Sold to Revati">Sold to Revati</option>
                <option value="Return">Return</option>
                <option value="Others">Others</option>
              </select>
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

