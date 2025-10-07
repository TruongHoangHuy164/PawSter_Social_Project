import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getThreadMediaSigned } from '../controllers/media.controller.js';

const router = Router();
router.get('/thread/:threadId/:index', authMiddleware, getThreadMediaSigned);
export default router;
