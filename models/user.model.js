import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isPro: { type: Boolean, default: false },
    proExpiry: { type: Date },
    badges: [{ type: String }],
    // Legacy admin flag (kept for compatibility); prefer using role below
    isAdmin: { type: Boolean, default: false },
    // Role-based access control
    role: { type: String, enum: ["user", "moderator", "admin"], default: "user", index: true },
    // Account status and locking
    status: { type: String, enum: ["active", "locked"], default: "active", index: true },
    lockedUntil: { type: Date },
  lockedReason: { type: String },
    // Admin warnings history
    warnings: [
      {
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    avatarKey: { type: String },
    coverKey: { type: String },
    bio: { type: String, maxlength: 300 },
    website: { type: String },
    likedThreads: [{ type: mongoose.Schema.Types.ObjectId, ref: "Thread" }],
    repostedThreads: [{ type: mongoose.Schema.Types.ObjectId, ref: "Thread" }],
  googleId: { type: String, index: true, sparse: true },
    // OTP password reset for authenticated change
    resetOtpHash: { type: String },
    resetOtpExpires: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.virtual("friendLimit").get(function () {
  return this.isPro ? 200 : 20;
});

// Virtual convenience flags
userSchema.virtual("isLocked").get(function () {
  if (this.status === "locked") return true;
  if (this.lockedUntil && this.lockedUntil > new Date()) return true;
  return false;
});

userSchema.virtual("isModerator").get(function () {
  return this.role === "moderator" || this.role === "admin" || !!this.isAdmin;
});

export const User = mongoose.model("User", userSchema);
