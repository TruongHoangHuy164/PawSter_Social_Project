import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import multer from 'multer';
import { getOrCreateConversation, listConversations, listMessages, sendMessage, markRead } from '../controllers/message.controller.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 6 } });

const router = Router();

// Danh sách hội thoại của tôi
router.get('/conversations', authMiddleware, listConversations);
// Tạo hoặc lấy hội thoại với user khác
router.post('/conversations/with/:otherId', authMiddleware, getOrCreateConversation);
// Lấy lịch sử tin nhắn của 1 hội thoại
router.get('/conversations/:conversationId/messages', authMiddleware, listMessages);
// Gửi tin nhắn (hỗ trợ đính kèm)
router.post('/conversations/:conversationId/messages', authMiddleware, upload.array('media', 6), sendMessage);
// Đánh dấu đã đọc
router.post('/conversations/:conversationId/read', authMiddleware, markRead);

export default router;
