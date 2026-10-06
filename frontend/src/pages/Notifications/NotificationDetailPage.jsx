import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Mail,
  Wrench,
  ShieldAlert,
  AlertTriangle,
  Info,
  Calendar,
  Clock,
  User,
  ExternalLink,
  Reply,
  CheckCircle2,
  XCircle,
  Loader2,
  Boxes,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';
import { notificationApi } from '../../api/notificationApi';
import { correctionApi } from '../../api/correctionApi';
import { useAuth } from '../../auth/AuthContext';
import { formatDate, formatDateTime, formatWeight } from '../../utils/formatters';
import MasterCorrectionModal from '../Reels/MasterCorrectionModal';
import Toast from '../../components/Common/Toast';
import LoadingState from '../../components/Common/LoadingState';
import ErrorAlert from '../../components/Common/ErrorAlert';

export default function NotificationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isRoleAdmin, isRoleSupervisor } = useAuth();

  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Modals state
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [rejectPromptOpen, setRejectPromptOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationApi.getById(id);
      if (res.success && res.data) {
        setNotification(res.data);
      } else {
        throw new Error(res.error?.message || 'Failed to load notification details');
      }
    } catch (err) {
      setError(err.message || 'Notification could not be retrieved.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleApplyCorrectionDirect = async () => {
    const corr = notification?.correction_request;
    if (!corr) return;

    setActionLoading(true);
    try {
      const res = await correctionApi.resolve(corr.id, {
        reason: corr.message || 'Correction applied by Admin',
      });
      if (res.success) {
        setToast({ type: 'success', message: 'Correction applied successfully to master reel!' });
        fetchDetail();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to apply correction.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectCorrection = async () => {
    const corr = notification?.correction_request;
    if (!corr || !rejectReason.trim()) return;

    setActionLoading(true);
    try {
      const res = await correctionApi.reject(corr.id, {
        reason: rejectReason.trim(),
      });
      if (res.success) {
        setToast({ type: 'success', message: 'Correction request declined.' });
        setRejectPromptOpen(false);
        setRejectReason('');
        fetchDetail();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to decline correction.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading notification details..." />;
  }

  if (error || !notification) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/notifications')}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft size={16} /> Back to Notifications
        </button>
        <ErrorAlert message={error || 'Notification not found'} onRetry={fetchDetail} />
      </div>
    );
  }

  const isMessage = notification.type === 'MESSAGE';
  const isCorrection =
    notification.type === 'CORRECTION_REQUESTED' ||
    notification.type === 'CORRECTION_RESOLVED' ||
    notification.type === 'CORRECTION_REJECTED' ||
    !!notification.correction_request;

  const msgDetails = notification.message_details;
  const corrDetails = notification.correction_request;
  const reelDetails = notification.reel_details;

  // Compile list of attached reels from message or reel details
  const attachedReels = [];
  if (msgDetails?.reels && Array.isArray(msgDetails.reels) && msgDetails.reels.length > 0) {
    attachedReels.push(...msgDetails.reels);
  } else if (reelDetails) {
    attachedReels.push(reelDetails);
  } else if (notification.reel_id) {
    attachedReels.push({
      reel_id: notification.reel_id,
      reel_no: notification.reel_no || 'Reference',
    });
  }

  const senderName = notification.sender_name || msgDetails?.sender_name || 'System';
  const senderRole = notification.sender_role || msgDetails?.sender_role || 'SYSTEM';

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() => navigate('/notifications')}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition group"
        >
          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50">
            <ArrowLeft size={16} />
          </div>
          <span>Back to Notifications</span>
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mark as Read button */}
          <button
            onClick={async () => {
              try {
                await notificationApi.markAsRead(id);
                setNotification((prev) => ({ ...prev, is_read: true, read_at: new Date().toISOString() }));
                setToast({ type: 'success', message: 'Notification marked as read.' });
              } catch (err) {
                setToast({ type: 'error', message: err.message || 'Failed to mark as read.' });
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition shadow-xs"
          >
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>Mark as Read</span>
          </button>

          {/* Action button to reply */}
          {notification.sender_id && notification.sender_id !== user?.id && (
            <button
              onClick={() => {
                const reelParam = attachedReels.length > 0 ? `&reel_id=${attachedReels[0].reel_id || attachedReels[0].id || attachedReels[0]._id}` : '';
                navigate(`/messages/compose?recipient=${notification.sender_id}${reelParam}`);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Reply size={14} />
              <span>Reply to {senderName}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Notification Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Banner Bar */}
        <div
          className={`h-2 ${
            isCorrection
              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
              : isMessage
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
              : 'bg-gradient-to-r from-slate-400 to-slate-600'
          }`}
        />

        <div className="p-6 space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isCorrection
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      : isMessage
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-300'
                  }`}
                >
                  {isCorrection ? 'Reel Correction' : isMessage ? 'User Message' : notification.type}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                    notification.is_read
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                  }`}
                >
                  {notification.is_read ? <CheckCircle2 size={12} /> : null}
                  {notification.is_read ? 'Read' : 'Unread'}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={13} />
                  {formatDateTime(notification.created_at)}
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-family-display)' }}>
                {notification.title || 'Notification Details'}
              </h1>
            </div>

            {/* Sender Badge Card */}
            {notification.sender_name && (
              <div className="bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-2 flex items-center gap-2.5 self-start shrink-0">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                  <User size={15} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                    {senderName}
                  </p>
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase leading-tight">
                    {senderRole}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Full Message Body */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Message Content</h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
              {msgDetails?.body || notification.message}
            </div>
          </div>

          {/* LINKED REELS SECTION - RECEIVER CAN OPEN REEL DIRECTLY */}
          {attachedReels.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Boxes size={14} className="text-indigo-600" />
                Direct Linked Reel References (Click to Open Reel):
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {attachedReels.map((r, idx) => {
                  const reelId = r.reel_id || r.id || r._id || notification.reel_id;
                  const reelNo = r.reel_no || notification.reel_no;
                  const masterCodeBadge = r.master_code_name || r.master_code;

                  return (
                    <div
                      key={idx}
                      className="bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/50 dark:from-slate-800 dark:via-slate-850 dark:to-slate-800 border-2 border-indigo-200/90 dark:border-indigo-900/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm hover:border-indigo-400 transition"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-base font-extrabold text-indigo-950 dark:text-white">
                            Reel #{reelNo}
                          </span>

                          {masterCodeBadge && (
                            <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-md font-mono shadow-xs">
                              {masterCodeBadge}
                            </span>
                          )}

                          {r.quality && (
                            <span className="text-xs px-2 py-0.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded font-semibold">
                              {r.quality} • {r.gsm ? `${r.gsm} GSM` : ''} • {r.size ? `${r.size} cm` : ''} • {r.bf ? `BF ${r.bf}` : ''}
                            </span>
                          )}
                        </div>

                        {(r.previous_weight !== undefined || r.supplier_name) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3">
                            {r.previous_weight !== undefined && (
                              <span>Weight Balance: <strong className="text-gray-700 dark:text-gray-200">{formatWeight(r.previous_weight)}</strong></span>
                            )}
                            {r.supplier_name && (
                              <>
                                <span>•</span>
                                <span>Supplier: {r.supplier_name} {r.mill_name ? `(${r.mill_name})` : ''}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Direct Click Link to Reel */}
                      {reelId && (
                        <Link
                          to={`/reels/${reelId}`}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition shrink-0"
                        >
                          <span>Open Reel #{reelNo}</span>
                          <ExternalLink size={14} />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* IF CORRECTION REQUEST: SHOW FULL AUDIT & RESOLUTION ACTIONS */}
          {corrDetails && (
            <div className="border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={18} className="text-amber-700 dark:text-amber-400" />
                  <h3 className="font-bold text-amber-950 dark:text-amber-300 text-sm">
                    Reel Correction Request Data
                  </h3>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    corrDetails.status === 'RESOLVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : corrDetails.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Status: {corrDetails.status}
                </span>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Current Snapshot */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-gray-200 dark:border-slate-800 space-y-2">
                  <p className="font-bold text-gray-500 uppercase text-[10px] tracking-wider">Current / Saved Specs</p>
                  <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Reel No: <strong>#{corrDetails.current_snapshot?.reel_no || corrDetails.reel_no}</strong></li>
                    <li>Master Code: <strong>{corrDetails.current_snapshot?.master_code || 'None'}</strong></li>
                    <li>Quality: <strong>{corrDetails.current_snapshot?.quality || 'N/A'}</strong></li>
                    <li>GSM / BF / Size: <strong>{corrDetails.current_snapshot?.gsm} GSM / BF {corrDetails.current_snapshot?.bf} / {corrDetails.current_snapshot?.size} cm</strong></li>
                    <li>Current Weight: <strong>{formatWeight(corrDetails.current_snapshot?.previous_weight)}</strong></li>
                    <li>Max Weight: <strong>{formatWeight(corrDetails.current_snapshot?.max_weight)}</strong></li>
                  </ul>
                </div>

                {/* Requested Adjustments */}
                <div className="bg-amber-100/60 dark:bg-amber-950/40 rounded-xl p-3 border border-amber-300 dark:border-amber-800 space-y-2">
                  <p className="font-bold text-amber-800 dark:text-amber-300 uppercase text-[10px] tracking-wider">Operator Requested Changes</p>
                  <ul className="space-y-1 text-amber-950 dark:text-amber-200 font-medium">
                    {corrDetails.requested_changes?.previous_weight !== undefined && (
                      <li>Correct Weight: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{formatWeight(corrDetails.requested_changes.previous_weight)}</strong></li>
                    )}
                    {corrDetails.requested_changes?.max_weight !== undefined && (
                      <li>Correct Max Weight: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{formatWeight(corrDetails.requested_changes.max_weight)}</strong></li>
                    )}
                    {corrDetails.requested_changes?.master_code_name && (
                      <li>Correct Master Code: <strong className="text-indigo-700 dark:text-indigo-300 font-bold">{corrDetails.requested_changes.master_code_name}</strong></li>
                    )}
                    {corrDetails.requested_changes?.reel_no && (
                      <li>Correct Reel #: <strong className="font-bold">#{corrDetails.requested_changes.reel_no}</strong></li>
                    )}
                    {corrDetails.requested_changes?.gsm && (
                      <li>Correct GSM: <strong className="font-bold">{corrDetails.requested_changes.gsm} GSM</strong></li>
                    )}
                    {corrDetails.requested_changes?.bf && (
                      <li>Correct BF: <strong className="font-bold">BF {corrDetails.requested_changes.bf}</strong></li>
                    )}
                    {corrDetails.requested_changes?.size && (
                      <li>Correct Size: <strong className="font-bold">{corrDetails.requested_changes.size} cm</strong></li>
                    )}
                    <li>Category: <strong className="uppercase">{corrDetails.category?.replace(/_/g, ' ')}</strong></li>
                  </ul>
                </div>
              </div>

              {/* Resolution details if resolved */}
              {corrDetails.status === 'RESOLVED' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <strong>Correction Applied by {corrDetails.resolved_by_name || 'Admin'}</strong> on {formatDateTime(corrDetails.resolved_at)}.
                    {corrDetails.resolution_note && <p className="text-[11px] mt-0.5">Note: {corrDetails.resolution_note}</p>}
                  </div>
                </div>
              )}

              {corrDetails.status === 'REJECTED' && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <XCircle size={16} className="text-rose-600 shrink-0" />
                  <div>
                    <strong>Correction Declined by {corrDetails.resolved_by_name || 'Reviewer'}</strong> on {formatDateTime(corrDetails.resolved_at)}.
                    {corrDetails.resolution_note && <p className="text-[11px] mt-0.5">Reason: {corrDetails.resolution_note}</p>}
                  </div>
                </div>
              )}

              {/* ADMIN ACTION BUTTONS FOR PENDING REQUEST */}
              {corrDetails.status === 'PENDING' && (
                <div className="pt-3 border-t border-amber-200 dark:border-amber-900/50 flex flex-wrap items-center justify-end gap-3">
                  {isRoleSupervisor && (
                    <button
                      type="button"
                      onClick={() => setRejectPromptOpen(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition"
                    >
                      Decline Request
                    </button>
                  )}

                  {isRoleAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCorrectionModalOpen(true)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                      >
                        <Wrench size={14} />
                        <span>Review & Custom Apply</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleApplyCorrectionDirect}
                        disabled={actionLoading}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                      >
                        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        <span>1-Click Apply Correction</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Decline Reason Modal */}
      {rejectPromptOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Decline Reel Correction Request</h3>
            <p className="text-xs text-gray-500">Please provide a reason note for declining this operator correction request.</p>
            <textarea
              rows={3}
              required
              className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              placeholder="e.g. Physical inventory verified; original tare weight 406kg is valid."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectPromptOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectCorrection}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 size={14} className="animate-spin" />}
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Correction Modal (Admin) */}
      {correctionModalOpen && corrDetails && (
        <MasterCorrectionModal
          isOpen={correctionModalOpen}
          reel={{
            id: corrDetails.reel_id,
            _id: corrDetails.reel_id,
            reel_no: corrDetails.requested_changes?.reel_no || corrDetails.current_snapshot?.reel_no || corrDetails.reel_no,
            master_code_id: corrDetails.requested_changes?.master_code_id || corrDetails.current_snapshot?.master_code_id,
            master_code: corrDetails.requested_changes?.master_code || corrDetails.current_snapshot?.master_code,
            quality: corrDetails.requested_changes?.quality || corrDetails.current_snapshot?.quality,
            gsm: corrDetails.requested_changes?.gsm || corrDetails.current_snapshot?.gsm,
            bf: corrDetails.requested_changes?.bf || corrDetails.current_snapshot?.bf,
            size: corrDetails.requested_changes?.size || corrDetails.current_snapshot?.size,
            previous_weight: corrDetails.requested_changes?.previous_weight ?? corrDetails.current_snapshot?.previous_weight,
            max_weight: corrDetails.requested_changes?.max_weight ?? corrDetails.current_snapshot?.max_weight,
            supplier_name: corrDetails.requested_changes?.supplier_name || corrDetails.current_snapshot?.supplier_name,
            mill_name: corrDetails.requested_changes?.mill_name || corrDetails.current_snapshot?.mill_name,
          }}
          onClose={() => setCorrectionModalOpen(false)}
          onSuccess={async (msg) => {
            setToast({ type: 'success', message: msg });
            // Mark the correction request resolved in backend
            try {
              await correctionApi.resolve(corrDetails.id, { reason: 'Master correction executed' });
            } catch (_e) {}
            fetchDetail();
          }}
        />
      )}
    </div>
  );
}
