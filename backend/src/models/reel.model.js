import mongoose from 'mongoose';
import { QUALITIES } from '../constants/qualities.js';
import { REEL_STATUS, RECORD_STATUS } from '../constants/reelStatus.js';

const roundTwoDecimals = (val) => (typeof val === 'number' ? Math.round(val * 100) / 100 : val);

const reelSchema = new mongoose.Schema(
  {
    sr_no: { type: Number, required: true, unique: true },
    reel_no: { type: String, required: true, trim: true },
    quality: { type: String, required: true, trim: true },
    bf: { type: mongoose.Schema.Types.Mixed, required: true },
    purchase_date: { type: Date, required: true, default: Date.now },
    supplier_name: { type: String, required: true, trim: true },
    mill_name: { type: String, trim: true, default: '' },
    size: { type: Number, required: true, set: roundTwoDecimals },
    gsm: { type: mongoose.Schema.Types.Mixed, required: true },
    rate_per_kg: { type: Number, default: 0, set: roundTwoDecimals },
    max_weight: { type: Number, required: true, set: roundTwoDecimals },
    previous_weight: { type: Number, required: true, set: roundTwoDecimals },
    status: {
      type: String,
      required: true,
      enum: Object.values(REEL_STATUS),
    },
    custom_fields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    master_product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterProduct',
      default: null,
    },
    // master_key: {
    //   type: String,
    //   trim: true,
    //   default: null,
    // },
    master_code_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterCode',
      default: null,
    },
    master_code: {
      type: String,
      trim: true,
      default: null,
    },
    stations_used: { type: [String], default: [] },
    pending_count: { type: Number, default: 0 },
    record_status: {
      type: String,
      required: true,
      enum: Object.values(RECORD_STATUS),
      default: RECORD_STATUS.ACTIVE,
    },
    last_activity_at: { type: Date, default: Date.now },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    minimize: false,
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

reelSchema.index({ reel_no: 1 });
reelSchema.index({ status: 1, quality: 1 });
reelSchema.index({ supplier_name: 1 });
reelSchema.index({ purchase_date: -1 });
reelSchema.index({ gsm: 1 });
reelSchema.index({ last_activity_at: 1 });
reelSchema.index({ pending_count: 1 });
reelSchema.index({ stations_used: 1 });
reelSchema.index({ record_status: 1 });
reelSchema.index({ record_status: 1, created_at: -1 });
reelSchema.index({ record_status: 1, status: 1, created_at: -1 });
reelSchema.index({ record_status: 1, quality: 1, purchase_date: -1 });
reelSchema.index({ record_status: 1, status: 1, quality: 1, purchase_date: -1 });
reelSchema.index({ record_status: 1, supplier_name: 1, purchase_date: -1 });
reelSchema.index({ record_status: 1, last_activity_at: 1 });
// reelSchema.index({ record_status: 1, master_key: 1 });
reelSchema.index({ record_status: 1, master_product_id: 1 });
reelSchema.index({ record_status: 1, master_code_id: 1 });
reelSchema.index({ record_status: 1, master_code: 1 });

export const Reel = mongoose.model('Reel', reelSchema);
