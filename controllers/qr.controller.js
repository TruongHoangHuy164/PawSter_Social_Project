import asyncHandler from 'express-async-handler';
import { generateFriendQR, verifyFriendQR } from '../utils/qr.js';
import { FriendRequest } from '../models/friendRequest.model.js';
import { User } from '../models/user.model.js';

export const createQR = asyncHandler(async (req, res) => {
  const { token, expiresAt, qr } = await generateFriendQR(req.user._id.toString(), process.env.QR_SECRET);
  res.json({ success: true, data: { token, expiresAt, qr } });
});

export const scanQR = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'Token missing' });
  const { valid, userId, reason } = verifyFriendQR(token, process.env.QR_SECRET);
  if (!valid) return res.status(400).json({ success: false, message: reason });
  if (userId === req.user._id.toString()) return res.status(400).json({ success: false, message: 'Cannot friend yourself' });

  const target = await User.findById(userId);
  if (!target) return res.status(404).json({ success: false, message: 'User not found' });

  // Check if already friends
  if (target.friends.includes(req.user._id)) {
    return res.status(400).json({ success: false, message: 'Already friends' });
  }

  // Check friend limits preemptively
  if (target.friends.length >= target.friendLimit || req.user.friends.length >= req.user.friendLimit) {
    return res.status(400).json({ success: false, message: 'Friend limit reached' });
  }

  const existing = await FriendRequest.findOne({ from: req.user._id, to: target._id });
  if (existing && existing.status === 'pending') {
    return res.status(200).json({ success: true, message: 'Request already pending' });
  }
  if (existing && existing.status === 'rejected') {
    existing.status = 'pending';
    await existing.save();
    return res.json({ success: true, message: 'Request re-sent' });
  }
  await FriendRequest.create({ from: req.user._id, to: target._id });
  res.status(201).json({ success: true, message: 'Friend request sent' });
});
