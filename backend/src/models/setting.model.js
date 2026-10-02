import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'app' },
    aging_threshold_days: { type: Number, default: 30 },
    digest: {
      enabled: { type: Boolean, default: true },
      time: { type: String, default: '20:00' },
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Setting = mongoose.model('Setting', settingSchema);
