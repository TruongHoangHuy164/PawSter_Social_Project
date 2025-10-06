import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getMe, updateMe, getFriends, acceptFriend } from '../controllers/user.controller.js';

const router = Router();
router.get('/me', authMiddleware, getMe);
router.patch('/me', authMiddleware, updateMe);
router.get('/:id/friends', authMiddleware, getFriends);
router.post('/friends/:id/accept', authMiddleware, acceptFriend);
export default router;
