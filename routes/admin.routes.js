import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import { User } from "../models/user.model.js";
import { Thread } from "../models/thread.model.js";
import { Payment } from "../models/payment.model.js";
import { getPaymentStats } from "../controllers/payment.controller.js";
import asyncHandler from "express-async-handler";

const router = Router();

router.use(authMiddleware, adminOnly);

router.get("/stats", async (req, res) => {
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get counts
  const [
    totalUsers,
    totalThreads,
    paidPayments,
    pendingPayments,
    proUsers,
    newUsersLast30,
    newUsersLast60,
    newThreadsThisMonth,
    totalRevenue,
    revenueThisMonth,
  ] = await Promise.all([
    User.countDocuments(),
    Thread.countDocuments(),
    Payment.countDocuments({ status: "paid" }),
    Payment.countDocuments({ status: "pending" }),
    User.countDocuments({ isPro: true }),
    User.countDocuments({ createdAt: { $gte: last30Days } }),
    User.countDocuments({
      createdAt: { $gte: last60Days, $lt: last30Days },
    }),
    Thread.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: { status: "paid", createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  // Calculate growth percentages
  const userGrowth =
    newUsersLast60 > 0
      ? (((newUsersLast30 - newUsersLast60) / newUsersLast60) * 100).toFixed(1)
      : 0;

  const totalRev = totalRevenue[0]?.total || 0;
  const monthRev = revenueThisMonth[0]?.total || 0;

  // Get user growth trend (last 30 days)
  const userTrend = await User.aggregate([
    {
      $match: { createdAt: { $gte: last30Days } },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        total: { $sum: 1 },
        pro: { $sum: { $cond: ["$isPro", 1, 0] } },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  // Get revenue trend (last 12 months)
  const last12Months = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const revenueTrend = await Payment.aggregate([
    {
      $match: {
        status: "paid",
        createdAt: { $gte: last12Months },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  // Get latest users (5)
  const latestUsers = await User.find()
    .select("username email isPro createdAt")
    .sort({ createdAt: -1 })
    .limit(5);

  // Get latest threads (5)
  const latestThreads = await Thread.find()
    .select("content author createdAt likesCount")
    .populate("author", "username isPro")
    .sort({ createdAt: -1 })
    .limit(5);

  // Get top threads by likes
  const topThreads = await Thread.find()
    .select("content author likesCount createdAt")
    .populate("author", "username isPro")
    .sort({ likesCount: -1 })
    .limit(5);

  // Get most active users (by thread count)
  const topUsers = await Thread.aggregate([
    {
      $group: {
        _id: "$author",
        threadCount: { $sum: 1 },
        totalLikes: { $sum: "$likesCount" },
      },
    },
    { $sort: { threadCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        username: "$user.username",
        isPro: "$user.isPro",
        threadCount: 1,
        totalLikes: 1,
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      summary: {
        totalUsers,
        totalThreads,
        totalRevenue: totalRev,
        revenueThisMonth: monthRev,
        proUsers,
        pendingPayments,
        newUsersLast30,
        newThreadsThisMonth,
        userGrowth: parseFloat(userGrowth),
      },
      trends: {
        users: userTrend.map((item) => ({
          date: `${item._id.year}-${String(item._id.month).padStart(
            2,
            "0"
          )}-${String(item._id.day).padStart(2, "0")}`,
          total: item.total,
          pro: item.pro,
        })),
        revenue: revenueTrend.map((item) => ({
          month: item._id.month,
          year: item._id.year,
          amount: item.total,
          count: item.count,
        })),
      },
      latest: {
        users: latestUsers,
        threads: latestThreads,
      },
      top: {
        threads: topThreads,
        users: topUsers,
      },
    },
  });
});

// Users with filters: q (username/email), role, status
router.get("/users", async (req, res) => {
  const { q, role, status } = req.query;
  const filter = {};
  if (q) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
    filter.$or = [{ username: rx }, { email: rx }];
  }
  if (role) filter.role = role;
  if (status) filter.status = status;
  const items = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 })
    .limit(300);
  res.json({ success: true, data: items });
});

// User registration statistics
router.get("/users/stats", async (req, res) => {
  const { period = "30d" } = req.query; // 7d, 30d, 90d, 12m

  let startDate;
  const now = new Date();

  switch (period) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "12m":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Aggregate user registrations by date
  const stats = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        total: { $sum: 1 },
        proUsers: {
          $sum: { $cond: ["$isPro", 1, 0] },
        },
        freeUsers: {
          $sum: { $cond: ["$isPro", 0, 1] },
        },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
    },
  ]);

  // Format results
  const formattedStats = stats.map((item) => ({
    date: `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(
      item._id.day
    ).padStart(2, "0")}`,
    total: item.total,
    pro: item.proUsers,
    free: item.freeUsers,
  }));

  // Get summary
  const totalUsers = await User.countDocuments();
  const proUsers = await User.countDocuments({ isPro: true });
  const freeUsers = totalUsers - proUsers;
  const newUsers = await User.countDocuments({
    createdAt: { $gte: startDate },
  });

  res.json({
    success: true,
    data: {
      stats: formattedStats,
      summary: {
        total: totalUsers,
        pro: proUsers,
        free: freeUsers,
        new: newUsers,
        period,
      },
    },
  });
});

// Basic updates (pro/admin/badges/role/status)
router.patch("/users/:id", async (req, res) => {
  const allowed = ["isPro", "isAdmin", "badges", "role", "status", "lockedUntil"];
  const updates = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
  }).select("-password");
  if (!user) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: user });
});

// Lock user (temporary or immediate). Accepts { hours?: number, until?: ISO, reason?: string }
router.post("/users/:id/lock", asyncHandler(async (req, res) => {
  const { hours, until, reason } = req.body || {};
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ success: false, message: "Not found" });
  let lockedUntil = until ? new Date(until) : undefined;
  if (!lockedUntil && hours) lockedUntil = new Date(Date.now() + Number(hours) * 3600 * 1000);
  u.status = "locked";
  u.lockedUntil = lockedUntil || new Date(Date.now() + 24 * 3600 * 1000);
  u.lockedReason = reason || u.lockedReason || "Tài khoản bị khóa bởi quản trị viên";
  if (reason) {
    u.warnings = u.warnings || [];
    u.warnings.push({ message: `LOCK: ${reason}`, by: req.user._id });
  }
  await u.save();
  res.json({ success: true, data: { _id: u._id, status: u.status, lockedUntil: u.lockedUntil, lockedReason: u.lockedReason } });
}));

