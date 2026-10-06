import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    phone: { type: String, trim: true, default: null },
    password_hash: { type: String, required: true, select: false },
    plain_password: { type: String, trim: true, default: null },
    role: {
      type: String,
      required: true,
      enum: Object.values(ROLES),
    },
    is_active: { type: Boolean, required: true, default: true },
    must_change_password: { type: Boolean, required: true, default: true },
    failed_login_attempts: { type: Number, default: 0 },
    locked_until: { type: Date, default: null },
    last_login_at: { type: Date, default: null },
    password_changed_at: { type: Date, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password_hash;
        return ret;
      },
    },
  }
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string' } },
  }
);
userSchema.index({ role: 1, is_active: 1 });
userSchema.index({ created_at: -1 });

export const User = mongoose.model('User', userSchema);
