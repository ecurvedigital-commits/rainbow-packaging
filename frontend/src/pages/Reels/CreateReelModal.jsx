import React, { useState, useEffect } from 'react';
import { reelApi } from '../../api/reelApi';
import { masterCodeApi } from '../../api/masterCodeApi';
import { fieldDefinitionApi } from '../../api/fieldDefinitionApi';
import { extractMasterCodeSpecs } from '../../utils/formatters';
import { X, Save, Loader2, AlertCircle, RefreshCw, Layers, Key } from 'lucide-react';

const inputClass = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue transition-shadow';
const labelClass = 'block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1';

export const CreateReelModal = ({ isOpen = true, onClose, onSuccess }) => {
  const [fieldDefs, setFieldDefs] = useState([]);
  const [masterCodes, setMasterCodes] = useState([]);
  const [selectedMasterCodeId, setSelectedMasterCodeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingNextNo, setLoadingNextNo] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    reel_no: '',
    quality: 'VK',
    bf: 18,
    supplier_name: '',
    mill_name: '',
    size: 100,
    gsm: 150,
    rate_per_kg: '',
    max_weight: 1000,
    purchase_date: new Date().toISOString().split('T')[0],
    custom_fields: {},
  });

  const fetchNextReelNumber = async () => {
    setLoadingNextNo(true);
    try {
      const res = await reelApi.getNextReelNumber();
      if (res.success && res.data?.next_reel_no) {
        setFormData((prev) => ({ ...prev, reel_no: res.data.next_reel_no }));
      }
    } catch (err) {
      console.warn('Failed to load next reel number:', err.message);
    } finally {
      setLoadingNextNo(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const fetchInitialData = async () => {
      try {
        const [fieldRes, codeRes] = await Promise.all([
          fieldDefinitionApi.list(),
          masterCodeApi.list({ status: 'ACTIVE' }),
        ]);

        if (fieldRes.success && Array.isArray(fieldRes.data)) {
          setFieldDefs(fieldRes.data.filter((f) => f.is_active !== false));
        }

        if (codeRes.success && Array.isArray(codeRes.data)) {
          setMasterCodes(codeRes.data);
          // Auto select first master code if available
          if (codeRes.data.length > 0) {
            const first = codeRes.data[0];
            setSelectedMasterCodeId(first.master_code_id || first.id);
            const specs = extractMasterCodeSpecs(first);
            setFormData((prev) => ({
              ...prev,
              quality: specs.quality !== undefined ? specs.quality : prev.quality,
              gsm: specs.gsm !== undefined ? specs.gsm : prev.gsm,
              bf: specs.bf !== undefined ? specs.bf : prev.bf,
              size: specs.size !== undefined ? specs.size : prev.size,
            }));
          }
        }
      } catch (err) {
        console.warn('Failed to load initial reel modal data:', err.message);
      }

      fetchNextReelNumber();
    };

    fetchInitialData();
  }, [isOpen]);

  const handleMasterCodeChange = (e) => {
    const codeId = e.target.value;
    setSelectedMasterCodeId(codeId);
    const selected = masterCodes.find((mc) => (mc.master_code_id || mc.id) === codeId);
    if (selected) {
      const specs = extractMasterCodeSpecs(selected);
      setFormData((prev) => ({
        ...prev,
        quality: specs.quality !== undefined ? specs.quality : prev.quality,
        gsm: specs.gsm !== undefined ? specs.gsm : prev.gsm,
        bf: specs.bf !== undefined ? specs.bf : prev.bf,
        size: specs.size !== undefined ? specs.size : prev.size,
      }));
    }
  };

  // Real-time Technical Master Key generator (Canonical formula: QualityCode-GsmCode-BfCode-SizeCode)
  const getTechnicalMasterKey = () => {
    try {
      const qCodeMap = { VK: 'VK', SPECTRA: 'SPC', ULTRA: 'ULT', SK: 'SK', IMPORTANT: 'IMP', SBS: 'SBS', FBB: 'FBB', DCB: 'DCB' };
      const qCode = qCodeMap[formData.quality] || formData.quality || 'VK';
      const gsmNum = parseInt(formData.gsm, 10);
      const gsmCode = isNaN(gsmNum) ? 'G000' : `G${gsmNum < 100 ? String(gsmNum).padStart(3, '0') : gsmNum}`;
      const bfNum = parseInt(formData.bf, 10);
      const bfCode = isNaN(bfNum) ? 'BF00' : `BF${bfNum}`;
      const sizeNum = parseFloat(formData.size);
      const sizeCode = isNaN(sizeNum) ? 'S00' : `S${sizeNum % 1 === 0 ? String(sizeNum) : sizeNum.toFixed(1)}`;
      return `${qCode}-${gsmCode}-${bfCode}-${sizeCode}`;
    } catch {
      return 'CALCULATING...';
    }
  };

  const technicalMasterKey = getTechnicalMasterKey();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const selectedCodeDoc = masterCodes.find((mc) => (mc.master_code_id || mc.id) === selectedMasterCodeId);

      const payload = {
        reel_no: formData.reel_no.trim(),
        master_code: selectedCodeDoc ? selectedCodeDoc.master_code : undefined,
        master_code_id: selectedMasterCodeId || undefined,
        quality: formData.quality,
        bf: isNaN(Number(formData.bf)) || String(formData.quality || '').trim().toUpperCase() === 'ULTRA' || String(formData.bf).trim().toUpperCase() === 'ULTRA' ? String(formData.bf).trim() : Number(formData.bf),
        supplier_name: formData.supplier_name.trim(),
        mill_name: formData.mill_name ? formData.mill_name.trim() : '',
        size: Number(formData.size),
        gsm: Number(formData.gsm),
        rate_per_kg: formData.rate_per_kg ? Number(formData.rate_per_kg) : 0,
        max_weight: Number(formData.max_weight),
        purchase_date: formData.purchase_date,
        custom_fields: formData.custom_fields,
      };

      const res = await reelApi.create(payload);
      setSubmitting(false);

      if (res.success) {
        onSuccess(res.data?.message || `Reel #${formData.reel_no} created successfully!`);
        onClose();
      }
    } catch (err) {
      setSubmitting(false);
      setError(err.message || 'Failed to create reel.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-scale-in max-h-[90vh] flex flex-col">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
              Create New Reel
            </h2>
            <p className="text-xs text-gray-500">Submitted entries require supervisor confirmation.</p>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* STEP 1: Business Master Code Selector Box */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-brand-blue uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-brand-blue" />
                Master Code (Business Classification) *
              </label>
              <span className="text-[11px] font-semibold text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                {masterCodes.length} Active Master Codes
              </span>
            </div>
            <select
              className="w-full border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              value={selectedMasterCodeId}
              onChange={handleMasterCodeChange}
            >
              {masterCodes.map((mc) => {
                const specs = [
                  mc.quality ? `Quality: ${mc.quality}` : null,
                  mc.bf ? `BF: ${mc.bf}` : null,
                  mc.gsm ? `GSM: ${mc.gsm}` : null,
                  mc.size ? `Size: ${mc.size} cm` : null,
                ].filter(Boolean).join(', ');
                return (
                  <option key={mc.master_code_id || mc.id} value={mc.master_code_id || mc.id}>
                    Master Code {mc.master_code} — {mc.master_code_name} {specs ? `(${specs})` : ''}
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-gray-500">
              Selecting a Master Code automatically pre-fills Quality, GSM, BF, and Size.
            </p>
          </div>

          {/* STEP 2: Pre-filled Technical Specification Fields & Reel Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className={labelClass}>Reel Number *</label>
                <button
                  type="button"
                  onClick={fetchNextReelNumber}
                  disabled={loadingNextNo}
                  className="text-[10px] text-brand-blue hover:underline flex items-center gap-1 font-semibold mb-1"
                  title="Auto-calculate next sequence number"
                >
                  <RefreshCw size={10} className={loadingNextNo ? 'animate-spin' : ''} />
                  Auto-next
                </button>
              </div>
              <input
                required
                type="text"
                className={inputClass}
                placeholder="e.g. R-2201"
                value={formData.reel_no}
                onChange={(e) => setFormData({ ...formData, reel_no: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Quality *</label>
              <input
                required
                type="text"
                className={inputClass}
                placeholder="e.g. duplex, sk, vk, import kraft, fbb, sbs"
                value={formData.quality}
                onChange={(e) => {
                  const qVal = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    quality: qVal,
                    bf: qVal.trim().toUpperCase() === 'ULTRA' ? 'ULTRA' : prev.bf,
                  }));
                }}
              />
            </div>

            <div>
              <label className={labelClass}>Supplier Name *</label>
              <input
                required
                type="text"
                className={inputClass}
                placeholder="e.g. Alpha Papers"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Mill Name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Century Paper Mill"
                value={formData.mill_name}
                onChange={(e) => setFormData({ ...formData, mill_name: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Reel Weight (kg) *</label>
              <input
                required
                type="number"
                step="any"
                min="0.01"
                className={inputClass}
                value={formData.max_weight}
                onChange={(e) => setFormData({ ...formData, max_weight: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className={labelClass}>Rate / KG (₹)</label>
                {formData.rate_per_kg && formData.max_weight > 0 && (
                  <span className="text-[10px] text-brand-green font-bold mb-1">
                    Est: ₹{(Number(formData.rate_per_kg) * Number(formData.max_weight)).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                placeholder="e.g. 55.00"
                value={formData.rate_per_kg}
                onChange={(e) => setFormData({ ...formData, rate_per_kg: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>GSM</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. 220, 230/240, 250+"
                value={formData.gsm}
                onChange={(e) => setFormData({ ...formData, gsm: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Size / Width (cm)</label>
              <input
                type="number"
                step="any"
                min="0.01"
                className={inputClass}
                placeholder="e.g. 100, 105.5, 120"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Bursting Factor (BF)</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. 18, 22, ultra, dcb, spectra"
                value={formData.bf}
                onChange={(e) => setFormData({ ...formData, bf: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Purchase Date *</label>
              <input
                required
                type="date"
                className={inputClass}
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              />
            </div>
          </div>

          {/* STEP 3: Derived Read-Only Technical Master Key Display Box (Hidden)
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <label className="text-[11px] font-bold text-brand-blue uppercase tracking-wider flex items-center gap-1.5">
                <Key size={14} className="text-brand-blue" />
                Technical Master Key (System Derived Spec)
              </label>
              <p className="text-xs text-gray-600 mt-0.5">
                Auto-calculated from Quality ({formData.quality}) + GSM ({formData.gsm}) + BF ({formData.bf}) + Size ({formData.size} cm). Read-only.
              </p>
            </div>
            <div className="px-4 py-2 bg-brand-blue text-white rounded-xl font-mono font-bold text-sm tracking-wide shadow-xs shrink-0 border border-brand-blue-dark">
              {technicalMasterKey}
            </div>
          </div>
          */}

          {/* Dynamic Custom Fields */}
          {fieldDefs.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Custom Fields</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fieldDefs.map((def) => (
                  <div key={def.key}>
                    <label className={labelClass}>{def.label} {def.required && '*'}</label>
                    <input
                      type={def.type === 'number' ? 'number' : 'text'}
                      required={def.required}
                      className={inputClass}
                      value={formData.custom_fields[def.key] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          custom_fields: {
                            ...formData.custom_fields,
                            [def.key]: def.type === 'number' ? Number(e.target.value) : e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark flex items-center gap-2 shadow-xs">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {submitting ? 'Submitting…' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReelModal;
