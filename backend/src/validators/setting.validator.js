import { z } from 'zod';

export const updateSettingsSchema = z.object({
  body: z.object({
    aging_threshold_days: z.number().int().min(1).max(365).optional(),
    digest: z.object({
      enabled: z.boolean().optional(),
      time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm 24-hour format').optional(),
      timezone: z.string().optional(),
    }).optional(),
  }),
});
