import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Scissors,
  CheckCircle2,
  AlertCircle,
  History,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { sheetApi } from '../api/sheetApi';
import SheetStockSelector from '../components/SheetStockSelector';
import SheetCutForm from '../components/SheetCutForm';

export default function SheetCutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialLotId = searchParams.get('lotId') || searchParams.get('id') || '';

  const [selectedLot, setSelectedLot] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cutResult, setCutResult] = useState(null);
  const [error, setError] = useState(null);

  // If initialLotId is provided in URL, load it
  useEffect(() => {
    if (!initialLotId) return;

    setLoadingInitial(true);
    sheetApi
      .getById(initialLotId)
      .then((res) => {
        if (res.success && res.data) {
          setSelectedLot(res.data);
        }
      })
      .catch((err) => {
        setError(`Could not preselect lot (${err?.message || 'Lot not found'})`);
      })
      .finally(() => {
        setLoadingInitial(false);
      });
  }, [initialLotId]);

  const handleCutSubmit = async (cutPayload) => {
    if (!selectedLot) return;

    setSubmitting(true);
    setError(null);
    setCutResult(null);

    try {
      const res = await sheetApi.recordUsage(selectedLot.id, cutPayload);
      if (res.success && res.data) {
        setCutResult({
          lotSrNo: selectedLot.sr_no,
          partyName: selectedLot.party_name,
          jobName: selectedLot.job_name,
          consumedQty: cutPayload.consumed_quantity,
          station: cutPayload.station,
          newRemainingQty: res.data.current_quantity,
          newRemainingWeight: res.data.current_weight,
          consumedWeight: (
            ((selectedLot.deckle * selectedLot.cutting * selectedLot.gsm * cutPayload.consumed_quantity) /
              10000000)
          ).toFixed(2),
        });

        // Update selectedLot state to new balance
        setSelectedLot(res.data);
      }
    } catch (err) {
      setError(err?.message || 'Failed to record sheet cutting issue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setSelectedLot(null);
    setCutResult(null);
    setError(null);
  };

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
                Sheet Cut (Outward / Issue)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Production Cutting
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Issue board stock to offset press, sheeter, or die-cutting with automated stock deduction.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/sheets/history"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <History size={15} className="text-emerald-600" />
            <span>Stock History</span>
          </Link>
          <Link
            to="/sheets/inventory"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-all shadow-xs"
          >
            <Layers size={15} />
            <span>Inventory</span>
          </Link>
        </div>
      </div>

      {/* Loading Initial Lot Spinner */}
      {loadingInitial && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-pulse">
          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Preselecting stock lot from inventory...</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold animate-scale-in">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Success Cut Banner */}
      {cutResult && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Stock Successfully Issued for Cutting!
                </h3>
                <p className="text-xs text-emerald-800">
                  Issued {cutResult.consumedQty.toLocaleString()} sheets (~{cutResult.consumedWeight} kg) from Lot #{cutResult.lotSrNo} to station: {cutResult.station}.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-gray-500 block uppercase font-medium">Updated Store Balance</span>
              <p className="text-lg font-black font-mono text-emerald-800">
                {cutResult.newRemainingQty.toLocaleString()} sheets ({cutResult.newRemainingWeight.toLocaleString()} kg)
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-emerald-200/60 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetForAnother}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              <RotateCcw size={14} />
              <span>Issue from Another Lot</span>
            </button>

            <div className="flex items-center gap-3">
              <Link
                to="/sheets/history"
                className="text-xs font-bold text-emerald-800 hover:underline inline-flex items-center gap-1"
              >
                <History size={14} /> View Stock Movement History
              </Link>
              <Link
                to="/sheets/inventory"
                className="text-xs font-bold text-gray-700 hover:text-gray-900 hover:underline"
              >
                Back to Inventory
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Stock Lot Selection */}
      <SheetStockSelector
        selectedLot={selectedLot}
        onSelectLot={(lot) => {
          setSelectedLot(lot);
          setCutResult(null);
          setError(null);
        }}
      />

      {/* Step 2 & 3: Issue Form and Live Calculation */}
      <SheetCutForm
        selectedLot={selectedLot}
        onSubmit={handleCutSubmit}
        submitting={submitting}
      />
    </div>
  );
}

