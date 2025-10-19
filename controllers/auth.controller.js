import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { sendEmail } from "../utils/email.js";
import axios from "axios";

const signToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists)
    return res
      .status(400)
      .json({ success: false, message: "User already exists" });
  const user = await User.create({ username, email, password });
  const token = signToken(user);
  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        username,
        email,
        isAdmin: user.isAdmin,
        isPro: user.isPro,
        friends: user.friends,
        followers: user.followers,
        following: user.following,
        friendLimit: user.friendLimit,
      },
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const emailRaw = req.body?.email;
  const password = req.body?.password;
  const email =
    typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : emailRaw;
  if (!email || !password)
    return res
      .status(400)
      .json({ success: false, message: "Missing credentials" });
  const user = await User.findOne({ email });
  if (!user)
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  const match = await user.comparePassword(password);
  if (!match)
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  const token = signToken(user);
  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isPro: user.isPro,
        isAdmin: user.isAdmin,
        friends: user.friends,
        followers: user.followers,
        following: user.following,
        friendLimit: user.friendLimit,
      },
    },
  });
});
// POST /auth/google - verify Google ID token and login/register
export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ success: false, message: "Missing idToken" });

  // Verify token with Google
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const { data: info } = await axios.get(tokenInfoUrl);
  // Validate aud
  if (googleClientId && info.aud !== googleClientId) {
    return res.status(401).json({ success: false, message: "Invalid Google token audience" });
  }

  const email = String(info.email || '').toLowerCase();
  const sub = info.sub; // Google's unique user ID
  const name = info.name || email.split('@')[0];
  if (!email || !sub) return res.status(400).json({ success: false, message: "Invalid Google token payload" });

  let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });
  if (!user) {
    // Create a user with a random password
    const randomPwd = crypto.randomBytes(12).toString('hex');
    const usernameBase = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 18) || `user${sub.slice(-6)}`;
    let username = usernameBase;
    // Ensure unique username
    for (let i = 0; i < 5; i++) {
      const exists = await User.findOne({ username });
      if (!exists) break;
      username = `${usernameBase}${Math.floor(Math.random()*1000)}`;
    }
    user = await User.create({ username, email, password: randomPwd, googleId: sub });
  } else if (!user.googleId) {
    user.googleId = sub; await user.save();
  }

  const token = signToken(user);
  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isPro: user.isPro,
        isAdmin: user.isAdmin,
        friends: user.friends,
        friendLimit: user.friendLimit,
      },
    },
  });
});

// Helper to hash OTP for storage
const hashOtp = (otp) =>
  crypto.createHash("sha256").update(String(otp)).digest("hex");

// POST /auth/password/otp - request OTP to change password (must be authenticated)
export const requestPasswordOtp = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  // generate 6-digit numeric OTP
  const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
  user.resetOtpHash = hashOtp(otp);
  user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: "Mã OTP đổi mật khẩu Pawster",
      text: `Mã OTP của bạn là ${otp}. OTP hết hạn sau 10 phút.`,
      html: `<p>Mã OTP của bạn là <b>${otp}</b>.</p><p>OTP hết hạn sau 10 phút.</p>`,
    });
    return res.json({ success: true, message: "Đã gửi OTP tới email của bạn" });
  } catch (e) {
    const msg = e?.message || String(e);
    console.error("Failed to send OTP email:", msg);
    // In development, log OTP to console to unblock testing
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[DEV ONLY] OTP for ${user.email}: ${otp}`);
    }
    return res
      .status(500)
      .json({ success: false, message: "Gửi email OTP thất bại. Kiểm tra cấu hình SMTP (SMTP_HOST/PORT/USER/PASS)." });
  }
});

// POST /auth/password/change - change password with OTP { otp, newPassword }
export const changePasswordWithOtp = asyncHandler(async (req, res) => {
  const { otp, newPassword } = req.body || {};
  if (!otp || !newPassword)
    return res.status(400).json({ success: false, message: "Thiếu OTP hoặc mật khẩu mới" });

  const userId = req.user?.id || req.user?._id;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  if (!user.resetOtpHash || !user.resetOtpExpires)
    return res.status(400).json({ success: false, message: "OTP không hợp lệ" });
  if (user.resetOtpExpires.getTime() < Date.now())
    return res.status(400).json({ success: false, message: "OTP đã hết hạn" });

  const valid = user.resetOtpHash === hashOtp(otp);
  if (!valid) return res.status(400).json({ success: false, message: "OTP không chính xác" });

  user.password = newPassword; // will be hashed by pre-save hook
  user.resetOtpHash = undefined;
  user.resetOtpExpires = undefined;
  await user.save();

  res.json({ success: true, message: "Đổi mật khẩu thành công" });
});
