import { RECORD_STATUS } from '../constants/reelStatus.js';

/**
 * Converts HTTP query parameters into a Mongoose query object for Reels.
 * @param {object} filters
 * @param {{ role?: string }} [actor]
 * @returns {object}
 */
export function buildReelFilter(filters = {}, actor = {}) {
  const query = {};

  // Record status: voided reels are hidden by default unless include_voided is true and caller is ADMIN
  if (filters.include_voided && actor.role === 'ADMIN') {
    // include both ACTIVE and VOIDED
  } else {
    query.record_status = RECORD_STATUS.ACTIVE;
  }

  // Quick or substring search on reel_no
  if (filters.q) {
    query.reel_no = new RegExp(filters.q.trim(), 'i');
  }

  // Master Key filter (supports comma-separated multi-select)
  if (filters.master_key) {
    const keys = String(filters.master_key).split(',').map((k) => k.trim()).filter(Boolean);
    if (keys.length === 1) {
      query.master_key = keys[0];
    } else if (keys.length > 1) {
      query.master_key = { $in: keys };
    }
  }

  // Master Product ID filter
  if (filters.master_product_id) {
    query.master_product_id = filters.master_product_id;
  }

  // Status (REEL, CUT, NILL)
  if (filters.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : String(filters.status).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (statuses.length === 1) {
      query.status = statuses[0];
    } else if (statuses.length > 1) {
      query.status = { $in: statuses };
    }
  }

  // Quality
  if (filters.quality) {
    const qualities = Array.isArray(filters.quality)
      ? filters.quality
      : String(filters.quality).split(',').map((q) => q.trim().toUpperCase()).filter(Boolean);
    if (qualities.length === 1) {
      query.quality = qualities[0];
    } else if (qualities.length > 1) {
      query.quality = { $in: qualities };
    }
  }

  // Bursting Factor (BF) — supports comma-separated multi-select
  if (filters.bf !== undefined && filters.bf !== '') {
    const bfValues = String(filters.bf).split(',').map((v) => v.trim()).filter(Boolean);
    if (bfValues.length === 1) {
      query.bf = Number(bfValues[0]);
    } else if (bfValues.length > 1) {
      query.bf = { $in: bfValues.map(Number) };
    }
  }

  // Supplier exact match (comma-separated) or substring match
  if (filters.supplier) {
    const suppliers = Array.isArray(filters.supplier)
      ? filters.supplier
      : String(filters.supplier).split(',').map((s) => s.trim()).filter(Boolean);
    if (suppliers.length === 1) {
      query.supplier_name = suppliers[0];
    } else if (suppliers.length > 1) {
      query.supplier_name = { $in: suppliers };
    }
  } else if (filters.supplier_q) {
    query.supplier_name = new RegExp(filters.supplier_q.trim(), 'i');
  }

  // GSM — exact multi-value (comma-separated) or range
  if (filters.gsm !== undefined && filters.gsm !== '') {
    const gsmValues = String(filters.gsm).split(',').map((v) => v.trim()).filter(Boolean);
    if (gsmValues.length === 1) {
      query.gsm = Number(gsmValues[0]);
    } else if (gsmValues.length > 1) {
      query.gsm = { $in: gsmValues.map(Number) };
    }
  } else if (filters.gsm_min !== undefined || filters.gsm_max !== undefined) {
    query.gsm = {};
    if (filters.gsm_min !== undefined) query.gsm.$gte = Number(filters.gsm_min);
    if (filters.gsm_max !== undefined) query.gsm.$lte = Number(filters.gsm_max);
  }

  // Size — exact multi-value (comma-separated) or range
  if (filters.size !== undefined && filters.size !== '') {
    const sizeValues = String(filters.size).split(',').map((v) => v.trim()).filter(Boolean);
    if (sizeValues.length === 1) {
      query.size = Number(sizeValues[0]);
    } else if (sizeValues.length > 1) {
      query.size = { $in: sizeValues.map(Number) };
    }
  } else if (filters.size_min !== undefined || filters.size_max !== undefined) {
    query.size = {};
    if (filters.size_min !== undefined) query.size.$gte = Number(filters.size_min);
    if (filters.size_max !== undefined) query.size.$lte = Number(filters.size_max);
  }

  // Weight (balance) range
  if (filters.weight_min !== undefined || filters.weight_max !== undefined) {
    query.previous_weight = {};
    if (filters.weight_min !== undefined) query.previous_weight.$gte = Number(filters.weight_min);
    if (filters.weight_max !== undefined) query.previous_weight.$lte = Number(filters.weight_max);
  }

  // Purchase date range
  if (filters.purchase_date_from || filters.purchase_date_to) {
    query.purchase_date = {};
    if (filters.purchase_date_from) {
      query.purchase_date.$gte = new Date(filters.purchase_date_from);
    }
    if (filters.purchase_date_to) {
      const toDate = new Date(filters.purchase_date_to);
      toDate.setHours(23, 59, 59, 999);
      query.purchase_date.$lte = toDate;
    }
  }

  // Station used
  if (filters.station) {
    const stations = Array.isArray(filters.station)
      ? filters.station
      : String(filters.station).split(',').map((s) => s.trim()).filter(Boolean);
    if (stations.length === 1) {
      query.stations_used = stations[0];
    } else if (stations.length > 1) {
      query.stations_used = { $in: stations };
    }
  }

  // Approval status (derived from pending_count)
  if (filters.approval_status) {
    if (filters.approval_status.toUpperCase() === 'PENDING') {
      query.pending_count = { $gt: 0 };
    } else if (filters.approval_status.toUpperCase() === 'CONFIRMED') {
      query.pending_count = 0;
    }
  }

  // Dynamic custom fields (cf.<key>)
  for (const key of Object.keys(filters)) {
    if (key.startsWith('cf.')) {
      const fieldName = key.substring(3);
      if (fieldName.endsWith('_min')) {
        const realKey = `custom_fields.${fieldName.substring(0, fieldName.length - 4)}`;
        query[realKey] = query[realKey] || {};
        query[realKey].$gte = Number(filters[key]);
      } else if (fieldName.endsWith('_max')) {
        const realKey = `custom_fields.${fieldName.substring(0, fieldName.length - 4)}`;
        query[realKey] = query[realKey] || {};
        query[realKey].$lte = Number(filters[key]);
      } else {
        query[`custom_fields.${fieldName}`] = filters[key];
      }
    }
  }

  return query;
}
