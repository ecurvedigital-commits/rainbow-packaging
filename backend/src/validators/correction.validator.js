import { z } from 'zod';
import { paginationQuerySchema, idParamSchema, objectIdSchema } from './common.validator.js';
import { CORRECTION_CATEGORIES, CORRECTION_STATUS } from '../constants/notificationTypes.js';

export const createCorrectionSchema = z.object({
  body: z.object({
    reel_id: objectIdSchema.optional(),
    reel_no: z.string().trim().optional(),
    category: z.enum(CORRECTION_CATEGORIES).optional().default('OTHER'),
    message: z.string().min(1, 'Correction reason/note is required').trim(),
    requested_changes: z.object({
      previous_weight: z.coerce.number().min(0).optional(),
      max_weight: z.coerce.number().positive().optional(),
      reel_no: z.string().trim().optional(),
      quality: z.string().trim().optional(),
      gsm: z.coerce.number().positive().optional(),
      bf: z.any().optional(),
      size: z.coerce.number().positive().optional(),
      supplier_name: z.string().trim().optional(),
      mill_name: z.string().trim().optional(),
      master_code: z.string().trim().optional(),
      master_code_id: z.string().trim().optional(),
      master_code_name: z.string().trim().optional(),
    }).optional().default({}),
  }),
});

export const listCorrectionsSchema = z.object({
  query: paginationQuerySchema.extend({
    status: z.enum(['PENDING', 'RESOLVED', 'REJECTED', 'ALL']).optional(),
    reel_no: z.string().trim().optional(),
  }),
});

export const getCorrectionSchema = z.object({
  params: idParamSchema,
});

export const resolveCorrectionSchema = z.object({
  params: idParamSchema,
  body: z.object({
    changes: z.record(z.any()).optional().default({}),
    reason: z.string().trim().optional(),
    resolution_note: z.string().trim().optional(),
  }).optional().default({}),
});

export const rejectCorrectionSchema = z.object({
  params: idParamSchema,
  body: z.object({
    reason: z.string().min(1, 'Decline reason is required').trim(),
  }),
});
