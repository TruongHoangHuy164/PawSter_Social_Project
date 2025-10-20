import asyncHandler from "express-async-handler";
import { Payment } from "../models/payment.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import {
  createMoMoOrder,
  verifyIpnSignature,
  isMomoConfigured,
} from "../utils/momo.js";

// Simulated payment creation
export const createPayment = asyncHandler(async (req, res) => {
  const { provider = "mock", amount = 50000 } = req.body;
  const payment = await Payment.create({
    user: req.user._id,
    provider,
    amount,
    status: "pending",
  });
  const paymentUrl = `${
    process.env.APP_URL || "http://localhost:3000"
  }/pay/mock/${payment._id}`;
  res
    .status(201)
    .json({ success: true, data: { paymentId: payment._id, paymentUrl } });
});

export const paymentWebhook = asyncHandler(async (req, res) => {
  const { paymentId, status } = req.body;
  if (!paymentId || !status)
    return res.status(400).json({ success: false, message: "Missing fields" });
  const payment = await Payment.findById(paymentId);
  if (!payment)
    return res
      .status(404)
      .json({ success: false, message: "Payment not found" });

  payment.status = status;
  await payment.save();

  if (status === "paid") {
    const user = await User.findById(payment.user);
    if (user) {
      user.isPro = true;
      user.proExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      if (!user.badges.includes("Pro")) user.badges.push("Pro");
      await user.save();
    }
  }

  res.json({
    success: true,
    message: "Webhook processed",
    data: { status: payment.status },
  });
});

// MoMo integration
const BASE_PRICE = 39000; // VND / month
export const Plans = {
  "1m": { months: 1, discount: 0 },
  "6m": { months: 6, discount: 0.1 },
  "12m": { months: 12, discount: 0.2 },
};

export function calcPlanAmount(planKey) {
  const plan = Plans[planKey];
  if (!plan) return null;
  const raw = BASE_PRICE * plan.months;
  const discounted = Math.round(raw * (1 - plan.discount));
  return discounted;
}

export const getPlans = asyncHandler(async (req, res) => {
  const map = Object.fromEntries(
    Object.keys(Plans).map((k) => [
      k,
      { months: Plans[k].months, amount: calcPlanAmount(k) },
    ])
  );
  res.json({ success: true, data: map });
});

export const createMomoPayment = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  if (!userId)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  const { plan } = req.body || {};
  const amount = calcPlanAmount(plan);
  if (!amount)
    return res.status(400).json({ success: false, message: "Invalid plan" });

  if (!isMomoConfigured()) {
    return res
      .status(400)
      .json({
        success: false,
        message:
          "MoMo chưa được cấu hình đầy đủ. Vui lòng kiểm tra các biến môi trường MOMO_* trong .env",
      });
  }

  const pay = await Payment.create({
    user: new mongoose.Types.ObjectId(userId),
    provider: "momo",
    amount,
    status: "pending",
    plan,
  });

  const orderId = `momo_${pay._id}_${Date.now()}`;
  const orderInfo = `PawSter Pro ${plan}`;
  const extraDataObj = {
    paymentId: String(pay._id),
    userId: String(userId),
    plan,
  };

  // Optional URL validation to catch format errors early
  try {
    // eslint-disable-next-line no-new
    new URL(process.env.MOMO_REDIRECT_URL);
    // eslint-disable-next-line no-new
    new URL(process.env.MOMO_IPN_URL);
  } catch {
    pay.status = "failed";
    pay.meta = {
      orderId,
      reason: "Invalid MOMO_REDIRECT_URL or MOMO_IPN_URL format",
    };
    await pay.save();
    return res
      .status(400)
      .json({
        success: false,
        message:
          "MOMO_REDIRECT_URL hoặc MOMO_IPN_URL không hợp lệ (không phải URL đầy đủ). Vui lòng cập nhật .env",
      });
  }

  try {
    const momoResp = await createMoMoOrder({
      amount,
      orderId,
      orderInfo,
      extraDataObj,
    });
    if (momoResp?.resultCode === 0 && momoResp?.payUrl) {
      pay.meta = {
        orderId,
        requestId: momoResp.requestId,
        deeplink: momoResp.deeplink,
      };
      await pay.save();
      return res.json({
        success: true,
        data: { payUrl: momoResp.payUrl, orderId, paymentId: pay._id },
      });
    }
    // Non-zero resultCode
    pay.status = "failed";
    pay.meta = {
      orderId,
      reason: momoResp?.message || "Create order failed",
      momo: momoResp,
    };
    await pay.save();
    return res
      .status(400)
      .json({
        success: false,
        message: momoResp?.message || "Create order failed",
        data: momoResp,
      });
  } catch (e) {
    // Axios/non-2xx or signature mismatch etc.
    pay.status = "failed";
    pay.meta = {
      orderId,
      reason: e.message || "Create order exception",
      momo: e.momoResponse,
    };
    await pay.save();
    const status =
      e.statusCode && e.statusCode >= 400 && e.statusCode < 500
        ? e.statusCode
        : 400;
    return res
      .status(status)
      .json({
        success: false,
        message: e.message || "Create order failed",
        data: e.momoResponse || null,
      });
  }
});

