import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { 
  createComment, 
  getComments, 
  getReplies, 
  deleteComment, 
  toggleLike, 
  updateComment 
} from '../controllers/comment.controller.js';
import { uploadThreadMedia } from '../middleware/uploadMiddleware.js';

const router = Router();

// Create a new comment
router.post('/', authMiddleware, uploadThreadMedia, createComment);

// Get comments for a thread
router.get('/thread/:threadId', authMiddleware, getComments);

// Get replies for a specific comment
router.get('/:commentId/replies', authMiddleware, getReplies);

// Update a comment
router.patch('/:id', authMiddleware, updateComment);

// Delete a comment
router.delete('/:id', authMiddleware, deleteComment);

// Like/Unlike a comment
router.post('/:id/like', authMiddleware, toggleLike);

export default router;

