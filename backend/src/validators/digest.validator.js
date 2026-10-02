import { z } from 'zod';
import { paginationQuerySchema, dateOnlySchema } from './common.validator.js';

export const previewDigestSchema = z.object({
  query: z.object({
    date: dateOnlySchema.optional(),
  }),
});

export const sendDigestSchema = z.object({
  body: z.object({
    date: dateOnlySchema.optional(),
    force: z.boolean().optional().default(false),
  }).optional().default({}),
});

export const listDigestLogsSchema = z.object({
  query: paginationQuerySchema,
});
