import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createPayment,
  paymentWebhook,
  getPlans,
  createMomoPayment,
  momoIpnHandler,
  momoReturnRedirect,
  momoReturnConfirm,
} from "../controllers/payment.controller.js";

const router = Router();
router.post("/create", authMiddleware, createPayment);
router.post("/webhook", paymentWebhook); // no auth - simulated provider callback

// MoMo routes
router.get("/plans", getPlans);
router.post("/momo/create", authMiddleware, createMomoPayment);
router.post("/momo/ipn", momoIpnHandler);
// Redirect URL configured in MoMo should point to this, we'll forward to frontend route
router.get("/momo/return", momoReturnRedirect);
// Optional confirm endpoint (GET/POST) if you want to confirm via redirect payload when IPN is delayed
router.all("/momo/confirm", momoReturnConfirm);

export default router;
