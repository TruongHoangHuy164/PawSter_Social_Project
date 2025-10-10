import asyncHandler from "express-async-handler";
import { User } from "../models/user.model.js";
import { FriendRequest } from "../models/friendRequest.model.js";
import {
  uploadBuffer,
  getSignedMediaUrl,
  deleteMediaKey,
} from "../utils/s3.js";
import path from "path";

export const getMe = asyncHandler(async (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    data: {
      _id: u._id,
      username: u.username,
      email: u.email,
      isPro: u.isPro,
      isAdmin: u.isAdmin,
    },
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const allowed = ["username"];
  const updates = {};
  for (const key of allowed) if (req.body[key]) updates[key] = req.body[key];
  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
  }).select("-password");
  res.json({ success: true, data: user });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  let avatarUrl = null,
    coverUrl = null;
  if (user.avatarKey) avatarUrl = await getSignedMediaUrl(user.avatarKey, 900);
  if (user.coverKey) coverUrl = await getSignedMediaUrl(user.coverKey, 900);
  res.json({
    success: true,
    data: {
      _id: user._id,
      username: user.username,
      email: user.email,
      isPro: user.isPro,
      friends: user.friends,
      badges: user.badges,
      avatarKey: user.avatarKey,
      coverKey: user.coverKey,
      avatarUrl,
      coverUrl,
      bio: user.bio || "",
      website: user.website || "",
    },
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const { bio, website, username } = req.body;
  if (typeof bio !== "undefined") user.bio = String(bio).slice(0, 300);
  if (typeof website !== "undefined")
    user.website = String(website).slice(0, 200);
  if (typeof username !== "undefined" && username.trim())
    user.username = username.trim();

  const files = req.files || {};
  const toDelete = [];
  // avatar
  if (files.avatar && files.avatar[0]) {
    if (user.avatarKey) toDelete.push(user.avatarKey); // we delete after successful upload new one
    const f = files.avatar[0];
    const ext =
      path.extname(f.originalname).replace(".", "") ||
      f.mimetype?.split("/")?.[1];
    const { key } = await uploadBuffer({
      buffer: f.buffer,
      mimeType: f.mimetype,
      folder: "avatars",
      ext,
      userId: user._id,
    });
    user.avatarKey = key;
  }
  // cover
  if (files.cover && files.cover[0]) {
    if (user.coverKey) toDelete.push(user.coverKey);
    const f = files.cover[0];
    const ext =
      path.extname(f.originalname).replace(".", "") ||
      f.mimetype?.split("/")?.[1];
    const { key } = await uploadBuffer({
      buffer: f.buffer,
      mimeType: f.mimetype,
      folder: "covers",
      ext,
      userId: user._id,
    });
    user.coverKey = key;
  }

  await user.save();
  // delete old keys AFTER save (ignore errors)
  for (const k of toDelete) {
    try {
      await deleteMediaKey(k);
    } catch (e) {
      /* ignore */
    }
  }

  const avatarUrl = user.avatarKey
    ? await getSignedMediaUrl(user.avatarKey, 900)
    : null;
  const coverUrl = user.coverKey
    ? await getSignedMediaUrl(user.coverKey, 900)
    : null;

  res.json({
    success: true,
    data: {
      _id: user._id,
      username: user.username,
      email: user.email,
      isPro: user.isPro,
      friends: user.friends,
      badges: user.badges,
      avatarKey: user.avatarKey,
      coverKey: user.coverKey,
      avatarUrl,
      coverUrl,
      bio: user.bio || "",
      website: user.website || "",
    },
  });
});

export const getFriends = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate(
    "friends",
    "username email isPro badges avatarKey"
  );
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  // Add avatar URLs to friends
  const friendsWithAvatars = await Promise.all(
    user.friends.map(async (friend) => {
      const friendObj = friend.toObject();
      if (friendObj.avatarKey) {
        try {
          friendObj.avatarUrl = await getSignedMediaUrl(
            friendObj.avatarKey,
            900
          );
        } catch (error) {
          console.error("Error generating avatar URL:", error);
          friendObj.avatarUrl = null;
        }
      } else {
        friendObj.avatarUrl = null;
      }
      return friendObj;
    })
  );

  res.json({ success: true, data: friendsWithAvatars });
});

