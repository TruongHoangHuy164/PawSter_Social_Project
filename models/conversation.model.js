import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  lastMessageAt: { type: Date, default: Date.now, index: true },
  lastMessage: { type: String },
  lastSender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ participants: 1 }, { unique: false });

export const Conversation = mongoose.model('Conversation', conversationSchema);
