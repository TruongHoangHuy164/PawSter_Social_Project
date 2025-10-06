import asyncHandler from 'express-async-handler';
import { Payment } from '../models/payment.model.js';
import { User } from '../models/user.model.js';

// Simulated payment creation
export const createPayment = asyncHandler(async (req, res) => {
  const { provider = 'mock', amount = 50000 } = req.body;
  const payment = await Payment.create({ user: req.user._id, provider, amount, status: 'pending' });
  const paymentUrl = `${process.env.APP_URL || 'http://localhost:3000'}/pay/mock/${payment._id}`;
  res.status(201).json({ success: true, data: { paymentId: payment._id, paymentUrl } });
});

export const paymentWebhook = asyncHandler(async (req, res) => {
  const { paymentId, status } = req.body;
  if (!paymentId || !status) return res.status(400).json({ success: false, message: 'Missing fields' });
  const payment = await Payment.findById(paymentId);
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

  payment.status = status;
  await payment.save();

  if (status === 'paid') {
    const user = await User.findById(payment.user);
    if (user) {
      user.isPro = true;
      user.proExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      if (!user.badges.includes('Pro')) user.badges.push('Pro');
      await user.save();
    }
  }

  res.json({ success: true, message: 'Webhook processed', data: { status: payment.status } });
});
