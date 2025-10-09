import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createThread, listThreads, deleteThread, createReply, getThread, listReplies, updateThread, listByTag } from '../controllers/thread.controller.js';
import { uploadThreadMedia } from '../middleware/uploadMiddleware.js';

const router = Router();
router.post('/', authMiddleware, uploadThreadMedia, createThread);
router.get('/', authMiddleware, listThreads);
router.get('/tag/:tag', authMiddleware, listByTag);
router.get('/:id', authMiddleware, getThread);
router.get('/:id/replies', authMiddleware, listReplies);
router.post('/:id/replies', authMiddleware, uploadThreadMedia, createReply);
router.patch('/:id', authMiddleware, updateThread);
router.delete('/:id', authMiddleware, deleteThread);
export default router;
