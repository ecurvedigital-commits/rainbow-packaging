import mongoose from 'mongoose';
import { EVENT_TYPES } from '../constants/eventTypes.js';
import { APPROVAL_STATUS } from '../constants/approvalStatus.js';

const reelEventSchema = new mongoose.Schema(
  {
    reel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
    reel_no: { type: String, required: true },
    event_type: {
      type: String,
      required: true,
      enum: Object.values(EVENT_TYPES),
    },
    approval_status: {
      type: String,
      enum: [...Object.values(APPROVAL_STATUS), null],
      default: null,
    },
    performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    performed_by_name: { type: String, required: true },
    performed_by_role: { type: String, required: true },
    performed_at: { type: Date, required: true, default: Date.now },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approved_by_name: { type: String, default: null },
    approved_at: { type: Date, default: null },
    decline_reason: { type: String, default: null },
    ref_event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ReelEvent', default: null },
    cascaded_from_event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ReelEvent', default: null },
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

reelEventSchema.index({ reel_id: 1, performed_at: 1 });
reelEventSchema.index({ approval_status: 1, performed_at: 1 });
reelEventSchema.index({ performed_at: -1 });
reelEventSchema.index({ event_type: 1, performed_at: -1 });
reelEventSchema.index({ performed_by: 1, performed_at: -1 });
reelEventSchema.index({ ref_event_id: 1 });
reelEventSchema.index({ reel_id: 1, event_type: 1, performed_at: -1 });
reelEventSchema.index({ performed_by: 1, approval_status: 1, performed_at: -1 });

export const ReelEvent = mongoose.model('ReelEvent', reelEventSchema);
