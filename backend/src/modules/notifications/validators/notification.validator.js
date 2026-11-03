import { z } from 'zod';
import { paginationQuerySchema, idParamSchema, booleanString } from '../../../core/validators/common.validator.js';

export const listNotificationsSchema = z.object({
  query: paginationQuerySchema.extend({
    unread: booleanString,
    module: z.enum(['reels', 'sheets', 'finished-boxes', 'general', 'all']).optional(),
  }),
});

export const markReadSchema = z.object({
  params: idParamSchema,
});

export const getNotificationSchema = z.object({
  params: idParamSchema,
});

