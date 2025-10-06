import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createQR, scanQR } from '../controllers/qr.controller.js';

const router = Router();
router.post('/create', authMiddleware, createQR);
router.post('/scan', authMiddleware, scanQR);
export default router;
