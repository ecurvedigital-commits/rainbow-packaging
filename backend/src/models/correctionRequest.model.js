import mongoose from 'mongoose';
import { CORRECTION_CATEGORIES, CORRECTION_STATUS } from '../constants/notificationTypes.js';

const correctionRequestSchema = new mongoose.Schema(
  {
    reel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
    reel_no: { type: String, required: true, trim: true },
    master_code_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterCode', default: null },
    master_code: { type: String, trim: true, default: null },
    master_code_name: { type: String, trim: true, default: null },
    requested_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requested_by_name: { type: String, required: true },
    requested_by_role: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: CORRECTION_CATEGORIES,
      default: 'OTHER',
    },
    message: { type: String, required: true, trim: true },
    requested_changes: {
      previous_weight: { type: Number },
      max_weight: { type: Number },
      reel_no: { type: String },
      quality: { type: String },
      gsm: { type: mongoose.Schema.Types.Mixed },
      bf: { type: mongoose.Schema.Types.Mixed },
      size: { type: Number },
      supplier_name: { type: String },
      mill_name: { type: String },
      master_code: { type: String },
      master_code_id: { type: String },
      master_code_name: { type: String },
    },
    current_snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    message_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    status: {
      type: String,
      required: true,
      enum: Object.values(CORRECTION_STATUS),
      default: CORRECTION_STATUS.PENDING,
    },
    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolved_by_name: { type: String, default: null },
    resolution_note: { type: String, default: null },
    resolved_at: { type: Date, default: null },
    reel_event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ReelEvent', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    minimize: false,
    versionKey: false,
  }
);

correctionRequestSchema.index({ status: 1, created_at: -1 });
correctionRequestSchema.index({ reel_id: 1, status: 1 });
correctionRequestSchema.index({ requested_by: 1, created_at: -1 });

export const CorrectionRequest = mongoose.model('CorrectionRequest', correctionRequestSchema);
