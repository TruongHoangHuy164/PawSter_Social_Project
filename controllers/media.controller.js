import asyncHandler from 'express-async-handler';
import { Thread } from '../models/thread.model.js';
import { getSignedMediaUrl } from '../utils/s3.js';

// GET /api/media/thread/:threadId/:index
// Returns { url } presigned for video/audio/image retrieval if media exists and user can view thread
export const getThreadMediaSigned = asyncHandler(async (req, res) => {
  const { threadId, index } = req.params;
  const t = await Thread.findById(threadId).select('author media');
  if (!t) return res.status(404).json({ success: false, message: 'Thread not found' });
  if (!t.media || !t.media.length) return res.status(404).json({ success: false, message: 'No media' });
  const i = Number(index);
  if (Number.isNaN(i) || i < 0 || i >= t.media.length) return res.status(400).json({ success: false, message: 'Invalid index' });
  const item = t.media[i];
  // In future: enforce visibility rules (friends-only, etc.)
  const signed = await getSignedMediaUrl(item.key, 3600); // 1h
  res.json({ success: true, data: { url: signed, type: item.type, mimeType: item.mimeType } });
});
