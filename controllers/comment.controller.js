import asyncHandler from 'express-async-handler';
import { Comment } from '../models/comment.model.js';
import { Thread } from '../models/thread.model.js';
import { uploadBuffer, deleteMediaKeys } from '../utils/s3.js';

function detectType(mime) {
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'other';
}

const MAX_FILES = 4; // Fewer files for comments
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB per file
const MAX_TOTAL = 50 * 1024 * 1024; // 50MB total
const ALLOWED_PREFIX = ['image/','video/','audio/'];

// Create a new comment
export const createComment = asyncHandler(async (req, res) => {
  const { threadId, content, parentId } = req.body;
  const files = req.files || [];

  // Validate thread exists
  const thread = await Thread.findById(threadId);
  if (!thread) {
    return res.status(404).json({ success: false, message: 'Thread not found' });
  }

  // If parentId provided, validate parent comment exists
  if (parentId) {
    const parentComment = await Comment.findById(parentId);
    if (!parentComment || parentComment.threadId.toString() !== threadId) {
      return res.status(404).json({ success: false, message: 'Parent comment not found' });
    }
  }

  const rawContent = typeof content === 'string' ? content : '';
  const trimmedContent = rawContent.trim();

  if (!trimmedContent && files.length === 0) {
    return res.status(400).json({ success: false, message: 'Content or media required' });
  }
  if (trimmedContent.length > 500) {
    return res.status(400).json({ success: false, message: 'Content too long' });
  }
  if (files.length > MAX_FILES) {
    return res.status(400).json({ success: false, message: `Max ${MAX_FILES} files` });
  }
  
  const totalSize = files.reduce((a,f)=>a+f.size,0);
  if (totalSize > MAX_TOTAL) {
    return res.status(400).json({ success: false, message: 'Total media too large' });
  }
  
  for (const f of files) {
    if (f.size > MAX_FILE_SIZE) {
      return res.status(400).json({ success: false, message: `${f.originalname} exceeds per-file size limit` });
    }
    if (!ALLOWED_PREFIX.some(p=>f.mimetype.startsWith(p))) {
      return res.status(400).json({ success: false, message: `${f.originalname} unsupported type` });
    }
  }

  // Upload media files
  const concurrency = 3;
  const queue = [...files];
  const uploaded = [];
  let failed = false;

  async function worker() {
    while (queue.length && !failed) {
      const file = queue.shift();
      try {
        const { buffer, mimetype, originalname, size } = file;
        const ext = originalname.includes('.') ? originalname.split('.').pop() : undefined;
        const result = await uploadBuffer({ buffer, mimeType: mimetype, ext, userId: req.user._id });
        uploaded.push({
          key: result.key,
          type: detectType(mimetype),
          mimeType: mimetype,
          size
        });
      } catch (e) {
        console.error('Upload failed', e);
        failed = true;
      }
    }
  }

  if (files.length) {
    const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());
    await Promise.all(workers);
    if (failed) {
      // rollback any uploaded keys
      await deleteMediaKeys(uploaded.map(u=>u.key));
      return res.status(500).json({ success: false, message: 'Media upload failed' });
    }
  }

  try {
    const comment = await Comment.create({
      author: req.user._id,
      threadId,
      content: trimmedContent,
      media: uploaded,
      parentId: parentId || null,
      likes: [],
      likesCount: 0
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username isPro badges')
      .populate('parentId', 'author content');

    const sanitized = populatedComment.toObject();
    if (sanitized.media) {
      sanitized.media = sanitized.media.map(({ key, type, mimeType, size, _id }) => ({ _id, key, type, mimeType, size }));
    }

  // Emit real-time update
    if (req.io) {
      console.log('📡 Emitting new_comment to thread:', threadId, 'parentId:', parentId || 'none');
      
      // Get all sockets in the thread room
      const roomSockets = req.io.sockets.adapter.rooms.get(`thread_${threadId}`);
      console.log('👥 Sockets in thread room:', roomSockets?.size || 0);
      
      // Log all room names for debugging
      const allRooms = Array.from(req.io.sockets.adapter.rooms.keys());
      console.log('🏠 All active rooms:', allRooms.filter(room => room.startsWith('thread_')));
      
      // Emit immediately 
      req.io.to(`thread_${threadId}`).emit('new_comment', {
        comment: sanitized,
        threadId: threadId
      });
      
      // Also emit with delay for safety
      setTimeout(() => {
        console.log('🚀 Sending WebSocket event now...');
        req.io.to(`thread_${threadId}`).emit('new_comment', {
          comment: sanitized,
          threadId: threadId
        });
        
        // Also try emitting to all sockets as fallback
        req.io.emit('new_comment_broadcast', {
          comment: sanitized,
          threadId: threadId
        });
        console.log('📢 Broadcasted to all sockets as fallback');
      }, 100);
    } else {
      console.log('❌ No io instance available for WebSocket emit');
    }

    // Notifications
    try {
      const { notify } = await import("../utils/notifications.js");
      // Notify thread author on new top-level comment (avoid notifying self)
      if (thread && String(thread.author) !== String(req.user._id)) {
        await notify({
          io: req.io,
          userId: thread.author,
          actorId: req.user._id,
          type: "comment",
          threadId: thread._id,
          commentId: comment._id,
          meta: { parentId: parentId || null },
        });
      }
      // If replying to a comment, also notify parent comment author (if different from actor and thread author)
      if (parentId) {
        const parentComment = sanitized.parentId || (await Comment.findById(parentId));
        const parentAuthor = parentComment?.author?._id || parentComment?.author;
        if (parentAuthor && String(parentAuthor) !== String(req.user._id) && String(parentAuthor) !== String(thread.author)) {
          await notify({
            io: req.io,
            userId: parentAuthor,
            actorId: req.user._id,
            type: "comment",
            threadId: thread._id,
            commentId: comment._id,
            meta: { parentId },
          });
        }
      }
    } catch (e) {
      console.warn("Comment notification failed:", e?.message || e);
    }

    res.status(201).json({ success: true, data: sanitized });
  } catch (e) {
    console.error('Create comment validation error', e.message);
    // rollback media if DB validation fails unexpectedly
    if (uploaded.length) {
      deleteMediaKeys(uploaded.map(u=>u.key)).catch(()=>{});
    }
    return res.status(400).json({ success: false, message: e.message || 'Invalid comment' });
  }
});

// Get comments for a thread
export const getComments = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const { page = 1, limit = 20, parentId = null } = req.query;

  // Validate thread exists
  const thread = await Thread.findById(threadId);
  if (!thread) {
    return res.status(404).json({ success: false, message: 'Thread not found' });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const query = { threadId };
  if (parentId) {
    query.parentId = parentId;
  } else {
    query.parentId = null; // Only top-level comments
  }

  const comments = await Comment.find(query)
    .sort({ createdAt: -1 }) // Newest first for comments
    .skip(skip)
    .limit(parseInt(limit))
    .populate('author', 'username isPro badges')
    .populate('parentId', 'author content');

  // Get nested replies for each comment
  const commentsWithReplies = await Promise.all(
    comments.map(async (comment) => {
      const replies = await Comment.find({ parentId: comment._id })
        .sort({ createdAt: -1 }) // Newest first for replies (changed from oldest first)
        .limit(3) // Limit to 3 recent replies
        .populate('author', 'username isPro badges');
      
      const commentObj = comment.toObject();
      commentObj.replies = replies;
      commentObj.repliesCount = await Comment.countDocuments({ parentId: comment._id });
      
      // Sanitize media
      if (commentObj.media) {
        commentObj.media = commentObj.media.map(({ key, type, mimeType, size, _id }) => ({ _id, key, type, mimeType, size }));
      }
      
      return commentObj;
    })
  );

  const total = await Comment.countDocuments(query);

  res.json({
    success: true,
    data: commentsWithReplies,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Get replies for a specific comment
export const getReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found' });
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const replies = await Comment.find({ parentId: commentId })
    .sort({ createdAt: -1 }) // Newest first for replies (changed from oldest first) 
    .skip(skip)
    .limit(parseInt(limit))
    .populate('author', 'username isPro badges');

  const total = await Comment.countDocuments({ parentId: commentId });

  // Sanitize media
  const sanitizedReplies = replies.map(reply => {
    const replyObj = reply.toObject();
    if (replyObj.media) {
      replyObj.media = replyObj.media.map(({ key, type, mimeType, size, _id }) => ({ _id, key, type, mimeType, size }));
    }
    return replyObj;
  });

  res.json({
    success: true,
    data: sanitizedReplies,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Delete a comment
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found' });
  }

  // Check if user owns the comment
  if (String(comment.author) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  // Delete all replies first
  await Comment.deleteMany({ parentId: comment._id });

  // Delete the comment
  const keys = (comment.media || []).map(m=>m.key).filter(Boolean);
  await comment.deleteOne();

  // Clean up media files
  if (keys.length) {
    deleteMediaKeys(keys).catch(e=>console.error('Delete media keys failed', e));
  }

  // Emit real-time update
  if (req.io) {
    req.io.to(`thread_${comment.threadId}`).emit('comment_deleted', {
      commentId: comment._id,
      threadId: comment.threadId,
      parentId: comment.parentId
    });
  }

  res.json({ success: true, message: 'Comment deleted' });
});

// Like/Unlike a comment
export const toggleLike = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found' });
  }

  const userId = req.user._id;
  const isLiked = comment.likes.includes(userId);

  if (isLiked) {
    // Unlike
    comment.likes = comment.likes.filter(id => String(id) !== String(userId));
  } else {
    // Like
    comment.likes.push(userId);
  }

  await comment.save();

  // Emit real-time update
  if (req.io) {
    req.io.to(`thread_${comment.threadId}`).emit('comment_liked', {
      commentId: comment._id,
      threadId: comment.threadId,
      isLiked: !isLiked,
      likesCount: comment.likesCount,
      userId: req.user._id
    });
  }

  // Notification: notify comment author when their comment is liked
  try {
    if (!isLiked && String(comment.author) !== String(req.user._id)) {
      const { notify } = await import("../utils/notifications.js");
      await notify({
        io: req.io,
        userId: comment.author,
        actorId: req.user._id,
        type: "like_comment",
        threadId: comment.threadId,
        commentId: comment._id,
        meta: { target: "comment" },
      });
    }
  } catch (e) {
    console.warn("Comment like notification failed:", e?.message || e);
  }

  res.json({
    success: true,
    data: {
      isLiked: !isLiked,
      likesCount: comment.likesCount
    }
  });
});

// Update a comment
export const updateComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found' });
  }

  // Check if user owns the comment
  if (String(comment.author) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const rawContent = typeof req.body.content === 'string' ? req.body.content : '';
  const content = rawContent.trim();

  if (!content && (!comment.media || comment.media.length === 0)) {
    return res.status(400).json({ success: false, message: 'Content or media required' });
  }
  if (content.length > 500) {
    return res.status(400).json({ success: false, message: 'Content too long' });
  }

  comment.content = content;
  await comment.save();

  const populatedComment = await Comment.findById(comment._id)
    .populate('author', 'username isPro badges')
    .populate('parentId', 'author content');

  const sanitized = populatedComment.toObject();
  if (sanitized.media) {
    sanitized.media = sanitized.media.map(({ key, type, mimeType, size, _id }) => ({ _id, key, type, mimeType, size }));
  }

  res.json({ success: true, data: sanitized });
});
