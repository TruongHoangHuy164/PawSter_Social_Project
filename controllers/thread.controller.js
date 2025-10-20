import asyncHandler from "express-async-handler";
import { Thread } from "../models/thread.model.js";
import { User } from "../models/user.model.js";
import {
  uploadBuffer,
  deleteMediaKeys,
  getSignedMediaUrl,
} from "../utils/s3.js";
import crypto from "crypto";

function detectType(mime) {
  if (!mime) return "other";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "other";
}

const MAX_FILES = 6;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_TOTAL = 80 * 1024 * 1024; // 80MB total
const ALLOWED_PREFIX = ["image/", "video/", "audio/"];

function extractTags(text) {
  if (!text) return [];
  // match #hashtag with letters/numbers/underscore/hyphen
  const regex = /#([\p{L}\p{N}_-]{2,})/gu; // at least 2 chars
  const set = new Set();
  let m;
  while ((m = regex.exec(text)) !== null) {
    set.add(m[1].toLowerCase());
  }
  return Array.from(set);
}

export const createThread = asyncHandler(async (req, res) => {
  const rawContent =
    typeof req.body.content === "string" ? req.body.content : "";
  const content = rawContent.trim();
  const files = req.files || [];

  if (!content && files.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Content or media required" });
  }
  if (content.length > 500) {
    return res
      .status(400)
      .json({ success: false, message: "Content too long" });
  }
  if (files.length > MAX_FILES) {
    return res
      .status(400)
      .json({ success: false, message: `Max ${MAX_FILES} files` });
  }
  const totalSize = files.reduce((a, f) => a + f.size, 0);
  if (totalSize > MAX_TOTAL) {
    return res
      .status(400)
      .json({ success: false, message: "Total media too large" });
  }
  for (const f of files) {
    if (f.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: `${f.originalname} exceeds per-file size limit`,
      });
    }
    if (!ALLOWED_PREFIX.some((p) => f.mimetype.startsWith(p))) {
      return res.status(400).json({
        success: false,
        message: `${f.originalname} unsupported type`,
      });
    }
  }

  // Upload with limited concurrency (simple queue)
  const concurrency = 3;
  const queue = [...files];
  const uploaded = [];
  let failed = false;

  async function worker() {
    while (queue.length && !failed) {
      const file = queue.shift();
      try {
        const { buffer, mimetype, originalname, size } = file;
        const ext = originalname.includes(".")
          ? originalname.split(".").pop()
          : undefined;
        const result = await uploadBuffer({
          buffer,
          mimeType: mimetype,
          ext,
          userId: req.user._id,
        });
        uploaded.push({
          key: result.key,
          type: detectType(mimetype),
          mimeType: mimetype,
          size,
        });
      } catch (e) {
        console.error("Upload failed", e);
        failed = true;
      }
    }
  }

  if (files.length) {
    const workers = Array.from(
      { length: Math.min(concurrency, files.length) },
      () => worker()
    );
    await Promise.all(workers);
    if (failed) {
      // rollback any uploaded keys
      await deleteMediaKeys(uploaded.map((u) => u.key));
      return res
        .status(500)
        .json({ success: false, message: "Media upload failed" });
    }
  }

  try {
    const tags = extractTags(content);
    let thread = await Thread.create({
      author: req.user._id,
      content,
      media: uploaded,
      parent: null,
      tags,
    });
    // populate author to include avatarKey for signing url
    thread = await thread.populate("author", "username isPro badges avatarKey");
    const sanitized = thread.toObject();
    if (sanitized.author?.avatarKey) {
      try {
        sanitized.author.avatarUrl = await getSignedMediaUrl(
          sanitized.author.avatarKey,
          900
        );
      } catch {
        sanitized.author.avatarUrl = null;
      }
    }
    if (sanitized.media) {
      sanitized.media = sanitized.media.map(
        ({ key, type, mimeType, size, _id }) => ({
          _id,
          key,
          type,
          mimeType,
          size,
        })
      );
    }
    res.status(201).json({ success: true, data: sanitized });
  } catch (e) {
    console.error("Create thread validation error", e.message);
    // rollback media if DB validation fails unexpectedly
    if (uploaded.length) {
      deleteMediaKeys(uploaded.map((u) => u.key)).catch(() => {});
    }
    return res
      .status(400)
      .json({ success: false, message: e.message || "Invalid thread" });
  }
});

export const listThreads = asyncHandler(async (req, res) => {
  // Support filtering by author userId via query param ?author=userId
  const filter = {};
  if (req.query.author) {
    filter.author = req.query.author;
  }

  const threads = await Thread.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("author", "username isPro badges avatarKey");

  const withAvatars = await Promise.all(
    threads.map(async (t) => {
      const obj = t.toObject();
      if (obj.author?.avatarKey) {
        try {
          obj.author.avatarUrl = await getSignedMediaUrl(
            obj.author.avatarKey,
            900
          );
        } catch {
          obj.author.avatarUrl = null;
        }
      }
      return obj;
    })
  );

  res.json({ success: true, data: withAvatars });
});

