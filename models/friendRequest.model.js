import mongoose from 'mongoose';

const friendRequestSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
}, { timestamps: true });

friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

export const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);
