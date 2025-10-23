import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

export const authMiddleware = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    // Enforce account lock on all protected routes
    const now = Date.now();
    const isLocked = req.user.status === 'locked' || (req.user.lockedUntil && req.user.lockedUntil.getTime() > now);
    if (isLocked) {
      const until = req.user.lockedUntil && req.user.lockedUntil.getTime() > now ? req.user.lockedUntil : null;
      const reason = req.user.lockedReason || 'Tài khoản của bạn đã bị khoá';
      const message = `Tài khoản đã bị khoá. Lý do: ${reason}${until ? `. Mở khoá vào: ${until.toLocaleString('vi-VN')}` : ' (vô thời hạn)'}.`;
      return res.status(403).json({ success: false, code: 'ACCOUNT_LOCKED', message, data: { reason, lockedUntil: until } });
    }
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
