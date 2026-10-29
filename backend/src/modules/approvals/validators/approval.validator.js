import { z } from 'zod';
import { paginationQuerySchema, objectIdSchema } from '../../../core/validators/common.validator.js';

export const listPendingApprovalsSchema = z.object({
  query: paginationQuerySchema.extend({
    event_type: z.string().optional(),
    performed_by: objectIdSchema.optional(),
    q: z.string().optional(),
    sort: z.string().optional(),
  }),
});

export const listMyEntriesSchema = z.object({
  query: paginationQuerySchema.extend({
    status: z.enum(['PENDING', 'CONFIRMED', 'DECLINED']).optional(),
    event_type: z.string().optional(),
    q: z.string().optional(),
    sort: z.string().optional(),
  }),
});

export const confirmEntrySchema = z.object({
  params: z.object({
    eventId: objectIdSchema,
  }),
});

export const declineEntrySchema = z.object({
  params: z.object({
    eventId: objectIdSchema,
  }),
  body: z.object({
    reason: z.string().max(300).optional(),
  }).optional().default({}),
});

export const bulkConfirmSchema = z.object({
  body: z.object({
    event_ids: z.array(objectIdSchema).min(1, 'At least one event ID is required'),
  }),
});

export const bulkDeclineSchema = z.object({
  body: z.object({
    event_ids: z.array(objectIdSchema).min(1, 'At least one event ID is required'),
    reason: z.string().max(300).optional().default('Bulk declined by supervisor/admin'),
  }),
});

