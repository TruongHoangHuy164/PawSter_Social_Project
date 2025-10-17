import express from 'express';
import * as adminCtrl from '../controllers/admin.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.use(authMiddleware, adminOnly);

router.get('/stats', adminCtrl.stats);
router.get('/users', adminCtrl.listUsers);
router.patch('/users/:id', adminCtrl.updateUser);
router.get('/threads', adminCtrl.listThreads);
router.delete('/threads/:id', adminCtrl.deleteThread);
router.post('/friend/accept', adminCtrl.atomicAccept);
router.post('/pro/enforce', adminCtrl.enforceProExpiry);
router.get('/logs', adminCtrl.logs);
router.get('/payments', adminCtrl.payments);

export default router;
