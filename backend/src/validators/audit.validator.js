import { z } from 'zod';
import { paginationQuerySchema, dateOnlySchema, objectIdSchema } from './common.validator.js';

export const listAuditEventsSchema = z.object({
  query: paginationQuerySchema.extend({
    date: dateOnlySchema.optional(),
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    event_type: z.string().optional(),
    action: z.string().optional(),
    approval_status: z.enum(['PENDING', 'CONFIRMED', 'DECLINED']).optional(),
    performed_by: z.string().optional(),
    user: z.string().optional(),
    reel_no: z.string().optional(),
  }),
});

export const getAuditEventByIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});
