import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Check, Clock, User, Calendar, Scale, Layers, 
  MapPin, Tag, ShieldCheck, ArrowRight, History, ExternalLink 
} from 'lucide-react';
import { formatWeight, formatDate, formatDateTime } from '../../utils/formatters';

export default function ApprovalDetailModal({
  item,
  onClose,
  onConfirm,
  onDecline,
  canApprove = false,
  loadingAction = false,
}) {
  const navigate = useNavigate();
  if (!item) return null;

  const itemId = item.id || item._id;
  const reelId = item.reel_id || item.reel?.id || item.reel?._id || item.payload?.reel_id || item.reel;
  const reelNo = item.reel_no || item.reel?.reel_no || item.reel_number || 'N/A';
  const eventType = item.event_type || 'ENTRY';
  const approvalStatus = item.approval_status || item.status || 'PENDING';
  const performedBy = item.performed_by_name || item.requested_by?.username || item.requested_by || 'Operator';
  const dateStr = item.performed_at || item.created_at || item.createdAt;

  const isUsage = eventType === 'USAGE_LOGGED';
  const payload = item.payload || {};
  const reelObj = item.reel && typeof item.reel === 'object' ? item.reel : {};

  const prevW = payload.previous_weight ?? item.previous_weight_kg ?? reelObj.previous_weight;
  const currW = payload.current_weight_entered ?? item.requested_weight_kg ?? reelObj.current_weight;
  const usedW = payload.used_this_time ?? (prevW !== undefined && currW !== undefined ? Math.max(0, prevW - currW) : null);
  const maxW = payload.max_weight ?? reelObj.max_weight;

  const masterKey = reelObj.master_key || payload.fields?.master_key || payload.master_key || 'N/A';
  const supplier = reelObj.supplier_name || payload.fields?.supplier_name || payload.supplier_name || 'N/A';
  const mill = reelObj.mill_name || payload.fields?.mill_name || payload.mill_name || item.mill_name || 'N/A';
  const quality = reelObj.quality || payload.fields?.quality || 'N/A';
  const gsm = reelObj.gsm || payload.fields?.gsm || 'N/A';
  const bf = reelObj.bf || payload.fields?.bf || 'N/A';
  const size = reelObj.size || payload.fields?.size || 'N/A';
  const stations = reelObj.stations_used || payload.stations || (payload.station ? [payload.station] : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              eventType === 'CREATED'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                : eventType === 'USAGE_LOGGED'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
            }`}>
              {eventType}
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Approval Details: Reel #{reelNo}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Event ID: <span className="font-mono text-slate-700 dark:text-slate-300">{itemId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Status Alert Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            approvalStatus === 'CONFIRMED' || approvalStatus === 'APPROVED'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : approvalStatus === 'DECLINED'
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wide">Approval Status: </span>
                <strong className="text-sm font-extrabold">{approvalStatus}</strong>
                {item.waiting_hours !== undefined && approvalStatus === 'PENDING' && (
                  <span className="ml-2 text-xs bg-amber-200/60 dark:bg-amber-900/60 px-2 py-0.5 rounded font-mono font-semibold">
                    Waiting {item.waiting_hours}h
                  </span>
                )}
              </div>
            </div>
            {item.decision?.by_name && (
              <div className="text-xs text-right">
                <div>Decision by: <strong>{item.decision.by_name}</strong></div>
                <div className="text-slate-500">{formatDate(item.decision.at)}</div>
              </div>
            )}
          </div>

          {/* Decline Reason if present */}
          {(item.decline_reason || item.decision?.reason) && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 rounded-xl text-rose-800 dark:text-rose-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <X className="w-4 h-4 text-rose-600" />
                Decline Reason Provided:
              </div>
              <p className="font-mono bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
                {item.decline_reason || item.decision?.reason}
              </p>
            </div>
          )}

          {/* Operator Application Info */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              Application & Operator Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Operator Applied:</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{performedBy}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Application Date & Time:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{formatDateTime(dateStr)}</p>
              </div>
            </div>
          </div>

          {/* Weight & Usage Metrics */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-500" />
              Weight & Usage Breakdown
            </h3>
            
            {isUsage ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 block">Previous Weight</span>
                  <span className="text-base font-bold text-slate-800 dark:text-white mt-1 block">
                    {formatWeight(prevW)}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60">
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium block">Entered Weight</span>
                  <span className="text-base font-extrabold text-indigo-700 dark:text-indigo-300 mt-1 block">
                    {formatWeight(currW)}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60">
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium block">Consumed Weight</span>
                  <span className="text-base font-extrabold text-amber-700 dark:text-amber-300 mt-1 block">
                    {usedW !== null ? formatWeight(usedW) : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 block">Initial Max Capacity</span>
                  <span className="text-base font-bold text-slate-800 dark:text-white mt-1 block">
                    {formatWeight(maxW)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block">Starting Status</span>
                  <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 mt-1 block uppercase">
                    {reelObj.status || 'ACTIVE'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Reel Specifications & Usage Location */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              Reel Specifications & Location
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Master Key:</span>
                <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{masterKey}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Supplier:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{supplier}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Mill Name:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{mill}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Quality / GSM:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{quality} ({gsm} GSM)</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">BF / Size:</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{bf} BF / {size}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  Stations / Usage Locations:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {stations.length > 0 ? (
                    stations.map((st, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-[11px] font-medium">
                        {st}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">No specific station recorded</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* View Full Reel Details Page Button */}
          <button
            onClick={() => {
              const targetId = typeof reelId === 'object' ? reelId.id || reelId._id : reelId;
              if (onClose) onClose();
              if (targetId) {
                navigate(`/reels/${targetId}`);
              }
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2"
          >
            <History className="w-4 h-4" />
            <span>Open Full Reel Page & Timeline</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Confirm & Decline Buttons */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            {canApprove && approvalStatus === 'PENDING' && (
              <>
                <button
                  onClick={() => onDecline && onDecline(item)}
                  disabled={loadingAction || item.can_confirm === false}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  <span>Decline</span>
                </button>

                <button
                  onClick={() => onConfirm && onConfirm(itemId)}
                  disabled={loadingAction || item.can_confirm === false}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Entry</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
