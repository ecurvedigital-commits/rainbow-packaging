import mongoose from 'mongoose';
import { QUALITIES } from '../constants/qualities.js';

const masterCodeSchema = new mongoose.Schema(
  {
    master_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    master_code_name: {
      type: String,
      required: true,
      trim: true,
    },
    quality: {
      type: String,
      trim: true,
      default: '',
    },
    gsm: {
      type: mongoose.Schema.Types.Mixed,
      default: '',
    },
    bf: {
      type: mongoose.Schema.Types.Mixed,
      default: '',
    },
    size: {
      type: mongoose.Schema.Types.Mixed,
      default: '',
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updated_by: {
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
        ret.master_code_id = ret._id.toString();
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

masterCodeSchema.index({ status: 1, master_code: 1 });

export const MasterCode = mongoose.model('MasterCode', masterCodeSchema);
