// Explicitly load dotenv (some environments had trouble with shorthand 'import "dotenv/config"')
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

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
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import threadRoutes from './routes/thread.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import qrRoutes from './routes/qr.routes.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

const app = express();
app.use(cors());
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

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/qr', qrRoutes);

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

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Threads API is running on http://localhost:${PORT}`);
  });
});
