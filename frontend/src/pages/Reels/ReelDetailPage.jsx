import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reelApi } from '../../api/reelApi';
import { approvalApi } from '../../api/approvalApi';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import Pagination from '../../components/Common/Pagination';
import Toast from '../../components/Common/Toast';
import { formatDate, formatDateTime, formatWeight, formatCurrency, getStatusBadgeStyle, getApprovalBadgeStyle } from '../../utils/formatters';
import { ArrowLeft, CheckCircle2, AlertTriangle, PlusCircle, Activity, ShieldAlert, Check, X, XCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { RecordUsageModal } from './RecordUsageModal';
import { MasterCorrectionModal } from './MasterCorrectionModal';
import { VoidReelModal } from './VoidReelModal';
import DeclineReasonModal from '../Approvals/DeclineReasonModal';

export const ReelDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isRoleAdmin, isRoleSupervisor, isRoleOperator } = useAuth();
  const canApprove = isRoleAdmin || isRoleSupervisor;

  const [reel, setReel] = useState(null);
  const [journey, setJourney] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);

  const fetchReelDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reelRes, journeyRes] = await Promise.all([
        reelApi.getById(id),
        reelApi.getJourney(id, { page: pagination.page, limit: pagination.limit }),
      ]);

      if (reelRes.success) setReel(reelRes.data);
      if (journeyRes.success) {
        const payload = journeyRes.data || journeyRes;
        setJourney(payload.events || []);
        const meta = journeyRes.meta || payload.meta || {};
        setPagination((prev) => ({
          ...prev,
          page: meta.page || prev.page,
          limit: meta.limit || prev.limit,
          total: meta.total !== undefined ? meta.total : (payload.events?.length || 0),
          totalPages: meta.totalPages || 1,
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load reel details');
    } finally {
      setLoading(false);
    }
  }, [id, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchReelDetails();
  }, [fetchReelDetails]);

  const handleApprove = async (eventId) => {
    if (!canApprove) return;
    setActionLoadingId(eventId);
    try {
      await approvalApi.approve(eventId);
      setToast({ type: 'success', message: 'Approval request confirmed successfully!' });
      fetchReelDetails();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to confirm request.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineSubmit = async (reason) => {
    if (!declineTarget) return;
    const targetId = declineTarget.id || declineTarget._id;
    setActionLoadingId(targetId);
    try {
      await approvalApi.decline(targetId, reason);
      setToast({ type: 'success', message: 'Approval request declined.' });
      setDeclineTarget(null);
      fetchReelDetails();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to decline request.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) return <LoadingState message="Loading reel details and journey timeline…" />;
  if (error) return <ErrorAlert message={error} onRetry={fetchReelDetails} />;
  if (!reel) return <ErrorAlert message="Reel not found." />;

  const currentWeight = reel.current_weight ?? reel.previous_weight ?? reel.max_weight;
  const customFieldsEntries = Object.entries(reel.custom_fields || reel.customFields || {});
  const isVoided = reel.status === 'VOIDED' || reel.record_status === 'VOIDED';

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/reels')}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
                Reel #{reel.reel_no}
              </h1>
              {reel.master_code && (
                <span className="px-2.5 py-1 bg-brand-blue/10 text-brand-blue font-mono font-bold text-xs rounded-lg">
                  {/^master code/i.test(String(reel.master_code).trim())
                    ? reel.master_code
                    : (/^\d+$/.test(String(reel.master_code).trim())
                      ? `Master Code ${reel.master_code}`
                      : `Master Code: ${reel.master_code}`)}
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeStyle(reel.status)}`}>
                {reel.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              SRNO: {reel.sr_no} · Purchased on {formatDate(reel.purchase_date)}
            </p>
          </div>
        </div>

        {/* Action Buttons (Role-Gated) */}
        {!isVoided && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Record Usage (Operator & Admin) */}
            {(isRoleOperator || isRoleAdmin) && reel.status !== 'NILL' && (
              (reel.pending_count > 0 || reel.approval_status === 'PENDING') ? (
                <button
                  disabled
                  className="px-3.5 py-2 bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-not-allowed"
                  title={`Locked: Not approved by Admin (Since ${formatDate(reel.created_at || reel.purchase_date)})`}
                >
                  Record Usage (Locked)
                </button>
              ) : (
                <button
                  onClick={() => setShowUsageModal(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  Record Usage
                </button>
              )
            )}

            {/* Master Correction / Edit Details (Supervisor & Admin) */}
            {(isRoleAdmin || isRoleSupervisor) && (
              <button
                onClick={() => setShowCorrectionModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                Edit Reel Details
              </button>
            )}

            {/* Void Reel (Admin Only) */}
            {isRoleAdmin && (
              <button
                onClick={() => setShowVoidModal(true)}
                className="px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-colors"
              >
                Void Reel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Unapproved Warning Banner */}
      {(reel.pending_count > 0 || reel.approval_status === 'PENDING') && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-amber-950 dark:text-amber-100 text-sm block">
                Not approved by Admin (Since {formatDate(reel.created_at || reel.purchase_date)})
              </span>
              <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                This inward reel is awaiting Admin approval. Weight usage and alterations are locked until approved.
              </p>
            </div>
          </div>
          {canApprove && (
            <button
              onClick={() => navigate('/approvals')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0"
            >
              Review in Approvals
            </button>
          )}
        </div>
      )}

      {/* Main Specs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Physical Specs */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Physical Specs</h3>
          <SpecRow label="Quality" value={reel.quality} bold />
          <SpecRow label="Supplier" value={reel.supplier_name} />
          <SpecRow label="Bursting Factor (BF)" value={reel.bf} />
          <SpecRow label="GSM" value={reel.gsm} />
          <SpecRow label="Size / Width" value={`${reel.size} cm`} />
          <SpecRow label="Rate / KG" value={reel.rate_per_kg ? `₹${reel.rate_per_kg}/kg` : 'N/A'} />
        </div>

        {/* Inventory Weight Status */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Inventory Weight & Value</h3>
          <SpecRow label="Current Balance" value={formatWeight(currentWeight)} highlight />
          <SpecRow label="Current Stock Value" value={formatCurrency(Math.round((currentWeight || 0) * (reel.rate_per_kg || 55)))} bold />
          <SpecRow label="Initial Max Weight" value={formatWeight(reel.max_weight)} />
          <SpecRow label="Consumed Stock" value={formatWeight(reel.consumed_weight || Math.max(reel.max_weight - currentWeight, 0))} />
          <SpecRow label="Status" value={reel.status} />
        </div>

        {/* Custom Fields */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Custom Parameters</h3>
          {customFieldsEntries.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No custom parameters assigned.</p>
          ) : (
            customFieldsEntries.map(([k, v]) => (
              <SpecRow key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
            ))
          )}
        </div>
      </div>

      {/* Journey Timeline */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6" style={{ fontFamily: 'var(--font-family-display)' }}>
          Activity & Approval Journey
        </h2>

        {journey.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">No history logs recorded for this reel.</p>
        ) : (
          <div className="relative border-l-2 border-gray-100 ml-4 space-y-6">
            {journey.map((event) => {
              const eventId = event.id || event._id;
              const eventType = event.event_type || event.type || 'EVENT';
              const performedBy = event.performed_by?.name || event.performed_by_name || event.performed_by?.username || event.performed_by || 'User';
              const approvedBy = event.decision?.by_name || event.approved_by_name || event.approved_by?.name || event.approved_by?.username || (typeof event.approved_by === 'string' ? event.approved_by : null) || performedBy;
              const status = event.approval_status || (event.approved_at ? 'CONFIRMED' : 'PENDING');
              const isPending = status === 'PENDING';

              return (
                <div key={eventId} className="relative pl-8">
                  <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center text-brand-blue shadow-xs">
                    {eventType === 'CREATED' && <PlusCircle size={16} />}
                    {eventType === 'USAGE_LOGGED' && <Activity size={16} />}
                    {eventType === 'DECLINED_REVERTED' && <AlertTriangle size={16} className="text-red-500" />}
                    {eventType === 'MASTER_CORRECTED' && <ShieldAlert size={16} className="text-amber-500" />}
                  </div>

                  <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 capitalize">
                          {eventType.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-xs text-gray-500">
                          by <span className="font-semibold text-gray-800">{performedBy}</span> on {formatDateTime(event.performed_at || event.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getApprovalBadgeStyle(status)}`}>
                          {status}
                        </span>

                        {isPending && canApprove && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <button
                              onClick={() => setDeclineTarget(event)}
                              disabled={actionLoadingId === eventId}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <X size={12} />
                              <span>Decline</span>
                            </button>

                            <button
                              onClick={() => handleApprove(eventId)}
                              disabled={actionLoadingId === eventId}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs flex items-center gap-1 disabled:opacity-50"
                            >
                              <Check size={12} />
                              <span>Confirm</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Event Payload Details */}
                    {event.payload && (
                      <div className="bg-white p-3 rounded-xl border border-gray-100 text-xs space-y-1">
                        {event.payload.station && <p>Station: <span className="font-semibold">{event.payload.station}</span></p>}
                        {event.payload.previous_weight !== undefined && (
                          <p>Weight before: <span className="text-gray-400 line-through">{event.payload.previous_weight} kg</span></p>
                        )}
                        {event.payload.current_weight_entered !== undefined && (
                          <p>Weight after: <span className="font-bold text-gray-900">{event.payload.current_weight_entered} kg</span></p>
                        )}
                        {event.payload.used_this_time !== undefined && (
                          <p className="text-amber-700 font-bold pt-1">Used: {event.payload.used_this_time} kg</p>
                        )}
                        {event.payload.correction_reason && (
                          <p className="text-amber-800 font-medium">Correction Note: {event.payload.correction_reason}</p>
                        )}
                      </div>
                    )}

                    {/* Decision Details Banner for Confirmed / Declined */}
                    {status === 'DECLINED' || (event.decision && event.decision.reason) || event.decline_reason ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs space-y-1 mt-2">
                        <div className="flex items-center gap-1.5 font-bold text-red-900">
                          <XCircle size={14} className="text-red-600 shrink-0" />
                          <span>Declined by <strong>{event.decision?.by_name || approvedBy || 'Admin/Supervisor'}</strong> on {formatDateTime(event.decision?.at || event.performed_at)}</span>
                        </div>
                        {(event.decline_reason || event.decision?.reason) && (
                          <div className="text-red-800 font-medium pl-5 pt-0.5">
                            <span className="font-bold">Reason: </span>
                            <span className="bg-white px-2 py-0.5 rounded border border-red-200 font-mono text-[11px] text-red-900 font-semibold">
                              "{event.decline_reason || event.decision?.reason}"
                            </span>
                          </div>
                        )}
                        {event.decision?.reverted_from !== undefined && (
                          <p className="text-[11px] text-red-700 pl-5 font-mono">
                            Weight reverted: {formatWeight(event.decision.reverted_from)} &rarr; {formatWeight(event.decision.reverted_to)}
                          </p>
                        )}
                      </div>
                    ) : (status === 'CONFIRMED' || approvedBy) && (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-1.5 mt-2">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span>Confirmed by <strong>{event.decision?.by_name || approvedBy}</strong> on {formatDateTime(event.decision?.at || event.approved_at || event.performed_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls for Timeline */}
        {journey.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
              onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
            />
          </div>
        )}
      </div>

      {/* Action Modals */}
      {showUsageModal && (
        <RecordUsageModal
          reel={reel}
          isOpen={showUsageModal}
          onClose={() => setShowUsageModal(false)}
          onSuccess={() => {
            setShowUsageModal(false);
            fetchReelDetails();
          }}
        />
      )}

      {showCorrectionModal && (
        <MasterCorrectionModal
          reel={reel}
          isOpen={showCorrectionModal}
          onClose={() => setShowCorrectionModal(false)}
          onSuccess={() => {
            setShowCorrectionModal(false);
            fetchReelDetails();
          }}
        />
      )}

      {showVoidModal && (
        <VoidReelModal
          reelId={reel.id || reel._id}
          reelNo={reel.reel_no}
          isOpen={showVoidModal}
          onClose={() => setShowVoidModal(false)}
          onSuccess={() => {
            setShowVoidModal(false);
            fetchReelDetails();
          }}
        />
      )}

      {/* Decline Reason Modal */}
      {declineTarget && (
        <DeclineReasonModal
          title={`Decline Request for Reel #${reel.reel_no}`}
          onClose={() => setDeclineTarget(null)}
          onConfirm={handleDeclineSubmit}
          loading={actionLoadingId === (declineTarget.id || declineTarget._id)}
        />
      )}
    </div>
  );
};

export default ReelDetailPage;

const SpecRow = ({ label, value, bold, highlight }) => (
  <div className="flex justify-between items-center text-xs">
    <span className="text-gray-500 capitalize">{label}:</span>
    <span className={`font-medium ${bold ? 'font-bold text-gray-900' : 'text-gray-800'} ${highlight ? 'text-lg font-bold text-brand-blue' : ''}`}>
      {value || '-'}
    </span>
  </div>
);
