import { z } from 'zod';
import { PO_STATUS } from '../constants/poStatus.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}(T.*)?$/;

export const poItemInputSchema = z.object({
  client_name: z.string().trim().min(1, 'Client Name is required').max(200),
  job_name: z.string().trim().min(1, 'Job Name is required').max(200),
  deckle: z.coerce.number().positive('Deckle must be greater than 0'),
  cutting: z.coerce.number().positive('Cutting must be greater than 0'),
  gsm: z.coerce.number().int().positive('GSM must be a positive whole number'),
  ordered_quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
});

export const createPurchaseOrderSchema = z.object({
  body: z.object({
    po_date: z.string().regex(dateRegex, 'PO Date must be YYYY-MM-DD').optional(),
    delivery_date: z.string().regex(dateRegex, 'Delivery Date must be YYYY-MM-DD'),
    payment_terms: z.string().trim().max(300).optional().default(''),
    supplier_name: z.string().trim().min(1, 'Supplier Name is required').max(200),
    contact_person: z.string().trim().max(200).optional().default(''),
    phone_email: z.string().trim().max(200).optional().default(''),
    notes: z.string().trim().max(2000).optional().default(''),
    items: z
      .array(poItemInputSchema)
      .min(1, 'At least 1 item is required in a Purchase Order')
      .max(20, 'Maximum 20 items allowed per Purchase Order'),
  }),
});

export const updatePurchaseOrderSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'PO ID is required'),
  }),
  body: z.object({
    po_date: z.string().regex(dateRegex, 'PO Date must be YYYY-MM-DD').optional(),
    delivery_date: z.string().regex(dateRegex, 'Delivery Date must be YYYY-MM-DD').optional(),
    payment_terms: z.string().trim().max(300).optional(),
    supplier_name: z.string().trim().min(1).max(200).optional(),
    contact_person: z.string().trim().max(200).optional(),
    phone_email: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(2000).optional(),
    items: z.array(poItemInputSchema).min(1).max(20).optional(),
  }),
});

export const rejectPurchaseOrderSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'PO ID is required'),
  }),
  body: z.object({
    rejection_reason: z
      .string()
      .trim()
      .min(3, 'Rejection reason must be at least 3 characters long')
      .max(1000),
  }),
});

export const cancelPurchaseOrderSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'PO ID is required'),
  }),
  body: z.object({
    cancellation_reason: z.string().trim().max(1000).optional().default('Cancelled by user'),
  }),
});

export const getPurchaseOrderSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'PO ID is required'),
  }),
});

export const listPurchaseOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(25),
    status: z.enum([...Object.values(PO_STATUS), 'ALL']).optional().default('ALL'),
    supplier: z.string().optional(),
    search: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    sort: z.string().optional().default('-created_at'),
  }),
});

