import { Router } from 'express';
import { register, login, requestPasswordOtp, changePasswordWithOtp, googleLogin } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/password/otp', authMiddleware, requestPasswordOtp);
router.post('/password/change', authMiddleware, changePasswordWithOtp);
export default router;
