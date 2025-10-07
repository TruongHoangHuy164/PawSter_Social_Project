import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createThread, listThreads, deleteThread } from '../controllers/thread.controller.js';
import { uploadThreadMedia } from '../middleware/uploadMiddleware.js';

const router = Router();
router.post('/', authMiddleware, uploadThreadMedia, createThread);
router.get('/', authMiddleware, listThreads);
router.delete('/:id', authMiddleware, deleteThread);
export default router;
