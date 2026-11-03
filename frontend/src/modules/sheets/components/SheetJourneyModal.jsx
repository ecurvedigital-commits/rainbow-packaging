import React, { useEffect, useState } from 'react';
import { X, Layers, History, Clock, ArrowDownRight, ArrowUpRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { sheetApi } from '../api/sheetApi';
import { formatDate, formatDateTime } from '../../../utils/formatters';

export default function SheetJourneyModal({ isOpen, onClose, sheetId }) {
  if (!isOpen || !sheetId) return null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    sheetApi
      .getJourney(sheetId)
      .then((res) => {
        if (isMounted && res.success) {
          setData(res.data);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err?.message || 'Failed to load journey');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sheetId]);

  const sheet = data?.sheet;
  const events = data?.events || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <History size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Sheet Lot Journey & History</h3>
              <p className="text-xs text-gray-500">
                {sheet ? `Sr #${sheet.sr_no} — ${sheet.party_name} (${sheet.job_name || 'General'})` : 'Loading details...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-12 text-center text-xs text-gray-400">Loading lot lifecycle...</div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-xs font-medium">
              {error}
            </div>
          )}

          {sheet && !loading && (
            <>
              {/* Specification Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 font-medium">Quality</span>
                  <p className="font-bold text-gray-900 mt-0.5">{sheet.quality}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Dimensions</span>
                  <p className="font-bold text-gray-900 mt-0.5">{sheet.deckle} × {sheet.cutting} cm</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Board GSM</span>
                  <p className="font-bold text-gray-900 mt-0.5">{sheet.gsm} gsm</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Status</span>
                  <p className="font-bold text-emerald-700 mt-0.5">{sheet.status}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Initial Qty</span>
                  <p className="font-bold text-gray-900 mt-0.5">{sheet.initial_quantity.toLocaleString()} pcs ({sheet.initial_weight} kg)</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Current Balance</span>
                  <p className="font-bold text-emerald-800 mt-0.5">{sheet.current_quantity.toLocaleString()} pcs ({sheet.current_weight} kg)</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Consumed</span>
                  <p className="font-bold text-amber-800 mt-0.5">{sheet.consumed_quantity.toLocaleString()} pcs ({sheet.consumed_weight} kg)</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Received Date</span>
                  <p className="font-bold text-gray-900 mt-0.5">{formatDate(sheet.received_date)}</p>
                </div>
              </div>

              {/* Timeline Header */}
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Lifecycle Movement Events ({events.length})
                </h4>

                {events.length === 0 ? (
                  <p className="text-xs text-gray-400">No events recorded yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                    {events.map((e, idx) => {
                      const isCreated = e.event_type === 'CREATED';
                      const isConsumed = e.event_type === 'CONSUMED';
                      const isReturned = e.event_type === 'RETURNED';

                      let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                      if (isCreated) badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      if (isConsumed) badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                      if (isReturned) badgeColor = 'bg-teal-50 text-teal-700 border-teal-200';

                      return (
                        <div key={e.id || idx} className="relative group">
                          {/* Circle dot */}
                          <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-white border-2 border-emerald-600 shadow-xs" />

                          <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-xs space-y-1.5 hover:border-gray-300 transition-colors">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`px-2 py-0.5 rounded-full font-bold border ${badgeColor}`}>
                                {e.event_type}
                              </span>
                              <span className="text-gray-400 text-[11px]">
                                {formatDateTime(e.performed_at)}
                              </span>
                            </div>

                            <p className="text-xs text-gray-800 font-medium">
                              By: <span className="font-bold">{e.performed_by_name}</span> ({e.performed_by_role})
                              {e.payload?.station && ` at station [${e.payload.station}]`}
                            </p>

                            {e.payload?.consumed_quantity && (
                              <div className="text-xs text-amber-800 bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                                <strong>Deducted:</strong> {e.payload.consumed_quantity.toLocaleString()} sheets ({e.payload.consumed_weight} kg)
                                {e.payload.job_card_no && ` — Job Card: ${e.payload.job_card_no}`}
                              </div>
                            )}

                            {e.payload?.returned_quantity && (
                              <div className="text-xs text-teal-800 bg-teal-50/60 p-2 rounded-lg border border-teal-100">
                                <strong>Returned:</strong> {e.payload.returned_quantity.toLocaleString()} sheets ({e.payload.new_weight} kg)
                              </div>
                            )}

                            {e.payload?.notes && (
                              <p className="text-xs text-gray-500 italic">"{e.payload.notes}"</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

