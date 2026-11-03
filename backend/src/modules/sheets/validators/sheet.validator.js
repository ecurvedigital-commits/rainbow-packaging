import { z } from 'zod';

export const listSheetsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    sort: z.string().optional(),
    party_name: z.string().optional(),
    job_name: z.string().optional(),
    quality: z.string().optional(),
    gsm: z.union([z.coerce.number(), z.string()]).optional(),
    deckle: z.union([z.coerce.number(), z.string()]).optional(),
    cutting: z.union([z.coerce.number(), z.string()]).optional(),
    status: z.string().optional(),
    consumption: z.string().optional(),
    record_status: z.string().optional(),
    q: z.string().optional(),
    search_field: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
  }),
});

export const createSheetSchema = z.object({
  body: z.object({
    party_name: z.string().min(1, 'Party Name is required.').trim(),
    job_name: z.string().optional().default(''),
    quality: z.string().min(1, 'Board Quality is required.').trim(),
    deckle: z.coerce.number().positive('Deckle must be positive.'),
    cutting: z.coerce.number().positive('Cutting must be positive.'),
    gsm: z.coerce.number().positive('GSM must be positive.'),
    quantity: z.coerce.number().int().positive('Quantity must be a positive whole number.'),
    lot_no: z.string().optional(),
    supplier_name: z.string().optional(),
    received_date: z.string().optional(),
    notes: z.string().optional(),
    custom_fields: z.record(z.any()).optional(),
  }),
});

export const updateSheetSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    party_name: z.string().optional(),
    job_name: z.string().optional(),
    quality: z.string().optional(),
    deckle: z.coerce.number().positive().optional(),
    cutting: z.coerce.number().positive().optional(),
    gsm: z.coerce.number().positive().optional(),
    supplier_name: z.string().optional(),
    lot_no: z.string().optional(),
    notes: z.string().optional(),
    reason: z.string().optional(),
  }),
});

export const recordSheetUsageSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    consumed_quantity: z.coerce.number().int().positive('Consumed quantity must be positive.'),
    station: z.string().optional(),
    job_card_no: z.string().optional(),
    notes: z.string().optional(),
    expected_current_quantity: z.coerce.number().optional(),
  }),
});

export const adjustSheetStockSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    new_quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative.'),
    reason: z.string().min(1, 'Reason for adjustment is mandatory.').trim(),
  }),
});

export const returnSheetStockSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    returned_quantity: z.coerce.number().int().positive('Returned quantity must be positive.'),
    reason: z.string().optional(),
  }),
});

export const voidSheetSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    reason: z.string().optional(),
  }),
});

export const importExcelSchema = z.object({
  body: z.object({
    records: z.array(
      z.object({
        source_sno: z.coerce.number().optional(),
        party_name: z.string().min(1),
        job_name: z.string().optional().default(''),
        quality: z.string().min(1),
        deckle: z.coerce.number().positive(),
        cutting: z.coerce.number().positive(),
        gsm: z.coerce.number().positive(),
        quantity: z.coerce.number().int().positive(),
        excel_weight: z.coerce.number().optional(),
      })
    ).min(1, 'At least one record is required for import.'),
    force: z.boolean().optional().default(false),
    effectiveDate: z.string().optional(),
    importSource: z.string().optional().default('board-stock-sheet.xlsx'),
  }),
});

export const listSheetHistoryQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    q: z.string().optional(),
    event_type: z.string().optional(),
    party_name: z.string().optional(),
    sr_no: z.coerce.number().optional(),
    sheet_id: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
  }),
});
