import mongoose from 'mongoose';
import { QUALITIES } from '../constants/qualities.js';

const masterProductSchema = new mongoose.Schema(
  {
    // master_key: {
    //   type: String,
    //   trim: true,
    // },
    master_code_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterCode',
      default: null,
    },
    master_code: {
      type: String,
      trim: true,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quality: {
      type: String,
      required: true,
      trim: true,
    },
    gsm: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    bf: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    parameter_codes: {
      quality: { type: String, required: true },
      gsm: { type: String, required: true },
      bf: { type: String, required: true },
      size: { type: String, required: true },
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
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

masterProductSchema.index({ quality: 1, gsm: 1, bf: 1, size: 1 }, { unique: true });
// masterProductSchema.index({ is_active: 1, master_key: 1 });
masterProductSchema.index({ master_code_id: 1 });
masterProductSchema.index({ master_code: 1 });

export const MasterProduct = mongoose.model('MasterProduct', masterProductSchema);
