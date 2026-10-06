import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';

const notificationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      required: true,
      enum: Object.values(NOTIFICATION_TYPES),
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    // Reel/event references are optional: user messages may not reference a reel.
    event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ReelEvent', default: null },
    reel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', default: null },
    reel_no: { type: String, default: null },
    message_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    correction_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CorrectionRequest', default: null },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sender_name: { type: String, default: null },
    sender_role: { type: String, default: null },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    is_read: { type: Boolean, default: false },
    read_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
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

notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
