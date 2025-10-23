import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createThread,
  listThreads,
  deleteThread,
  createReply,
  getThread,
  listReplies,
  updateThread,
  listByTag,
  likeThread,
  unlikeThread,
  repostThread,
  unrepostThread,
  getFavorites,
  getReposts,
  getThreadsByHashtag,
  getTrendingHashtags,
} from "../controllers/thread.controller.js";
import { uploadThreadMedia } from "../middleware/uploadMiddleware.js";

const router = Router();
router.post("/", authMiddleware, uploadThreadMedia, createThread);
router.get("/", authMiddleware, listThreads);
router.get("/tag/:tag", authMiddleware, listByTag);
router.get("/hashtag/:tag", authMiddleware, getThreadsByHashtag);
router.get("/hashtags/trending", authMiddleware, getTrendingHashtags);
router.get("/:id", authMiddleware, getThread);
router.get("/:id/replies", authMiddleware, listReplies);
router.post("/:id/replies", authMiddleware, uploadThreadMedia, createReply);
router.patch("/:id", authMiddleware, uploadThreadMedia, updateThread);
router.delete("/:id", authMiddleware, deleteThread);

// Like/Unlike routes
router.post("/:id/like", authMiddleware, likeThread);
router.delete("/:id/like", authMiddleware, unlikeThread);

// Repost/Unrepost routes
router.post("/:id/repost", authMiddleware, repostThread);
router.delete("/:id/repost", authMiddleware, unrepostThread);

// Get favorites and reposts
router.get("/favorites/:userId", authMiddleware, getFavorites);
router.get("/reposts/:userId", authMiddleware, getReposts);

export default router;
