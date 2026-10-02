import { z } from 'zod';
import { paginationQuerySchema, idParamSchema, booleanString } from './common.validator.js';

export const listNotificationsSchema = z.object({
  query: paginationQuerySchema.extend({
    unread: booleanString,
  }),
});

export const markReadSchema = z.object({
  params: idParamSchema,
});
