import { Reel } from '../models/reel.model.js';
import { ReelEvent } from '../models/reelEvent.model.js';
import { Setting } from '../models/setting.model.js';
import { RECORD_STATUS, REEL_STATUS } from '../constants/reelStatus.js';
import { APPROVAL_STATUS } from '../constants/approvalStatus.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { env } from '../config/env.js';

/**
 * Get inventory tiles summary metrics (docs/routes/dashboard.md).
 * @param {{ actor: object }} args
 * @returns {Promise<object>}
 */
export async function getSummary({ actor }) {
  const settings = await Setting.findById('app').lean();
  const agingThresholdDays = settings?.aging_threshold_days || env.AGING_THRESHOLD_DAYS;
  const agingDate = new Date(Date.now() - agingThresholdDays * 24 * 60 * 60 * 1000);

  const [facetResults, pending_confirmations] = await Promise.all([
    Reel.aggregate([
      { $match: { record_status: RECORD_STATUS.ACTIVE } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total_reels: { $sum: 1 },
                weight_in_stock: { $sum: '$previous_weight' },
              },
            },
          ],
          by_status: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          unused_reels: [
            {
              $match: {
                status: { $ne: REEL_STATUS.NILL },
                last_activity_at: { $lte: agingDate },
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]),
    ReelEvent.countDocuments({ approval_status: APPROVAL_STATUS.PENDING }),
  ]);

  const facet = facetResults[0] || {};
  const total_reels = facet.totals?.[0]?.total_reels || 0;
  const rawWeight = facet.totals?.[0]?.weight_in_stock || 0;
  const weight_in_stock = Math.round(rawWeight * 100) / 100;
  const unused_reels = facet.unused_reels?.[0]?.count || 0;

  const byStatusMap = { REEL: 0, CUT: 0, NILL: 0 };
  if (facet.by_status) {
    for (const item of facet.by_status) {
      if (item._id && byStatusMap[item._id] !== undefined) {
        byStatusMap[item._id] = item.count;
      }
    }
  }

  return {
    total_reels,
    weight_in_stock,
    total_stock_value: Math.round(weight_in_stock * 55),
    pending_confirmations,
    unused_reels,
    aging_threshold_days: agingThresholdDays,
    by_status: byStatusMap,
  };
}

/**
 * Get 3-column status board items (docs/routes/dashboard.md).
 * @param {{ filters: { limit_per_column?: number, quality?: string, supplier?: string }, actor: object }} args
 * @returns {Promise<object>}
 */
export async function getStatusBoard({ filters = {}, actor }) {
  const limitPerColumn = Math.min(200, Math.max(1, parseInt(filters.limit_per_column, 10) || 50));
  const baseQuery = { record_status: RECORD_STATUS.ACTIVE };

  if (filters.quality) {
    baseQuery.quality = filters.quality.toUpperCase();
  }
  if (filters.supplier) {
    baseQuery.supplier_name = filters.supplier;
  }

  const [reelItems, cutItems, nillItems, reelCount, cutCount, nillCount] = await Promise.all([
    Reel.find({ ...baseQuery, status: REEL_STATUS.REEL }).sort({ created_at: -1, _id: -1 }).limit(limitPerColumn).lean(),
    Reel.find({ ...baseQuery, status: REEL_STATUS.CUT }).sort({ created_at: -1, _id: -1 }).limit(limitPerColumn).lean(),
    Reel.find({ ...baseQuery, status: REEL_STATUS.NILL }).sort({ created_at: -1, _id: -1 }).limit(limitPerColumn).lean(),
    Reel.countDocuments({ ...baseQuery, status: REEL_STATUS.REEL }),
    Reel.countDocuments({ ...baseQuery, status: REEL_STATUS.CUT }),
    Reel.countDocuments({ ...baseQuery, status: REEL_STATUS.NILL }),
  ]);

  const mapItem = (r) => ({
    id: r._id.toString(),
    reel_no: r.reel_no,
    quality: r.quality,
    supplier_name: r.supplier_name,
    previous_weight: r.previous_weight,
    gsm: r.gsm,
    size: r.size,
    approval_status: r.pending_count > 0 ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.CONFIRMED,
  });

  return {
    REEL: { count: reelCount, items: reelItems.map(mapItem) },
    CUT: { count: cutCount, items: cutItems.map(mapItem) },
    NILL: { count: nillCount, items: nillItems.map(mapItem) },
  };
}

/**
 * Get inventory weight breakdown by quality or supplier (docs/routes/dashboard.md).
 * @param {{ filters: { by: 'quality' | 'supplier' }, actor: object }} args
 * @returns {Promise<Array<object>>}
 */
export async function getBreakdown({ filters = {}, actor }) {
  if (filters.by === 'quality') {
    const results = await Reel.aggregate([
      { $match: { record_status: RECORD_STATUS.ACTIVE } },
      {
        $group: {
          _id: { quality: '$quality', bf: '$bf' },
          reel_count: { $sum: 1 },
          total_weight: { $sum: '$previous_weight' },
        },
      },
      { $sort: { reel_count: -1, total_weight: -1 } },
    ]);

    return results.map((r) => ({
      label: r._id.bf !== undefined && r._id.bf !== null ? `${r._id.quality || 'Unknown'} (${r._id.bf} BF)` : (r._id.quality || 'Unknown'),
      quality: r._id.quality,
      bf: r._id.bf,
      reel_count: r.reel_count,
      total_weight: Math.round((r.total_weight || 0) * 100) / 100,
    }));
  }

  const groupByField = '$supplier_name';

  const results = await Reel.aggregate([
    { $match: { record_status: RECORD_STATUS.ACTIVE } },
    {
      $group: {
        _id: groupByField,
        reel_count: { $sum: 1 },
        total_weight: { $sum: '$previous_weight' },
      },
    },
    { $sort: { total_weight: -1 } },
  ]);

  return results.map((r) => ({
    label: r._id || 'Unknown',
    supplier: r._id,
    reel_count: r.reel_count,
    total_weight: Math.round((r.total_weight || 0) * 100) / 100,
  }));
}

/**
 * Get aging dead stock reels list (docs/routes/dashboard.md).
 * @param {{ filters: { min_days?: number, page?: number, limit?: number }, actor: object }} args
 * @returns {Promise<{ items: Array<object>, meta: object }>}
 */
export async function getAging({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const settings = await Setting.findById('app').lean();
  const minDays = filters.min_days !== undefined ? Number(filters.min_days) : (settings?.aging_threshold_days || env.AGING_THRESHOLD_DAYS);

  const now = new Date();
  const agingThresholdDate = new Date(now.getTime() - minDays * 24 * 60 * 60 * 1000);

  const query = {
    record_status: RECORD_STATUS.ACTIVE,
    status: { $ne: REEL_STATUS.NILL },
    last_activity_at: { $lte: agingThresholdDate },
  };

  const [reels, total] = await Promise.all([
    Reel.find(query).sort({ last_activity_at: 1, _id: 1 }).skip(skip).limit(limit).lean(),
    Reel.countDocuments(query),
  ]);

  const items = reels.map((reel) => {
    const activityTime = new Date(reel.last_activity_at).getTime();
    const days_since_activity = Math.floor((now.getTime() - activityTime) / (1000 * 60 * 60 * 24));
    return {
      id: reel._id.toString(),
      reel_no: reel.reel_no,
      quality: reel.quality,
      supplier_name: reel.supplier_name,
      previous_weight: reel.previous_weight,
      status: reel.status,
      last_activity_at: reel.last_activity_at,
      days_since_activity,
    };
  });

  const meta = buildPaginationMeta({ page, limit, total });
  meta.min_days = minDays;

  return { items, meta };
}
