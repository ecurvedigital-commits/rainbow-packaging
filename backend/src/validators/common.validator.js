import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export function sortQuery(allowedFields) {
  return z.string().refine((val) => {
    const field = val.startsWith('-') ? val.substring(1) : val;
    return allowedFields.includes(field) || field.startsWith('cf.');
  }, {
    message: 'Invalid sort field',
  }).optional();
}

export function csvList(itemSchema) {
  return z.union([z.string(), z.array(z.string())]).transform((val) => {
    if (Array.isArray(val)) return val;
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }).pipe(z.array(itemSchema)).optional();
}

export const booleanString = z.enum(['true', 'false']).transform((val) => val === 'true').optional();

export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const idParamSchema = z.object({
  id: objectIdSchema,
});
