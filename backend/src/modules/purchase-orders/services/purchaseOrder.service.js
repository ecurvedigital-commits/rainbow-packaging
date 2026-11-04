import { PurchaseOrder } from '../models/purchaseOrder.model.js';
import { PO_STATUS } from '../constants/poStatus.js';
import { getNextSequence } from '../../../core/database/counter.service.js';
import { calculateTotalWeight, roundTwoDecimals } from '../../sheets/utils/sheetCalculations.js';
import { createApiError } from '../../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../../core/constants/errorCodes.js';
import { ROLES } from '../../../core/constants/roles.js';
import { parsePagination, buildPaginationMeta } from '../../../core/utils/pagination.js';
import { AuditLog } from '../../audit/models/auditLog.model.js';
import { User } from '../../users/models/user.model.js';
import { sendPushToUsers } from '../../notifications/services/fcm.service.js';

/**
 * Normalizes item inputs, computes ordered weight for each row, and sums aggregates
 */
function processPoItems(rawItems) {
  let totalQty = 0;
  let totalWeight = 0;

  const processedItems = rawItems.map((item, idx) => {
    const srNo = idx + 1;
    const deckle = roundTwoDecimals(Number(item.deckle));
    const cutting = roundTwoDecimals(Number(item.cutting));
    const gsm = Number(item.gsm);
    const orderedQuantity = Number(item.ordered_quantity);
    const orderedWeight = calculateTotalWeight(deckle, cutting, gsm, orderedQuantity);

    totalQty += orderedQuantity;
    totalWeight += orderedWeight;

    return {
      sr_no: srNo,
      client_name: String(item.client_name).trim(),
      job_name: String(item.job_name).trim(),
      deckle,
      cutting,
      gsm,
      ordered_quantity: orderedQuantity,
      ordered_weight: orderedWeight,
      received_quantity: 0,
      received_weight: 0,
    };
  });

  return {
    items: processedItems,
    total_items: processedItems.length,
    total_ordered_quantity: totalQty,
    total_ordered_weight: roundTwoDecimals(totalWeight),
  };
}

/**
 * Creates a new Purchase Order in DRAFT status
 */
export async function createPurchaseOrder({ input, actor }) {
  const { items, total_items, total_ordered_quantity, total_ordered_weight } = processPoItems(
    input.items
  );

  const srNo = await getNextSequence('po_sr_no');
  const year = new Date().getFullYear();
  const poNo = `PO-${year}-${String(srNo).padStart(4, '0')}`;

  const po = await PurchaseOrder.create({
    sr_no: srNo,
    po_no: poNo,
    po_date: input.po_date ? new Date(input.po_date) : new Date(),
    delivery_date: new Date(input.delivery_date),
    payment_terms: input.payment_terms || '',
    supplier_name: String(input.supplier_name).trim(),
    contact_person: input.contact_person || '',
    phone_email: input.phone_email || '',
    status: PO_STATUS.DRAFT,
    total_items,
    total_ordered_quantity,
    total_ordered_weight,
    total_received_quantity: 0,
    total_received_weight: 0,
    prepared_by: actor.id,
    prepared_by_name: actor.name,
    notes: input.notes || '',
    items,
  });

  // Log Audit trail
  await AuditLog.create({
    module: 'SHEETS',
    resource_type: 'PURCHASE_ORDER',
    resource_id: po._id,
    resource_label: `${po.po_no} (${po.supplier_name})`,
    action: 'CREATED',
    performed_by: actor.id,
    performed_by_name: actor.name,
    performed_by_role: actor.role,
    performed_at: new Date(),
    changes: {
      before: null,
      after: po.toJSON(),
    },
    metadata: {
      po_no: po.po_no,
      supplier_name: po.supplier_name,
      total_items,
      total_ordered_weight,
    },
  }).catch(() => null);

  return po.toJSON();
}

/**
 * Lists Purchase Orders with filtering, search, and pagination
 */
