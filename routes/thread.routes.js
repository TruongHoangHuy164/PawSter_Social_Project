import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createThread, listThreads, deleteThread } from '../controllers/thread.controller.js';

const router = Router();
router.post('/', authMiddleware, createThread);
router.get('/', authMiddleware, listThreads);
router.delete('/:id', authMiddleware, deleteThread);
export default router;
