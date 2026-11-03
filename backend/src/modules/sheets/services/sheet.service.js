import mongoose from 'mongoose';
import { Sheet } from '../models/sheet.model.js';
import { SheetEvent } from '../models/sheetEvent.model.js';
import { Counter } from '../../../core/database/counter.model.js';
import { AuditLog } from '../../audit/models/auditLog.model.js';
import { SHEET_STATUS, SHEET_RECORD_STATUS, SHEET_EVENT_TYPES, SHEET_STATIONS } from '../constants/sheetStatus.js';
import { ROLES } from '../../../core/constants/roles.js';
import { APPROVAL_STATUS } from '../../../core/constants/approvalStatus.js';
import { ERROR_CODES } from '../../../core/constants/errorCodes.js';
import { createApiError } from '../../../core/errors/ApiError.js';
import { withTransaction } from '../../../core/database/db.js';
import { getNextSequence } from '../../../core/database/counter.service.js';
import { parsePagination, buildPaginationMeta } from '../../../core/utils/pagination.js';
import {
  calculateTotalWeight,
  calculateRemainingWeight,
  calculateConsumedWeight,
  deriveSheetStatus,
  validateSheetSpecs,
  roundTwoDecimals,
} from '../utils/sheetCalculations.js';

/**
 * Creates/Inwards a new Sheet stock lot.
 * @param {{ input: object, actor: object }} args
 * @returns {Promise<{ sheet: object, event: object }>}
 */
export async function createSheet({ input, actor }) {
  const specCheck = validateSheetSpecs({
    deckle: input.deckle,
    cutting: input.cutting,
    gsm: input.gsm,
    quantity: input.quantity,
  });

  if (!specCheck.valid) {
    throw createApiError(422, ERROR_CODES.VALIDATION_ERROR, specCheck.errors.join(' '));
  }

  if (!input.party_name || !String(input.party_name).trim()) {
    throw createApiError(422, ERROR_CODES.VALIDATION_ERROR, 'Party Name is required.');
  }

  if (!input.quality || !String(input.quality).trim()) {
    throw createApiError(422, ERROR_CODES.VALIDATION_ERROR, 'Board Quality is required.');
  }

  return withTransaction(async (session) => {
    const sr_no = await getNextSequence('sheet_sr_no', session);

    const quantity = Math.floor(Number(input.quantity));
    const deckle = roundTwoDecimals(input.deckle);
    const cutting = roundTwoDecimals(input.cutting);
    const gsm = Number(input.gsm);
    const calculatedWeight = calculateTotalWeight(deckle, cutting, gsm, quantity);

    const isOperator = actor.role === ROLES.OPERATOR;
    const initialApprovalStatus = isOperator ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.CONFIRMED;
    const pendingCount = isOperator ? 1 : 0;

    const [sheet] = await Sheet.create(
      [
        {
          sr_no,
          lot_no: input.lot_no ? String(input.lot_no).trim() : null,
          party_name: String(input.party_name).trim(),
          job_name: input.job_name ? String(input.job_name).trim() : '',
          quality: String(input.quality).trim().toUpperCase(),
          deckle,
          cutting,
          gsm,
          initial_quantity: quantity,
          current_quantity: quantity,
          initial_weight: calculatedWeight,
          current_weight: calculatedWeight,
          status: SHEET_STATUS.AVAILABLE,
          supplier_name: input.supplier_name ? String(input.supplier_name).trim() : '',
          received_date: input.received_date ? new Date(input.received_date) : new Date(),
          sheater_reel_id: input.sheater_reel_id || null,
          pending_count: pendingCount,
          record_status: SHEET_RECORD_STATUS.ACTIVE,
          notes: input.notes ? String(input.notes).trim() : '',
          custom_fields: input.custom_fields || {},
          created_by: actor.id,
          last_activity_at: new Date(),
        },
      ],
      { session }
    );

    const [event] = await SheetEvent.create(
      [
        {
          sheet_id: sheet._id,
          sr_no: sheet.sr_no,
          event_type: SHEET_EVENT_TYPES.CREATED,
          approval_status: initialApprovalStatus,
          performed_by: actor.id,
          performed_by_name: actor.name,
          performed_by_role: actor.role,
          performed_at: new Date(),
          approved_by: isOperator ? null : actor.id,
          approved_by_name: isOperator ? null : actor.name,
          approved_at: isOperator ? null : new Date(),
          payload: {
            party_name: sheet.party_name,
            job_name: sheet.job_name,
            quality: sheet.quality,
            deckle: sheet.deckle,
            cutting: sheet.cutting,
            gsm: sheet.gsm,
            initial_quantity: sheet.initial_quantity,
            initial_weight: sheet.initial_weight,
            notes: sheet.notes,
          },
        },
      ],
      { session }
    );

    await AuditLog.create(
      [
        {
          module: 'SHEETS',
          resource_type: 'SHEET',
          resource_id: sheet._id,
          resource_label: `${sheet.party_name} - ${sheet.job_name || 'Lot'} (Sr #${sheet.sr_no})`,
          action: 'CREATED',
          performed_by: actor.id,
          performed_by_name: actor.name,
          performed_by_role: actor.role,
          performed_at: new Date(),
          changes: {
            before: null,
            after: sheet.toJSON(),
          },
          metadata: {
            sr_no: sheet.sr_no,
            initial_quantity: sheet.initial_quantity,
            initial_weight: sheet.initial_weight,
          },
        },
      ],
      { session }
    );

    return {
      sheet: sheet.toJSON(),
      event: event.toJSON(),
    };
  });
}

/**
 * Lists sheets with filters, search, aggregations, and pagination.
 * @param {{ filters: object, actor: object }} args
 * @returns {Promise<{ items: Array<object>, meta: object }>}
 */
