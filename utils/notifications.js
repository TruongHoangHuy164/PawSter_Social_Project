import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { Thread } from "../models/thread.model.js";
import { Comment } from "../models/comment.model.js";

// Create, save, and emit a notification to a user's room via Socket.IO
export async function notify({
  io,
  userId, // recipient
  actorId, // who triggered
  type,
  threadId,
  commentId,
  meta,
}) {
  try {
    if (!userId || !actorId || !type) return null;

    const notif = await Notification.create({
      user: userId,
      actor: actorId,
      type,
      thread: threadId || undefined,
      comment: commentId || undefined,
      meta: meta || undefined,
    });

    // Populate minimal fields for client
    const populated = await Notification.findById(notif._id)
      .populate("actor", "username avatarKey isPro badges")
      .populate("thread", "content author createdAt")
      .populate("comment", "content threadId createdAt");

    // Emit real-time event to recipient room
    if (io) {
      io.to(`user_${userId}`).emit("notification:new", {
        notification: sanitizeNotification(populated),
      });
    }

    return populated;
  } catch (e) {
    console.warn("Failed to create/emit notification:", e?.message || e);
    return null;
  }
}

export function sanitizeNotification(notifDoc) {
  if (!notifDoc) return null;
  const n = notifDoc.toObject ? notifDoc.toObject() : notifDoc;
  // Strip heavy fields if any
  return {
    _id: n._id,
    type: n.type,
    read: n.read,
    createdAt: n.createdAt,
    meta: n.meta || {},
    actor: n.actor && {
      _id: n.actor._id,
      username: n.actor.username,
      avatarKey: n.actor.avatarKey || null,
      isPro: n.actor.isPro || false,
      badges: n.actor.badges || [],
    },
    thread: n.thread
      ? { _id: n.thread._id, content: n.thread.content, author: n.thread.author, createdAt: n.thread.createdAt }
      : undefined,
    comment: n.comment
      ? { _id: n.comment._id, content: n.comment.content, threadId: n.comment.threadId, createdAt: n.comment.createdAt }
      : undefined,
  };
}
