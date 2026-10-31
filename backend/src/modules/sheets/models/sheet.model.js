import mongoose from 'mongoose';

/**
 * Minimal Placeholder Schema for Sheets Module Foundation
 *
 * NOTE: The exact business attributes, classifications, inventory fields,
 * and calculations for Sheets have NOT yet been decided.
 * This model establishes the independent module registration mechanism and
 * collection namespace ('sheets') without premature schema assumptions.
 */
const sheetPlaceholderSchema = new mongoose.Schema(
  {
    // Minimal system identification
    reference_id: { type: String, trim: true, default: null },
    status: { type: String, default: 'UNDER_DEVELOPMENT' },
    notes: { type: String, default: '' },
    // Extensible payload bag for future finalized business fields
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'sheets',
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

export const Sheet = mongoose.models.Sheet || mongoose.model('Sheet', sheetPlaceholderSchema);
