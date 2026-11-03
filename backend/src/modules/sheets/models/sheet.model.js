import mongoose from 'mongoose';
import { SHEET_STATUS, SHEET_RECORD_STATUS } from '../constants/sheetStatus.js';
import { roundTwoDecimals } from '../utils/sheetCalculations.js';

const sheetSchema = new mongoose.Schema(
  {
    sr_no: { type: Number, required: true, unique: true, index: true },
    lot_no: { type: String, trim: true, default: null, index: true },

    // Party and Job Information
    party_name: { type: String, required: true, trim: true, index: true },
    job_name: { type: String, trim: true, default: '', index: true },

    // Board Specifications
    quality: { type: String, required: true, trim: true, index: true },
    deckle: { type: Number, required: true, set: roundTwoDecimals },
    cutting: { type: Number, required: true, set: roundTwoDecimals },
    gsm: { type: Number, required: true, index: true },

    // Stock Quantities & Weights
    initial_quantity: { type: Number, required: true, min: 0 },
    current_quantity: { type: Number, required: true, min: 0 },
    initial_weight: { type: Number, required: true, min: 0, set: roundTwoDecimals },
    current_weight: { type: Number, required: true, min: 0, set: roundTwoDecimals },

    // Lifecycle Status
    status: {
      type: String,
      required: true,
      enum: Object.values(SHEET_STATUS),
      default: SHEET_STATUS.AVAILABLE,
      index: true,
    },
    supplier_name: { type: String, trim: true, default: '' },
    received_date: { type: Date, required: true, default: Date.now, index: true },
    sheater_reel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', default: null },

    pending_count: { type: Number, default: 0, index: true },
    record_status: {
      type: String,
      required: true,
      enum: Object.values(SHEET_RECORD_STATUS),
      default: SHEET_RECORD_STATUS.ACTIVE,
      index: true,
    },

    notes: { type: String, default: '' },
    custom_fields: { type: mongoose.Schema.Types.Mixed, default: {} },
    last_activity_at: { type: Date, default: Date.now },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'sheets',
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
sheetSchema.index({ record_status: 1, party_name: 1 });
sheetSchema.index({ record_status: 1, job_name: 1 });
sheetSchema.index({ record_status: 1, quality: 1 });
sheetSchema.index({ record_status: 1, status: 1 });
sheetSchema.index({ record_status: 1, received_date: -1 });
sheetSchema.index({ record_status: 1, created_at: -1 });
sheetSchema.index({ record_status: 1, current_quantity: 1 });

export const Sheet = mongoose.models.Sheet || mongoose.model('Sheet', sheetSchema);
