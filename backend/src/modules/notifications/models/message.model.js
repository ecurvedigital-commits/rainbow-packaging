import mongoose from 'mongoose';

/**
 * Reel reference attached to a message so the receiver can open the reel directly.
 */
const reelRefSchema = new mongoose.Schema(
  {
    reel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
    reel_no: { type: String, required: true, trim: true },
    master_code_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterCode', default: null },
    master_code: { type: String, trim: true, default: null },
    master_code_name: { type: String, trim: true, default: null },
    quality: { type: String, default: null },
    gsm: { type: mongoose.Schema.Types.Mixed, default: null },
    bf: { type: mongoose.Schema.Types.Mixed, default: null },
    size: { type: Number, default: null },
  },
  { _id: false }
);

const recipientSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    username: { type: String, default: null },
    role: { type: String, required: true },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender_name: { type: String, required: true },
    sender_role: { type: String, required: true },
    recipients: { type: [recipientSchema], default: [] },
    subject: { type: String, trim: true, default: '' },
    body: { type: String, required: true, trim: true },
    reels: { type: [reelRefSchema], default: [] },
    kind: { type: String, enum: ['MESSAGE', 'CORRECTION'], default: 'MESSAGE' },
    correction_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CorrectionRequest', default: null },
    reply_to: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    versionKey: false,
  }
);

messageSchema.index({ sender_id: 1, created_at: -1 });
messageSchema.index({ 'recipients.user_id': 1, created_at: -1 });

export const Message = mongoose.model('Message', messageSchema);
