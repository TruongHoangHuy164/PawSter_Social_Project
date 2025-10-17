import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, trim: true },
  media: [{ key: String, type: { type: String }, mimeType: String, size: Number }],
  readAt: { type: Date },
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ to: 1, readAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
