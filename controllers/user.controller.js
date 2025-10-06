import asyncHandler from 'express-async-handler';
import { User } from '../models/user.model.js';
import { FriendRequest } from '../models/friendRequest.model.js';

export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

export const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['username'];
  const updates = {};
  for (const key of allowed) if (req.body[key]) updates[key] = req.body[key];
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
  res.json({ success: true, data: user });
});

export const getFriends = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('friends', 'username email isPro badges');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: user.friends });
});

export const acceptFriend = asyncHandler(async (req, res) => {
  const requestId = req.params.id;
  const fr = await FriendRequest.findById(requestId);
  if (!fr || fr.status !== 'pending') return res.status(404).json({ success: false, message: 'Request not found' });
  if (String(fr.to) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Not authorized' });

  const fromUser = await User.findById(fr.from);
  const toUser = await User.findById(fr.to);
  if (!fromUser || !toUser) return res.status(404).json({ success: false, message: 'Users missing' });

  if (fromUser.friends.length >= fromUser.friendLimit || toUser.friends.length >= toUser.friendLimit) {
    return res.status(400).json({ success: false, message: 'Friend limit reached' });
  }

  fromUser.friends.push(toUser._id);
  toUser.friends.push(fromUser._id);
  fr.status = 'accepted';
  await Promise.all([fromUser.save(), toUser.save(), fr.save()]);
  res.json({ success: true, message: 'Friend request accepted' });
});
