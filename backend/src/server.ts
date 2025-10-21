import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import * as dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import { initializeDatabases, closeDatabaseConnections } from './config/database';
import { setupRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { requestTracking, auditMiddleware, memoryMonitoring, errorTracking } from './middleware/monitoring';
import monitoringRoutes from './routes/monitoring';
import { logger } from './utils/logger';
import { setupWebSocket, initializeWebSocketEventService, cleanupWebSocketEventService } from './websocket/server';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create HTTP server
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Rate limiting
app.use(rateLimiter);

// Monitoring middleware
app.use(requestTracking);
app.use(memoryMonitoring);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Audit middleware (after body parsing)
app.use(auditMiddleware);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Import health check functions dynamically to avoid circular dependencies
    const { checkPostgreSQLHealth, checkMongoDBHealth, checkRedisHealth } = await import('./config/database-mock');
    
    const [postgres, mongodb, redis] = await Promise.all([
      checkPostgreSQLHealth(),
      checkMongoDBHealth(),
      checkRedisHealth(),
    ]);

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      databases: {
        postgresql: postgres ? 'connected' : 'disconnected',
        mongodb: mongodb ? 'connected' : 'disconnected',
        redis: redis ? 'connected' : 'disconnected',
      },
      memory: process.memoryUsage(),
    };

    const allHealthy = postgres && mongodb && redis;
    res.status(allHealthy ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Monitoring routes (before API routes for health checks)
app.use('/api/v1/monitoring', monitoringRoutes);

// API routes
app.use('/api/v1', setupRoutes());

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error tracking middleware
app.use(errorTracking);

// Error handling middleware (must be last)
app.use(errorHandler);

// Setup WebSocket server
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await cleanupWebSocketEventService();
      logger.info('WebSocket event service cleaned up');
      
      await closeDatabaseConnections();
      logger.info('Database connections closed');
      
      wss.close(() => {
        logger.info('WebSocket server closed');
        process.exit(0);
      });
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
async function startServer() {
  try {
    logger.info('🚀 Starting PrivacyGuard Backend Server...');
    
    // Initialize database connections
    await initializeDatabases();
    
    // Initialize WebSocket event service
    await initializeWebSocketEventService();
    
    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🔗 API available at http://localhost:${PORT}/api/v1`);
      logger.info(`🔌 WebSocket server ready for real-time connections`);
      
      if (NODE_ENV === 'development') {
        logger.info('🔧 Development mode - detailed logging enabled');
      }
    });
    
  } catch (error) {
    logger.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
