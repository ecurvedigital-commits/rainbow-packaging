import { z } from 'zod';
import { QUALITIES } from '../constants/qualities.js';

export const listMasterProductsSchema = z.object({
  query: z
    .object({
      q: z.string().trim().optional(),
      quality: z.string().optional(),
      is_active: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .passthrough(),
});

export const previewMasterKeySchema = z.object({
  body: z.object({
    quality: z.enum(QUALITIES, {
      required_error: 'Quality is required',
      invalid_type_error: `Quality must be one of: ${QUALITIES.join(', ')}`,
    }),
    gsm: z.coerce.number().int().positive('GSM must be a positive integer'),
    bf: z.coerce.number().int().positive('BF must be a positive integer'),
    size: z.coerce.number().positive('Size must be a positive number'),
  }),
});

export const updateMasterProductStatusSchema = z.object({
  params: z.object({
    id: z.string().length(24, 'Invalid Master Product ID format'),
  }),
  body: z.object({
    is_active: z.boolean({ required_error: 'is_active is required' }),
  }),
});
