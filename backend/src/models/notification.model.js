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
    event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ReelEvent', required: true },
    reel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
    reel_no: { type: String, required: true },
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
