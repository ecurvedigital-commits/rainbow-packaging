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

  // Field-targeted or global multi-field search
  if (filters.q) {
    const term = String(filters.q).trim();
    const regex = new RegExp(term, 'i');
    const num = Number(term);
    const hasNum = !isNaN(num) && term !== '';

    const targetField = String(filters.search_field || 'all').toLowerCase();

    if (targetField === 'reel_no') {
      query.reel_no = regex;
    } else if (targetField === 'master_code') {
      query.$or = [{ master_code: regex }, { master_key: regex }];
    } else if (targetField === 'quality') {
      query.quality = regex;
    } else if (targetField === 'supplier' || targetField === 'supplier_name') {
      query.supplier_name = regex;
    } else if (targetField === 'mill' || targetField === 'mill_name') {
      query.mill_name = regex;
    } else if (targetField === 'gsm') {
      query.gsm = hasNum ? num : regex;
    } else if (targetField === 'bf') {
      query.bf = hasNum ? { $in: [num, String(num), `${num}BF`, `${num} BF`] } : regex;
    } else if (targetField === 'size') {
      query.size = hasNum ? num : regex;
    } else if (targetField === 'weight') {
      query.$or = hasNum ? [{ previous_weight: num }, { max_weight: num }] : [{ previous_weight: regex }];
    } else if (targetField === 'consumed') {
      if (hasNum) {
        query.$expr = { $eq: [{ $subtract: ['$max_weight', '$previous_weight'] }, num] };
      }
    } else if (targetField === 'station') {
      query.stations_used = regex;
    } else if (targetField === 'status') {
      query.status = regex;
    } else {
      // 'all' fields search across all specifications
      const orConditions = [
        { reel_no: regex },
        { master_code: regex },
        { master_key: regex },
        { quality: regex },
        { supplier_name: regex },
        { mill_name: regex },
        { stations_used: regex },
        { status: regex },
        { bf: regex },
      ];
      if (hasNum) {
        orConditions.push({ gsm: num });
        orConditions.push({ bf: num });
        orConditions.push({ size: num });
        orConditions.push({ previous_weight: num });
        orConditions.push({ max_weight: num });
      }
      query.$or = orConditions;
    }
  }

  // Consumed Filter (Unused, Partially Consumed, Fully Consumed/Depleted)
  if (filters.consumption) {
    const cVal = String(filters.consumption).toUpperCase();
    if (cVal.includes('UNUSED') || cVal.includes('FRESH')) {
      query.$expr = { $gte: ['$previous_weight', '$max_weight'] };
    } else if (cVal.includes('PARTIAL') || cVal.includes('CUT')) {
      query.$expr = {
        $and: [
          { $lt: ['$previous_weight', '$max_weight'] },
          { $gt: ['$previous_weight', 0] },
        ]
      };
    } else if (cVal.includes('DEPLETED') || cVal.includes('NILL') || cVal.includes('FULL')) {
      query.$or = [
        { status: 'NILL' },
        { previous_weight: { $lte: 0 } },
      ];
    }
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



  // Master Code ID filter
  if (filters.master_code_id) {
    query.master_code_id = filters.master_code_id;
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

  // Bursting Factor (BF) — supports comma-separated multi-select (numbers like 18 or text strings like 18BF, ULTRA)
  if (filters.bf !== undefined && filters.bf !== '') {
    const rawValues = String(filters.bf).split(',').map((v) => v.trim()).filter(Boolean);
    const expanded = [];
    rawValues.forEach((val) => {
      expanded.push(val);
      const numMatch = val.match(/^(\d+)(?:\s*BF)?$/i);
      if (numMatch) {
        const n = Number(numMatch[1]);
        expanded.push(n);
        expanded.push(String(n));
        expanded.push(`${n}BF`);
        expanded.push(`${n} BF`);
      } else if (!isNaN(Number(val))) {
        const n = Number(val);
        expanded.push(n);
        expanded.push(String(n));
        expanded.push(`${n}BF`);
        expanded.push(`${n} BF`);
      } else {
        expanded.push(new RegExp(`^${val}$`, 'i'));
      }
    });
    const uniqueExpanded = Array.from(new Set(expanded));
    if (uniqueExpanded.length === 1) {
      query.bf = uniqueExpanded[0];
    } else {
      query.bf = { $in: uniqueExpanded };
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

  // Mill Name exact match (comma-separated) or substring match
  if (filters.mill_name) {
    const mills = Array.isArray(filters.mill_name)
      ? filters.mill_name
      : String(filters.mill_name).split(',').map((s) => s.trim()).filter(Boolean);
    if (mills.length === 1) {
      query.mill_name = mills[0];
    } else if (mills.length > 1) {
      query.mill_name = { $in: mills };
    }
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

  // Purchase date / Creation date range
  const dateFrom = filters.purchase_date_from || filters.created_from;
  const dateTo = filters.purchase_date_to || filters.created_to;
  if (dateFrom || dateTo) {
    query.purchase_date = {};
    if (dateFrom) {
      query.purchase_date.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      query.purchase_date.$lte = toDate;
    }
  }

  // NOTE: consumed_date_from/to are resolved in reel.service listReels via usage events.

  // Aging reels threshold (last_activity_at <= now - aging_days)
  const agingDays = filters.aging_days || filters.aging;
  if (agingDays !== undefined && agingDays !== '') {
    const days = Number(agingDays);
    if (!isNaN(days) && days > 0) {
      const agingCutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      query.last_activity_at = { $lte: agingCutoff };
      if (!query.status) {
        query.status = { $ne: 'NILL' };
      }
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
      if (fieldName.endsWith('_exists')) {
        const realKey = `custom_fields.${fieldName.substring(0, fieldName.length - 7)}`;
        if (String(filters[key]).toLowerCase() === 'true') {
          query[realKey] = { $exists: true, $nin: ['', null] };
        } else {
          query[realKey] = { $in: [null, ''] };
        }
      } else if (fieldName.endsWith('_min')) {
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
