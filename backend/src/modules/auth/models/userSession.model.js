import mongoose from 'mongoose';

/**
 * UserSession Model
 * Tracks active devices, login locations, browsers, and allows remote termination
 */
const userSessionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    device_name: {
      type: String,
      required: true,
      trim: true,
    },
    device_type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    os: {
      type: String,
      default: 'Unknown OS',
      trim: true,
    },
    browser: {
      type: String,
      default: 'Unknown Browser',
      trim: true,
    },
    ip: {
      type: String,
      default: null,
      trim: true,
    },
    user_agent: {
      type: String,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    login_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    last_active_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    revoked_at: {
      type: Date,
      default: null,
    },
    revoked_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    revocation_reason: {
      type: String,
      default: null,
    },
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

userSessionSchema.index({ user_id: 1, is_active: 1 });
userSessionSchema.index({ last_active_at: -1 });

export const UserSession = mongoose.model('UserSession', userSessionSchema);

