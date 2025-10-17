import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import asyncHandler from 'express-async-handler';

const signToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) return res.status(400).json({ success: false, message: 'User already exists' });
  const user = await User.create({ username, email, password });
  const token = signToken(user);
  res.status(201).json({ success: true, data: { token, user: { id: user._id, username, email, isAdmin: user.isAdmin, isPro: user.isPro } } });
});

export const login = asyncHandler(async (req, res) => {
  const emailRaw = req.body?.email;
  const password = req.body?.password;
  const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : emailRaw;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Missing credentials' });
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const match = await user.comparePassword(password);
  if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const token = signToken(user);
  res.json({ success: true, data: { token, user: { id: user._id, username: user.username, email: user.email, isPro: user.isPro, isAdmin: user.isAdmin } } });
});
