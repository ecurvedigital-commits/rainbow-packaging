import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText, ArrowLeft, Edit3, Send, CheckCircle2, XCircle, Ban,
  Printer, Building2, Calendar, User, Phone, CreditCard,
  AlertTriangle, Clock, Layers, ChevronRight, X, ShieldCheck,
  FileCheck2, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { purchaseOrderApi } from '../api/purchaseOrderApi';
import { PO_STATUS, PO_STATUS_CONFIG } from '../constants/poConstants';
import { formatDate, formatWeight } from '../../../utils/formatters';

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isRoleAdmin, isRoleSupervisor } = useAuth();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Modals state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchPo = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await purchaseOrderApi.getById(id);
      if (res.success && res.data) {
        setPo(res.data);
      } else {
        throw new Error(res.error?.message || 'Failed to retrieve purchase order');
      }
    } catch (err) {
      setError(err.message || 'Error loading purchase order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPo();
  }, [fetchPo]);

  // Determine permissions
  const canAuthorize = isRoleAdmin || isRoleSupervisor;
  const isDraftOrRejected = po?.status === PO_STATUS.DRAFT || po?.status === PO_STATUS.REJECTED;
  const isPendingApproval = po?.status === PO_STATUS.PENDING_APPROVAL;
  const isApproved = po?.status === PO_STATUS.APPROVED;
  const isCancelled = po?.status === PO_STATUS.CANCELLED;

  // Actions
  const handleSubmitForApproval = async () => {
    if (!po) return;
    if (!window.confirm(`Submit Purchase Order "${po.po_no}" for Supervisor authorization?`)) return;

    setModalSubmitting(true);
    setError(null);
    try {
      const res = await purchaseOrderApi.submitForApproval(po.id || po._id);
      if (res.success) {
        setSuccessMessage(`Purchase Order ${po.po_no} submitted for authorization.`);
        await fetchPo();
      } else {
        throw new Error(res.error?.message || 'Submission failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!po) return;
    setModalSubmitting(true);
    setModalError('');
    try {
      const res = await purchaseOrderApi.approve(po.id || po._id);
      if (res.success) {
        setShowApproveModal(false);
        setSuccessMessage(`Purchase Order ${po.po_no} has been officially approved!`);
        await fetchPo();
      } else {
        throw new Error(res.error?.message || 'Approval failed');
      }
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!po) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      setModalError('Rejection reason must be at least 3 characters long.');
      return;
    }

    setModalSubmitting(true);
    setModalError('');
    try {
      const res = await purchaseOrderApi.reject(po.id || po._id, {
        rejection_reason: rejectionReason.trim(),
      });
      if (res.success) {
        setShowRejectModal(false);
        setRejectionReason('');
        setSuccessMessage(`Purchase Order ${po.po_no} has been rejected.`);
        await fetchPo();
      } else {
        throw new Error(res.error?.message || 'Rejection failed');
      }
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!po) return;
    setModalSubmitting(true);
    setModalError('');
    try {
      const res = await purchaseOrderApi.cancel(po.id || po._id, {
        cancellation_reason: cancellationReason.trim() || 'Cancelled by user',
      });
      if (res.success) {
        setShowCancelModal(false);
        setCancellationReason('');
        setSuccessMessage(`Purchase Order ${po.po_no} has been cancelled.`);
        await fetchPo();
      } else {
        throw new Error(res.error?.message || 'Cancellation failed');
      }
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="font-medium text-sm">Loading Purchase Order details...</p>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Link
          to="/sheets/purchase-orders"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchase Orders
        </Link>
        <div className="p-8 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <h2 className="text-base font-bold text-red-900">Purchase Order Not Found</h2>
          <p className="text-xs text-red-700 mt-1">{error || 'The requested Purchase Order does not exist or has been removed.'}</p>
          <button
            onClick={() => navigate('/sheets/purchase-orders')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition cursor-pointer"
          >
            Return to PO List
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = PO_STATUS_CONFIG[po.status] || {
    label: po.status,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    dot: 'bg-gray-400',
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* ── Breadcrumb & Back ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link
          to="/sheets/purchase-orders"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchase Orders
        </Link>

        {/* Quick action buttons on top bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer"
            title="Print Voucher"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Voucher</span>
          </button>

          {isDraftOrRejected && (
            <Link
              to={`/sheets/purchase-orders/create?editId=${po.id || po._id}`}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-blue-700 text-xs font-bold rounded-xl shadow-2xs transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Order</span>
            </Link>
          )}

          {isDraftOrRejected && (
            <button
              onClick={handleSubmitForApproval}
              disabled={modalSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Approval</span>
            </button>
          )}

          {isPendingApproval && canAuthorize && (
            <>
              <button
                onClick={() => {
                  setModalError('');
                  setShowRejectModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
              <button
                onClick={() => {
                  setModalError('');
                  setShowApproveModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve Purchase Order</span>
              </button>
            </>
          )}

          {!isCancelled && po.status !== PO_STATUS.COMPLETED && (
            <button
              onClick={() => {
                setModalError('');
                setShowCancelModal(true);
              }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
              title="Cancel Purchase Order"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Success Alert ───────────────────────────────────────────── */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between font-medium print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Pending Approval Notice for Operators ─────────────────────── */}
      {isPendingApproval && !canAuthorize && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-3 print:hidden">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-amber-900">Awaiting Supervisor Authorization</p>
            <p className="text-amber-800 mt-0.5">
              This Purchase Order was submitted by <strong>{po.submitted_by_name || po.prepared_by_name}</strong> on{' '}
              {formatDate(po.submitted_at || po.updated_at)}. Only Supervisors and Administrators can approve or reject this order.
            </p>
          </div>
        </div>
      )}

      {/* ── Rejection Banner ────────────────────────────────────────── */}
      {po.status === PO_STATUS.REJECTED && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-2xl flex items-start gap-3 print:border-black">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <p className="font-bold text-red-900">Order Rejected by {po.rejected_by_name || 'Supervisor'}</p>
              <span className="text-red-700 text-[11px]">{formatDate(po.rejected_at)}</span>
            </div>
            <p className="mt-1 text-red-800 bg-white/70 p-2.5 rounded-lg border border-red-200 font-mono text-[11px]">
              "{po.rejection_reason}"
            </p>
            <p className="mt-2 text-red-700 text-[11px]">
              You can click <strong>Edit Order</strong> above to modify sizes, quantities or terms and resubmit for approval.
            </p>
          </div>
        </div>
      )}

      {/* ── Cancellation Banner ─────────────────────────────────────── */}
      {po.status === PO_STATUS.CANCELLED && (
        <div className="p-4 bg-gray-100 border border-gray-300 text-gray-800 rounded-2xl flex items-start gap-3 print:border-black">
          <Ban className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900">Purchase Order Cancelled by {po.cancelled_by_name || 'User'}</p>
              <span className="text-gray-500 text-[11px]">{formatDate(po.cancelled_at)}</span>
            </div>
            {po.cancellation_reason && (
              <p className="mt-1 text-gray-700 bg-white p-2 rounded-lg border border-gray-200 font-mono text-[11px]">
                "{po.cancellation_reason}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Voucher Container (Matches BOARD_PO_FORMAT.xlsx) ──────────── */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden print:shadow-none print:border-black">
        {/* Company Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-b from-gray-50/50 to-white text-center">
          <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-extrabold uppercase tracking-widest rounded-full mb-1">
            Board Procurement Voucher
          </div>
          <h1
            className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight uppercase"
            style={{ fontFamily: 'var(--font-family-display)' }}
          >
            Rainbow Packaging Industry Pvt. Ltd.
          </h1>
          <p className="text-xs font-semibold text-gray-500 tracking-wide mt-0.5">
            SIDCUL, HARIDWAR, UTTARAKHAND
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg tracking-wider uppercase">
            <span>Purchase Order</span>
          </div>
        </div>

        {/* PO & Status Subheader */}
        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">PO Number</span>
              <span className="text-sm font-black text-gray-900 tracking-tight font-mono">{po.po_no}</span>
            </div>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">PO Date</span>
              <span className="font-semibold text-gray-800">{formatDate(po.po_date)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block text-right">Delivery Date</span>
              <span className="font-bold text-gray-900">{formatDate(po.delivery_date)}</span>
            </div>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block text-right">Status</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>

        {/* Two Column Info Section: Supplier & Terms */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-200 text-xs">
          {/* Supplier Info */}
          <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              Supplier Details
            </h3>
            <div className="space-y-1.5">
              <div>
                <span className="text-[10px] font-semibold text-gray-400 uppercase block">Supplier Name</span>
                <span className="text-sm font-bold text-gray-900">{po.supplier_name}</span>
              </div>
              {po.contact_person && (
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase block">Contact Person</span>
                  <span className="text-gray-800 font-medium">{po.contact_person}</span>
                </div>
              )}
              {po.phone_email && (
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase block">Phone / Email</span>
                  <span className="text-gray-800 font-mono text-[11px]">{po.phone_email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Terms & Notes */}
          <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              Terms & Delivery Condition
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-semibold text-gray-400 uppercase block">Payment Terms</span>
                <span className="text-xs font-semibold text-gray-900">
                  {po.payment_terms || 'Standard vendor settlement terms'}
                </span>
              </div>
              {po.notes && (
                <div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase block">Special Instructions</span>
                  <p className="text-xs text-gray-700 italic bg-white p-2 rounded-lg border border-gray-200 mt-1">
                    {po.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Items Table (Max 20 Line Items) ─────────────────────────── */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              Purchase Order Line Items ({po.items?.length || 0} / 20)
            </h3>
            <span className="text-[11px] text-gray-500 italic">
              Weight Formula: (Deckle × Cutting × GSM × Qty) / 10,000,000
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-100/80 text-[11px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-center w-12">Sr. No.</th>
                  <th className="px-4 py-3">Client Name</th>
                  <th className="px-4 py-3">Job Name</th>
                  <th className="px-3 py-3 text-center">Deckle (cm)</th>
                  <th className="px-3 py-3 text-center">Cutting (cm)</th>
                  <th className="px-3 py-3 text-center">GSM</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Weight (kg)</th>
                  {po.total_received_quantity > 0 && (
                    <>
                      <th className="px-3 py-3 text-right text-emerald-700">Received Qty</th>
                      <th className="px-3 py-3 text-center">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-medium">
                {po.items?.map((item, idx) => (
                  <tr key={item._id || idx} className="hover:bg-gray-50 transition">
                    <td className="px-3 py-3 text-center font-bold text-gray-400">
                      {item.sr_no || idx + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {item.client_name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.job_name}
                    </td>
                    <td className="px-3 py-3 text-center font-mono">
                      {item.deckle}
                    </td>
                    <td className="px-3 py-3 text-center font-mono">
                      {item.cutting}
                    </td>
                    <td className="px-3 py-3 text-center font-mono">
                      {item.gsm}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-800">
                      {item.ordered_quantity?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                      {formatWeight(item.ordered_weight)}
                    </td>
                    {po.total_received_quantity > 0 && (
                      <>
                        <td className="px-3 py-3 text-right font-mono text-emerald-700 font-semibold">
                          {item.received_quantity || 0}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-gray-100 text-gray-600">
                            {item.status || 'PENDING'}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 text-xs font-bold text-gray-900 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right uppercase tracking-wider text-gray-500">
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-black text-gray-900 text-sm">
                    {po.total_ordered_quantity?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-black text-emerald-800 text-sm whitespace-nowrap">
                    {formatWeight(po.total_ordered_weight)}
                  </td>
                  {po.total_received_quantity > 0 && (
                    <>
                      <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700">
                        {po.total_received_quantity?.toLocaleString() || 0}
                      </td>
                      <td />
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Signatures & Authorization Section ──────────────────────── */}
        <div className="p-6 bg-gray-50/60 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
            {/* Prepared By */}
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Prepared By (Operator / MIS)
              </span>
              <p className="font-bold text-gray-900 text-sm">{po.prepared_by_name || 'System User'}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Created: {formatDate(po.created_at)}</p>
            </div>

            {/* Submitted By */}
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Submitted For Authorization
              </span>
              <p className="font-bold text-gray-900 text-sm">{po.submitted_by_name || '—'}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {po.submitted_at ? formatDate(po.submitted_at) : 'Not yet submitted'}
              </p>
            </div>

            {/* Approved By */}
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Approved By (Supervisor / Admin)
              </span>
              <p
                className={`font-bold text-sm ${
                  po.status === PO_STATUS.APPROVED
                    ? 'text-emerald-700 flex items-center gap-1.5'
                    : po.status === PO_STATUS.REJECTED
                    ? 'text-red-600'
                    : 'text-gray-400'
                }`}
              >
                {po.status === PO_STATUS.APPROVED && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {po.approved_by_name || (po.status === PO_STATUS.REJECTED ? 'Rejected' : 'Pending Authorization')}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {po.approved_at ? formatDate(po.approved_at) : po.rejected_at ? formatDate(po.rejected_at) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Approval Modal ───────────────────────────────────────────── */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Authorize Purchase Order</h3>
                <p className="text-xs text-gray-500">Official authorization as Supervisor/Admin</p>
              </div>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
                {modalError}
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-xl text-xs space-y-2 border border-gray-200/80">
              <div className="flex justify-between">
                <span className="text-gray-500">PO Number:</span>
                <span className="font-bold text-gray-900 font-mono">{po.po_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Supplier:</span>
                <span className="font-semibold text-gray-800">{po.supplier_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Items:</span>
                <span className="font-medium text-gray-800">{po.total_items} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Weight:</span>
                <span className="font-bold text-emerald-800">{formatWeight(po.total_ordered_weight)}</span>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              By authorizing this Purchase Order, you confirm that board dimensions, GSM, and procurement quantities
              comply with packaging production requirements.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={modalSubmitting}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={modalSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {modalSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Authorize</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Modal ──────────────────────────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Reject Purchase Order</h3>
                <p className="text-xs text-gray-500">Provide a mandatory reason for declining authorization</p>
              </div>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
                {modalError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. GSM specification mismatch for Job #14; please adjust deckle size."
                className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 focus:bg-white text-gray-800"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Minimum 3 characters. The operator will be notified and can edit the draft to re-submit.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={modalSubmitting}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleReject}
                disabled={modalSubmitting || rejectionReason.trim().length < 3}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {modalSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancellation Modal ───────────────────────────────────────── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gray-100 text-gray-700 rounded-xl">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Cancel Purchase Order</h3>
                <p className="text-xs text-gray-500">Cancelling marks this order void and stops fulfillment</p>
              </div>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
                {modalError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Cancellation Reason (Optional)
              </label>
              <textarea
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Order cancelled by client; supplier unable to fulfill required GSM."
                className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-400 focus:bg-white text-gray-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={modalSubmitting}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleCancel}
                disabled={modalSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {modalSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>Confirm Cancellation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

