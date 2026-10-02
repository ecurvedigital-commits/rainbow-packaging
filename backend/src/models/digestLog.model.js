import mongoose from 'mongoose';
import { DIGEST_STATUS } from '../constants/digestStatus.js';

const digestLogSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    type: { type: String, required: true, default: 'DAILY' },
    status: {
      type: String,
      required: true,
      enum: Object.values(DIGEST_STATUS),
    },
    recipients: { type: [String], default: [] },
    counts: { type: mongoose.Schema.Types.Mixed, default: {} },
    deep_link: { type: String, default: null },
    triggered_by: { type: String, default: 'CRON' },
    error: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
    sent_at: { type: Date, default: null },
  },
  {
    timestamps: false,
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

digestLogSchema.index({ date: 1, type: 1 }, { unique: true });
digestLogSchema.index({ created_at: -1 });

export const DigestLog = mongoose.model('DigestLog', digestLogSchema);