export async function listSheets({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const query = {};

  // Record status filter
  if (filters.record_status && filters.record_status.toUpperCase() === 'VOIDED') {
    query.record_status = SHEET_RECORD_STATUS.VOIDED;
  } else if (filters.record_status && filters.record_status.toUpperCase() === 'ALL') {
    // Show all
  } else {
    query.record_status = SHEET_RECORD_STATUS.ACTIVE;
  }

  // Exact or multi-party filter
  if (filters.party_name) {
    const rawParties = String(filters.party_name).split(',').map((p) => p.trim()).filter(Boolean);
    if (rawParties.length === 1) {
      query.party_name = new RegExp(`^${rawParties[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    } else if (rawParties.length > 1) {
      query.party_name = {
        $in: rawParties.map((p) => new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')),
      };
    }
  }

  // Job name
  if (filters.job_name) {
    query.job_name = new RegExp(String(filters.job_name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  // Quality filter
  if (filters.quality) {
    const rawQ = String(filters.quality).split(',').map((q) => q.trim()).filter(Boolean);
    if (rawQ.length === 1) {
      query.quality = new RegExp(`^${rawQ[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    } else if (rawQ.length > 1) {
      query.quality = {
        $in: rawQ.map((q) => new RegExp(`^${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')),
      };
    }
  }

  // Status filter
  if (filters.status) {
    const rawStatus = String(filters.status).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (rawStatus.length === 1) {
      query.status = rawStatus[0];
    } else if (rawStatus.length > 1) {
      query.status = { $in: rawStatus };
    }
  }

  // Consumption status filter
  if (filters.consumption) {
    const rawCons = String(filters.consumption).toLowerCase();
    if (rawCons.includes('fresh') || rawCons.includes('unused')) {
      query.status = SHEET_STATUS.AVAILABLE;
    } else if (rawCons.includes('partially') || rawCons.includes('in-use')) {
      query.status = SHEET_STATUS.PARTIALLY_CONSUMED;
    } else if (rawCons.includes('depleted') || rawCons.includes('consumed')) {
      query.status = SHEET_STATUS.DEPLETED;
    }
  }

  // GSM filter (single or comma-separated)
  if (filters.gsm) {
    const rawGsm = String(filters.gsm)
      .split(',')
      .map((g) => Number(g.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    if (rawGsm.length === 1) query.gsm = rawGsm[0];
    else if (rawGsm.length > 1) query.gsm = { $in: rawGsm };
  }

  // Deckle filter (single or comma-separated)
  if (filters.deckle) {
    const rawDeckle = String(filters.deckle)
      .split(',')
      .map((d) => Number(d.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    if (rawDeckle.length === 1) query.deckle = rawDeckle[0];
    else if (rawDeckle.length > 1) query.deckle = { $in: rawDeckle };
  }

  // Cutting filter (single or comma-separated)
  if (filters.cutting) {
    const rawCutting = String(filters.cutting)
      .split(',')
      .map((c) => Number(c.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    if (rawCutting.length === 1) query.cutting = rawCutting[0];
    else if (rawCutting.length > 1) query.cutting = { $in: rawCutting };
  }

  // Date range
  const sDate = filters.startDate || filters.date_from;
  const eDate = filters.endDate || filters.date_to;
  if (sDate || eDate) {
    query.received_date = {};
    if (sDate) query.received_date.$gte = new Date(sDate);
    if (eDate) {
      const toDate = new Date(eDate);
      toDate.setHours(23, 59, 59, 999);
      query.received_date.$lte = toDate;
    }
  }

  // General text search 'q' or targeted search_field
  if (filters.q && filters.q.trim()) {
    const qTrim = filters.q.trim();
    const regex = new RegExp(qTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const numVal = Number(qTrim);
    const sField = filters.search_field && filters.search_field !== 'all' ? filters.search_field : null;

    if (sField) {
      if (sField === 'sr_no' && !isNaN(numVal)) {
        query.sr_no = numVal;
      } else if (sField === 'gsm' && !isNaN(numVal)) {
        query.gsm = numVal;
      } else if (sField === 'deckle' && !isNaN(numVal)) {
        query.deckle = numVal;
      } else if (sField === 'cutting' && !isNaN(numVal)) {
        query.cutting = numVal;
      } else if (sField === 'party_name') {
        query.party_name = regex;
      } else if (sField === 'job_name') {
        query.job_name = regex;
      } else if (sField === 'quality') {
        query.quality = regex;
      } else if (sField === 'supplier' || sField === 'supplier_name') {
        query.supplier_name = regex;
      } else if (sField === 'status') {
        query.status = new RegExp(`^${qTrim}$`, 'i');
      } else {
        query[sField] = regex;
      }
    } else {
      const orConditions = [
        { party_name: regex },
        { job_name: regex },
        { quality: regex },
        { lot_no: regex },
        { supplier_name: regex },
      ];

      if (!isNaN(numVal) && numVal > 0) {
        orConditions.push({ sr_no: numVal });
        orConditions.push({ gsm: numVal });
        orConditions.push({ deckle: numVal });
        orConditions.push({ cutting: numVal });
        orConditions.push({ current_quantity: numVal });
      }

      if (query.$and) {
        query.$and.push({ $or: orConditions });
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: orConditions }];
        delete query.$or;
      } else {
        query.$or = orConditions;
      }
    }
  }

  // Sorting
  const sortOption = {};
  if (filters.sort) {
    const isDesc = filters.sort.startsWith('-');
    const field = isDesc ? filters.sort.substring(1) : filters.sort;
    sortOption[field] = isDesc ? -1 : 1;
    if (field !== '_id') sortOption._id = -1;
  } else {
    sortOption.created_at = -1;
    sortOption._id = -1;
  }

  const [sheets, total, summaryAgg] = await Promise.all([
    Sheet.find(query).sort(sortOption).skip(skip).limit(limit).lean(),
    Sheet.countDocuments(query),
    Sheet.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total_lots: { $sum: 1 },
          total_available_sheets: { $sum: '$current_quantity' },
          total_initial_sheets: { $sum: '$initial_quantity' },
          total_available_weight: { $sum: '$current_weight' },
          total_initial_weight: { $sum: '$initial_weight' },
          available_lots_count: {
            $sum: { $cond: [{ $eq: ['$status', SHEET_STATUS.AVAILABLE] }, 1, 0] },
          },
          partially_consumed_count: {
            $sum: { $cond: [{ $eq: ['$status', SHEET_STATUS.PARTIALLY_CONSUMED] }, 1, 0] },
          },
          depleted_count: {
            $sum: { $cond: [{ $eq: ['$status', SHEET_STATUS.DEPLETED] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const summaryDoc = summaryAgg[0] || {};
  const totalAvailableSheets = summaryDoc.total_available_sheets || 0;
  const totalInitialSheets = summaryDoc.total_initial_sheets || 0;
  const totalConsumedSheets = Math.max(0, totalInitialSheets - totalAvailableSheets);
  const totalAvailableWeight = roundTwoDecimals(summaryDoc.total_available_weight || 0);
  const totalInitialWeight = roundTwoDecimals(summaryDoc.total_initial_weight || 0);
  const totalConsumedWeight = roundTwoDecimals(Math.max(0, totalInitialWeight - totalAvailableWeight));

  const summary = {
    total_lots: total,
    total_available_sheets: totalAvailableSheets,
    total_initial_sheets: totalInitialSheets,
    total_consumed_sheets: totalConsumedSheets,
    total_available_weight: totalAvailableWeight,
    total_available_weight_tons: roundTwoDecimals(totalAvailableWeight / 1000),
    total_initial_weight: totalInitialWeight,
    total_consumed_weight: totalConsumedWeight,
    available_lots_count: summaryDoc.available_lots_count || 0,
    partially_consumed_count: summaryDoc.partially_consumed_count || 0,
    depleted_count: summaryDoc.depleted_count || 0,
  };

  const items = sheets.map((s) => ({
    id: s._id.toString(),
    sr_no: s.sr_no,
    lot_no: s.lot_no,
    party_name: s.party_name,
    job_name: s.job_name,
    quality: s.quality,
    deckle: s.deckle,
    cutting: s.cutting,
    gsm: s.gsm,
    initial_quantity: s.initial_quantity,
    current_quantity: s.current_quantity,
    consumed_quantity: Math.max(0, s.initial_quantity - s.current_quantity),
    initial_weight: s.initial_weight,
    current_weight: s.current_weight,
    consumed_weight: roundTwoDecimals(Math.max(0, s.initial_weight - s.current_weight)),
    status: s.status,
    supplier_name: s.supplier_name,
    received_date: s.received_date,
    sheater_reel_id: s.sheater_reel_id ? s.sheater_reel_id.toString() : null,
    pending_count: s.pending_count || 0,
    record_status: s.record_status,
    notes: s.notes,
    custom_fields: s.custom_fields || {},
    created_at: s.created_at,
    last_activity_at: s.last_activity_at,
  }));

  return {
    items,
    meta: {
      ...buildPaginationMeta({ page, limit, total }),
      summary,
    },
  };
}

/**
 * Retrieves an individual sheet lot by ID or Serial Number.
 * @param {{ id: string, actor: object }} args
 * @returns {Promise<object>}
 */
export async function getSheet({ id, actor }) {
  let sheet = null;
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    sheet = await Sheet.findById(id).lean();
  }
  if (!sheet && !isNaN(Number(id))) {
    sheet = await Sheet.findOne({ sr_no: Number(id) }).lean();
  }

  if (!sheet) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, `Sheet lot not found with ID/SrNo: "${id}"`);
  }

  return {
    id: sheet._id.toString(),
    sr_no: sheet.sr_no,
    lot_no: sheet.lot_no,
    party_name: sheet.party_name,
    job_name: sheet.job_name,
    quality: sheet.quality,
    deckle: sheet.deckle,
    cutting: sheet.cutting,
    gsm: sheet.gsm,
    initial_quantity: sheet.initial_quantity,
    current_quantity: sheet.current_quantity,
    consumed_quantity: Math.max(0, sheet.initial_quantity - sheet.current_quantity),
    initial_weight: sheet.initial_weight,
    current_weight: sheet.current_weight,
    consumed_weight: roundTwoDecimals(Math.max(0, sheet.initial_weight - sheet.current_weight)),
    status: sheet.status,
    supplier_name: sheet.supplier_name,
    received_date: sheet.received_date,
    sheater_reel_id: sheet.sheater_reel_id ? sheet.sheater_reel_id.toString() : null,
    pending_count: sheet.pending_count || 0,
    record_status: sheet.record_status,
    notes: sheet.notes,
    custom_fields: sheet.custom_fields || {},
    created_at: sheet.created_at,
    last_activity_at: sheet.last_activity_at,
  };
}

/**
 * Admin direct updates sheet lot parameters.
 * @param {{ id: string, input: object, actor: object }} args
 * @returns {Promise<{ sheet: object, event: object }>}
 */
export async function updateSheet({ id, input, actor }) {
  return withTransaction(async (session) => {
    const sheet = await Sheet.findById(id).session(session);
    if (!sheet || sheet.record_status === SHEET_RECORD_STATUS.VOIDED) {
      throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Active Sheet lot not found.');
    }

    const previousSnapshot = sheet.toJSON();

    if (input.party_name !== undefined) sheet.party_name = String(input.party_name).trim();
    if (input.job_name !== undefined) sheet.job_name = String(input.job_name).trim();
    if (input.quality !== undefined) sheet.quality = String(input.quality).trim().toUpperCase();
    if (input.supplier_name !== undefined) sheet.supplier_name = String(input.supplier_name).trim();
    if (input.notes !== undefined) sheet.notes = String(input.notes).trim();
    if (input.lot_no !== undefined) sheet.lot_no = input.lot_no ? String(input.lot_no).trim() : null;

    let specsChanged = false;
    if (input.deckle !== undefined && Number(input.deckle) > 0) {
      sheet.deckle = roundTwoDecimals(input.deckle);
      specsChanged = true;
    }
    if (input.cutting !== undefined && Number(input.cutting) > 0) {
      sheet.cutting = roundTwoDecimals(input.cutting);
      specsChanged = true;
    }
    if (input.gsm !== undefined && Number(input.gsm) > 0) {
      sheet.gsm = Number(input.gsm);
      specsChanged = true;
    }

    // Recalculate weights if dimensions or GSM changed
    if (specsChanged) {
      sheet.initial_weight = calculateTotalWeight(sheet.deckle, sheet.cutting, sheet.gsm, sheet.initial_quantity);
      sheet.current_weight = calculateRemainingWeight(sheet.deckle, sheet.cutting, sheet.gsm, sheet.current_quantity);
    }

    sheet.last_activity_at = new Date();
    await sheet.save({ session });

    const [event] = await SheetEvent.create(
      [
        {
          sheet_id: sheet._id,
          sr_no: sheet.sr_no,
          event_type: SHEET_EVENT_TYPES.ADJUSTED,
          approval_status: APPROVAL_STATUS.CONFIRMED,
          performed_by: actor.id,
          performed_by_name: actor.name,
          performed_by_role: actor.role,
          performed_at: new Date(),
          approved_by: actor.id,
          approved_by_name: actor.name,
          approved_at: new Date(),
          payload: {
            reason: input.reason || 'Metadata / spec parameters updated',
            before: previousSnapshot,
            after: sheet.toJSON(),
          },
        },
      ],
      { session }
    );

    await AuditLog.create(
      [
        {
          module: 'SHEETS',
          resource_type: 'SHEET',
          resource_id: sheet._id,
          resource_label: `${sheet.party_name} - ${sheet.job_name || 'Lot'} (Sr #${sheet.sr_no})`,
          action: 'UPDATED',
          performed_by: actor.id,
          performed_by_name: actor.name,
          performed_by_role: actor.role,
          performed_at: new Date(),
          changes: {
            before: previousSnapshot,
            after: sheet.toJSON(),
          },
          metadata: { sr_no: sheet.sr_no },
        },
      ],
      { session }
    );

    return { sheet: sheet.toJSON(), event: event.toJSON() };
  });
}

/**
 * Records sheet consumption on machine press / station.
 * @param {{ id: string, input: { consumed_quantity: number, station?: string, job_card_no?: string, notes?: string, expected_current_quantity?: number }, actor: object }} args
 * @returns {Promise<{ sheet: object, event: object }>}
 */
export async function recordSheetUsage({ id, input, actor }) {
  const consumedQty = Math.floor(Number(input.consumed_quantity));
  if (isNaN(consumedQty) || consumedQty <= 0) {
    throw createApiError(422, ERROR_CODES.VALIDATION_ERROR, 'Consumed quantity must be a positive integer greater than 0.');
  }

  return withTransaction(async (session) => {
    const sheet = await Sheet.findById(id).session(session);
    if (!sheet || sheet.record_status === SHEET_RECORD_STATUS.VOIDED) {
      throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Sheet lot is not active or has been voided.');
    }

    if (sheet.current_quantity <= 0) {
      throw createApiError(422, ERROR_CODES.VALIDATION_ERROR, 'Sheet lot is already fully depleted (0 sheets remaining).');
    }

    // Optimistic concurrency check
    if (
      input.expected_current_quantity !== undefined &&
      Math.abs(sheet.current_quantity - input.expected_current_quantity) > 0
    ) {
      throw createApiError(
        409,
        ERROR_CODES.STALE_WEIGHT,
        `Sheet stock quantity has changed (current: ${sheet.current_quantity} pcs). Please refresh and retry.`
      );
    }

    if (consumedQty > sheet.current_quantity) {
      throw createApiError(
        422,
        ERROR_CODES.VALIDATION_ERROR,
        `Consumed quantity (${consumedQty} pcs) cannot exceed available balance (${sheet.current_quantity} pcs).`
      );
    }

    const previousQuantity = sheet.current_quantity;
    const remainingQuantity = previousQuantity - consumedQty;
    const previousWeight = sheet.current_weight;
    const consumedWeight = calculateConsumedWeight(sheet.deckle, sheet.cutting, sheet.gsm, consumedQty);
    const remainingWeight = calculateRemainingWeight(sheet.deckle, sheet.cutting, sheet.gsm, remainingQuantity);

    sheet.current_quantity = remainingQuantity;
    sheet.current_weight = remainingWeight;
    sheet.status = deriveSheetStatus(remainingQuantity, sheet.initial_quantity);
    sheet.last_activity_at = new Date();

    const isOperator = actor.role === ROLES.OPERATOR;
    const approvalStatus = isOperator ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.CONFIRMED;
    if (isOperator) {
      sheet.pending_count = (sheet.pending_count || 0) + 1;
    }

    await sheet.save({ session });

    const [event] = await SheetEvent.create(
      [
        {
          sheet_id: sheet._id,
          sr_no: sheet.sr_no,
          event_type: SHEET_EVENT_TYPES.CONSUMED,
          approval_status: approvalStatus,
          performed_by: actor.id,
          performed_by_name: actor.name,
          performed_by_role: actor.role,
          performed_at: new Date(),
          approved_by: isOperator ? null : actor.id,
          approved_by_name: isOperator ? null : actor.name,
          approved_at: isOperator ? null : new Date(),
          payload: {
            station: input.station || 'Offset Printing',
            job_card_no: input.job_card_no ? String(input.job_card_no).trim() : '',
            previous_quantity: previousQuantity,
            consumed_quantity: consumedQty,
            remaining_quantity: remainingQuantity,
            previous_weight: previousWeight,
            consumed_weight: consumedWeight,
            remaining_weight: remainingWeight,
            notes: input.notes ? String(input.notes).trim() : '',
          },
        },
      ],
      { session }
    );

    return { sheet: sheet.toJSON(), event: event.toJSON() };
  });
}

/**
 * Adjusts sheet inventory balance (physical stock count reconciliation).
 * @param {{ id: string, input: { new_quantity: number, reason: string }, actor: object }} args
 * @returns {Promise<{ sheet: object, event: object }>}
 */
export async function adjustSheetStock({ id, input, actor }) {
  const newQty = Math.floor(Number(input.new_quantity));
  if (isNaN(newQty) || newQty < 0) {
    throw createApiError(422, ERROR_CODES.VALIDATION_ERROR, 'New quantity must be a non-negative whole integer.');
  }

  if (!input.reason || !String(input.reason).trim()) {
    throw createApiError(422, ERROR_CODES.VALIDATION_ERROR, 'An adjustment reason is mandatory.');
  }

  return withTransaction(async (session) => {
    const sheet = await Sheet.findById(id).session(session);
    if (!sheet || sheet.record_status === SHEET_RECORD_STATUS.VOIDED) {
      throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Active Sheet lot not found.');
    }

    const previousQuantity = sheet.current_quantity;
    const previousWeight = sheet.current_weight;
    const remainingWeight = calculateRemainingWeight(sheet.deckle, sheet.cutting, sheet.gsm, newQty);

    sheet.current_quantity = newQty;
    sheet.current_weight = remainingWeight;
    sheet.status = deriveSheetStatus(newQty, sheet.initial_quantity);
    sheet.last_activity_at = new Date();
    await sheet.save({ session });

    const [event] = await SheetEvent.create(
      [
        {
          sheet_id: sheet._id,
          sr_no: sheet.sr_no,
          event_type: SHEET_EVENT_TYPES.ADJUSTED,
          approval_status: APPROVAL_STATUS.CONFIRMED,
          performed_by: actor.id,
          performed_by_name: actor.name,
          performed_by_role: actor.role,
          performed_at: new Date(),
          approved_by: actor.id,
          approved_by_name: actor.name,
          approved_at: new Date(),
          payload: {
            reason: String(input.reason).trim(),
            previous_quantity: previousQuantity,
            new_quantity: newQty,
            delta_quantity: newQty - previousQuantity,
            previous_weight: previousWeight,
            new_weight: remainingWeight,
          },
        },
      ],
      { session }
    );

    return { sheet: sheet.toJSON(), event: event.toJSON() };
  });
}

/**
 * Returns unused sheets from production back to inventory.
 * @param {{ id: string, input: { returned_quantity: number, reason?: string }, actor: object }} args
 * @returns {Promise<{ sheet: object, event: object }>}
 */
export async function returnSheetStock({ id, input, actor }) {
  const returnQty = Math.floor(Number(input.returned_quantity));
  if (isNaN(returnQty) || returnQty <= 0) {
    throw createApiError(422, ERROR_CODES.VALIDATION_ERROR, 'Returned quantity must be a positive integer greater than 0.');
  }

  return withTransaction(async (session) => {
    const sheet = await Sheet.findById(id).session(session);
    if (!sheet || sheet.record_status === SHEET_RECORD_STATUS.VOIDED) {
      throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Active Sheet lot not found.');
    }

    const previousQuantity = sheet.current_quantity;
    const newQuantity = previousQuantity + returnQty;
    const previousWeight = sheet.current_weight;
    const newWeight = calculateRemainingWeight(sheet.deckle, sheet.cutting, sheet.gsm, newQuantity);

    sheet.current_quantity = newQuantity;
    sheet.current_weight = newWeight;
    sheet.status = deriveSheetStatus(newQuantity, sheet.initial_quantity);
    sheet.last_activity_at = new Date();
    await sheet.save({ session });

    const [event] = await SheetEvent.create(
      [
        {
          sheet_id: sheet._id,
          sr_no: sheet.sr_no,
          event_type: SHEET_EVENT_TYPES.RETURNED,
          approval_status: APPROVAL_STATUS.CONFIRMED,
          performed_by: actor.id,
          performed_by_name: actor.name,
          performed_by_role: actor.role,
          performed_at: new Date(),
          approved_by: actor.id,
          approved_by_name: actor.name,
          approved_at: new Date(),
          payload: {
            returned_quantity: returnQty,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            previous_weight: previousWeight,
            new_weight: newWeight,
            reason: input.reason ? String(input.reason).trim() : 'Unused sheets returned from press',
          },
        },
      ],
      { session }
    );

    return { sheet: sheet.toJSON(), event: event.toJSON() };
  });
}

/**
 * Soft voids a sheet lot.
 * @param {{ id: string, input: { reason?: string }, actor: object }} args
 * @returns {Promise<{ sheet: object, event: object }>}
 */
export async function voidSheet({ id, input = {}, actor }) {
  return withTransaction(async (session) => {
    const sheet = await Sheet.findById(id).session(session);
    if (!sheet || sheet.record_status === SHEET_RECORD_STATUS.VOIDED) {
      throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Sheet lot not found or already voided.');
    }

    sheet.record_status = SHEET_RECORD_STATUS.VOIDED;
    sheet.status = SHEET_STATUS.VOIDED;
    sheet.pending_count = 0;
    sheet.last_activity_at = new Date();
    await sheet.save({ session });

    const [event] = await SheetEvent.create(
      [
        {
          sheet_id: sheet._id,
          sr_no: sheet.sr_no,
          event_type: SHEET_EVENT_TYPES.VOIDED,
          approval_status: APPROVAL_STATUS.CONFIRMED,
          performed_by: actor.id,
          performed_by_name: actor.name,
          performed_by_role: actor.role,
          performed_at: new Date(),
          approved_by: actor.id,
          approved_by_name: actor.name,
          approved_at: new Date(),
          payload: {
            reason: input.reason ? String(input.reason).trim() : 'Voided by administrative action',
          },
        },
      ],
      { session }
    );

    await AuditLog.create(
      [
        {
          module: 'SHEETS',
          resource_type: 'SHEET',
          resource_id: sheet._id,
          resource_label: `${sheet.party_name} - ${sheet.job_name || 'Lot'} (Sr #${sheet.sr_no})`,
          action: 'VOIDED',
          performed_by: actor.id,
          performed_by_name: actor.name,
          performed_by_role: actor.role,
          performed_at: new Date(),
          changes: { before: { status: 'ACTIVE' }, after: { status: 'VOIDED' } },
          metadata: { sr_no: sheet.sr_no },
        },
      ],
      { session }
    );

    return { sheet: sheet.toJSON(), event: event.toJSON() };
  });
}

/**
 * Summary KPI statistics for the Sheet dashboard.
 * @param {{ actor: object }} args
 * @returns {Promise<object>}
 */
export async function getSheetSummary({ actor }) {
  const [totalsAgg, pendingCount, recentEvents] = await Promise.all([
    Sheet.aggregate([
      { $match: { record_status: SHEET_RECORD_STATUS.ACTIVE } },
      {
        $group: {
          _id: null,
          total_lots: { $sum: 1 },
          total_available_sheets: { $sum: '$current_quantity' },
          total_initial_sheets: { $sum: '$initial_quantity' },
          total_available_weight: { $sum: '$current_weight' },
          available_lots_count: {
            $sum: { $cond: [{ $eq: ['$status', SHEET_STATUS.AVAILABLE] }, 1, 0] },
          },
          partially_consumed_count: {
            $sum: { $cond: [{ $eq: ['$status', SHEET_STATUS.PARTIALLY_CONSUMED] }, 1, 0] },
          },
          depleted_count: {
            $sum: { $cond: [{ $eq: ['$status', SHEET_STATUS.DEPLETED] }, 1, 0] },
          },
        },
      },
    ]),
    SheetEvent.countDocuments({ approval_status: APPROVAL_STATUS.PENDING }),
    SheetEvent.find().sort({ performed_at: -1 }).limit(6).lean(),
  ]);

  const doc = totalsAgg[0] || {};
  const totalWeightKg = roundTwoDecimals(doc.total_available_weight || 0);

  return {
    total_sheet_lots: doc.total_lots || 0,
    available_sheets: doc.total_available_sheets || 0,
    initial_sheets: doc.total_initial_sheets || 0,
    consumed_sheets: Math.max(0, (doc.total_initial_sheets || 0) - (doc.total_available_sheets || 0)),
    total_weight_kg: totalWeightKg,
    total_weight_tons: roundTwoDecimals(totalWeightKg / 1000),
    available_lots: doc.available_lots_count || 0,
    partially_consumed_lots: doc.partially_consumed_count || 0,
    depleted_lots: doc.depleted_count || 0,
    pending_confirmations: pendingCount,
    recent_movements: recentEvents.map((e) => ({
      id: e._id.toString(),
      sheet_id: e.sheet_id.toString(),
      sr_no: e.sr_no,
      event_type: e.event_type,
      approval_status: e.approval_status,
      performed_by_name: e.performed_by_name,
      performed_at: e.performed_at,
      payload: e.payload,
    })),
  };
}

/**
 * Filter dropdown options.
 * @returns {Promise<object>}
 */
export async function getSheetFilterOptions() {
  const [parties, jobs, qualities, gsms, statuses, deckles, cuttings] = await Promise.all([
    Sheet.distinct('party_name', { record_status: SHEET_RECORD_STATUS.ACTIVE }),
    Sheet.distinct('job_name', { record_status: SHEET_RECORD_STATUS.ACTIVE }),
    Sheet.distinct('quality', { record_status: SHEET_RECORD_STATUS.ACTIVE }),
    Sheet.distinct('gsm', { record_status: SHEET_RECORD_STATUS.ACTIVE }),
    Sheet.distinct('status', { record_status: SHEET_RECORD_STATUS.ACTIVE }),
    Sheet.distinct('deckle', { record_status: SHEET_RECORD_STATUS.ACTIVE }),
    Sheet.distinct('cutting', { record_status: SHEET_RECORD_STATUS.ACTIVE }),
  ]);

  return {
    parties: parties.filter(Boolean).sort(),
    jobs: jobs.filter(Boolean).sort(),
    qualities: qualities.filter(Boolean).sort(),
    gsms: gsms.filter(Boolean).sort((a, b) => Number(a) - Number(b)),
    statuses: statuses.filter(Boolean).sort(),
    deckles: deckles.filter(Boolean).sort((a, b) => Number(a) - Number(b)),
    cuttings: cuttings.filter(Boolean).sort((a, b) => Number(a) - Number(b)),
    stations: [...SHEET_STATIONS],
  };
}

/**
 * Retrieves the full journey and timeline of events for a sheet lot.
 * @param {{ id: string, query: object, actor: object }} args
 * @returns {Promise<{ sheet: object, events: Array<object> }>}
 */
export async function getSheetJourney({ id, query = {}, actor }) {
  const sheet = await getSheet({ id, actor });
  const events = await SheetEvent.find({ sheet_id: sheet.id })
    .sort({ performed_at: -1, _id: -1 })
    .lean();

  return {
    sheet,
    events: events.map((e) => ({
      id: e._id.toString(),
      sheet_id: e.sheet_id.toString(),
      sr_no: e.sr_no,
      event_type: e.event_type,
      approval_status: e.approval_status,
      performed_by_name: e.performed_by_name,
      performed_by_role: e.performed_by_role,
      performed_at: e.performed_at,
      approved_by_name: e.approved_by_name,
      approved_at: e.approved_at,
      decline_reason: e.decline_reason,
      payload: e.payload,
    })),
  };
}

/**
 * Lists all sheet stock history / transaction ledger entries across all lots.
 * @param {{ filters: object, actor: object }} args
 * @returns {Promise<{ items: Array<object>, meta: object }>}
 */
export async function listSheetHistory({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const query = {};

  if (filters.event_type) {
    const rawEvents = String(filters.event_type).split(',').map((e) => e.trim().toUpperCase()).filter(Boolean);
    if (rawEvents.length === 1) {
      query.event_type = rawEvents[0];
    } else if (rawEvents.length > 1) {
      query.event_type = { $in: rawEvents };
    }
  }

  if (filters.sheet_id) {
    query.sheet_id = filters.sheet_id;
  }

  if (filters.sr_no) {
    const num = Number(filters.sr_no);
    if (!isNaN(num) && num > 0) query.sr_no = num;
  }

  const sDate = filters.startDate || filters.date_from;
  const eDate = filters.endDate || filters.date_to;
  if (sDate || eDate) {
    query.performed_at = {};
    if (sDate) query.performed_at.$gte = new Date(sDate);
    if (eDate) {
      const toDate = new Date(eDate);
      toDate.setHours(23, 59, 59, 999);
      query.performed_at.$lte = toDate;
    }
  }

  if (filters.party_name) {
    const partyRegex = new RegExp(String(filters.party_name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query['payload.party_name'] = partyRegex;
  }

  if (filters.q && filters.q.trim()) {
    const qTrim = filters.q.trim();
    const regex = new RegExp(qTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const numVal = Number(qTrim);

    const orConditions = [
      { performed_by_name: regex },
      { 'payload.party_name': regex },
      { 'payload.job_name': regex },
      { 'payload.station': regex },
      { 'payload.notes': regex },
      { 'payload.job_card_no': regex },
    ];

    if (!isNaN(numVal) && numVal > 0) {
      orConditions.push({ sr_no: numVal });
      orConditions.push({ 'payload.consumed_quantity': numVal });
      orConditions.push({ 'payload.initial_quantity': numVal });
    }

    if (query.$and) {
      query.$and.push({ $or: orConditions });
    } else if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: orConditions }];
      delete query.$or;
    } else {
      query.$or = orConditions;
    }
  }

  const [rawEvents, total] = await Promise.all([
    SheetEvent.find(query).sort({ performed_at: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    SheetEvent.countDocuments(query),
  ]);

  const sheetIds = [...new Set(rawEvents.map((e) => e.sheet_id.toString()))];
  const sheets = await Sheet.find({ _id: { $in: sheetIds } }).lean();
  const sheetMap = new Map(sheets.map((s) => [s._id.toString(), s]));

  const items = rawEvents.map((e) => {
    const s = sheetMap.get(e.sheet_id.toString());
    const p = e.payload || {};

    const partyName = p.party_name || s?.party_name || '-';
    const jobName = p.job_name || s?.job_name || '';
    const quality = p.quality || s?.quality || '-';
    const deckle = p.deckle || s?.deckle || 0;
    const cutting = p.cutting || s?.cutting || 0;
    const gsm = p.gsm || s?.gsm || 0;

    let qtyIn = 0;
    let qtyOut = 0;
    let prevBal = p.previous_quantity !== undefined ? p.previous_quantity : (s?.initial_quantity || 0);
    let newBal = prevBal;
    let weightImpact = 0;

    if (e.event_type === SHEET_EVENT_TYPES.CREATED) {
      qtyIn = p.initial_quantity || s?.initial_quantity || 0;
      prevBal = 0;
      newBal = qtyIn;
      weightImpact = p.initial_weight || s?.initial_weight || 0;
    } else if (e.event_type === SHEET_EVENT_TYPES.CONSUMED) {
      qtyOut = p.consumed_quantity || 0;
      newBal = p.remaining_quantity !== undefined ? p.remaining_quantity : (prevBal - qtyOut);
      weightImpact = p.consumed_weight || 0;
    } else if (e.event_type === SHEET_EVENT_TYPES.RETURNED) {
      qtyIn = p.returned_quantity || 0;
      newBal = p.new_quantity !== undefined ? p.new_quantity : (prevBal + qtyIn);
      weightImpact = p.new_weight || 0;
    } else if (e.event_type === SHEET_EVENT_TYPES.ADJUSTED) {
      newBal = p.new_quantity !== undefined ? p.new_quantity : prevBal;
      if (newBal > prevBal) qtyIn = newBal - prevBal;
      else qtyOut = prevBal - newBal;
      weightImpact = p.new_weight || 0;
    }

    return {
      id: e._id.toString(),
      sheet_id: e.sheet_id.toString(),
      sr_no: e.sr_no,
      party_name: partyName,
      job_name: jobName,
      quality,
      dimensions: deckle && cutting ? `${deckle} × ${cutting} cm` : '-',
      gsm,
      event_type: e.event_type,
      qty_in: qtyIn,
      qty_out: qtyOut,
      previous_balance: prevBal,
      new_balance: newBal,
      weight_impact_kg: weightImpact,
      station: p.station || '-',
      job_card_no: p.job_card_no || '-',
      performed_by_name: e.performed_by_name,
      performed_by_role: e.performed_by_role,
      performed_at: e.performed_at,
      approval_status: e.approval_status,
      notes: p.notes || p.reason || '',
    };
  });

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

/**
 * Lists pending approvals for sheets.
 * @param {{ filters: object, actor: object }} args
 * @returns {Promise<{ items: Array<object>, meta: object }>}
 */
export async function listPendingSheetApprovals({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const query = { approval_status: APPROVAL_STATUS.PENDING };

  const [rawEvents, total] = await Promise.all([
    SheetEvent.find(query).sort({ performed_at: -1 }).skip(skip).limit(limit).lean(),
    SheetEvent.countDocuments(query),
  ]);

  const sheetIds = [...new Set(rawEvents.map((e) => e.sheet_id.toString()))];
  const sheets = await Sheet.find({ _id: { $in: sheetIds } }).lean();
  const sheetMap = new Map(sheets.map((s) => [s._id.toString(), s]));

  const items = rawEvents.map((e) => {
    const sheetObj = sheetMap.get(e.sheet_id.toString());
    return {
      id: e._id.toString(),
      sheet_id: e.sheet_id.toString(),
      sr_no: e.sr_no,
      event_type: e.event_type,
      performed_by_name: e.performed_by_name,
      performed_by_role: e.performed_by_role,
      performed_at: e.performed_at,
      payload: e.payload,
      sheet: sheetObj
        ? {
            id: sheetObj._id.toString(),
            sr_no: sheetObj.sr_no,
            party_name: sheetObj.party_name,
            job_name: sheetObj.job_name,
            quality: sheetObj.quality,
            current_quantity: sheetObj.current_quantity,
            current_weight: sheetObj.current_weight,
          }
        : null,
    };
  });

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

/**
 * Confirms a pending sheet approval entry.
 * @param {{ eventId: string, actor: object }} args
 * @returns {Promise<object>}
 */
export async function confirmSheetEntry({ eventId, actor }) {
  return withTransaction(async (session) => {
    const event = await SheetEvent.findById(eventId).session(session);
    if (!event) {
      throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Pending approval event not found.');
    }

    if (event.performed_by.toString() === actor.id) {
      throw createApiError(403, ERROR_CODES.SELF_APPROVAL_NOT_ALLOWED, 'You cannot confirm your own entry.');
    }

    if (event.approval_status !== APPROVAL_STATUS.PENDING) {
      throw createApiError(409, ERROR_CODES.ALREADY_DECIDED, 'This entry has already been decided.');
    }

    event.approval_status = APPROVAL_STATUS.CONFIRMED;
    event.approved_by = actor.id;
    event.approved_by_name = actor.name;
    event.approved_at = new Date();
    await event.save({ session });

    const sheet = await Sheet.findById(event.sheet_id).session(session);
    if (sheet) {
      sheet.pending_count = Math.max(0, (sheet.pending_count || 1) - 1);
      await sheet.save({ session });
    }

    await SheetEvent.create(
      [
        {
          sheet_id: event.sheet_id,
          sr_no: event.sr_no,
          event_type: SHEET_EVENT_TYPES.CONFIRMED,
          approval_status: null,
          performed_by: actor.id,
          performed_by_name: actor.name,
          performed_by_role: actor.role,
          performed_at: new Date(),
          ref_event_id: event._id,
          payload: { target_event_type: event.event_type },
        },
      ],
      { session }
    );

    return {
      event: {
        id: event._id.toString(),
        approval_status: event.approval_status,
        approved_by_name: event.approved_by_name,
        approved_at: event.approved_at,
      },
    };
  });
}

/**
 * Declines a pending sheet entry and rolls back stock safely.
 * @param {{ eventId: string, input: { reason?: string }, actor: object }} args
 * @returns {Promise<object>}
 */
export async function declineSheetEntry({ eventId, input = {}, actor }) {
  return withTransaction(async (session) => {
    const event = await SheetEvent.findById(eventId).session(session);
    if (!event) {
      throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Pending approval event not found.');
    }

    if (event.performed_by.toString() === actor.id) {
      throw createApiError(403, ERROR_CODES.SELF_APPROVAL_NOT_ALLOWED, 'You cannot decline your own entry.');
    }

    if (event.approval_status !== APPROVAL_STATUS.PENDING) {
      throw createApiError(409, ERROR_CODES.ALREADY_DECIDED, 'This entry has already been decided.');
    }

    const sheet = await Sheet.findById(event.sheet_id).session(session);
    if (!sheet) {
      throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Associated sheet lot not found.');
    }

    const declineReason = input.reason ? String(input.reason).trim() : null;
    event.approval_status = APPROVAL_STATUS.DECLINED;
    event.approved_by = actor.id;
    event.approved_by_name = actor.name;
    event.approved_at = new Date();
    event.decline_reason = declineReason;
    await event.save({ session });

    sheet.pending_count = Math.max(0, (sheet.pending_count || 1) - 1);

    // Rollback logic
    if (event.event_type === SHEET_EVENT_TYPES.CREATED) {
      sheet.record_status = SHEET_RECORD_STATUS.VOIDED;
      sheet.status = SHEET_STATUS.VOIDED;
      sheet.pending_count = 0;
    } else if (event.event_type === SHEET_EVENT_TYPES.CONSUMED) {
      // Restore consumed quantity
      const restoredQuantity = sheet.current_quantity + (event.payload?.consumed_quantity || 0);
      sheet.current_quantity = restoredQuantity;
      sheet.current_weight = calculateRemainingWeight(sheet.deckle, sheet.cutting, sheet.gsm, restoredQuantity);
      sheet.status = deriveSheetStatus(restoredQuantity, sheet.initial_quantity);
    }

    sheet.last_activity_at = new Date();
    await sheet.save({ session });

    await SheetEvent.create(
      [
        {
          sheet_id: sheet._id,
          sr_no: sheet.sr_no,
          event_type: SHEET_EVENT_TYPES.DECLINED,
          approval_status: null,
          performed_by: actor.id,
          performed_by_name: actor.name,
          performed_by_role: actor.role,
          performed_at: new Date(),
          ref_event_id: event._id,
          payload: {
            reason: declineReason,
            target_event_type: event.event_type,
            restored_quantity: sheet.current_quantity,
            restored_weight: sheet.current_weight,
          },
        },
      ],
      { session }
    );

    return {
      event: {
        id: event._id.toString(),
        approval_status: event.approval_status,
        decline_reason: event.decline_reason,
      },
      sheet: sheet.toJSON(),
    };
  });
}
