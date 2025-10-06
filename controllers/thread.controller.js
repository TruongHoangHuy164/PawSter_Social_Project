import asyncHandler from 'express-async-handler';
import { Thread } from '../models/thread.model.js';

export const createThread = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ success: false, message: 'Content required' });
  const thread = await Thread.create({ author: req.user._id, content });
  res.status(201).json({ success: true, data: thread });
});

export const listThreads = asyncHandler(async (req, res) => {
  const threads = await Thread.find().sort({ createdAt: -1 }).limit(200).populate('author', 'username isPro badges');
  res.json({ success: true, data: threads });
});

export const deleteThread = asyncHandler(async (req, res) => {
  const t = await Thread.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: 'Not found' });
  if (String(t.author) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Forbidden' });
  await t.deleteOne();
  res.json({ success: true, message: 'Deleted' });
});
