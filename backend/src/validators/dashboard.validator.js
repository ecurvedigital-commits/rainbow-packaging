import { z } from 'zod';
import { paginationQuerySchema } from './common.validator.js';

export const getStatusBoardSchema = z.object({
  query: z.object({
    limit_per_column: z.coerce.number().int().positive().max(200).default(50),
    quality: z.string().optional(),
    supplier: z.string().optional(),
  }).passthrough(),
});

export const getBreakdownSchema = z.object({
  query: z.object({
    by: z.enum(['quality', 'supplier']),
  }),
});

export const getAgingSchema = z.object({
  query: paginationQuerySchema.extend({
    min_days: z.coerce.number().int().positive().optional(),
  }),
});
