import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Scissors,
  CornerUpLeft,
  RefreshCw,
  History,
  Scale,
  Layers,
  Calendar,
  Building2,
  Briefcase,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { sheetApi } from '../api/sheetApi';
import { calculateSheetArea, calculateSingleSheetWeight } from '../utils/sheetCalculations';
import SheetUsageModal from '../components/SheetUsageModal';
import SheetAdjustmentModal from '../components/SheetAdjustmentModal';
import SheetReturnModal from '../components/SheetReturnModal';
import { formatDateTime, formatDate } from '../../../utils/formatters';

export default function SheetDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sheet, setSheet] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    sheetApi
      .getJourney(id)
      .then((res) => {
        if (res.success && res.data) {
          setSheet(res.data.sheet);
          setEvents(res.data.events || []);
        }
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load sheet details.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center max-w-4xl mx-auto my-12">
        <div className="w-8 h-8 mx-auto border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-gray-500 font-semibold">Loading stock lot specifications & history...</p>
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-base font-bold text-gray-900">Sheet Lot Not Found</h3>
        <p className="text-xs text-gray-500">{error || 'The requested sheet lot does not exist.'}</p>
        <button
          onClick={() => navigate('/sheets/inventory')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
        >
          <ArrowLeft size={14} /> Back to Inventory
        </button>
      </div>
    );
  }

  const areaM2 = calculateSheetArea(sheet.deckle, sheet.cutting);
  const singleKg = calculateSingleSheetWeight(sheet.deckle, sheet.cutting, sheet.gsm);
  const singleGrams = (singleKg * 1000).toFixed(2);
  const consumedQty = Math.max(0, sheet.initial_quantity - sheet.current_quantity);
  const consumedPct = sheet.initial_quantity > 0
    ? Math.min(100, Math.round((consumedQty / sheet.initial_quantity) * 100))
    : 0;

  const isDepleted = sheet.status === 'DEPLETED';
  const isVoided = sheet.status === 'VOIDED';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/sheets/inventory')}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            title="Back to Sheet Inventory"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-gray-500">LOT #{sheet.sr_no}</span>
              <h1
                className="text-2xl font-black text-gray-900 tracking-tight"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                {sheet.party_name}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  sheet.status === 'AVAILABLE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : sheet.status === 'PARTIALLY_CONSUMED'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : sheet.status === 'DEPLETED'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-gray-100 text-gray-800 border border-gray-300'
                }`}
              >
                {sheet.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Job: <span className="font-semibold text-gray-800">{sheet.job_name || 'General / Unassigned'}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isDepleted && !isVoided && (
            <Link
              to={`/sheets/cut?lotId=${sheet.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Scissors size={15} />
              <span>Cut / Issue Stock</span>
            </Link>
          )}

          {!isVoided && (
            <button
              type="button"
              onClick={() => setReturnModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold rounded-xl border border-teal-200 transition cursor-pointer"
            >
              <CornerUpLeft size={14} />
              <span>Return Stock</span>
            </button>
          )}

          {!isVoided && (
            <button
              type="button"
              onClick={() => setAdjustModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Adjust Count</span>
            </button>
          )}
        </div>
      </div>

      {/* Specifications & Stock Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Balance & Consumption Overview */}
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Current Available Stock
            </span>
            <span className="text-xs font-mono text-emerald-200">{consumedPct}% Used</span>
          </div>

          <div>
            <div className="text-3xl font-mono font-black text-white">
              {sheet.current_quantity.toLocaleString()} <span className="text-lg font-normal text-emerald-200">sheets</span>
            </div>
            <div className="text-sm font-mono text-emerald-300 mt-1">
              {sheet.current_weight.toLocaleString()} kg (~{(sheet.current_weight / 1000).toFixed(3)} tons)
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-2">
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, 100 - consumedPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-emerald-200/80 font-mono">
              <span>Consumed: {consumedQty.toLocaleString()}</span>
              <span>Initial: {sheet.initial_quantity.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Board Specifications */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-gray-900 font-bold text-xs uppercase tracking-wider">
            <Layers size={15} className="text-emerald-600" />
            <span>Board Specifications</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-400 font-medium">Quality Grade</span>
              <p className="font-bold text-gray-900 mt-0.5">{sheet.quality}</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">GSM (Grammage)</span>
              <p className="font-mono font-bold text-gray-900 mt-0.5">{sheet.gsm} g/m²</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Deckle (Width)</span>
              <p className="font-mono font-bold text-gray-900 mt-0.5">{sheet.deckle} cm</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Cutting (Length)</span>
              <p className="font-mono font-bold text-gray-900 mt-0.5">{sheet.cutting} cm</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Area / Sheet</span>
              <p className="font-mono font-semibold text-gray-700 mt-0.5">{areaM2} m²</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Weight / Sheet</span>
              <p className="font-mono font-semibold text-gray-700 mt-0.5">{singleGrams} g</p>
            </div>
          </div>
        </div>

        {/* Card 3: Logistics & Traceability */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-gray-900 font-bold text-xs uppercase tracking-wider">
            <Calendar size={15} className="text-emerald-600" />
            <span>Logistics & Metadata</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-gray-400 font-medium">Physical Lot #</span>
              <p className="font-mono font-semibold text-gray-800 mt-0.5">{sheet.lot_no || 'None'}</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Supplier / Mill</span>
              <p className="font-semibold text-gray-800 mt-0.5">{sheet.supplier_name || 'Direct / Stock'}</p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Inward Date</span>
              <p className="font-medium text-gray-800 mt-0.5">
                {sheet.received_date ? formatDate(sheet.received_date) : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Last Activity</span>
              <p className="font-medium text-gray-800 mt-0.5">
                {sheet.last_activity_at ? formatDateTime(sheet.last_activity_at) : 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lot Journey & Transaction Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <History size={16} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-900">Lot History & Lifecycle Events</h2>
          </div>
          <span className="text-xs text-gray-400 font-medium">{events.length} recorded events</span>
        </div>

        {events.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No lifecycle events recorded for this lot yet.</p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
            {events.map((event) => (
              <div key={event.id} className="relative">
                {/* Node icon */}
                <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-50" />

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{event.event_type}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        {event.approval_status}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400">{formatDateTime(event.performed_at)}</span>
                  </div>

                  <div className="text-xs text-gray-600 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                    {event.payload?.consumed_quantity && (
                      <div>
                        <span className="text-gray-400">Consumed:</span> {event.payload.consumed_quantity.toLocaleString()} pcs
                      </div>
                    )}
                    {event.payload?.consumed_weight && (
                      <div>
                        <span className="text-gray-400">Cut Weight:</span> {event.payload.consumed_weight} kg
                      </div>
                    )}
                    {event.payload?.station && (
                      <div>
                        <span className="text-gray-400">Station:</span> {event.payload.station}
                      </div>
                    )}
                    {event.payload?.job_card_no && (
                      <div>
                        <span className="text-gray-400">Job Card:</span> {event.payload.job_card_no}
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200/60 flex items-center justify-between">
                    <span>
                      Performed by: <strong className="text-gray-700">{event.performed_by_name}</strong> ({event.performed_by_role})
                    </span>
                    {event.approved_by_name && (
                      <span>
                        Approved by: <strong className="text-gray-700">{event.approved_by_name}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {usageModalOpen && (
        <SheetUsageModal
          isOpen={usageModalOpen}
          sheet={sheet}
          onClose={() => setUsageModalOpen(false)}
          onSuccess={() => {
            setUsageModalOpen(false);
            loadData();
          }}
        />
      )}

      {adjustModalOpen && (
        <SheetAdjustmentModal
          isOpen={adjustModalOpen}
          sheet={sheet}
          onClose={() => setAdjustModalOpen(false)}
          onSuccess={() => {
            setAdjustModalOpen(false);
            loadData();
          }}
        />
      )}

      {returnModalOpen && (
        <SheetReturnModal
          isOpen={returnModalOpen}
          sheet={sheet}
          onClose={() => setReturnModalOpen(false)}
          onSuccess={() => {
            setReturnModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