// Unlock user
router.post("/users/:id/unlock", asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ success: false, message: "Not found" });
  u.status = "active";
  u.lockedUntil = null;
  u.lockedReason = undefined;
  await u.save();
  res.json({ success: true, data: { _id: u._id, status: u.status } });
}));

// Warn user { message }
router.post("/users/:id/warn", asyncHandler(async (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ success: false, message: "message required" });
  const u = await User.findById(req.params.id).select("-password");
  if (!u) return res.status(404).json({ success: false, message: "Not found" });
  u.warnings = u.warnings || [];
  u.warnings.push({ message, by: req.user._id });
  await u.save();
  // Notify the user about manual warning
  try {
    const { notify } = await import("../utils/notifications.js");
    await notify({
      io: req.io,
      userId: u._id,
      actorId: req.user._id,
      type: "content_warning",
      meta: { kind: 'account', reason: message, warningsCount: u.warnings.length }
    });
  } catch (e) {
    console.warn('Warn notification failed:', e?.message || e);
  }
  res.json({ success: true, data: u });
}));

// Reset password (admin action) { newPassword }
router.post("/users/:id/reset-password", asyncHandler(async (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ success: false, message: "newPassword >= 6 chars" });
  }
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ success: false, message: "Not found" });
  u.password = newPassword; // will be hashed by pre('save') hook
  await u.save();
  res.json({ success: true, message: "Password reset" });
}));

router.get("/threads", async (req, res) => {
  const items = await Thread.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("author", "username isPro");
  res.json({ success: true, data: items });
});

router.delete("/threads/:id", async (req, res) => {
  const t = await Thread.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: "Not found" });
  await t.deleteOne();
  res.json({ success: true, message: "Deleted" });
});

// List flagged or pending threads for human review
router.get("/moderation/threads", asyncHandler(async (req, res) => {
  const { status = "FLAGGED" } = req.query;
  const items = await Thread.find({ status })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("author", "username isPro warnings status");
  res.json({ success: true, data: items });
}));

// Approve a thread (clears flag)
router.post("/moderation/threads/:id/approve", asyncHandler(async (req, res) => {
  const t = await Thread.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: "Not found" });
  t.status = "APPROVED";
  t.moderation = {
    ...(t.moderation || {}),
    notes: (`${t.moderation?.notes || ""}\nApproved by ${req.user.username} (${req.user._id})`).trim(),
    reviewer: req.user._id,
    reviewedAt: new Date(),
  };
  await t.save();
  res.json({ success: true, data: t });
}));

// Reject a thread (admin)
router.post("/moderation/threads/:id/reject", asyncHandler(async (req, res) => {
  const { warn = true, reason } = req.body || {};
  const t = await Thread.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: "Not found" });
  t.status = "REJECTED";
  t.moderation = {
    ...(t.moderation || {}),
    notes: (
      `${t.moderation?.notes || ""}\nRejected by ${req.user.username} (${req.user._id})${reason ? `: ${reason}` : ""}`
    ).trim(),
    reviewer: req.user._id,
    reviewedAt: new Date(),
  };
  await t.save();

  let userUpdate;
  if (warn) {
    const u = await User.findById(t.author);
    if (u) {
      u.warnings = u.warnings || [];
      u.warnings.push({ message: `THREAD_REJECT${reason ? `: ${reason}` : ''}`, by: req.user._id });
      // Auto-ban when warnings >= 5
      if (u.warnings.length >= 5) {
        const fifteenDays = new Date(Date.now() + 15 * 24 * 3600 * 1000);
        u.status = "locked";
        // If already locked until a later date, keep the later one; else set to 15 days
        if (!u.lockedUntil || u.lockedUntil.getTime() < fifteenDays.getTime()) {
          u.lockedUntil = fifteenDays;
        }
        u.lockedReason = "Tài khoản bị khóa 15 ngày do đạt 5 cảnh cáo";
      }
      await u.save();
      userUpdate = { userId: u._id, warningsCount: u.warnings.length, status: u.status, lockedUntil: u.lockedUntil };

      // Notify the author about the content warning
      try {
        const { notify } = await import("../utils/notifications.js");
        await notify({
          io: req.io,
          userId: u._id,
          actorId: req.user._id,
          type: "content_warning",
          threadId: t._id,
          meta: { kind: 'thread', reason: reason || 'Nội dung vi phạm chính sách', warningsCount: u.warnings.length, locked: u.status === 'locked' }
        });
      } catch (e) {
        console.warn('Warn notification failed:', e?.message || e);
      }
    }
  }

  res.json({ success: true, data: t, user: userUpdate });
}));

