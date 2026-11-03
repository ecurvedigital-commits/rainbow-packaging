import React, { useState } from 'react';
import { Scale, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, Scissors } from 'lucide-react';
import SheetCalculationPreview from './SheetCalculationPreview';
import { calculateConsumedWeight, calculateRemainingWeight } from '../utils/sheetCalculations';

export default function SheetCutForm({ selectedLot, onSubmit, submitting = false }) {
  const [cuttingQty, setCuttingQty] = useState('');
  const [cuttingDate, setCuttingDate] = useState(new Date().toISOString().slice(0, 10));
  const [station, setStation] = useState('Offset Printing');
  const [jobCardNo, setJobCardNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  if (!selectedLot) {
    return (
      <div className="bg-slate-50 border border-dashed border-gray-300 rounded-2xl p-8 text-center text-xs text-gray-500">
        Please select an available stock lot from Step 1 above to proceed with cutting.
      </div>
    );
  }

  const availableQty = selectedLot.current_quantity || 0;
  const numCut = parseInt(cuttingQty, 10) || 0;
  const remainingQty = Math.max(0, availableQty - numCut);

  const cutWeight = calculateConsumedWeight(
    selectedLot.deckle,
    selectedLot.cutting,
    selectedLot.gsm,
    numCut
  );
  const remainingWeight = calculateRemainingWeight(
    selectedLot.deckle,
    selectedLot.cutting,
    selectedLot.gsm,
    remainingQty
  );

  const handlePreSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (numCut <= 0) {
      setError('Please enter a valid cutting quantity greater than 0.');
      return;
    }

    if (numCut > availableQty) {
      setError(
        `Cutting quantity (${numCut.toLocaleString()} sheets) exceeds available balance (${availableQty.toLocaleString()} sheets).`
      );
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    if (!onSubmit) return;

    await onSubmit({
      consumed_quantity: numCut,
      station,
      job_card_no: jobCardNo.trim() || undefined,
      notes: remarks.trim() || undefined,
      expected_current_quantity: availableQty,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Inputs */}
        <form
          onSubmit={handlePreSubmit}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
                <Scissors size={18} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Step 2: Enter Cutting & Press Details</h3>
                <p className="text-xs text-gray-500">
                  Deduct issued sheets from Lot #{selectedLot.sr_no} ({selectedLot.party_name})
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold font-mono">
              Balance: {availableQty.toLocaleString()} pcs
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Lot Specifications Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-gray-400 font-medium">Party / Job</span>
              <p className="font-bold text-gray-900 truncate mt-0.5">
                {selectedLot.party_name} ({selectedLot.job_name || 'General'})
              </p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Dimensions</span>
              <p className="font-bold text-gray-900 font-mono mt-0.5">
                {selectedLot.deckle} × {selectedLot.cutting} cm
              </p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Board Quality & GSM</span>
              <p className="font-bold text-gray-900 mt-0.5">
                {selectedLot.quality} — {selectedLot.gsm} GSM
              </p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Available Stock</span>
              <p className="font-bold text-emerald-800 font-mono mt-0.5">
                {availableQty.toLocaleString()} pcs ({selectedLot.current_weight} kg)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Cutting Quantity (Sheets to Issue) *
              </label>
              <input
                type="number"
                min="1"
                max={availableQty}
                required
                value={cuttingQty}
                onChange={(e) => setCuttingQty(e.target.value)}
                placeholder={`Max available: ${availableQty}`}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl text-sm font-bold text-gray-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Cutting / Issue Date *
              </label>
              <input
                type="date"
                required
                value={cuttingDate}
                onChange={(e) => setCuttingDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Production Station / Destination *
              </label>
              <select
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
              >
                <option value="Offset Printing">Offset Printing</option>
                <option value="Die Cutting">Die Cutting</option>
                <option value="Pasting">Pasting</option>
                <option value="Corrugation Liner">Corrugation Liner</option>
                <option value="Scrap/Trim">Scrap/Trim</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Job Card / Order # (Optional)
              </label>
              <input
                type="text"
                value={jobCardNo}
                onChange={(e) => setJobCardNo(e.target.value)}
                placeholder="e.g. JC-7042"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Remarks / Production Notes
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Issued 2 bundles to Offset Heidelberg machine #2"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl text-xs font-medium text-gray-900 outline-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="submit"
              disabled={submitting || numCut <= 0 || numCut > availableQty}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Scissors size={15} />
              <span>Review & Confirm Outward Cut</span>
            </button>
          </div>
        </form>

        {/* Live Calculation Preview Sidebar */}
        <div className="space-y-4">
          <SheetCalculationPreview
            deckle={selectedLot.deckle}
            cutting={selectedLot.cutting}
            gsm={selectedLot.gsm}
            quantity={numCut}
            mode="cut"
            availableQty={availableQty}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
                <Scissors size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Confirm Stock Outward / Cut</h3>
                <p className="text-xs text-gray-500">Please review before deducting stock</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2 text-gray-800">
              <div className="flex justify-between">
                <span className="text-gray-500">Stock Lot:</span>
                <span className="font-bold">Lot #{selectedLot.sr_no} ({selectedLot.party_name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Station:</span>
                <span className="font-semibold">{station}</span>
              </div>
              {jobCardNo && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Job Card #:</span>
                  <span className="font-mono font-bold">{jobCardNo}</span>
                </div>
              )}
              <div className="flex justify-between text-amber-900 font-bold border-t border-gray-200 pt-2">
                <span>Deducting:</span>
                <span>{numCut.toLocaleString()} sheets ({cutWeight} kg)</span>
              </div>
              <div className="flex justify-between text-emerald-900 font-bold">
                <span>Remaining in Store:</span>
                <span>{remainingQty.toLocaleString()} sheets ({remainingWeight} kg)</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {submitting && <RefreshCw size={14} className="animate-spin" />}
                <span>{submitting ? 'Deducting Stock...' : 'Confirm & Deduct'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

