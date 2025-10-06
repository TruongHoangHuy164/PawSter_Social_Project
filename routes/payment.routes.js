import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createPayment, paymentWebhook } from '../controllers/payment.controller.js';

const router = Router();
router.post('/create', authMiddleware, createPayment);
router.post('/webhook', paymentWebhook); // no auth - simulated provider callback
export default router;
