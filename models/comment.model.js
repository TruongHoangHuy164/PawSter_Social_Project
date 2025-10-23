import mongoose from 'mongoose';

const mediaSubSchema = new mongoose.Schema({
  key: { type: String, required: true },          // S3 object key for future deletion
  type: { type: String, enum: ['image', 'video', 'audio', 'other'], required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },         // bytes
  duration: { type: Number },                     // seconds (only for audio/video)
  width: { type: Number },                        // optional for images/video
  height: { type: Number },
  thumbnailUrl: { type: String },                 // future video/image optimization
}, { _id: false, timestamps: false });

const moderationSubSchema = new mongoose.Schema({
  score: { type: Number, default: 0 },
  categories: { type: [String], default: [] },
  decision: { type: String, enum: ["APPROVE", "FLAG", "REJECT"], default: "APPROVE" },
  labels: { type: [String], default: [] },
  notes: { type: String },
  reviewedAt: { type: Date },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false, timestamps: false });

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true },
  content: { type: String, maxlength: 500 },
  media: { type: [mediaSubSchema], default: [] },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }, // for nested replies
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
  status: { type: String, enum: ['APPROVED', 'FLAGGED', 'REJECTED'], default: 'APPROVED', index: true },
  moderation: { type: moderationSubSchema, default: undefined },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

commentSchema.pre('validate', function(next) {
  if (!this.content && (!this.media || this.media.length === 0)) {
    return next(new Error('Content or media required'));
  }
  next();
});

commentSchema.pre('save', function(next) {
  // Auto-update likesCount
  this.likesCount = this.likes ? this.likes.length : 0;
  next();
});

// Indexes for better performance
commentSchema.index({ threadId: 1, createdAt: -1 });
commentSchema.index({ parentId: 1, createdAt: 1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ status: 1, createdAt: -1 });

export const Comment = mongoose.model('Comment', commentSchema);

