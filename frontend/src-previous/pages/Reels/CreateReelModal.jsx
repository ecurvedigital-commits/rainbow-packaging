import React, { useState, useEffect } from 'react';
import { reelApi } from '../../api/reelApi';
import { fieldDefinitionApi } from '../../api/fieldDefinitionApi';
import { X, Save, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const inputClass = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue transition-shadow';
const labelClass = 'block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1';

export const CreateReelModal = ({ isOpen = true, onClose, onSuccess }) => {
  const [fieldDefs, setFieldDefs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingNextNo, setLoadingNextNo] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    reel_no: '',
    quality: 'VK',
    bf: 18,
    supplier_name: '',
    size: 100,
    gsm: 150,
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
        const res = await fieldDefinitionApi.list();
        if (res.success && Array.isArray(res.data)) {
          setFieldDefs(res.data.filter((f) => f.is_active !== false));
        }
      } catch (err) {
        console.warn('Failed to load custom fields:', err.message);
      }

      fetchNextReelNumber();
    };

    fetchInitialData();
  }, [isOpen]);

  const getMasterKeyPreview = () => {
    try {
      const qCodeMap = { VK: 'VK', SPECTRA: 'SPC', ULTRA: 'ULT', SK: 'SK', IMPORTANT: 'IMP', SBS: 'SBS', FBB: 'FBB', DCB: 'DCB' };
      const qCode = qCodeMap[formData.quality] || formData.quality;
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

  const masterKeyPreview = getMasterKeyPreview();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        reel_no: formData.reel_no.trim(),
        quality: formData.quality,
        bf: Number(formData.bf),
        supplier_name: formData.supplier_name.trim(),
        size: Number(formData.size),
        gsm: Number(formData.gsm),
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
              <select
                className={inputClass}
                value={formData.quality}
                onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
              >
                {['VK', 'SPECTRA', 'ULTRA', 'SK', 'IMPORTANT', 'SBS', 'FBB', 'DCB'].map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
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
              <label className={labelClass}>Reel Weight (kg) *</label>
              <input
                required
                type="number"
                min="1"
                className={inputClass}
                value={formData.max_weight}
                onChange={(e) => setFormData({ ...formData, max_weight: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>GSM *</label>
              <input
                required
                type="number"
                min="1"
                className={inputClass}
                value={formData.gsm}
                onChange={(e) => setFormData({ ...formData, gsm: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Size / Width (cm) *</label>
              <input
                required
                type="number"
                min="1"
                className={inputClass}
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Bursting Factor (BF) *</label>
              <input
                required
                type="number"
                min="1"
                className={inputClass}
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

          {/* Master Product Key Live Preview Card */}
          <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">Product Classification Category</p>
              <p className="text-xs text-gray-600">Reel will be grouped under this Master Product Key:</p>
            </div>
            <div className="px-3.5 py-1.5 bg-brand-blue text-white rounded-lg font-mono font-bold text-sm tracking-wide shadow-xs shrink-0">
              {masterKeyPreview}
            </div>
          </div>

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

