import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { projectRoutes } from './routes/projects';
import { deploymentRoutes } from './routes/deployments';
import { rollbackRoutes } from './routes/rollbacks';
import { analyticsRoutes } from './routes/analytics';
import { webhookRoutes } from './routes/webhooks';
import { authRoutes } from './routes/auth';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);

// ─── Socket.IO ──────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected');

  socket.on('join:project', (projectId: string) => {
    socket.join(`project:${projectId}`);
    logger.info({ socketId: socket.id, projectId }, 'Joined project room');
  });

  socket.on('leave:project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');
  });
});

// Export io for use in controllers
export { io };

// ─── Middleware ──────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ─── Health Check ───────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── API Routes ─────────────────────────────────────────────────────

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/deployments', deploymentRoutes);
app.use('/api/v1/rollbacks', rollbackRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// ─── Error Handler ──────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001', 10);

httpServer.listen(PORT, () => {
  logger.info(`🚀 SEQA API running on http://localhost:${PORT}`);
  logger.info(`📡 WebSocket server ready`);
  logger.info(`💾 Database: ${process.env.DATABASE_URL ? 'connected' : 'not configured'}`);
});

export default app;
