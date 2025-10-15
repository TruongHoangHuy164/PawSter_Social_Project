import asyncHandler from "express-async-handler";
import { generateFriendQR, verifyFriendQR } from "../utils/qr.js";
import { FriendRequest } from "../models/friendRequest.model.js";
import { User } from "../models/user.model.js";

export const createQR = asyncHandler(async (req, res) => {
  const { token, expiresAt, qr } = await generateFriendQR(
    req.user._id.toString(),
    process.env.QR_SECRET
  );
  res.json({ success: true, data: { token, expiresAt, qr } });
});

export const scanQR = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token)
    return res.status(400).json({ success: false, message: "Token missing" });
  // tolerate pasted JSON or prefixed strings
  let tokenInput = typeof token === 'string' ? token.trim() : '';
  try {
    if (tokenInput.startsWith('{')) {
      const parsed = JSON.parse(tokenInput);
      tokenInput = parsed?.t || parsed?.token || tokenInput;
    } else {
      const m = tokenInput.match(/(?:token\s*[:=]\s*)?([A-Za-z0-9_-]{10,})/i);
      if (m && m[1]) tokenInput = m[1];
    }
  } catch (e) {}

  const { valid, userId, reason } = verifyFriendQR(
    tokenInput,
    process.env.QR_SECRET
  );
  if (!valid) return res.status(400).json({ success: false, message: reason });
  if (userId === req.user._id.toString())
    return res
      .status(400)
      .json({ success: false, message: "Cannot friend yourself" });

  const target = await User.findById(userId);
  if (!target)
    return res.status(404).json({ success: false, message: "User not found" });

  // Check if already friends
  if (target.friends.includes(req.user._id)) {
    return res.status(400).json({ success: false, message: "Already friends" });
  }

  // Check friend limits preemptively
  if (req.user.friends.length >= req.user.friendLimit) {
    const userType = req.user.isPro ? "Pro" : "thường";
    return res.status(400).json({
      success: false,
      message: `Bạn đã đạt giới hạn kết bạn! Tài khoản ${userType} chỉ có thể kết bạn tối đa ${req.user.friendLimit} người. Hiện tại bạn đã có ${req.user.friends.length} bạn bè.`,
    });
  }

  if (target.friends.length >= target.friendLimit) {
    const targetUserType = target.isPro ? "Pro" : "thường";
    return res.status(400).json({
      success: false,
      message: `${target.username} đã đạt giới hạn kết bạn! Tài khoản ${targetUserType} chỉ có thể kết bạn tối đa ${target.friendLimit} người.`,
    });
  }

  try {
    const fr = await FriendRequest.findOneAndUpdate(
      { from: req.user._id, to: target._id },
      { $setOnInsert: { from: req.user._id, to: target._id, status: 'pending' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (fr && fr.status === 'rejected') {
      fr.status = 'pending';
      await fr.save();
      console.log('🔁 QR FriendRequest re-sent:', fr._id);
      return res.json({ success: true, message: 'Request re-sent' });
    }
    console.log('🔔 QR FriendRequest created/upserted:', { id: fr._id, from: String(fr.from), to: String(fr.to), status: fr.status });
    return res.status(201).json({ success: true, message: 'Friend request sent' });
  } catch (err) {
    if (err && (err.code === 11000 || err.code === '11000')) {
      return res.status(200).json({ success: true, message: 'Request already pending' });
    }
    throw err;
  }
});
