import asyncHandler from "express-async-handler";
import { Notification } from "../models/notification.model.js";
import { sanitizeNotification } from "../utils/notifications.js";

// GET /api/notifications?cursor=&limit=
export const listNotifications = asyncHandler(async (req, res) => {
  const { cursor, limit = 20 } = req.query;
  const query = { user: req.user._id };
  if (cursor) query._id = { $lt: cursor };

  const docs = await Notification.find(query)
    .sort({ _id: -1 })
    .limit(Math.min(Number(limit) || 20, 50))
    .populate("actor", "username avatarKey isPro badges")
    .populate("thread", "content author createdAt")
    .populate("comment", "content threadId createdAt");

  const items = docs.map(sanitizeNotification);
  const nextCursor = items.length ? items[items.length - 1]._id : null;
  const unread = await Notification.countDocuments({ user: req.user._id, read: false });

  res.json({ success: true, data: { items, nextCursor, unread } });
});

// POST /api/notifications/:id/read
export const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const n = await Notification.findOne({ _id: id, user: req.user._id });
  if (!n) return res.status(404).json({ success: false, message: "Not found" });
  if (!n.read) {
    n.read = true;
    await n.save();
  }
  res.json({ success: true });
});

// POST /api/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ success: true });
});
