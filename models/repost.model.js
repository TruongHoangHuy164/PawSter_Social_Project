import mongoose from "mongoose";

const repostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
    },
    // Optional comment when reposting
    comment: { type: String, maxlength: 200 },
  },
  { 
    timestamps: true 
  }
);

// Ensure unique reposts (one user can't repost the same thread multiple times)
repostSchema.index({ user: 1, thread: 1 }, { unique: true });

// Index for efficient queries
repostSchema.index({ user: 1, createdAt: -1 });
repostSchema.index({ thread: 1, createdAt: -1 });
repostSchema.index({ createdAt: -1 });

export const Repost = mongoose.model("Repost", repostSchema);