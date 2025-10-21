import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { listNotifications, markRead, markAllRead } from "../controllers/notification.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", listNotifications);
router.post("/:id/read", markRead);
router.post("/read-all", markAllRead);

export default router;