// Send friend request directly
export const sendFriendRequest = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;

  if (String(targetUserId) === String(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: "Cannot send friend request to yourself",
    });
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser)
    return res.status(404).json({ success: false, message: "User not found" });

  // Check if already friends
  if (targetUser.friends.includes(req.user._id)) {
    return res.status(400).json({ success: false, message: "Already friends" });
  }

  // Check friend limits
  if (req.user.friends.length >= req.user.friendLimit) {
    const userType = req.user.isPro ? "Pro" : "thường";
    return res.status(400).json({
      success: false,
      message: `Bạn đã đạt giới hạn kết bạn! Tài khoản ${userType} chỉ có thể kết bạn tối đa ${req.user.friendLimit} người. Hiện tại bạn đã có ${req.user.friends.length} bạn bè.`,
    });
  }

  if (targetUser.friends.length >= targetUser.friendLimit) {
    const targetUserType = targetUser.isPro ? "Pro" : "thường";
    return res.status(400).json({
      success: false,
      message: `${targetUser.username} đã đạt giới hạn kết bạn! Tài khoản ${targetUserType} chỉ có thể kết bạn tối đa ${targetUser.friendLimit} người.`,
    });
  }

  // Check if request already exists
  const existing = await FriendRequest.findOne({
    from: req.user._id,
    to: targetUserId,
  });
  if (existing && existing.status === "pending") {
    return res
      .status(400)
      .json({ success: false, message: "Friend request already sent" });
  }

  if (existing && existing.status === "rejected") {
    existing.status = "pending";
    await existing.save();
    return res.json({ success: true, message: "Friend request re-sent" });
  }

  await FriendRequest.create({ from: req.user._id, to: targetUserId });
  res.status(201).json({ success: true, message: "Friend request sent" });
});

// Get received friend requests
export const getReceivedRequests = asyncHandler(async (req, res) => {
  const requests = await FriendRequest.find({
    to: req.user._id,
    status: "pending",
  }).populate("from", "username email isPro badges avatarKey");

  // Add avatar URLs
  const requestsWithAvatars = await Promise.all(
    requests.map(async (request) => {
      const requestObj = request.toObject();
      if (requestObj.from.avatarKey) {
        try {
          requestObj.from.avatarUrl = await getSignedMediaUrl(
            requestObj.from.avatarKey,
            900
          );
        } catch (error) {
          console.error("Error generating avatar URL:", error);
          requestObj.from.avatarUrl = null;
        }
      } else {
        requestObj.from.avatarUrl = null;
      }
      return requestObj;
    })
  );

  res.json({ success: true, data: requestsWithAvatars });
});

// Get sent friend requests
export const getSentRequests = asyncHandler(async (req, res) => {
  const requests = await FriendRequest.find({
    from: req.user._id,
    status: "pending",
  }).populate("to", "username email isPro badges avatarKey");

  // Add avatar URLs
  const requestsWithAvatars = await Promise.all(
    requests.map(async (request) => {
      const requestObj = request.toObject();
      if (requestObj.to.avatarKey) {
        try {
          requestObj.to.avatarUrl = await getSignedMediaUrl(
            requestObj.to.avatarKey,
            900
          );
        } catch (error) {
          console.error("Error generating avatar URL:", error);
          requestObj.to.avatarUrl = null;
        }
      } else {
        requestObj.to.avatarUrl = null;
      }
      return requestObj;
    })
  );

  res.json({ success: true, data: requestsWithAvatars });
});

// Search users
export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res
      .status(400)
      .json({ success: false, message: "Query must be at least 2 characters" });
  }

  const users = await User.find({
    $and: [
      { _id: { $ne: req.user._id } }, // Exclude current user
      {
        $or: [
          { username: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      },
    ],
  })
    .select("username email isPro badges avatarKey")
    .limit(20);

  // Add friendship status for each user
  const userIds = users.map((u) => u._id);
  const friendRequests = await FriendRequest.find({
    $or: [
      { from: req.user._id, to: { $in: userIds } },
      { from: { $in: userIds }, to: req.user._id },
    ],
  });

  const usersWithStatus = await Promise.all(
    users.map(async (user) => {
      let friendshipStatus = "none";

      // Check if already friends
      if (req.user.friends.includes(user._id)) {
        friendshipStatus = "friends";
      } else {
        // Check friend requests
        const sentRequest = friendRequests.find(
          (fr) =>
            String(fr.from) === String(req.user._id) &&
            String(fr.to) === String(user._id)
        );
        const receivedRequest = friendRequests.find(
          (fr) =>
            String(fr.from) === String(user._id) &&
            String(fr.to) === String(req.user._id)
        );

        if (sentRequest && sentRequest.status === "pending") {
          friendshipStatus = "sent";
        } else if (receivedRequest && receivedRequest.status === "pending") {
          friendshipStatus = "received";
        }
      }

      // Add avatar URL
      let avatarUrl = null;
      if (user.avatarKey) {
        try {
          avatarUrl = await getSignedMediaUrl(user.avatarKey, 900);
        } catch (error) {
          console.error("Error generating avatar URL:", error);
        }
      }

      return {
        ...user.toObject(),
        friendshipStatus,
        avatarUrl,
      };
    })
  );

  res.json({ success: true, data: usersWithStatus });
});

