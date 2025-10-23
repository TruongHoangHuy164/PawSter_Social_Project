import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getMe,
  updateMe,
  getFriends,
  acceptFriend,
  rejectFriend,
  getProfile,
  updateProfile,
  sendFriendRequest,
  getReceivedRequests,
  getSentRequests,
  searchUsers,
  cancelFriendRequest,
  removeFriend,
  getUserById,
  followUser,
  unfollowUser,
  getFollowSuggestions,
} from "../controllers/user.controller.js";
import { profileUpload } from "../middleware/profileUpload.js";

const router = Router();
router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);
router.get("/me/profile", authMiddleware, getProfile);
router.patch("/me/profile", authMiddleware, profileUpload, updateProfile);

// Friends management
router.get("/:id/friends", authMiddleware, getFriends);
router.post("/friends/:id/send", authMiddleware, sendFriendRequest);
router.post("/friends/:id/accept", authMiddleware, acceptFriend);
router.post("/friends/:id/reject", authMiddleware, rejectFriend);
router.delete("/friends/:id/cancel", authMiddleware, cancelFriendRequest);
router.delete("/friends/:id/remove", authMiddleware, removeFriend);

// Friend requests
router.get("/friends/requests/received", authMiddleware, getReceivedRequests);
router.get("/friends/requests/sent", authMiddleware, getSentRequests);

// Search users
router.get("/search", authMiddleware, searchUsers);

// Follow/Unfollow
router.post("/:id/follow", authMiddleware, followUser);
router.delete("/:id/follow", authMiddleware, unfollowUser);

// Follow suggestions
router.get("/suggestions", authMiddleware, getFollowSuggestions);

// Public profile
router.get("/:id", authMiddleware, getUserById);

export default router;