export const momoIpnHandler = asyncHandler(async (req, res) => {
  const body = req.body;
  const valid = verifyIpnSignature(body);
  if (!valid)
    return res
      .status(400)
      .json({ success: false, message: "Invalid signature" });

  const { orderId, resultCode, amount, extraData } = body;
  let paymentId;
  try {
    const extra = JSON.parse(
      Buffer.from(extraData || "", "base64").toString("utf8") || "{}"
    );
    paymentId = extra.paymentId;
  } catch {}
  if (!paymentId && orderId?.includes("_")) {
    const parts = String(orderId).split("_");
    paymentId = parts[1];
  }
  const payment = await Payment.findById(paymentId);
  if (!payment)
    return res
      .status(404)
      .json({ success: false, message: "Payment not found" });

  if (payment.status === "paid" || payment.status === "failed") {
    return res.json({ success: true });
  }

  if (Number(amount) !== Number(payment.amount)) {
    payment.status = "failed";
    payment.meta = {
      ...(payment.meta || {}),
      reason: "Amount mismatch",
      reportedAmount: Number(amount),
    };
    await payment.save();
    return res.status(400).json({ success: false, message: "Amount mismatch" });
  }

  if (Number(resultCode) === 0) {
    payment.status = "paid";
    payment.meta = { ...(payment.meta || {}), momo: body };
    await payment.save();

    const planKey = payment.plan;
    const months = planKey && Plans[planKey] ? Plans[planKey].months : 1;
    const user = await User.findById(payment.user);
    if (user) {
      const now = new Date();
      const base =
        user.proExpiry && new Date(user.proExpiry) > now
          ? new Date(user.proExpiry)
          : now;
      base.setMonth(base.getMonth() + months);
      user.isPro = true;
      user.proExpiry = base;
      if (!user.badges.includes("Pro")) user.badges.push("Pro");
      await user.save();
    }
    return res.json({ success: true });
  } else {
    payment.status = "failed";
    payment.meta = { ...(payment.meta || {}), momo: body };
    await payment.save();
    return res.json({ success: true });
  }
});

// Redirect handler for MoMo return: forward to frontend /payment/return with original query
export const momoReturnRedirect = asyncHandler(async (req, res) => {
  // 1) Try to confirm payment server-side using redirect payload (in case IPN is delayed)
  const payload = req.query || {};
  if (verifyIpnSignature(payload)) {
    try {
      const { resultCode, amount, orderId, extraData } = payload;
      let paymentId;
      try {
        const extra = JSON.parse(
          Buffer.from(extraData || "", "base64").toString("utf8") || "{}"
        );
        paymentId = extra.paymentId;
      } catch {}
      if (!paymentId && orderId?.includes("_"))
        paymentId = String(orderId).split("_")[1];
      if (paymentId) {
        const payment = await Payment.findById(paymentId);
        if (payment) {
          if (payment.status !== "paid") {
            if (Number(amount) !== Number(payment.amount)) {
              payment.status = "failed";
              payment.meta = {
                ...(payment.meta || {}),
                reason: "Amount mismatch (return)",
                reportedAmount: Number(amount),
              };
              await payment.save();
            } else if (Number(resultCode) === 0) {
              payment.status = "paid";
              payment.meta = { ...(payment.meta || {}), return: payload };
              await payment.save();
              // Update user pro
              const planKey = payment.plan;
              const months =
                planKey && Plans[planKey] ? Plans[planKey].months : 1;
              const user = await User.findById(payment.user);
              if (user) {
                const now = new Date();
                const base =
                  user.proExpiry && new Date(user.proExpiry) > now
                    ? new Date(user.proExpiry)
                    : now;
                base.setMonth(base.getMonth() + months);
                user.isPro = true;
                user.proExpiry = base;
                if (!user.badges.includes("Pro")) user.badges.push("Pro");
                await user.save();
              }
            } else {
              payment.status = "failed";
              payment.meta = { ...(payment.meta || {}), return: payload };
              await payment.save();
            }
          }
        }
      }
    } catch (e) {
      // swallow confirmation error and still redirect
    }
  }
  // 2) Redirect user to frontend Upgrade page
  const clientBase =
    process.env.WEB_URL ||
    process.env.APP_WEB_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:5173";
  const target = `${clientBase.replace(/\/$/, "")}/upgrade`;
  return res.redirect(target);
});

