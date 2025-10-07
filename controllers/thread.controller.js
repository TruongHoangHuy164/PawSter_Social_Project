import asyncHandler from 'express-async-handler';
import { Thread } from '../models/thread.model.js';
import { uploadBuffer, deleteMediaKeys } from '../utils/s3.js';
import crypto from 'crypto';

function detectType(mime) {
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'other';
}

const MAX_FILES = 6;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_TOTAL = 80 * 1024 * 1024; // 80MB total
const ALLOWED_PREFIX = ['image/','video/','audio/'];

export const createThread = asyncHandler(async (req, res) => {
  const rawContent = typeof req.body.content === 'string' ? req.body.content : '';
  const content = rawContent.trim();
  const files = req.files || [];

  if (!content && files.length === 0) {
    return res.status(400).json({ success: false, message: 'Content or media required' });
  }
  if (content.length > 500) {
    return res.status(400).json({ success: false, message: 'Content too long' });
  }
  if (files.length > MAX_FILES) {
    return res.status(400).json({ success: false, message: `Max ${MAX_FILES} files` });
  }
  const totalSize = files.reduce((a,f)=>a+f.size,0);
  if (totalSize > MAX_TOTAL) {
    return res.status(400).json({ success: false, message: 'Total media too large' });
  }
  for (const f of files) {
    if (f.size > MAX_FILE_SIZE) {
      return res.status(400).json({ success: false, message: `${f.originalname} exceeds per-file size limit` });
    }
    if (!ALLOWED_PREFIX.some(p=>f.mimetype.startsWith(p))) {
      return res.status(400).json({ success: false, message: `${f.originalname} unsupported type` });
    }
  }

  // Upload with limited concurrency (simple queue)
  const concurrency = 3;
  const queue = [...files];
  const uploaded = [];
  let failed = false;

  async function worker() {
    while (queue.length && !failed) {
      const file = queue.shift();
      try {
        const { buffer, mimetype, originalname, size } = file;
        const ext = originalname.includes('.') ? originalname.split('.').pop() : undefined;
        const result = await uploadBuffer({ buffer, mimeType: mimetype, ext, userId: req.user._id });
        uploaded.push({
          key: result.key,
          type: detectType(mimetype),
          mimeType: mimetype,
          size
        });
      } catch (e) {
        console.error('Upload failed', e);
        failed = true;
      }
    }
  }

  if (files.length) {
    const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());
    await Promise.all(workers);
    if (failed) {
      // rollback any uploaded keys
      await deleteMediaKeys(uploaded.map(u=>u.key));
      return res.status(500).json({ success: false, message: 'Media upload failed' });
    }
  }

  try {
    const thread = await Thread.create({ author: req.user._id, content, media: uploaded });
    const sanitized = thread.toObject();
    if (sanitized.media) {
      sanitized.media = sanitized.media.map(({ key, type, mimeType, size, _id }) => ({ _id, key, type, mimeType, size }));
    }
    res.status(201).json({ success: true, data: sanitized });
  } catch (e) {
    console.error('Create thread validation error', e.message);
    // rollback media if DB validation fails unexpectedly
    if (uploaded.length) {
      deleteMediaKeys(uploaded.map(u=>u.key)).catch(()=>{});
    }
    return res.status(400).json({ success: false, message: e.message || 'Invalid thread' });
  }
});

export const listThreads = asyncHandler(async (req, res) => {
  const threads = await Thread.find().sort({ createdAt: -1 }).limit(200).populate('author', 'username isPro badges');
  res.json({ success: true, data: threads });
});

export const deleteThread = asyncHandler(async (req, res) => {
  const t = await Thread.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: 'Not found' });
  if (String(t.author) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Forbidden' });
  const keys = (t.media || []).map(m=>m.key).filter(Boolean);
  await t.deleteOne();
  if (keys.length) {
    deleteMediaKeys(keys).catch(e=>console.error('Delete media keys failed', e));
  }
  res.json({ success: true, message: 'Deleted' });
});
