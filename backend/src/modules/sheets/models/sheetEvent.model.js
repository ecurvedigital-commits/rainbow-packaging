import mongoose from 'mongoose';
import { SHEET_EVENT_TYPES } from '../constants/sheetStatus.js';
import { APPROVAL_STATUS } from '../../../core/constants/approvalStatus.js';

const sheetEventSchema = new mongoose.Schema(
  {
    sheet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Sheet', required: true, index: true },
    sr_no: { type: Number, required: true },
    event_type: {
      type: String,
      required: true,
      enum: Object.values(SHEET_EVENT_TYPES),
      index: true,
    },
    approval_status: {
      type: String,
      enum: [...Object.values(APPROVAL_STATUS), null],
      default: null,
      index: true,
    },
    performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    performed_by_name: { type: String, required: true },
    performed_by_role: { type: String, required: true },
    performed_at: { type: Date, required: true, default: Date.now, index: true },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approved_by_name: { type: String, default: null },
    approved_at: { type: Date, default: null },
    decline_reason: { type: String, default: null },
    ref_event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SheetEvent', default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: false,
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

sheetEventSchema.index({ sheet_id: 1, performed_at: 1 });
sheetEventSchema.index({ approval_status: 1, performed_at: 1 });
sheetEventSchema.index({ performed_at: -1 });
sheetEventSchema.index({ event_type: 1, performed_at: -1 });
sheetEventSchema.index({ performed_by: 1, performed_at: -1 });

export const SheetEvent = mongoose.models.SheetEvent || mongoose.model('SheetEvent', sheetEventSchema);

