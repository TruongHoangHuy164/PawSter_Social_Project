import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  lastMessageAt: { type: Date, default: Date.now, index: true },
  lastMessage: { type: String },
  lastSender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Keep a compound index to support queries by participants ordered by activity
conversationSchema.index({ participants: 1, updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
