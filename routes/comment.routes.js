import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createComment,
  getComments,
  getReplies,
  deleteComment,
  toggleLike,
  updateComment,
} from "../controllers/comment.controller.js";
import { uploadThreadMedia } from "../middleware/uploadMiddleware.js";
import { Comment } from "../models/comment.model.js";
import asyncHandler from "express-async-handler";

const router = Router();

// Get user's comments (for Profile "Paw trả lời" tab) - MUST BE BEFORE /:commentId routes
router.get(
  "/user/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.find({ author: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("author", "username isPro badges")
      .populate({
        path: "threadId",
        select: "content author createdAt",
        populate: {
          path: "author",
          select: "username isPro",
        },
      });

    const total = await Comment.countDocuments({ author: userId });

    // Sanitize media
    const sanitizedComments = comments.map((comment) => {
      const commentObj = comment.toObject();
      if (commentObj.media) {
        commentObj.media = commentObj.media.map(
          ({ key, type, mimeType, size, _id }) => ({
            _id,
            key,
            type,
            mimeType,
            size,
          })
        );
      }
      return commentObj;
    });

    res.json({
      success: true,
      data: sanitizedComments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  })
);

// Create a new comment
router.post("/", authMiddleware, uploadThreadMedia, createComment);

// Get comments for a thread
router.get("/thread/:threadId", authMiddleware, getComments);

// Get replies for a specific comment
router.get("/:commentId/replies", authMiddleware, getReplies);

// Update a comment
router.patch("/:id", authMiddleware, uploadThreadMedia, updateComment);

// Delete a comment
router.delete("/:id", authMiddleware, deleteComment);

// Like/Unlike a comment
router.post("/:id/like", authMiddleware, toggleLike);

export default router;
