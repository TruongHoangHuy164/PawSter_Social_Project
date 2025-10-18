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
    isPro: { type: Boolean, default: false },
    proExpiry: { type: Date },
    badges: [{ type: String }],
    isAdmin: { type: Boolean, default: false },
    avatarKey: { type: String },
    coverKey: { type: String },
    bio: { type: String, maxlength: 300 },
    website: { type: String },
    likedThreads: [{ type: mongoose.Schema.Types.ObjectId, ref: "Thread" }],
    repostedThreads: [{ type: mongoose.Schema.Types.ObjectId, ref: "Thread" }],
  },
  { timestamps: true }
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
  return this.isPro ? 30 : 20;
});

export const User = mongoose.model("User", userSchema);
