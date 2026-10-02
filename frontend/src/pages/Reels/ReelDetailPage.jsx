import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reelApi } from '../../api/reelApi';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';
import { formatDate, formatDateTime, formatWeight, getStatusBadgeStyle, getApprovalBadgeStyle } from '../../utils/formatters';
import { ArrowLeft, CheckCircle2, AlertTriangle, PlusCircle, Activity, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { RecordUsageModal } from './RecordUsageModal';
import { MasterCorrectionModal } from './MasterCorrectionModal';
import { VoidReelModal } from './VoidReelModal';

export const ReelDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isRoleAdmin, isRoleOperator } = useAuth();

  const [reel, setReel] = useState(null);
  const [journey, setJourney] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);

  const fetchReelDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reelRes, journeyRes] = await Promise.all([
        reelApi.getById(id),
        reelApi.getJourney(id),
      ]);

      if (reelRes.success) setReel(reelRes.data);
      if (journeyRes.success) setJourney(journeyRes.data?.events || journeyRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load reel details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReelDetails();
  }, [id]);

  if (loading) return <LoadingState message="Loading reel details and journey timeline…" />;
  if (error) return <ErrorAlert message={error} onRetry={fetchReelDetails} />;
  if (!reel) return <ErrorAlert message="Reel not found." />;

  const currentWeight = reel.current_weight ?? reel.previous_weight ?? reel.max_weight;
  const customFieldsEntries = Object.entries(reel.custom_fields || reel.customFields || {});
  const isVoided = reel.status === 'VOIDED' || reel.record_status === 'VOIDED';

  return (
    <div className="space-y-6">
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
              {reel.master_key && (
                <span className="px-2.5 py-1 bg-brand-blue/10 text-brand-blue font-mono font-bold text-xs rounded-lg">
                  {reel.master_key}
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
              <button
                onClick={() => setShowUsageModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                Record Usage
              </button>
            )}

            {/* Master Correction (Admin Only) */}
            {isRoleAdmin && (
              <button
                onClick={() => setShowCorrectionModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                Master Correction
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
        </div>

        {/* Inventory Weight Status */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Inventory Weight</h3>
          <SpecRow label="Current Balance" value={formatWeight(currentWeight)} highlight />
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
              const eventType = event.event_type || event.type || 'EVENT';
              const performedBy = event.performed_by?.name || event.performed_by?.username || event.performed_by || 'User';
              const approvedBy = event.approved_by?.name || event.approved_by?.username || event.approved_by;

              return (
                <div key={event.id || event._id} className="relative pl-8">
                  <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center text-brand-blue shadow-xs">
                    {eventType === 'CREATED' && <PlusCircle size={16} />}
                    {eventType === 'USAGE_LOGGED' && <Activity size={16} />}
                    {eventType === 'DECLINED_REVERTED' && <AlertTriangle size={16} className="text-red-500" />}
                    {eventType === 'MASTER_CORRECTED' && <ShieldAlert size={16} className="text-amber-500" />}
                  </div>

                  <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 capitalize">
                          {eventType.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-xs text-gray-500">
                          by <span className="font-semibold text-gray-800">{performedBy}</span> on {formatDateTime(event.performed_at || event.created_at)}
                        </p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getApprovalBadgeStyle(event.approval_status || (event.approved_at ? 'CONFIRMED' : 'PENDING'))}`}>
                        {event.approval_status || (event.approved_at ? 'CONFIRMED' : 'PENDING')}
                      </span>
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

                    {approvedBy && (
                      <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} /> Approved by {approvedBy} on {formatDateTime(event.approved_at)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
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
