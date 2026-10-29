import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token_hash: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    revoked_at: { type: Date, default: null },
    user_agent: { type: String, default: null },
    ip: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
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

refreshTokenSchema.index({ user_id: 1 });
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