export async function listPurchaseOrders({ query, actor }) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.status && query.status !== 'ALL') {
    filter.status = query.status;
  }

  if (query.supplier) {
    filter.supplier_name = new RegExp(query.supplier.trim(), 'i');
  }

  if (query.date_from || query.date_to) {
    filter.po_date = {};
    if (query.date_from) filter.po_date.$gte = new Date(query.date_from);
    if (query.date_to) filter.po_date.$lte = new Date(query.date_to + 'T23:59:59.999Z');
  }

  if (query.search) {
    const searchRegex = new RegExp(query.search.trim(), 'i');
    filter.$or = [
      { po_no: searchRegex },
      { supplier_name: searchRegex },
      { contact_person: searchRegex },
      { 'items.client_name': searchRegex },
      { 'items.job_name': searchRegex },
    ];
  }

  const sortField = query.sort || '-created_at';

  const [items, total, statusCounts] = await Promise.all([
    PurchaseOrder.find(filter).sort(sortField).skip(skip).limit(limit).lean(),
    PurchaseOrder.countDocuments(filter),
    PurchaseOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total_weight: { $sum: '$total_ordered_weight' },
        },
      },
    ]),
  ]);

  const summary = {
    total_pos: 0,
    draft_count: 0,
    pending_approval_count: 0,
    approved_count: 0,
    partially_received_count: 0,
    completed_count: 0,
    rejected_count: 0,
    cancelled_count: 0,
  };

  statusCounts.forEach((s) => {
    summary.total_pos += s.count;
    if (s._id === PO_STATUS.DRAFT) summary.draft_count = s.count;
    if (s._id === PO_STATUS.PENDING_APPROVAL) summary.pending_approval_count = s.count;
    if (s._id === PO_STATUS.APPROVED) summary.approved_count = s.count;
    if (s._id === PO_STATUS.PARTIALLY_RECEIVED) summary.partially_received_count = s.count;
    if (s._id === PO_STATUS.COMPLETED) summary.completed_count = s.count;
    if (s._id === PO_STATUS.REJECTED) summary.rejected_count = s.count;
    if (s._id === PO_STATUS.CANCELLED) summary.cancelled_count = s.count;
  });

  return {
    items: items.map((doc) => {
      const ret = { ...doc, id: doc._id.toString() };
      delete ret._id;
      return ret;
    }),
    meta: buildPaginationMeta(total, page, limit),
    summary,
  };
}

/**
 * Retrieves a single Purchase Order by ID or PO Number
 */
export async function getPurchaseOrderById(idOrPoNo) {
  const query = idOrPoNo.startsWith('PO-') ? { po_no: idOrPoNo } : { _id: idOrPoNo };
  const po = await PurchaseOrder.findOne(query).lean();
  if (!po) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Purchase Order not found.');
  }

  const ret = { ...po, id: po._id.toString() };
  delete ret._id;
  return ret;
}

/**
 * Updates a Purchase Order (only permitted when in DRAFT or REJECTED status)
 */
export async function updatePurchaseOrder({ id, input, actor }) {
  const po = await PurchaseOrder.findById(id);
  if (!po) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Purchase Order not found.');
  }

  // Only editable in DRAFT or REJECTED
  if (po.status !== PO_STATUS.DRAFT && po.status !== PO_STATUS.REJECTED) {
    throw createApiError(
      400,
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      `Cannot edit Purchase Order in ${po.status} status. Only DRAFT or REJECTED POs can be edited.`
    );
  }

  // Authorization check: creator or Admin/Supervisor
  const isCreator = po.prepared_by.toString() === actor.id;
  const isPrivileged = actor.role === ROLES.ADMIN || actor.role === ROLES.SUPERVISOR;
  if (!isCreator && !isPrivileged) {
    throw createApiError(403, ERROR_CODES.FORBIDDEN, 'You do not have permission to edit this Purchase Order.');
  }

  const beforeDoc = po.toJSON();

  if (input.po_date) po.po_date = new Date(input.po_date);
  if (input.delivery_date) po.delivery_date = new Date(input.delivery_date);
  if (input.payment_terms !== undefined) po.payment_terms = input.payment_terms;
  if (input.supplier_name !== undefined) po.supplier_name = String(input.supplier_name).trim();
  if (input.contact_person !== undefined) po.contact_person = input.contact_person;
  if (input.phone_email !== undefined) po.phone_email = input.phone_email;
  if (input.notes !== undefined) po.notes = input.notes;

  if (input.items && Array.isArray(input.items) && input.items.length > 0) {
    const { items, total_items, total_ordered_quantity, total_ordered_weight } = processPoItems(
      input.items
    );
    po.items = items;
    po.total_items = total_items;
    po.total_ordered_quantity = total_ordered_quantity;
    po.total_ordered_weight = total_ordered_weight;
  }

  // If was REJECTED and now edited, reset status to DRAFT so it can be resubmitted
  if (po.status === PO_STATUS.REJECTED) {
    po.status = PO_STATUS.DRAFT;
    po.rejection_reason = null;
  }

  await po.save();

  // Audit log
  await AuditLog.create({
    module: 'SHEETS',
    resource_type: 'PURCHASE_ORDER',
    resource_id: po._id,
    resource_label: `${po.po_no} (${po.supplier_name})`,
    action: 'UPDATED',
    performed_by: actor.id,
    performed_by_name: actor.name,
    performed_by_role: actor.role,
    performed_at: new Date(),
    changes: {
      before: beforeDoc,
      after: po.toJSON(),
    },
  }).catch(() => null);

  return po.toJSON();
}

