// Explicitly load dotenv (some environments had trouble with shorthand 'import "dotenv/config"')
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
// Load base .env first
dotenv.config();

// If NODE_ENV=test, merge variables from .env.test (without overriding existing)
if (process.env.NODE_ENV === "test") {
  const envTestPath = path.resolve(".env.test");
  if (fs.existsSync(envTestPath)) {
    try {
      const testContent = fs.readFileSync(envTestPath);
      // Try direct parse (assume utf8). If fails, try utf16le
      let parsed;
      try {
        parsed = dotenv.parse(testContent.toString("utf8"));
      } catch {
        parsed = dotenv.parse(testContent.toString("utf16le"));
      }
      for (const [k, v] of Object.entries(parsed)) {
        if (!process.env[k]) process.env[k] = v;
      }
      console.log("🧪 Loaded test environment from .env.test");
    } catch (e) {
      console.warn("Failed to load .env.test:", e.message);
    }
  }
}

// Fallback: if essential vars missing, attempt UTF-16LE parse (user's .env was saved UTF-16)
if (!process.env.MONGO_URI) {
  const envPath = path.resolve(".env");
  if (fs.existsSync(envPath)) {
    const buf = fs.readFileSync(envPath);
    // Detect UTF-16LE BOM 0xFF 0xFE
    const isUtf16le = buf.length > 2 && buf[0] === 0xff && buf[1] === 0xfe;
    if (isUtf16le) {
      try {
        const content = buf.toString("utf16le");
        const parsed = dotenv.parse(content);
        for (const [k, v] of Object.entries(parsed)) {
          if (!process.env[k]) process.env[k] = v;
        }
        if (process.env.MONGO_URI) {
          console.log("🔄 Loaded environment from UTF-16LE .env file");
        }
      } catch (e) {
        console.warn("Failed UTF-16LE fallback parse:", e.message);
      }
    }
  }
}
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { connectDB } from "./config/db.js";
import { User } from "./models/user.model.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import threadRoutes from "./routes/thread.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import qrRoutes from "./routes/qr.routes.js";
import mediaRoutes from "./routes/media.routes.js";
import messageRoutes from "./routes/message.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import adminBootstrapRoutes from "./routes/adminBootstrap.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import { verifyS3Connection } from "./utils/s3.js";
import { verifyEmailTransport } from "./utils/email.js";
// Optional AI helper (OpenRouter). To use, set OPENROUTER_API_KEY in your env and import { ask, chat } from "./utils/ai.js" where needed.

const app = express();
const server = createServer(app);

// Support multiple frontend origins (comma-separated) for LAN testing
// Build from FRONTEND_URL and WEB_URL, normalize, and add common dev defaults
const normalizeOrigin = (o) => (typeof o === "string" ? o.replace(/\/$/, "") : o);
const envOrigins = [process.env.FRONTEND_URL, process.env.WEB_URL]
  .filter(Boolean)
  .flatMap((s) => String(s).split(","))
  .map((s) => normalizeOrigin(s.trim()))
  .filter(Boolean);

const devDefaults = [
  "http://localhost:5022",
  "http://127.0.0.1:5022",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const allowedOrigins = new Set(
  [
    ...envOrigins,
    ...(process.env.NODE_ENV !== "production" ? devDefaults : []),
  ]
    .filter(Boolean)
    .map(normalizeOrigin)
);

const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      // In development, allow any origin to simplify LAN/HTTPS dev
      if (process.env.NODE_ENV !== "production") return cb(null, true);
      if (!origin) return cb(null, true);
      if (envOrigins.includes("*")) return cb(null, true);
      const norm = normalizeOrigin(origin);
      if (allowedOrigins.size === 0) return cb(null, true);
      if (allowedOrigins.has(norm)) return cb(null, true);
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Socket.IO CORS blocked Origin=${origin} (normalized=${norm}). Allowed: ${[...allowedOrigins].join(", ")}`);
      }
      return cb(new Error("Not allowed by Socket.IO CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: (origin, cb) => {
      // In development, allow any origin to simplify LAN/HTTPS dev
      if (process.env.NODE_ENV !== "production") return cb(null, true);
      // Allow same-origin/no Origin and any explicitly allowed origin
      if (!origin) return cb(null, true);
      if (envOrigins.includes("*")) return cb(null, true);
      const norm = normalizeOrigin(origin);
      if (allowedOrigins.size === 0) return cb(null, true);
      if (allowedOrigins.has(norm)) return cb(null, true);
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Express CORS blocked Origin=${origin} (normalized=${norm}). Allowed: ${[...allowedOrigins].join(", ")}`);
      }
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "Threads API", version: "1.0.0" },
    servers: [{ url: process.env.APP_URL || "http://localhost:3000" }],
  },
  apis: [],
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "OK" })
);

