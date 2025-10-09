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

function extractTags(text) {
  if (!text) return [];
  // match #hashtag with letters/numbers/underscore/hyphen
  const regex = /#([\p{L}\p{N}_-]{2,})/gu; // at least 2 chars
  const set = new Set();
  let m;
  while ((m = regex.exec(text)) !== null) {
    set.add(m[1].toLowerCase());
  }
  return Array.from(set);
}

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
    const tags = extractTags(content);
    const thread = await Thread.create({ author: req.user._id, content, media: uploaded, parent: null, tags });
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

export const getThread = asyncHandler(async (req, res) => {
  const t = await Thread.findById(req.params.id).populate('author', 'username isPro badges');
  if (!t) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: t });
});

export const listReplies = asyncHandler(async (req, res) => {
  const parentId = req.params.id;
  const replies = await Thread.find({ parent: parentId }).sort({ createdAt: 1 }).populate('author', 'username isPro badges');
  res.json({ success: true, data: replies });
});

export const createReply = asyncHandler(async (req, res) => {
  const parentId = req.params.id;
  const parent = await Thread.findById(parentId);
  if (!parent) return res.status(404).json({ success: false, message: 'Parent not found' });

  const rawContent = typeof req.body.content === 'string' ? req.body.content : '';
  const content = rawContent.trim();
  const files = req.files || [];
  if (!content && files.length === 0) {
    return res.status(400).json({ success: false, message: 'Content or media required' });
  }
  if (content.length > 500) return res.status(400).json({ success: false, message: 'Content too long' });
  if (files.length > MAX_FILES) return res.status(400).json({ success: false, message: `Max ${MAX_FILES} files` });
  const totalSize = files.reduce((a,f)=>a+f.size,0);
  if (totalSize > MAX_TOTAL) return res.status(400).json({ success: false, message: 'Total media too large' });
  for (const f of files) {
    if (f.size > MAX_FILE_SIZE) return res.status(400).json({ success: false, message: `${f.originalname} exceeds per-file size limit` });
    if (!ALLOWED_PREFIX.some(p=>f.mimetype.startsWith(p))) return res.status(400).json({ success: false, message: `${f.originalname} unsupported type` });
  }

  const concurrency = 3; const queue = [...files]; const uploaded = []; let failed = false;
  async function worker(){
    while (queue.length && !failed) {
      const file = queue.shift();
      try {
        const { buffer, mimetype, originalname, size } = file;
        const ext = originalname.includes('.') ? originalname.split('.').pop() : undefined;
        const result = await uploadBuffer({ buffer, mimeType: mimetype, ext, userId: req.user._id });
        uploaded.push({ key: result.key, type: detectType(mimetype), mimeType: mimetype, size });
      } catch(e){ failed = true; }
    }
  }
  if (files.length) {
    const workers = Array.from({ length: Math.min(concurrency, files.length)}, ()=>worker());
    await Promise.all(workers);
    if (failed) { await deleteMediaKeys(uploaded.map(u=>u.key)); return res.status(500).json({ success: false, message: 'Media upload failed' }); }
  }
  try {
    const tags = extractTags(content);
    const reply = await Thread.create({ author: req.user._id, content, media: uploaded, parent: parentId, tags });
    res.status(201).json({ success: true, data: reply });
  } catch(e){
    if (uploaded.length) deleteMediaKeys(uploaded.map(u=>u.key)).catch(()=>{});
    return res.status(400).json({ success: false, message: e.message || 'Invalid reply' });
  }
});

export const updateThread = asyncHandler(async (req, res) => {
  const t = await Thread.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: 'Not found' });
  if (String(t.author) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Forbidden' });
  const rawContent = typeof req.body.content === 'string' ? req.body.content : '';
  const content = rawContent.trim();
  if (!content && (!t.media || t.media.length===0)) return res.status(400).json({ success: false, message: 'Content or media required' });
  if (content.length > 500) return res.status(400).json({ success: false, message: 'Content too long' });
  t.content = content;
  t.tags = extractTags(content);
  await t.save();
  res.json({ success: true, data: t });
});

export const listByTag = asyncHandler(async (req, res) => {
  const tag = String(req.params.tag || '').toLowerCase();
  if (!tag) return res.status(400).json({ success: false, message: 'Tag required' });
  const items = await Thread.find({ parent: null, tags: tag }).sort({ createdAt: -1 }).limit(200).populate('author', 'username isPro badges');
  res.json({ success: true, data: items });
});
