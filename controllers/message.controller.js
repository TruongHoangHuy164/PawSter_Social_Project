import asyncHandler from 'express-async-handler';
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { uploadBuffer, getSignedMediaUrl } from '../utils/s3.js';

function detectType(mime) {
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'other';
}

export const listConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const items = await Conversation.find({ participants: userId })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'username avatarKey isPro badges');

  const result = await Promise.all(items.map(async c => {
    const obj = c.toObject();
    obj.participants = await Promise.all(obj.participants.map(async (p) => {
      if (p.avatarKey) {
        try { p.avatarUrl = await getSignedMediaUrl(p.avatarKey, 900); } catch {}
      }
      return p;
    }));
    return obj;
  }));

  res.json({ success: true, data: result });
});

export const getOrCreateConversation = asyncHandler(async (req, res) => {
  const otherId = req.params.otherId;
  const userId = req.user._id;
  if (String(otherId) === String(userId)) return res.status(400).json({ success: false, message: 'Không thể chat với chính mình' });
  let conv = await Conversation.findOne({ participants: { $all: [userId, otherId] } });
  if (!conv) {
    conv = await Conversation.create({ participants: [userId, otherId], lastMessageAt: new Date() });
  }
  res.json({ success: true, data: conv });
});

export const listMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 30 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const items = await Message.find({ conversation: conversationId })
    .sort({ createdAt: -1 })
    .skip(skip).limit(Number(limit));

  // attach signed urls for media if any
  const withUrls = await Promise.all(items.map(async (m) => {
    const o = m.toObject();
    if (o.media?.length) {
      o.media = await Promise.all(o.media.map(async (mm) => ({ ...mm, url: await getSignedMediaUrl(mm.key, 900) })));
    }
    return o;
  }));

  res.json({ success: true, data: withUrls.reverse() });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { to, content } = req.body;
  const files = req.files || [];

  const media = [];
  for (const f of files) {
    const { buffer, mimetype, originalname, size } = f;
    const ext = originalname.includes('.') ? originalname.split('.').pop() : undefined;
    const uploaded = await uploadBuffer({ buffer, mimeType: mimetype, ext, userId: req.user._id, folder: 'dm' });
    media.push({ key: uploaded.key, type: detectType(mimetype), mimeType: mimetype, size });
  }

  const msg = await Message.create({ conversation: conversationId, from: req.user._id, to, content: (content||'').trim(), media });

  await Conversation.findByIdAndUpdate(conversationId, { lastMessageAt: new Date(), lastMessage: content || (media.length ? '[media]' : ''), lastSender: req.user._id });

  // Realtime emit
  try {
    req.io.to(`dm_${conversationId}`).emit('dm:new_message', { message: msg });
    // notify receiver directly as well
    req.io.to(`user_${to}`).emit('dm:notify', { conversationId, message: msg });
  } catch {}

  res.status(201).json({ success: true, data: msg });
});

export const markRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  await Message.updateMany({ conversation: conversationId, to: userId, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
  res.json({ success: true });
});