export const deleteThread = asyncHandler(async (req, res) => {
  const t = await Thread.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: "Not found" });
  if (String(t.author) !== String(req.user._id))
    return res.status(403).json({ success: false, message: "Forbidden" });
  const keys = (t.media || []).map((m) => m.key).filter(Boolean);
  await t.deleteOne();
  if (keys.length) {
    deleteMediaKeys(keys).catch((e) =>
      console.error("Delete media keys failed", e)
    );
  }
  res.json({ success: true, message: "Deleted" });
});

export const getThread = asyncHandler(async (req, res) => {
  const t = await Thread.findById(req.params.id).populate(
    "author",
    "username isPro badges avatarKey"
  );
  if (!t) return res.status(404).json({ success: false, message: "Not found" });
  const obj = t.toObject();
  if (obj.author?.avatarKey) {
    try {
      obj.author.avatarUrl = await getSignedMediaUrl(obj.author.avatarKey, 900);
    } catch {
      obj.author.avatarUrl = null;
    }
  }
  res.json({ success: true, data: obj });
});

export const listReplies = asyncHandler(async (req, res) => {
  const parentId = req.params.id;
  const replies = await Thread.find({ parent: parentId })
    .sort({ createdAt: 1 })
    .populate("author", "username isPro badges avatarKey");

  const withAvatars = await Promise.all(
    replies.map(async (r) => {
      const o = r.toObject();
      if (o.author?.avatarKey) {
        try {
          o.author.avatarUrl = await getSignedMediaUrl(o.author.avatarKey, 900);
        } catch {
          o.author.avatarUrl = null;
        }
      }
      return o;
    })
  );

  res.json({ success: true, data: withAvatars });
});

export const createReply = asyncHandler(async (req, res) => {
  const parentId = req.params.id;
  const parent = await Thread.findById(parentId);
  if (!parent)
    return res
      .status(404)
      .json({ success: false, message: "Parent not found" });

  const rawContent =
    typeof req.body.content === "string" ? req.body.content : "";
  const content = rawContent.trim();
  const files = req.files || [];
  if (!content && files.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Content or media required" });
  }
  if (content.length > 500)
    return res
      .status(400)
      .json({ success: false, message: "Content too long" });
  if (files.length > MAX_FILES)
    return res
      .status(400)
      .json({ success: false, message: `Max ${MAX_FILES} files` });
  const totalSize = files.reduce((a, f) => a + f.size, 0);
  if (totalSize > MAX_TOTAL)
    return res
      .status(400)
      .json({ success: false, message: "Total media too large" });
  for (const f of files) {
    if (f.size > MAX_FILE_SIZE)
      return res.status(400).json({
        success: false,
        message: `${f.originalname} exceeds per-file size limit`,
      });
    if (!ALLOWED_PREFIX.some((p) => f.mimetype.startsWith(p)))
      return res.status(400).json({
        success: false,
        message: `${f.originalname} unsupported type`,
      });
  }

  const concurrency = 3;
  const queue = [...files];
  const uploaded = [];
  let failed = false;
  async function worker() {
    while (queue.length && !failed) {
      const file = queue.shift();
      try {
        const { buffer, mimetype, originalname, size } = file;
        const ext = originalname.includes(".")
          ? originalname.split(".").pop()
          : undefined;
        const result = await uploadBuffer({
          buffer,
          mimeType: mimetype,
          ext,
          userId: req.user._id,
        });
        uploaded.push({
          key: result.key,
          type: detectType(mimetype),
          mimeType: mimetype,
          size,
        });
      } catch (e) {
        failed = true;
      }
    }
  }
  if (files.length) {
    const workers = Array.from(
      { length: Math.min(concurrency, files.length) },
      () => worker()
    );
    await Promise.all(workers);
    if (failed) {
      await deleteMediaKeys(uploaded.map((u) => u.key));
      return res
        .status(500)
        .json({ success: false, message: "Media upload failed" });
    }
  }
  try {
    const tags = extractTags(content);
    let reply = await Thread.create({
      author: req.user._id,
      content,
      media: uploaded,
      parent: parentId,
      tags,
    });
    reply = await reply.populate("author", "username isPro badges avatarKey");
    const obj = reply.toObject();
    if (obj.author?.avatarKey) {
      try {
        obj.author.avatarUrl = await getSignedMediaUrl(
          obj.author.avatarKey,
          900
        );
      } catch {
        obj.author.avatarUrl = null;
      }
    }
    res.status(201).json({ success: true, data: obj });
  } catch (e) {
    if (uploaded.length)
      deleteMediaKeys(uploaded.map((u) => u.key)).catch(() => {});
    return res
      .status(400)
      .json({ success: false, message: e.message || "Invalid reply" });
  }
});

export const updateThread = asyncHandler(async (req, res) => {
  const t = await Thread.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: "Not found" });
  if (String(t.author) !== String(req.user._id))
    return res.status(403).json({ success: false, message: "Forbidden" });
  const rawContent =
    typeof req.body.content === "string" ? req.body.content : "";
  const content = rawContent.trim();
  if (!content && (!t.media || t.media.length === 0))
    return res
      .status(400)
      .json({ success: false, message: "Content or media required" });
  if (content.length > 500)
    return res
      .status(400)
      .json({ success: false, message: "Content too long" });
  t.content = content;
  t.tags = extractTags(content);
  await t.save();
  res.json({ success: true, data: t });
});

