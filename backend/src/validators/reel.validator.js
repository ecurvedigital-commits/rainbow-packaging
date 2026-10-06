import { z } from 'zod';
import { QUALITIES } from '../constants/qualities.js';
import { STATIONS } from '../constants/stations.js';
import { idParamSchema, paginationQuerySchema, sortQuery, booleanString, dateOnlySchema } from './common.validator.js';

export const listReelsSchema = z.object({
  query: paginationQuerySchema.extend({
    q: z.string().optional(),
    status: z.string().optional(),
    quality: z.string().optional(),
    supplier: z.string().optional(),
    supplier_q: z.string().optional(),
    mill_name: z.string().optional(),
    gsm_min: z.coerce.number().optional(),
    gsm_max: z.coerce.number().optional(),
    size_min: z.coerce.number().optional(),
    size_max: z.coerce.number().optional(),
    weight_min: z.coerce.number().optional(),
    weight_max: z.coerce.number().optional(),
    purchase_date_from: dateOnlySchema.optional(),
    purchase_date_to: dateOnlySchema.optional(),
    station: z.string().optional(),
    approval_status: z.enum(['PENDING', 'CONFIRMED']).optional(),
    include_voided: booleanString,
    sort: sortQuery(['sr_no', 'reel_no', 'status', 'quality', 'supplier_name', 'mill_name', 'purchase_date', 'gsm', 'size', 'previous_weight', 'last_activity_at']),
  }).passthrough(),
});

export const searchReelsSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query must have at least 1 character').trim(),
    page: z.coerce.number().int().positive('Page must be a positive integer').optional().default(1),
    limit: z.coerce.number().int().positive('Limit must be a positive integer').max(50, 'Limit cannot exceed 50').default(10),
  }),
});

export const getReelSchema = z.object({
  params: idParamSchema,
});

export const getReelJourneySchema = z.object({
  params: idParamSchema,
  query: paginationQuerySchema,
});

export const createReelSchema = z.object({
  body: z.object({
    reel_no: z.string().min(1, 'Reel number is required').trim(),
    quality: z.string().min(1, 'Quality is required').trim(),
    bf: z.union([z.string().min(1, 'BF is required'), z.number()]).transform((v) => {
      if (typeof v === 'number') return v;
      const s = String(v).trim();
      const n = Number(s);
      return !isNaN(n) && s !== '' ? n : s;
    }),
    purchase_date: dateOnlySchema.optional().default(() => new Date().toISOString().slice(0, 10)),
    supplier_name: z.string().trim().optional().default('Self / Stock'),
    mill_name: z.string().trim().optional().default(''),
    size: z.coerce.number().positive(),
    gsm: z.coerce.number().positive(),
    rate_per_kg: z.coerce.number().min(0).optional().default(0),
    max_weight: z.coerce.number().positive(),
    master_code: z.string().optional(),
    master_code_id: z.string().optional(),
    custom_fields: z.record(z.any()).optional().default({}),
  }),
});

export const bulkCreateReelSchema = z.object({
  body: z.array(createReelSchema.shape.body).min(1, 'At least one reel is required').max(1000, 'Maximum 1000 reels at once'),
});

export const recordUsageSchema = z.object({
  params: idParamSchema,
  body: z.object({
    station: z.enum(STATIONS),
    current_weight_entered: z.coerce.number().min(0),
    expected_previous_weight: z.coerce.number().optional(),
  }),
});

export const updateReelSchema = z.object({
  params: idParamSchema,
  body: z.object({
    reel_no: z.string().trim().optional(),
    quality: z.string().trim().optional(),
    bf: z.union([z.string(), z.number()]).transform((v) => {
      if (typeof v === 'number') return v;
      const s = String(v).trim();
      const n = Number(s);
      return !isNaN(n) && s !== '' ? n : s;
    }).optional(),
    purchase_date: dateOnlySchema.optional(),
    supplier_name: z.string().trim().optional(),
    mill_name: z.string().trim().optional(),
    size: z.coerce.number().positive().optional(),
    gsm: z.coerce.number().positive().optional(),
    max_weight: z.coerce.number().positive().optional(),
    previous_weight: z.coerce.number().min(0).optional(),
    station: z.string().trim().optional(),
    master_code: z.string().trim().optional(),
    master_code_id: z.string().trim().optional(),
    custom_fields: z.record(z.any()).optional(),
    reason: z.string().optional(),
    correction_reason: z.string().optional(),
  }),
});

export const voidReelSchema = z.object({
  params: idParamSchema,
  body: z.object({
    reason: z.string().min(1, 'Reason for voiding is required'),
  }),
});
