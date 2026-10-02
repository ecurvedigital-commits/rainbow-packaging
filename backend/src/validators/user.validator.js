import { z } from 'zod';
import { ROLES } from '../constants/roles.js';
import { idParamSchema, paginationQuerySchema, sortQuery, booleanString } from './common.validator.js';

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).trim(),
    username: z.string().min(3).max(30).regex(/^[a-z0-9._-]+$/, 'Username must be lowercase alphanumeric and ._-').trim(),
    role: z.enum([ROLES.SUPERVISOR, ROLES.OPERATOR], {
      errorMap: () => ({ message: 'Role must be SUPERVISOR or OPERATOR' }),
    }),
    email: z.string().email().optional().nullable(),
    phone: z.string().regex(/^\d{10,15}$/, 'Phone must be 10-15 digits').optional().nullable(),
    password: z.string().min(8).optional(),
  }),
});

export const listUsersSchema = z.object({
  query: paginationQuerySchema.extend({
    role: z.string().optional(),
    is_active: booleanString,
    q: z.string().optional(),
    sort: sortQuery(['name', 'username', 'role', 'created_at', 'last_login_at']),
  }),
});

export const getUserSchema = z.object({
  params: idParamSchema,
});

export const updateUserSchema = z.object({
  params: idParamSchema,
  body: z.object({
    name: z.string().min(2).max(80).trim().optional(),
    username: z.string().min(3).max(30).regex(/^[a-z0-9._-]+$/, 'Username must be lowercase alphanumeric and ._-').trim().optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().regex(/^\d{10,15}$/, 'Phone must be 10-15 digits').optional().nullable(),
    role: z.enum([ROLES.SUPERVISOR, ROLES.OPERATOR, ROLES.ADMIN]).optional(),
    password: z.string().min(6).optional(),
    is_active: z.boolean().optional(),
  }),
});


export const setUserStatusSchema = z.object({
  params: idParamSchema,
  body: z.object({
    is_active: z.boolean(),
  }),
});

export const resetUserPasswordSchema = z.object({
  params: idParamSchema,
  body: z.object({
    password: z.string().min(8).optional(),
  }).optional().default({}),
});

export const unlockUserSchema = z.object({
  params: idParamSchema,
});
