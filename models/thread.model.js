import mongoose from 'mongoose';

const threadSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 500 },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

threadSchema.index({ createdAt: -1 });

export const Thread = mongoose.model('Thread', threadSchema);