export const acceptFriend = asyncHandler(async (req, res) => {
  const requestId = req.params.id;
  const fr = await FriendRequest.findById(requestId);
  if (!fr || fr.status !== "pending")
    return res
      .status(404)
      .json({ success: false, message: "Request not found" });
  if (String(fr.to) !== String(req.user._id))
    return res.status(403).json({ success: false, message: "Not authorized" });

  const fromUser = await User.findById(fr.from);
  const toUser = await User.findById(fr.to);
  if (!fromUser || !toUser)
    return res.status(404).json({ success: false, message: "Users missing" });

  if (fromUser.friends.length >= fromUser.friendLimit) {
    const fromUserType = fromUser.isPro ? "Pro" : "thường";
    return res.status(400).json({
      success: false,
      message: `Không thể chấp nhận lời mời! Bạn đã đạt giới hạn kết bạn. Tài khoản ${fromUserType} chỉ có thể kết bạn tối đa ${fromUser.friendLimit} người.`,
    });
  }

  if (toUser.friends.length >= toUser.friendLimit) {
    const toUserType = toUser.isPro ? "Pro" : "thường";
    return res.status(400).json({
      success: false,
      message: `Không thể chấp nhận lời mời! Bạn đã đạt giới hạn kết bạn. Tài khoản ${toUserType} chỉ có thể kết bạn tối đa ${toUser.friendLimit} người.`,
    });
  }

  fromUser.friends.push(toUser._id);
  toUser.friends.push(fromUser._id);
  fr.status = "accepted";
  await Promise.all([fromUser.save(), toUser.save(), fr.save()]);
  res.json({ success: true, message: "Friend request accepted" });
});

// Reject friend request
export const rejectFriend = asyncHandler(async (req, res) => {
  const requestId = req.params.id;
  const fr = await FriendRequest.findById(requestId);
  if (!fr || fr.status !== "pending")
    return res
      .status(404)
      .json({ success: false, message: "Request not found" });
  if (String(fr.to) !== String(req.user._id))
    return res.status(403).json({ success: false, message: "Not authorized" });

  fr.status = "rejected";
  await fr.save();
  res.json({ success: true, message: "Friend request rejected" });
});

// Cancel sent friend request
export const cancelFriendRequest = asyncHandler(async (req, res) => {
  const requestId = req.params.id;
  const fr = await FriendRequest.findById(requestId);
  if (!fr || fr.status !== "pending")
    return res
      .status(404)
      .json({ success: false, message: "Request not found" });
  if (String(fr.from) !== String(req.user._id))
    return res.status(403).json({ success: false, message: "Not authorized" });

  await FriendRequest.findByIdAndDelete(requestId);
  res.json({ success: true, message: "Friend request cancelled" });
});

// Remove friend (unfriend)
export const removeFriend = asyncHandler(async (req, res) => {
  const friendId = req.params.id;

  if (String(friendId) === String(req.user._id)) {
    return res
      .status(400)
      .json({ success: false, message: "Cannot unfriend yourself" });
  }

  const currentUser = await User.findById(req.user._id);
  const friendUser = await User.findById(friendId);

  if (!friendUser) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Check if they are actually friends
  if (!currentUser.friends.includes(friendId)) {
    return res
      .status(400)
      .json({ success: false, message: "Not friends with this user" });
  }

  // Remove each other from friends lists
  currentUser.friends = currentUser.friends.filter(
    (id) => String(id) !== String(friendId)
  );
  friendUser.friends = friendUser.friends.filter(
    (id) => String(id) !== String(req.user._id)
  );

  // Save both users
  await Promise.all([currentUser.save(), friendUser.save()]);

  res.json({ success: true, message: "Friend removed successfully" });
});