export const listByTag = asyncHandler(async (req, res) => {
  const tag = String(req.params.tag || "").toLowerCase();
  if (!tag)
    return res.status(400).json({ success: false, message: "Tag required" });
  const items = await Thread.find({ parent: null, tags: tag })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("author", "username isPro badges avatarKey");

  const withAvatars = await Promise.all(
    items.map(async (t) => {
      const obj = t.toObject();
      if (obj.author?.avatarKey) {
        try {
          obj.author.avatarUrl = await getSignedMediaUrl(
            obj.author.avatarKey,
            900
          );
        } catch {
          obj.author.avatarUrl = null;
        }
      }
      return obj;
    })
  );

  res.json({ success: true, data: withAvatars });
});

// Like a thread
export const likeThread = asyncHandler(async (req, res) => {
  const threadId = req.params.id;
  const userId = req.user._id;

  const thread = await Thread.findById(threadId);
  if (!thread)
    return res
      .status(404)
      .json({ success: false, message: "Thread not found" });

  // Check if already liked
  if (thread.likes.includes(userId)) {
    return res.status(400).json({ success: false, message: "Already liked" });
  }

  // Add to thread likes and user likedThreads atomically
  await Promise.all([
    Thread.updateOne({ _id: threadId }, { $addToSet: { likes: userId } }),
    User.updateOne({ _id: userId }, { $addToSet: { likedThreads: threadId } }),
  ]);

  res.json({ success: true, message: "Thread liked" });
});

// Unlike a thread
export const unlikeThread = asyncHandler(async (req, res) => {
  const threadId = req.params.id;
  const userId = req.user._id;

  const thread = await Thread.findById(threadId);
  if (!thread)
    return res
      .status(404)
      .json({ success: false, message: "Thread not found" });

  // Remove from thread likes and user likedThreads atomically
  await Promise.all([
    Thread.updateOne({ _id: threadId }, { $pull: { likes: userId } }),
    User.updateOne({ _id: userId }, { $pull: { likedThreads: threadId } }),
  ]);

  res.json({ success: true, message: "Thread unliked" });
});

// Repost a thread
export const repostThread = asyncHandler(async (req, res) => {
  const threadId = req.params.id;
  const userId = req.user._id;

  const thread = await Thread.findById(threadId);
  if (!thread)
    return res
      .status(404)
      .json({ success: false, message: "Thread not found" });

  // Check if already reposted
  if (thread.reposts.includes(userId)) {
    return res
      .status(400)
      .json({ success: false, message: "Already reposted" });
  }

  // Add to thread reposts and user repostedThreads atomically
  await Promise.all([
    Thread.updateOne({ _id: threadId }, { $addToSet: { reposts: userId } }),
    User.updateOne(
      { _id: userId },
      { $addToSet: { repostedThreads: threadId } }
    ),
  ]);

  res.json({ success: true, message: "Thread reposted" });
});

// Unrepost a thread
export const unrepostThread = asyncHandler(async (req, res) => {
  const threadId = req.params.id;
  const userId = req.user._id;

  const thread = await Thread.findById(threadId);
  if (!thread)
    return res
      .status(404)
      .json({ success: false, message: "Thread not found" });

  // Remove from thread reposts and user repostedThreads atomically
  await Promise.all([
    Thread.updateOne({ _id: threadId }, { $pull: { reposts: userId } }),
    User.updateOne({ _id: userId }, { $pull: { repostedThreads: threadId } }),
  ]);

  res.json({ success: true, message: "Thread unreposted" });
});

// Get user's liked threads (favorites)
export const getFavorites = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;

  const user = await User.findById(userId).populate({
    path: "likedThreads",
    populate: { path: "author", select: "username isPro badges avatarKey" },
    options: { sort: { createdAt: -1 } },
  });

  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const withAvatars = await Promise.all(
    (user.likedThreads || []).map(async (t) => {
      const obj = t.toObject();
      if (obj.author?.avatarKey) {
        try {
          obj.author.avatarUrl = await getSignedMediaUrl(
            obj.author.avatarKey,
            900
          );
        } catch {
          obj.author.avatarUrl = null;
        }
      }
      return obj;
    })
  );

  res.json({ success: true, data: withAvatars });
});

// Get user's reposted threads
export const getReposts = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;

  const user = await User.findById(userId).populate({
    path: "repostedThreads",
    populate: { path: "author", select: "username isPro badges avatarKey" },
    options: { sort: { createdAt: -1 } },
  });

  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const withAvatars = await Promise.all(
    (user.repostedThreads || []).map(async (t) => {
      const obj = t.toObject();
      if (obj.author?.avatarKey) {
        try {
          obj.author.avatarUrl = await getSignedMediaUrl(
            obj.author.avatarKey,
            900
          );
        } catch {
          obj.author.avatarUrl = null;
        }
      }
      return obj;
    })
  );

  res.json({ success: true, data: withAvatars });
});
