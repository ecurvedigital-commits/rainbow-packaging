import { z } from 'zod';
import { FIELD_TYPES } from '../constants/fieldTypes.js';
import { idParamSchema } from './common.validator.js';

export const listFieldDefinitionsSchema = z.object({
  query: z.object({
    active: z.enum(['true', 'false', 'all']).default('true'),
  }),
});

export const createFieldDefinitionSchema = z.object({
  body: z.object({
    label: z.string().min(2).max(60).trim(),
    type: z.enum([FIELD_TYPES.TEXT, FIELD_TYPES.NUMBER]),
    key: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/, 'Key must be snake_case 2-40 chars starting with a letter').optional(),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional().default([]),
  }),
});

export const updateFieldDefinitionSchema = z.object({
  params: idParamSchema,
  body: z.object({
    label: z.string().min(2).max(60).trim().optional(),
    required: z.boolean().optional(),
    order: z.number().int().optional(),
    is_active: z.boolean().optional(),
    options: z.array(z.string()).optional(),
    key: z.undefined({ invalid_type_error: 'Field key cannot be changed' }),
    type: z.undefined({ invalid_type_error: 'Field type cannot be changed' }),
  }),
});
