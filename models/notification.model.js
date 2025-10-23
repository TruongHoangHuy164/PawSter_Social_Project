import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // recipient
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who triggered
    type: {
      type: String,
      enum: [
        "friend_accepted",
        "follow",
        "comment",
        "like_thread",
        "like_comment",
        "repost_thread",
        "content_warning",
      ],
      required: true,
    },
    thread: { type: mongoose.Schema.Types.ObjectId, ref: "Thread" },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
    read: { type: Boolean, default: false },
    meta: { type: Object },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
