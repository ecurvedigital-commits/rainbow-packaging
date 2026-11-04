import mongoose from 'mongoose';
import { PO_STATUS, PO_ITEM_STATUS } from '../constants/poStatus.js';
import { roundTwoDecimals } from '../../sheets/utils/sheetCalculations.js';

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    sr_no: { type: Number, required: true },
    client_name: { type: String, required: true, trim: true },
    job_name: { type: String, required: true, trim: true },
    deckle: { type: Number, required: true, min: 0.1, set: roundTwoDecimals },
    cutting: { type: Number, required: true, min: 0.1, set: roundTwoDecimals },
    gsm: { type: Number, required: true, min: 1 },
    ordered_quantity: { type: Number, required: true, min: 1 },
    ordered_weight: { type: Number, required: true, min: 0, set: roundTwoDecimals },
    received_quantity: { type: Number, default: 0, min: 0 },
    received_weight: { type: Number, default: 0, min: 0, set: roundTwoDecimals },
    status: {
      type: String,
      enum: Object.values(PO_ITEM_STATUS),
      default: PO_ITEM_STATUS.PENDING,
    },
  },
  { _id: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    sr_no: { type: Number, required: true, unique: true, index: true },
    po_no: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    po_date: { type: Date, required: true, default: Date.now, index: true },
    delivery_date: { type: Date, required: true, index: true },
    payment_terms: { type: String, trim: true, default: '' },

    // Supplier Information
    supplier_name: { type: String, required: true, trim: true, index: true },
    contact_person: { type: String, trim: true, default: '' },
    phone_email: { type: String, trim: true, default: '' },

    // Lifecycle Status
    status: {
      type: String,
      required: true,
      enum: Object.values(PO_STATUS),
      default: PO_STATUS.DRAFT,
      index: true,
    },

    // Aggregates
    total_items: { type: Number, default: 0 },
    total_ordered_quantity: { type: Number, default: 0 },
    total_ordered_weight: { type: Number, default: 0, set: roundTwoDecimals },
    total_received_quantity: { type: Number, default: 0 },
    total_received_weight: { type: Number, default: 0, set: roundTwoDecimals },

    // Audit & Workflow Signatures
    prepared_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    prepared_by_name: { type: String, required: true },

    submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    submitted_by_name: { type: String, default: null },
    submitted_at: { type: Date, default: null },

    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approved_by_name: { type: String, default: null },
    approved_at: { type: Date, default: null },

    rejected_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejected_by_name: { type: String, default: null },
    rejected_at: { type: Date, default: null },
    rejection_reason: { type: String, default: null },

    cancelled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelled_by_name: { type: String, default: null },
    cancelled_at: { type: Date, default: null },
    cancellation_reason: { type: String, default: null },

    notes: { type: String, trim: true, default: '' },

    // Items list (Maximum 20 items per PO)
    items: {
      type: [purchaseOrderItemSchema],
      validate: [
        (val) => Array.isArray(val) && val.length >= 1 && val.length <= 20,
        'Purchase Order must have between 1 and 20 line items.',
      ],
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'purchase_orders',
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// High frequency query indexes
purchaseOrderSchema.index({ status: 1, created_at: -1 });
purchaseOrderSchema.index({ supplier_name: 1, created_at: -1 });
purchaseOrderSchema.index({ po_date: -1 });
purchaseOrderSchema.index({ delivery_date: 1 });

export const PurchaseOrder =
  mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', purchaseOrderSchema);

