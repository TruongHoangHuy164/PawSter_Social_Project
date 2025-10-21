import mongoose from "mongoose";

const mediaSubSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // S3 object key for future deletion
    type: {
      type: String,
      enum: ["image", "video", "audio", "other"],
      required: true,
    },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // bytes
    duration: { type: Number }, // seconds (only for audio/video)
    width: { type: Number }, // optional for images/video
    height: { type: Number },
    thumbnailUrl: { type: String }, // future video/image optimization
    // Optional per-media moderation details for fine-grained UI handling
    moderation: {
      score: { type: Number, default: 0 }, // 0..1
      decision: { type: String, enum: ["APPROVE", "FLAG", "REJECT"], default: "APPROVE" },
      // Could contain detailed categories like nudity_explicit, violence_graphic, etc.
      categories: { type: [String], default: [] },
    },
  },
  { _id: false, timestamps: false }
);

const threadSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, maxlength: 500 },
    media: { type: [mediaSubSchema], default: [] },
    // Parent thread for replies; null for root posts
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Thread", default: null },
    // Extracted hashtags for filtering and discovery
    tags: { type: [String], default: [] },
    // Moderation status for visibility / review pipeline
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "FLAGGED", "REJECTED"],
      default: "APPROVED",
      index: true,
    },
    moderation: {
      autoFlagScore: { type: Number, default: 0 }, // 0..1
      categories: { type: [String], default: [] }, // e.g., violence_hard, sexual_explicit, self_harm, hate
      action: { type: String }, // APPROVE | FLAG | REJECT
      notes: { type: String },
      reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewedAt: { type: Date },
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Denormalized counters for admin analytics/sorting
    likesCount: { type: Number, default: 0 },
    reposts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

threadSchema.pre("validate", function (next) {
  if (!this.content && (!this.media || this.media.length === 0)) {
    return next(new Error("Content or media required"));
  }
  next();
});

threadSchema.index({ createdAt: -1 });
threadSchema.index({ parent: 1, createdAt: 1 });
threadSchema.index({ tags: 1, createdAt: -1 });

export const Thread = mongoose.model("Thread", threadSchema);