// Make io accessible to routes - MUST be before route definitions
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/threads", threadRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin-bootstrap", adminBootstrapRoutes);
app.use("/api/notifications", notificationRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  // Handle duplicate key errors for friend requests more gracefully
  const msg = String(err?.message || "").toLowerCase();
  if (
    err &&
    (err.code === 11000 || err.codeName === "DuplicateKey") &&
    msg.includes("friendrequests")
  ) {
    // Return success-like response; the request is effectively already present
    return res
      .status(200)
      .json({ success: true, message: "Friend request already sent" });
  }
  res
    .status(err.status || 500)
    .json({ success: false, message: err.message || "Server error" });
});

const PORT = process.env.PORT || 3000;

if (!process.env.MONGO_URI) {
  console.warn(
    "⚠️  MONGO_URI not found in environment. Using fallback in-memory server will fail (no in-memory configured). Update .env"
  );
}

// Socket.IO connection handling with authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    console.log("🔐 WebSocket auth attempt:", {
      hasToken: !!token,
      tokenLength: token?.length,
      socketId: socket.id,
    });

    if (!token) {
      console.log("❌ No token provided");
      return next(new Error("No token provided"));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ JWT verified for user:", decoded.id);

    // Get user from database
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      console.log("❌ User not found:", decoded.id);
      return next(new Error("User not found"));
    }

    console.log("✅ User authenticated:", user.username);

    // Attach user to socket
    socket.userId = user._id;
    socket.user = user;
    next();
  } catch (error) {
    console.error("❌ WebSocket auth error:", error.message);
    next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  console.log(
    `🔌 User connected: ${socket.id} (User: ${socket.user?.username})`
  );

  // Join theo user để nhận notify
  if (socket.user?._id) {
    socket.join(`user_${socket.user._id}`);
  }

  // Join thread room for real-time updates
  socket.on("join_thread", (threadId) => {
    socket.join(`thread_${threadId}`);
    console.log(
      `📱 User ${socket.user?.username} (${socket.id}) joined thread ${threadId}`
    );

    // Send confirmation back to client
    socket.emit("joined_thread", {
      threadId,
      timestamp: new Date().toISOString(),
    });
  });

  // Leave thread room
  socket.on("leave_thread", (threadId) => {
    socket.leave(`thread_${threadId}`);
    console.log(
      `📱 User ${socket.user?.username} (${socket.id}) left thread ${threadId}`
    );
  });

  socket.on("disconnect", () => {
    console.log(
      `🔌 User disconnected: ${socket.id} (User: ${socket.user?.username})`
    );
  });

  // ====== Direct Message Rooms ======
  socket.on('dm:join', (conversationId) => {
    socket.join(`dm_${conversationId}`);
    socket.emit('dm:joined', { conversationId });
  });

  socket.on('dm:leave', (conversationId) => {
    socket.leave(`dm_${conversationId}`);
  });

  // ====== WebRTC Call Signaling ======
  // Caller sends offer to callee (toUserId) for a specific conversation
  socket.on('call:offer', ({ toUserId, conversationId, sdp }) => {
    if (!toUserId || !conversationId || !sdp) return;
    try {
      io.to(`user_${toUserId}`).emit('call:offer', {
        conversationId,
        fromUserId: socket.userId,
        sdp,
      });
    } catch {}
  });

  // Callee sends answer back to caller
  socket.on('call:answer', ({ toUserId, conversationId, sdp }) => {
    if (!toUserId || !conversationId || !sdp) return;
    try {
      io.to(`user_${toUserId}`).emit('call:answer', {
        conversationId,
        fromUserId: socket.userId,
        sdp,
      });
    } catch {}
  });

  // Exchange ICE candidates
  socket.on('call:candidate', ({ toUserId, conversationId, candidate }) => {
    if (!toUserId || !conversationId || !candidate) return;
    try {
      io.to(`user_${toUserId}`).emit('call:candidate', {
        conversationId,
        fromUserId: socket.userId,
        candidate,
      });
    } catch {}
  });

  // Hang up / end call
  socket.on('call:hangup', ({ toUserId, conversationId }) => {
    if (!toUserId || !conversationId) return;
    try {
      io.to(`user_${toUserId}`).emit('call:hangup', {
        conversationId,
        fromUserId: socket.userId,
      });
    } catch {}
  });
});

connectDB().then(async () => {
  // Fire and forget S3 verification (doesn't block server if it fails)
  verifyS3Connection().catch(() => {});
  // Fire and forget SMTP verification to help diagnose email issues in dev
  verifyEmailTransport()
    .then(() => console.log("📧 SMTP verified successfully"))
    .catch((e) => console.warn("📧 SMTP verification failed:", e?.message || e));
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Threads API is running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server is running`);
    if (process.env.NODE_ENV !== "production") {
      console.log(`🔐 CORS allowlist: ${[...allowedOrigins].join(", ") || "<empty> (allow all/no Origin)"}`);
    }
  });
});
