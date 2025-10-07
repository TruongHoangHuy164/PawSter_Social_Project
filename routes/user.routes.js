import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getMe, updateMe, getFriends, acceptFriend, getProfile, updateProfile } from '../controllers/user.controller.js';
import { profileUpload } from '../middleware/profileUpload.js';

const router = Router();
router.get('/me', authMiddleware, getMe);
router.patch('/me', authMiddleware, updateMe);
router.get('/me/profile', authMiddleware, getProfile);
router.patch('/me/profile', authMiddleware, profileUpload, updateProfile);
router.get('/:id/friends', authMiddleware, getFriends);
router.post('/friends/:id/accept', authMiddleware, acceptFriend);
export default router;