// ===== Comment Moderation =====
import { Comment } from "../models/comment.model.js";

router.get("/moderation/comments", asyncHandler(async (req, res) => {
  const { status = "FLAGGED" } = req.query;
  const items = await Comment.find({ status })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("author", "username isPro warnings status")
    .populate("threadId", "content author")
  res.json({ success: true, data: items });
}));

router.post("/moderation/comments/:id/approve", asyncHandler(async (req, res) => {
  const c = await Comment.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: "Not found" });
  c.status = "APPROVED";
  c.moderation = {
    ...(c.moderation || {}),
    notes: (`${c.moderation?.notes || ""}\nApproved by ${req.user.username} (${req.user._id})`).trim(),
    reviewer: req.user._id,
    reviewedAt: new Date(),
  };
  await c.save();
  res.json({ success: true, data: c });
}));

router.post("/moderation/comments/:id/reject", asyncHandler(async (req, res) => {
  const { warn = true, reason } = req.body || {};
  const c = await Comment.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: "Not found" });
  c.status = "REJECTED";
  c.moderation = {
    ...(c.moderation || {}),
    notes: (
      `${c.moderation?.notes || ""}\nRejected by ${req.user.username} (${req.user._id})${reason ? `: ${reason}` : ""}`
    ).trim(),
    reviewer: req.user._id,
    reviewedAt: new Date(),
  };
  await c.save();

  let userUpdate;
  if (warn) {
    const u = await User.findById(c.author);
    if (u) {
      u.warnings = u.warnings || [];
      u.warnings.push({ message: `COMMENT_REJECT${reason ? `: ${reason}` : ''}`, by: req.user._id });
      if (u.warnings.length >= 5) {
        const fifteenDays = new Date(Date.now() + 15 * 24 * 3600 * 1000);
        u.status = "locked";
        if (!u.lockedUntil || u.lockedUntil.getTime() < fifteenDays.getTime()) {
          u.lockedUntil = fifteenDays;
        }
        u.lockedReason = "Tài khoản bị khóa 15 ngày do đạt 5 cảnh cáo";
      }
      await u.save();
      userUpdate = { userId: u._id, warningsCount: u.warnings.length, status: u.status, lockedUntil: u.lockedUntil };

      // Notify the author about the content warning
      try {
        const { notify } = await import("../utils/notifications.js");
        await notify({
          io: req.io,
          userId: u._id,
          actorId: req.user._id,
          type: "content_warning",
          commentId: c._id,
          meta: { kind: 'comment', reason: reason || 'Nội dung vi phạm chính sách', warningsCount: u.warnings.length, locked: u.status === 'locked' }
        });
      } catch (e) {
        console.warn('Warn notification failed:', e?.message || e);
      }
    }
  }

  res.json({ success: true, data: c, user: userUpdate });
}));

router.delete("/moderation/comments/:id", asyncHandler(async (req, res) => {
  const c = await Comment.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: "Not found" });
  await c.deleteOne();
  res.json({ success: true, message: "Deleted" });
}));

// ===== Reports =====
import { Report } from "../models/report.model.js";

router.get("/reports", asyncHandler(async (req, res) => {
  const { status, type } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  const items = await Report.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("createdBy", "username")
    .populate("handledBy", "username")
    .populate("history.by", "username");
  res.json({ success: true, data: items });
}));

router.post("/reports/:id/resolve", asyncHandler(async (req, res) => {
  const { action = "RESOLVED", notes } = req.body || {};
  const r = await Report.findById(req.params.id);
  if (!r) return res.status(404).json({ success: false, message: "Not found" });
  r.status = action === "REJECTED" ? "REJECTED" : "RESOLVED";
  r.handledBy = req.user._id;
  r.handledAt = new Date();
  r.history = r.history || [];
  r.history.push({ action: r.status, by: req.user._id, at: new Date(), notes });
  await r.save();
  res.json({ success: true, data: r });
}));

router.get("/payments", async (req, res) => {
  const items = await Payment.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("user", "username email");
  res.json({ success: true, data: items });
});

// Payment statistics by month
router.get("/payments/stats", getPaymentStats);

export default router;
