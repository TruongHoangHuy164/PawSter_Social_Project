import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { User } from '../models/user.model.js';
import { Thread } from '../models/thread.model.js';
import { FriendRequest } from '../models/friendRequest.model.js';
import { Payment } from '../models/payment.model.js';

const readLastLines = (filePath, maxLines = 200) => {
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, 'utf8');
  const lines = data.trim().split(/\r?\n/);
  return lines.slice(-maxLines);
};

export const stats = async (req, res) => {
  try {
    const users = await User.countDocuments();
    const threads = await Thread.countDocuments();
    const paymentsPaid = await Payment.countDocuments({ status: 'paid' });
    const paymentsPending = await Payment.countDocuments({ status: 'pending' });
    return res.json({ success: true, data: { users, threads, payments: { paid: paymentsPaid, pending: paymentsPending } } });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
};

export const listUsers = async (req, res) => {
  try {
    const { q, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [ { username: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') } ];
    }
    const users = await User.find(filter).skip((page-1)*limit).limit(Number(limit)).select('-password').lean();
    return res.json({ success: true, data: users });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body;
    // allow toggling isPro and proExpiry and isAdmin, badges
    const allowed = ['isPro','proExpiry','isAdmin','badges'];
    const data = {};
    for (const k of allowed) if (k in patch) data[k] = patch[k];
    const user = await User.findByIdAndUpdate(id, data, { new: true }).select('-password');
    return res.json({ success: true, data: user });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
};

export const listThreads = async (req, res) => {
  try {
    const { q, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (q) filter.content = new RegExp(q, 'i');
    const threads = await Thread.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)).populate('author','username').lean();
    return res.json({ success: true, data: threads });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
};

// Get thread detail by ID
export const getThreadDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const thread = await Thread.findById(id)
      .populate('author', 'username email isAdmin isPro createdAt');
    
    if (!thread) {
      return res.status(404).json({ success: false, message: 'Thread not found' });
    }

    const daysDiff = Math.floor((Date.now() - new Date(thread.createdAt)) / (1000 * 60 * 60 * 24));
    const createdAgo = daysDiff === 0 ? 'Today' : 
                      daysDiff === 1 ? '1 day ago' : 
                      daysDiff < 30 ? `${daysDiff} days ago` : 
                      `${Math.floor(daysDiff / 30)} months ago`;

    return res.json({ 
      success: true, 
      data: {
        ...thread.toObject(),
        stats: {
          contentLength: thread.content?.length || 0,
          mediaCount: thread.media?.length || 0,
          hasMedia: (thread.media?.length || 0) > 0,
          createdAgo,
          accountAge: Math.floor((Date.now() - new Date(thread.author.createdAt)) / (1000 * 60 * 60 * 24)) + ' days'
        }
      }
    });
  } catch (e) { 
    console.error('getThreadDetail error:', e);
    return res.status(500).json({ success: false, message: e.message }); 
  }
};

export const deleteThread = async (req, res) => {
  try {
    const { id } = req.params;
    await Thread.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
};

export const atomicAccept = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { requestId } = req.body;
    const fr = await FriendRequest.findById(requestId).session(session);
    if (!fr) throw new Error('Friend request not found');
    if (fr.status !== 'pending') throw new Error('Friend request not pending');
    fr.status = 'accepted';
    await fr.save({ session });
    // add each user to other's friends if not exists
    const from = await User.findById(fr.from).session(session);
    const to = await User.findById(fr.to).session(session);
    if (!from || !to) throw new Error('User not found');
    if (!from.friends.includes(to._id)) from.friends.push(to._id);
    if (!to.friends.includes(from._id)) to.friends.push(from._id);
    await from.save({ session });
    await to.save({ session });
    await session.commitTransaction();
    session.endSession();
    return res.json({ success: true });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const enforceProExpiry = async (req, res) => {
  try {
    const now = new Date();
    const expired = await User.updateMany({ isPro: true, proExpiry: { $lte: now } }, { isPro: false, proExpiry: null });
    return res.json({ success: true, data: expired });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
};

export const logs = async (req, res) => {
  try {
    const { lines = 200 } = req.query;
    const logfile = process.env.LOG_FILE_PATH || path.join(process.cwd(), 'server.log');
    const output = readLastLines(logfile, Number(lines));
    return res.json({ success: true, data: output });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
};

export const payments = async (req, res) => {
  try {
    const items = await Payment.find().sort({ createdAt: -1 }).limit(200).populate('user','username email').lean();
    return res.json({ success: true, data: items });
  } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
};
