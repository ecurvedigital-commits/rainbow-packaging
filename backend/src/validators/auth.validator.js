import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required').trim(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshSchema = z.object({});

export const changePasswordSchema = z.object({
  body: z.object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'New password must be at least 8 characters'),
  }).refine((data) => data.current_password !== data.new_password, {
    message: 'New password must differ from current password',
    path: ['new_password'],
  }),
});
