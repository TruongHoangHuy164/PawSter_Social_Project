import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import { User } from "../models/user.model.js";
import { Thread } from "../models/thread.model.js";
import { Payment } from "../models/payment.model.js";
import { getPaymentStats } from "../controllers/payment.controller.js";

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

router.get("/users", async (req, res) => {
  const items = await User.find()
    .select("-password")
    .sort({ createdAt: -1 })
    .limit(200);
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

router.patch("/users/:id", async (req, res) => {
  const allowed = ["isPro", "isAdmin", "badges"];
  const updates = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
  }).select("-password");
  if (!user)
    return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: user });
});

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
