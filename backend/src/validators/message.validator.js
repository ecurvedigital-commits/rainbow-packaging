import { z } from 'zod';
import { paginationQuerySchema, idParamSchema, objectIdSchema } from './common.validator.js';

const reelAttachmentSchema = z.object({
  reel_id: objectIdSchema.optional(),
  reel_no: z.string().trim().optional(),
  master_code_id: z.string().optional().nullable(),
  master_code: z.string().trim().optional().nullable(),
  master_code_name: z.string().trim().optional().nullable(),
  quality: z.string().optional().nullable(),
  gsm: z.any().optional().nullable(),
  bf: z.any().optional().nullable(),
  size: z.coerce.number().optional().nullable(),
}).passthrough();

export const sendMessageSchema = z.object({
  body: z.object({
    recipient_ids: z.array(objectIdSchema).min(1, 'Please select at least one recipient'),
    subject: z.string().trim().optional().default(''),
    body: z.string().min(1, 'Message body cannot be empty').trim(),
    reels: z.array(reelAttachmentSchema).optional().default([]),
    kind: z.enum(['MESSAGE', 'CORRECTION']).optional().default('MESSAGE'),
    correction_request_id: objectIdSchema.optional().nullable(),
    reply_to: objectIdSchema.optional().nullable(),
  }),
});

export const listMessagesSchema = z.object({
  query: paginationQuerySchema.extend({
    box: z.enum(['inbox', 'sent']).optional().default('inbox'),
  }),
});

export const getMessageSchema = z.object({
  params: idParamSchema,
});
