import mongoose from 'mongoose';
import { FIELD_TYPES } from '../constants/fieldTypes.js';

const fieldDefinitionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: Object.values(FIELD_TYPES),
    },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
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
        return ret;
      },
    },
  }
);

fieldDefinitionSchema.index({ is_active: 1, order: 1 });

export const FieldDefinition = mongoose.model('FieldDefinition', fieldDefinitionSchema);