// Optional fallback confirm: use redirect query payload to confirm payment when IPN is delayed
export const momoReturnConfirm = asyncHandler(async (req, res) => {
  // Prefer body, fallback to query
  const payload = Object.keys(req.body || {}).length ? req.body : req.query;
  // verify signature with same logic
  if (!verifyIpnSignature(payload)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid signature (confirm)" });
  }
  const { resultCode, amount, orderId, extraData } = payload;
  let paymentId;
  try {
    const extra = JSON.parse(
      Buffer.from(extraData || "", "base64").toString("utf8") || "{}"
    );
    paymentId = extra.paymentId;
  } catch {}
  if (!paymentId && orderId?.includes("_")) {
    paymentId = String(orderId).split("_")[1];
  }
  const payment = await Payment.findById(paymentId);
  if (!payment)
    return res
      .status(404)
      .json({ success: false, message: "Payment not found" });

  if (payment.status === "paid") return res.json({ success: true });

  if (Number(amount) !== Number(payment.amount)) {
    payment.status = "failed";
    payment.meta = {
      ...(payment.meta || {}),
      reason: "Amount mismatch (confirm)",
      reportedAmount: Number(amount),
    };
    await payment.save();
    return res.status(400).json({ success: false, message: "Amount mismatch" });
  }

  if (Number(resultCode) === 0) {
    payment.status = "paid";
    payment.meta = { ...(payment.meta || {}), confirm: payload };
    await payment.save();

    const planKey = payment.plan;
    const months = planKey && Plans[planKey] ? Plans[planKey].months : 1;
    const user = await User.findById(payment.user);
    if (user) {
      const now = new Date();
      const base =
        user.proExpiry && new Date(user.proExpiry) > now
          ? new Date(user.proExpiry)
          : now;
      base.setMonth(base.getMonth() + months);
      user.isPro = true;
      user.proExpiry = base;
      if (!user.badges.includes("Pro")) user.badges.push("Pro");
      await user.save();
    }
    return res.json({ success: true });
  }

  payment.status = "failed";
  payment.meta = { ...(payment.meta || {}), confirm: payload };
  await payment.save();
  return res.json({ success: true });
});

// Get payment statistics by month
export const getPaymentStats = asyncHandler(async (req, res) => {
  const { year, months = 12 } = req.query;
  const currentYear = year ? parseInt(year) : new Date().getFullYear();
  const monthsToShow = Math.min(parseInt(months) || 12, 24); // Max 24 months

  // Aggregate payments by month
  const stats = await Payment.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(currentYear, 0, 1),
          $lt: new Date(currentYear + 1, 0, 1),
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          status: "$status",
        },
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  // Format data by month
  const monthlyStats = {};
  for (let i = 1; i <= 12; i++) {
    monthlyStats[i] = {
      month: i,
      year: currentYear,
      paid: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      failed: { count: 0, amount: 0 },
      total: { count: 0, amount: 0 },
    };
  }

  // Fill in actual data
  stats.forEach((item) => {
    const month = item._id.month;
    const status = item._id.status;
    if (monthlyStats[month]) {
      monthlyStats[month][status] = {
        count: item.count,
        amount: item.totalAmount,
      };
      monthlyStats[month].total.count += item.count;
      monthlyStats[month].total.amount += item.totalAmount;
    }
  });

  // Convert to array and calculate growth
  const result = Object.values(monthlyStats);
  result.forEach((item, index) => {
    if (index > 0) {
      const prevAmount = result[index - 1].paid.amount;
      item.growth =
        prevAmount > 0
          ? (((item.paid.amount - prevAmount) / prevAmount) * 100).toFixed(2)
          : 0;
    } else {
      item.growth = 0;
    }
  });

  // Get overall stats
  const totalStats = await Payment.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(currentYear, 0, 1),
          $lt: new Date(currentYear + 1, 0, 1),
        },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  const summary = {
    paid: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 },
    total: { count: 0, amount: 0 },
  };

  totalStats.forEach((item) => {
    summary[item._id] = {
      count: item.count,
      amount: item.totalAmount,
    };
    summary.total.count += item.count;
    summary.total.amount += item.totalAmount;
  });

  res.json({
    success: true,
    data: {
      year: currentYear,
      monthly: result,
      summary,
    },
  });
});