/**
 * Submits a DRAFT or REJECTED Purchase Order for Authorization
 */
export async function submitPurchaseOrderForApproval({ id, actor }) {
  const po = await PurchaseOrder.findById(id);
  if (!po) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Purchase Order not found.');
  }

  if (po.status !== PO_STATUS.DRAFT && po.status !== PO_STATUS.REJECTED) {
    throw createApiError(
      400,
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      `Cannot submit Purchase Order in ${po.status} status. Only DRAFT or REJECTED POs can be submitted for approval.`
    );
  }

  po.status = PO_STATUS.PENDING_APPROVAL;
  po.submitted_by = actor.id;
  po.submitted_by_name = actor.name;
  po.submitted_at = new Date();
  po.rejection_reason = null;

  await po.save();

  // Dispatch FCM push alert to MIS/Supervisors and Admins
  User.find({ role: { $in: [ROLES.ADMIN, ROLES.SUPERVISOR] }, is_active: true }, '_id')
    .lean()
    .then((users) => {
      const recipientIds = users.map((u) => u._id.toString());
      if (recipientIds.length > 0) {
        sendPushToUsers({
          userIds: recipientIds,
          title: `📑 PO Pending Approval: ${po.po_no}`,
          body: `${po.supplier_name} · ${po.total_items} items (${po.total_ordered_weight} kg) submitted by ${actor.name}.`,
          data: {
            po_id: po._id.toString(),
            po_no: po.po_no,
            type: 'PO_PENDING_APPROVAL',
          },
          clickAction: `/sheets/purchase-orders/${po._id.toString()}`,
        }).catch(() => null);
      }
    })
    .catch(() => null);

  // Audit log
  await AuditLog.create({
    module: 'SHEETS',
    resource_type: 'PURCHASE_ORDER',
    resource_id: po._id,
    resource_label: `${po.po_no} (${po.supplier_name})`,
    action: 'SUBMITTED_FOR_APPROVAL',
    performed_by: actor.id,
    performed_by_name: actor.name,
    performed_by_role: actor.role,
    performed_at: new Date(),
  }).catch(() => null);

  return po.toJSON();
}

/**
 * Approves a Purchase Order (Supervisor / Admin only)
 */
export async function approvePurchaseOrder({ id, actor }) {
  if (actor.role !== ROLES.ADMIN && actor.role !== ROLES.SUPERVISOR) {
    throw createApiError(403, ERROR_CODES.FORBIDDEN, 'Only Admins and Supervisors can approve Purchase Orders.');
  }

  const po = await PurchaseOrder.findById(id);
  if (!po) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Purchase Order not found.');
  }

  if (po.status !== PO_STATUS.PENDING_APPROVAL) {
    throw createApiError(
      400,
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      `Cannot approve Purchase Order in ${po.status} status. Only PENDING_APPROVAL POs can be approved.`
    );
  }

  po.status = PO_STATUS.APPROVED;
  po.approved_by = actor.id;
  po.approved_by_name = actor.name;
  po.approved_at = new Date();
  po.rejection_reason = null;

  await po.save();

  // Audit log
  await AuditLog.create({
    module: 'SHEETS',
    resource_type: 'PURCHASE_ORDER',
    resource_id: po._id,
    resource_label: `${po.po_no} (${po.supplier_name})`,
    action: 'APPROVED',
    performed_by: actor.id,
    performed_by_name: actor.name,
    performed_by_role: actor.role,
    performed_at: new Date(),
  }).catch(() => null);

  return po.toJSON();
}

