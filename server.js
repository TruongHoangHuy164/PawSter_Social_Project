// Explicitly load dotenv (some environments had trouble with shorthand 'import "dotenv/config"')
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
// Load base .env first
dotenv.config();

// If NODE_ENV=test, merge variables from .env.test (without overriding existing)
if (process.env.NODE_ENV === 'test') {
  const envTestPath = path.resolve('.env.test');
  if (fs.existsSync(envTestPath)) {
    try {
      const testContent = fs.readFileSync(envTestPath);
      // Try direct parse (assume utf8). If fails, try utf16le
      let parsed;
      try {
        parsed = dotenv.parse(testContent.toString('utf8'));
      } catch {
        parsed = dotenv.parse(testContent.toString('utf16le'));
      }
      for (const [k, v] of Object.entries(parsed)) {
        if (!process.env[k]) process.env[k] = v;
      }
      console.log('🧪 Loaded test environment from .env.test');
    } catch (e) {
      console.warn('Failed to load .env.test:', e.message);
    }
  }
}

// Fallback: if essential vars missing, attempt UTF-16LE parse (user's .env was saved UTF-16)
if (!process.env.MONGO_URI) {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const buf = fs.readFileSync(envPath);
    // Detect UTF-16LE BOM 0xFF 0xFE
    const isUtf16le = buf.length > 2 && buf[0] === 0xFF && buf[1] === 0xFE;
    if (isUtf16le) {
      try {
        const content = buf.toString('utf16le');
        const parsed = dotenv.parse(content);
        for (const [k, v] of Object.entries(parsed)) {
          if (!process.env[k]) process.env[k] = v;
        }
        if (process.env.MONGO_URI) {
          console.log('🔄 Loaded environment from UTF-16LE .env file');
        }
      } catch (e) {
        console.warn('Failed UTF-16LE fallback parse:', e.message);
      }
    }
  }
}
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { connectDB } from './config/db.js';
import { User } from './models/user.model.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import threadRoutes from './routes/thread.routes.js';
import commentRoutes from './routes/comment.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import qrRoutes from './routes/qr.routes.js';
import mediaRoutes from './routes/media.routes.js';
import adminRoutes from './routes/admin.routes.js';
import adminBootstrapRoutes from './routes/adminBootstrap.routes.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { verifyS3Connection } from './utils/s3.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: [
    process.env.FRONTEND_URL],
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Threads API', version: '1.0.0' },
    servers: [{ url: process.env.APP_URL || 'http://localhost:3000' }]
  },
  apis: []
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'OK' }));

// Make io accessible to routes - MUST be before route definitions
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-bootstrap', adminBootstrapRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 3000;

if (!process.env.MONGO_URI) {
  console.warn('⚠️  MONGO_URI not found in environment. Using fallback in-memory server will fail (no in-memory configured). Update .env');
}

// Socket.IO connection handling with authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    console.log('🔐 WebSocket auth attempt:', { 
      hasToken: !!token, 
      tokenLength: token?.length,
      socketId: socket.id 
    });
    
    if (!token) {
      console.log('❌ No token provided');
      return next(new Error('No token provided'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ JWT verified for user:', decoded.id);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log('❌ User not found:', decoded.id);
      return next(new Error('User not found'));
    }

    console.log('✅ User authenticated:', user.username);
    
    // Attach user to socket
    socket.userId = user._id;
    socket.user = user;
    next();
  } catch (error) {
    console.error('❌ WebSocket auth error:', error.message);
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id} (User: ${socket.user?.username})`);

  // Join thread room for real-time updates
  socket.on('join_thread', (threadId) => {
    socket.join(`thread_${threadId}`);
    console.log(`📱 User ${socket.user?.username} (${socket.id}) joined thread ${threadId}`);
    
    // Send confirmation back to client
    socket.emit('joined_thread', { threadId, timestamp: new Date().toISOString() });
  });

  // Leave thread room
  socket.on('leave_thread', (threadId) => {
    socket.leave(`thread_${threadId}`);
    console.log(`📱 User ${socket.user?.username} (${socket.id}) left thread ${threadId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id} (User: ${socket.user?.username})`);
  });
});

connectDB()
  .then(async () => {
    // Fire and forget S3 verification (doesn't block server if it fails)
    verifyS3Connection().catch(()=>{});
    server.listen(PORT, () => {
      console.log(`🚀 Threads API is running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server is running`);
    });
  });
