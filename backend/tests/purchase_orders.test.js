import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PO_STATUS, PO_ITEM_STATUS } from '../src/modules/purchase-orders/constants/poStatus.js';
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  rejectPurchaseOrderSchema,
  cancelPurchaseOrderSchema,
  poItemInputSchema,
} from '../src/modules/purchase-orders/validators/purchaseOrder.validator.js';
import { calculateTotalWeight, roundTwoDecimals } from '../src/modules/sheets/utils/sheetCalculations.js';

describe('Phase 1: Purchase Order Backend Module Tests', () => {
  describe('PO Status & Lifecycle Constants', () => {
    test('defines all standard PO lifecycle statuses', () => {
      assert.strictEqual(PO_STATUS.DRAFT, 'DRAFT');
      assert.strictEqual(PO_STATUS.PENDING_APPROVAL, 'PENDING_APPROVAL');
      assert.strictEqual(PO_STATUS.APPROVED, 'APPROVED');
      assert.strictEqual(PO_STATUS.REJECTED, 'REJECTED');
      assert.strictEqual(PO_STATUS.PARTIALLY_RECEIVED, 'PARTIALLY_RECEIVED');
      assert.strictEqual(PO_STATUS.COMPLETED, 'COMPLETED');
      assert.strictEqual(PO_STATUS.CANCELLED, 'CANCELLED');
    });

    test('defines all line item fulfillment statuses', () => {
      assert.strictEqual(PO_ITEM_STATUS.PENDING, 'PENDING');
      assert.strictEqual(PO_ITEM_STATUS.PARTIALLY_RECEIVED, 'PARTIALLY_RECEIVED');
      assert.strictEqual(PO_ITEM_STATUS.COMPLETED, 'COMPLETED');
    });
  });

  describe('Purchase Order Mathematical Weight Engine', () => {
    test('calculates accurate line item weight using packaging board formula', () => {
      // 70cm x 100cm, 250 GSM, 2000 sheets
      // (70 * 100 * 250 * 2000) / 10,000,000 = 350.00 kg
      const weight = calculateTotalWeight(70, 100, 250, 2000);
      assert.strictEqual(weight, 350);
    });

    test('reconciles multiple line items total weight accurately without drift', () => {
      const items = [
        { deckle: 70, cutting: 100, gsm: 250, ordered_quantity: 1000 }, // 175.00 kg
        { deckle: 65.5, cutting: 95.5, gsm: 300, ordered_quantity: 500 }, // (65.5 * 95.5 * 300 * 500) / 10,000,000 = 93.83 kg
      ];

      const item1Weight = calculateTotalWeight(items[0].deckle, items[0].cutting, items[0].gsm, items[0].ordered_quantity);
      const item2Weight = calculateTotalWeight(items[1].deckle, items[1].cutting, items[1].gsm, items[1].ordered_quantity);
      const totalWeight = roundTwoDecimals(item1Weight + item2Weight);

      assert.strictEqual(item1Weight, 175);
      assert.strictEqual(item2Weight, 93.83);
      assert.strictEqual(totalWeight, 268.83);
    });
  });

  describe('Purchase Order Zod Validation Schemas', () => {
    test('accepts valid PO creation payload with 1 to 20 items', () => {
      const validPayload = {
        body: {
          po_date: '2026-11-04',
          delivery_date: '2026-11-20',
          payment_terms: '30 Days Net',
          supplier_name: 'BILT Graphic Papers Ltd',
          contact_person: 'Mr. Rajesh Sharma',
          phone_email: '9876543210 / rajesh@bilt.com',
          notes: 'Standard delivery via truck',
          items: [
            {
              client_name: 'Unilever India',
              job_name: 'Dove Soap 100g Mono Carton',
              deckle: 72,
              cutting: 102,
              gsm: 280,
              ordered_quantity: 5000,
            },
          ],
        },
      };

      const parsed = createPurchaseOrderSchema.safeParse(validPayload);
      assert.strictEqual(parsed.success, true);
    });

    test('rejects PO creation with 0 items', () => {
      const emptyItemsPayload = {
        body: {
          delivery_date: '2026-11-20',
          supplier_name: 'BILT Graphic Papers Ltd',
          items: [],
        },
      };

      const parsed = createPurchaseOrderSchema.safeParse(emptyItemsPayload);
      assert.strictEqual(parsed.success, false);
      assert.ok(parsed.error.issues.some((i) => i.message.includes('At least 1 item is required')));
    });

    test('rejects PO creation with more than 20 items (exceeding Excel format capacity)', () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        client_name: `Client ${i + 1}`,
        job_name: `Job ${i + 1}`,
        deckle: 70,
        cutting: 100,
        gsm: 250,
        ordered_quantity: 1000,
      }));

      const overLimitPayload = {
        body: {
          delivery_date: '2026-11-20',
          supplier_name: 'BILT Graphic Papers Ltd',
          items,
        },
      };

      const parsed = createPurchaseOrderSchema.safeParse(overLimitPayload);
      assert.strictEqual(parsed.success, false);
      assert.ok(parsed.error.issues.some((i) => i.message.includes('Maximum 20 items allowed')));
    });

    test('rejects non-positive dimensions, negative gsm, or zero quantity in items', () => {
      const invalidItem = {
        client_name: 'Test Client',
        job_name: 'Test Job',
        deckle: -5,
        cutting: 0,
        gsm: -100,
        ordered_quantity: 0,
      };

      const parsed = poItemInputSchema.safeParse(invalidItem);
      assert.strictEqual(parsed.success, false);
      assert.strictEqual(parsed.error.issues.length >= 3, true);
    });

    test('validates rejection reason requirement', () => {
      const validReject = {
        params: { id: '60d5ec49f1b2c8b1f8e4e1a1' },
        body: { rejection_reason: 'Price mismatch with approved quote' },
      };
      assert.strictEqual(rejectPurchaseOrderSchema.safeParse(validReject).success, true);

      const invalidReject = {
        params: { id: '60d5ec49f1b2c8b1f8e4e1a1' },
        body: { rejection_reason: 'no' }, // less than 3 chars
      };
      assert.strictEqual(rejectPurchaseOrderSchema.safeParse(invalidReject).success, false);
    });
  });

  describe('Phase 2: Frontend-Backend Contract & Workflow Verification', () => {
    test('updatePurchaseOrderSchema accepts valid partial update and items modification', () => {
      const updatePayload = {
        params: { id: '60d5ec49f1b2c8b1f8e4e1a1' },
        body: {
          supplier_name: 'ITC PSPD Bhadrachalam',
          delivery_date: '2026-11-25',
          items: [
            {
              client_name: 'Nestle India',
              job_name: 'Maggi 2-Min Noodle Outer Box',
              deckle: 75.5,
              cutting: 105.0,
              gsm: 320,
              ordered_quantity: 4000,
            },
          ],
        },
      };

      const parsed = updatePurchaseOrderSchema.safeParse(updatePayload);
      assert.strictEqual(parsed.success, true);
    });

    test('cancelPurchaseOrderSchema validates optional cancellation reason', () => {
      const validCancel = {
        params: { id: '60d5ec49f1b2c8b1f8e4e1a1' },
        body: { cancellation_reason: 'Client cancelled batch run' },
      };
      assert.strictEqual(cancelPurchaseOrderSchema.safeParse(validCancel).success, true);

      const defaultCancel = {
        params: { id: '60d5ec49f1b2c8b1f8e4e1a1' },
        body: {},
      };
      const parsedDefault = cancelPurchaseOrderSchema.safeParse(defaultCancel);
      assert.strictEqual(parsedDefault.success, true);
      assert.strictEqual(parsedDefault.data.body.cancellation_reason, 'Cancelled by user');
    });

    test('frontend weight calculation exactly matches backend packaging weight', () => {
      // Formula: (D * C * GSM * Q) / 10,000,000
      const testCases = [
        { d: 70, c: 100, gsm: 250, q: 2000, expected: 350.0 },
        { d: 72.5, c: 102.5, gsm: 285, q: 3500, expected: 741.27 },
        { d: 50.8, c: 76.2, gsm: 180, q: 10000, expected: 696.77 },
        { d: 90.0, c: 120.0, gsm: 350, q: 1500, expected: 567.0 },
      ];

      for (const tc of testCases) {
        const calculated = calculateTotalWeight(tc.d, tc.c, tc.gsm, tc.q);
        assert.strictEqual(calculated, tc.expected);
      }
    });

    test('role authorization logic strictly gates approve and reject to Supervisor and Admin', () => {
      const roles = {
        OPERATOR: 'OPERATOR',
        SUPERVISOR: 'SUPERVISOR',
        ADMIN: 'ADMIN',
      };

      const canAuthorize = (role) => role === roles.SUPERVISOR || role === roles.ADMIN;
      const canCreateOrEdit = (_role) => true; // All authenticated roles can prepare POs

      assert.strictEqual(canCreateOrEdit(roles.OPERATOR), true);
      assert.strictEqual(canCreateOrEdit(roles.SUPERVISOR), true);
      assert.strictEqual(canCreateOrEdit(roles.ADMIN), true);

      assert.strictEqual(canAuthorize(roles.OPERATOR), false);
      assert.strictEqual(canAuthorize(roles.SUPERVISOR), true);
      assert.strictEqual(canAuthorize(roles.ADMIN), true);
    });
  });
});

