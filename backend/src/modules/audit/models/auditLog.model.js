import mongoose from 'mongoose';

/**
 * Universal Cross-Module System Audit Log Model
 *
 * Records immutable operational and security events across all inventory modules
 * (Reels, Sheets, Finished Boxes) as well as platform services (Users, Auth, Settings).
 */
const auditLogSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      enum: ['REELS', 'SHEETS', 'FINISHED_BOXES', 'USERS', 'AUTH', 'SETTINGS', 'SYSTEM'],
      index: true,
    },
    resource_type: {
      type: String,
      required: true,
      index: true,
      // e.g. 'REEL', 'SHEET', 'BOX', 'USER', 'MASTER_CODE', 'SETTING'
    },
    resource_id: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    resource_label: {
      type: String,
      trim: true,
      default: null,
      // e.g. Reel Number, Sheet Lot No, Box SKU
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
      // e.g. 'CREATED', 'USAGE_RECORDED', 'VOIDED', 'APPROVED', 'UPDATED', 'CONVERTED'
    },
    performed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    performed_by_name: {
      type: String,
      required: true,
    },
    performed_by_role: {
      type: String,
      required: true,
    },
    performed_at: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed, default: null },
      after: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Optional Cross-Module traceability pointer
    cross_reference: {
      source_module: { type: String, default: null },
      source_id: { type: mongoose.Schema.Types.Mixed, default: null },
      batch_id: { type: String, default: null },
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

// Compound indexes for high-frequency audit queries
auditLogSchema.index({ module: 1, performed_at: -1 });
auditLogSchema.index({ resource_type: 1, resource_id: 1, performed_at: -1 });
auditLogSchema.index({ performed_by: 1, performed_at: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

