import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' }
}, { timestamps: { createdAt: 'createdAt', updatedAt: true } });

paymentSchema.index({ user: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
