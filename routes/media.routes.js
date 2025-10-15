import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getThreadMediaSigned, getCommentMediaSigned } from '../controllers/media.controller.js';

const router = Router();
router.get('/thread/:threadId/:index', authMiddleware, getThreadMediaSigned);
router.get('/comment/:commentId/:index', authMiddleware, getCommentMediaSigned);
export default router;
