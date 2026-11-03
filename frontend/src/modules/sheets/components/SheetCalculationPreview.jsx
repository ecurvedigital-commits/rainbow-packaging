import React from 'react';
import { Sparkles, Scale, Layers } from 'lucide-react';
import {
  calculateSheetArea,
  calculateSingleSheetWeight,
  calculateTotalWeight,
} from '../utils/sheetCalculations';

export default function SheetCalculationPreview({
  deckle,
  cutting,
  gsm,
  quantity,
  mode = 'inward', // 'inward' | 'cut'
  availableQty = 0,
}) {
  const d = parseFloat(deckle) || 0;
  const c = parseFloat(cutting) || 0;
  const g = parseFloat(gsm) || 0;
  const q = parseInt(quantity, 10) || 0;

  const areaM2 = calculateSheetArea(d, c);
  const singleKg = calculateSingleSheetWeight(d, c, g);
  const singleGrams = (singleKg * 1000).toFixed(2);
  const totalWeightKg = calculateTotalWeight(d, c, g, q);
  const totalWeightTons = (totalWeightKg / 1000).toFixed(3);

  // If in 'cut' mode, calculate remaining
  const remainingQty = Math.max(0, availableQty - q);
  const remainingWeightKg = calculateTotalWeight(d, c, g, remainingQty);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-6 rounded-2xl shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles size={16} />
          <span>Live Weight Calculations</span>
        </div>
        <span className="text-[10px] text-gray-400 font-mono">
          Formula: (D × C × GSM × Qty) / 10M
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <span className="text-[11px] text-gray-400">Surface Area / Sheet</span>
          <p className="text-base font-mono font-bold text-white mt-0.5">
            {areaM2 > 0 ? `${areaM2} m²` : '—'}
          </p>
          <span className="text-[10px] text-gray-500 font-mono">({d || 'D'} × {c || 'C'} / 10K)</span>
        </div>

        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <span className="text-[11px] text-gray-400">Weight / Sheet</span>
          <p className="text-base font-mono font-bold text-white mt-0.5">
            {singleKg > 0 ? `${singleGrams} g` : '—'}
          </p>
          <span className="text-[10px] text-gray-500 font-mono">({singleKg.toFixed(4)} kg)</span>
        </div>
      </div>

      {mode === 'inward' ? (
        <div className="p-4 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
          <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">
            Total Inward Weight (Authoritative)
          </span>
          <p className="text-2xl font-mono font-black text-emerald-400 mt-1">
            {totalWeightKg > 0 ? `${totalWeightKg.toLocaleString()} kg` : '0 kg'}
          </p>
          {totalWeightKg > 0 && (
            <span className="text-xs text-emerald-200/80 font-mono mt-0.5 block">
              Equivalent to ~{totalWeightTons} Metric Tons ({q.toLocaleString()} sheets)
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="p-3.5 bg-amber-500/20 rounded-xl border border-amber-500/30">
            <span className="text-xs text-amber-300 font-semibold uppercase tracking-wider">
              Issued for Cut / Outward
            </span>
            <p className="text-xl font-mono font-black text-amber-400 mt-1">
              {totalWeightKg > 0 ? `${totalWeightKg.toLocaleString()} kg` : '0 kg'}
            </p>
            <span className="text-[11px] text-amber-200/80 font-mono mt-0.5 block">
              {q > 0 ? `${q.toLocaleString()} sheets to press` : 'Enter cutting quantity'}
            </span>
          </div>

          <div className="p-3.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">
              Projected Remaining Balance
            </span>
            <p className="text-xl font-mono font-black text-emerald-400 mt-1">
              {availableQty > 0 ? `${remainingWeightKg.toLocaleString()} kg` : '0 kg'}
            </p>
            <span className="text-[11px] text-emerald-200/80 font-mono mt-0.5 block">
              {remainingQty.toLocaleString()} sheets remaining in store
            </span>
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400 leading-relaxed pt-1 border-t border-white/5">
        Calculated dynamically from board deckle, cutting, GSM, and sheet count. Authoritative values are re-verified on the backend.
      </p>
    </div>
  );
}

