import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { User } from '../models/user.model.js';

const router = Router();

// One-time bootstrap: if there is no admin, allow the current authenticated user to become admin.
router.post('/self', authMiddleware, async (req, res) => {
  const exists = await User.exists({ isAdmin: true });
  if (exists) return res.status(403).json({ success: false, message: 'Admin already exists' });
  await User.findByIdAndUpdate(req.user._id, { isAdmin: true });
  res.json({ success: true, message: 'Current user promoted to admin' });
});

export default router;