/**
 * Rejects a Purchase Order with reason (Supervisor / Admin only)
 */
export async function rejectPurchaseOrder({ id, rejection_reason, actor }) {
  if (actor.role !== ROLES.ADMIN && actor.role !== ROLES.SUPERVISOR) {
    throw createApiError(403, ERROR_CODES.FORBIDDEN, 'Only Admins and Supervisors can reject Purchase Orders.');
  }

  const po = await PurchaseOrder.findById(id);
  if (!po) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Purchase Order not found.');
  }

  if (po.status !== PO_STATUS.PENDING_APPROVAL) {
    throw createApiError(
      400,
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      `Cannot reject Purchase Order in ${po.status} status. Only PENDING_APPROVAL POs can be rejected.`
    );
  }

  po.status = PO_STATUS.REJECTED;
  po.rejected_by = actor.id;
  po.rejected_by_name = actor.name;
  po.rejected_at = new Date();
  po.rejection_reason = String(rejection_reason).trim();

  await po.save();

  // Audit log
  await AuditLog.create({
    module: 'SHEETS',
    resource_type: 'PURCHASE_ORDER',
    resource_id: po._id,
    resource_label: `${po.po_no} (${po.supplier_name})`,
    action: 'REJECTED',
    performed_by: actor.id,
    performed_by_name: actor.name,
    performed_by_role: actor.role,
    performed_at: new Date(),
    metadata: {
      rejection_reason: po.rejection_reason,
    },
  }).catch(() => null);

  return po.toJSON();
}

/**
 * Cancels a Purchase Order
 */
export async function cancelPurchaseOrder({ id, cancellation_reason = 'Cancelled by user', actor }) {
  const po = await PurchaseOrder.findById(id);
  if (!po) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Purchase Order not found.');
  }

  if (po.status === PO_STATUS.COMPLETED || po.status === PO_STATUS.PARTIALLY_RECEIVED) {
    throw createApiError(
      400,
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      `Cannot cancel Purchase Order in ${po.status} status because stock receipts have already occurred.`
    );
  }

  if (po.status === PO_STATUS.CANCELLED) {
    throw createApiError(400, ERROR_CODES.INVALID_STATUS_TRANSITION, 'Purchase Order is already cancelled.');
  }

  // Privileges: Admin or Creator
  const isCreator = po.prepared_by.toString() === actor.id;
  const isAdmin = actor.role === ROLES.ADMIN;
  if (!isCreator && !isAdmin) {
    throw createApiError(403, ERROR_CODES.FORBIDDEN, 'You do not have permission to cancel this Purchase Order.');
  }

  po.status = PO_STATUS.CANCELLED;
  po.cancelled_by = actor.id;
  po.cancelled_by_name = actor.name;
  po.cancelled_at = new Date();
  po.cancellation_reason = String(cancellation_reason).trim();

  await po.save();

  // Audit log
  await AuditLog.create({
    module: 'SHEETS',
    resource_type: 'PURCHASE_ORDER',
    resource_id: po._id,
    resource_label: `${po.po_no} (${po.supplier_name})`,
    action: 'CANCELLED',
    performed_by: actor.id,
    performed_by_name: actor.name,
    performed_by_role: actor.role,
    performed_at: new Date(),
    metadata: {
      cancellation_reason: po.cancellation_reason,
    },
  }).catch(() => null);

  return po.toJSON();
}

/**
 * Autocompletion options for PO creation (Distinct suppliers, clients, jobs)
 */
export async function getPurchaseOrderFilterOptions() {
  const [suppliers, clients, jobs] = await Promise.all([
    PurchaseOrder.distinct('supplier_name'),
    PurchaseOrder.distinct('items.client_name'),
    PurchaseOrder.distinct('items.job_name'),
  ]);

  return {
    suppliers: suppliers.filter(Boolean).sort(),
    clients: clients.filter(Boolean).sort(),
    jobs: jobs.filter(Boolean).sort(),
  };
}
