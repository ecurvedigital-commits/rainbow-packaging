import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Calendar,
  Building2,
  Briefcase,
  Hash,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { sheetApi } from '../api/sheetApi';
import SheetCalculationPreview from '../components/SheetCalculationPreview';
import SheetImportModal from '../components/SheetImportModal';

const STANDARD_QUALITIES = [
  'ULTRA',
  'EXCEL',
  'ANAND',
  'DUPLEX',
  'FBB',
  'SBS',
  'KRAFT',
  'WHITE BACK',
  'GREY BACK',
];

export default function SheetInwardPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    party_name: '',
    job_name: '',
    quality: 'ULTRA',
    deckle: '',
    cutting: '',
    gsm: '',
    quantity: '',
    lot_no: '',
    supplier_name: '',
    received_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const [filterOptions, setFilterOptions] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    sheetApi.getFilterOptions().then((res) => {
      if (res.success && res.data) {
        setFilterOptions(res.data);
      }
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData({
      party_name: '',
      job_name: '',
      quality: 'ULTRA',
      deckle: '',
      cutting: '',
      gsm: '',
      quantity: '',
      lot_no: '',
      supplier_name: '',
      received_date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setError(null);
    setSuccess(null);
  };

  const deckleNum = parseFloat(formData.deckle) || 0;
  const cuttingNum = parseFloat(formData.cutting) || 0;
  const gsmNum = parseFloat(formData.gsm) || 0;
  const qtyNum = parseInt(formData.quantity, 10) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.party_name.trim()) {
      setError('Party Name is required.');
      return;
    }
    if (!formData.quality.trim()) {
      setError('Quality is required.');
      return;
    }
    if (deckleNum <= 0) {
      setError('Deckle must be a valid positive dimension in cm (e.g., 58.5).');
      return;
    }
    if (cuttingNum <= 0) {
      setError('Cutting must be a valid positive dimension in cm (e.g., 74.5).');
      return;
    }
    if (gsmNum <= 0) {
      setError('GSM must be a valid positive number (e.g., 230).');
      return;
    }
    if (qtyNum <= 0) {
      setError('Quantity of sheets must be a positive whole number.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        party_name: formData.party_name.trim(),
        job_name: formData.job_name.trim(),
        quality: formData.quality.trim().toUpperCase(),
        deckle: deckleNum,
        cutting: cuttingNum,
        gsm: gsmNum,
        quantity: qtyNum,
        lot_no: formData.lot_no.trim() || undefined,
        supplier_name: formData.supplier_name.trim() || undefined,
        received_date: formData.received_date || undefined,
        notes: formData.notes.trim() || undefined,
      };

      const res = await sheetApi.create(payload);
      if (res.success && res.data) {
        setSuccess(`Sheet Lot #${res.data.sr_no} inwarded successfully with ${res.data.initial_quantity.toLocaleString()} sheets (${res.data.initial_weight.toLocaleString()} kg)!`);
        setTimeout(() => {
          navigate('/sheets/inventory');
        }, 1500);
      }
    } catch (err) {
      setError(err?.message || 'Failed to inward sheet lot.');
    } finally {
      setSubmitting(false);
    }
  };

  // Combine standard and existing qualities
  const qualityOptions = Array.from(
    new Set([...STANDARD_QUALITIES, ...(filterOptions?.qualities || [])])
  ).sort();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/sheets/inventory')}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            title="Back to Sheet Inventory"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-black text-gray-900 tracking-tight"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                Sheet Inward (Invert)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Store Inward Entry
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Inward new board stock lots into store inventory with automatic weight calculation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Excel Batch Import</span>
          </button>
          <Link
            to="/sheets/inventory"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-all shadow-xs"
          >
            <Layers size={15} />
            <span>View Inventory</span>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold animate-scale-in">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold animate-scale-in">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <div className="flex-1">{success}</div>
        </div>
      )}

      {/* Main Grid: Form (Left 2 cols) + Live Calculation Preview (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inward Entry Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6"
        >
          {/* Section 1: Party & Job Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Building2 size={16} className="text-emerald-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                1. Party & Job Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Party Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="party_name"
                  list="party-list"
                  value={formData.party_name}
                  onChange={handleChange}
                  placeholder="e.g. M/S CARBORUNDUM UNIVERSAL LTD"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                  required
                />
                <datalist id="party-list">
                  {filterOptions?.parties?.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                <p className="text-[10px] text-gray-400 mt-1">Client or party owning or assigned to this stock</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Job Name <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="job_name"
                  list="job-list"
                  value={formData.job_name}
                  onChange={handleChange}
                  placeholder="e.g. 4 INCH CUT OFF WHEEL BOX"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                />
                <datalist id="job-list">
                  {filterOptions?.jobs?.map((j) => (
                    <option key={j} value={j} />
                  ))}
                </datalist>
                <p className="text-[10px] text-gray-400 mt-1">Leave blank if general or unassigned board stock</p>
              </div>
            </div>
          </div>

          {/* Section 2: Board Specifications */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Layers size={16} className="text-emerald-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                2. Board Specifications
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Quality <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="quality"
                  list="quality-list"
                  value={formData.quality}
                  onChange={handleChange}
                  placeholder="e.g. ULTRA"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition uppercase"
                  required
                />
                <datalist id="quality-list">
                  {qualityOptions.map((q) => (
                    <option key={q} value={q} />
                  ))}
                </datalist>
                <p className="text-[10px] text-gray-400 mt-1">Board grade or board mill brand</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Deckle (cm) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  name="deckle"
                  value={formData.deckle}
                  onChange={handleChange}
                  placeholder="e.g. 58.5"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">Width in centimeters</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Cutting (cm) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  name="cutting"
                  value={formData.cutting}
                  onChange={handleChange}
                  placeholder="e.g. 74.5"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">Length in centimeters</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  GSM <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  name="gsm"
                  value={formData.gsm}
                  onChange={handleChange}
                  placeholder="e.g. 230"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">Grams per square meter</p>
              </div>
            </div>
          </div>

          {/* Section 3: Quantity & Inward Logistics */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Truck size={16} className="text-emerald-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                3. Quantity & Inward Logistics
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Quantity (Sheets) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="e.g. 10000"
                  className="w-full px-3.5 py-2.5 bg-emerald-50/40 border border-emerald-300 rounded-xl text-sm font-mono font-black text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">Exact sheet count received</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Supplier / Mill Name <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleChange}
                  placeholder="e.g. Emami Paper Mills"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                />
                <p className="text-[10px] text-gray-400 mt-1">Source paper supplier or converter</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Physical Lot / Batch # <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="lot_no"
                  value={formData.lot_no}
                  onChange={handleChange}
                  placeholder="e.g. BATCH-2026-04"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                />
                <p className="text-[10px] text-gray-400 mt-1">Mill pallet or batch label</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Inward Date
                </label>
                <input
                  type="date"
                  name="received_date"
                  value={formData.received_date}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Remarks / Notes <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="e.g. Received in prime condition on 2 pallets"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              <RotateCcw size={15} />
              <span>Clear Form</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/sheets/inventory')}
                className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Inwarding Stock...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle size={16} />
                    <span>Inward Stock (Confirm)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Live Weight Calculation & Formula Sidebar */}
        <div className="space-y-5">
          <SheetCalculationPreview
            deckle={formData.deckle}
            cutting={formData.cutting}
            gsm={formData.gsm}
            quantity={formData.quantity}
            mode="inward"
          />

          {/* Technical Info Box */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-xs uppercase tracking-wider">
              <Sparkles size={15} className="text-emerald-600" />
              <span>Rainbow Board Stock Rules</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-2 list-disc list-inside">
              <li>
                Each inward entry creates an <strong>independent stock lot</strong> with its own unique serial number.
              </li>
              <li>
                Stock weight is authoritatively calculated as:
                <div className="font-mono text-[11px] bg-gray-50 border border-gray-200 p-2 rounded-lg mt-1 text-gray-800">
                  Weight (kg) = (Deckle × Cutting × GSM × Qty) / 10,000,000
                </div>
              </li>
              <li>
                Decimal dimensions are preserved with exact 2-decimal precision (e.g. 58.5 cm × 74.5 cm).
              </li>
              <li>
                Operators can inward lots directly; stock approvals are tracked according to role permissions.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Batch Import Modal */}
      {importModalOpen && (
        <SheetImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => {
            setImportModalOpen(false);
            navigate('/sheets/inventory');
          }}
        />
      )}
    </div>
  );
}

