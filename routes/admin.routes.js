import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import { User } from '../models/user.model.js';
import { Thread } from '../models/thread.model.js';
import { Payment } from '../models/payment.model.js';

const router = Router();

router.use(authMiddleware, adminOnly);

router.get('/stats', async (req, res) => {
  const [users, threads, paid, pending] = await Promise.all([
    User.countDocuments(),
    Thread.countDocuments(),
    Payment.countDocuments({ status: 'paid' }),
    Payment.countDocuments({ status: 'pending' })
  ]);
  res.json({ success: true, data: { users, threads, payments: { paid, pending } } });
});

router.get('/users', async (req, res) => {
  const items = await User.find().select('-password').sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: items });
});

router.patch('/users/:id', async (req, res) => {
  const allowed = ['isPro', 'isAdmin', 'badges'];
  const updates = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: user });
});

router.get('/threads', async (req, res) => {
  const items = await Thread.find().sort({ createdAt: -1 }).limit(200).populate('author', 'username isPro');
  res.json({ success: true, data: items });
});

router.delete('/threads/:id', async (req, res) => {
  const t = await Thread.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: 'Not found' });
  await t.deleteOne();
  res.json({ success: true, message: 'Deleted' });
});

router.get('/payments', async (req, res) => {
  const items = await Payment.find().sort({ createdAt: -1 }).limit(200).populate('user', 'username email');
  res.json({ success: true, data: items });
});

export default router;
