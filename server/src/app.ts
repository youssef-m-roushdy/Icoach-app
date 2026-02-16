import express from "express";
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { configurePassport } from './config/passport.js';
import { initializeDatabases } from './config/database.js';
import { setupSwagger } from './config/swagger.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { socketService } from './services/socketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configure passport after environment variables are loaded
configurePassport();

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
socketService.initialize(httpServer);

// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);

// ============= EJS CONFIGURATION =============
// Configure EJS template engine for web pages
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Points to src/views

// ============= STATIC FILES CONFIGURATION =============
// Serve static files for web pages (CSS, JS, images)
app.use('/assets', express.static(path.join(__dirname, 'public')));
// Serve static files for API (workout GIFs, etc.)
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// ============= SECURITY MIDDLEWARE =============
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for EJS
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for EJS
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));

// CORS configuration (only for API routes)
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8081',
    'http://localhost:19000',
    'http://localhost:19001',
    'exp://localhost:8081',
    'exp://192.168.1.6:8081'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Apply CORS to API routes only (not to web views)
app.use('/api', cors(corsOptions));

// Rate limiting for all routes
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ============= LOGGING MIDDLEWARE =============
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ============= BODY PARSING MIDDLEWARE =============
app.use(express.json({ 
  limit: process.env.MAX_FILE_SIZE || '10mb',
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_FILE_SIZE || '10mb',
}));

// Cookie parser middleware
app.use(cookieParser());

// ============= SWAGGER DOCUMENTATION =============
setupSwagger(app);

// ============= WEB VIEWS ROUTES =============
// Import web routes (for password reset, email verification, etc.)
import webRoutes from './routes/web/publicRoutes.js';

// Health check endpoint (accessible via web and API)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true,
    status: 'OK', 
    message: 'iCoach server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ============= WEB ROUTES =============
// These handle web pages (password reset, email verification, etc.)
app.use('/', webRoutes);

// ============= API ROUTES =============
// These handle mobile app API requests
app.use('/api', apiRoutes);

// ============= ERROR HANDLING =============
// 404 handler for unmatched routes (must be after all other routes)
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// ============= SERVER STARTUP =============
const startServer = async () => {
  try {
    // Initialize databases
    await initializeDatabases();
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Web views available at: http://localhost:${PORT}`);
      console.log(`📖 API documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🔌 WebSocket server ready for connections`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Add global unhandled rejection and exception handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server with proper error handling
try {
  startServer().catch((error) => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Synchronous error during startup:', error);
  process.exit(1);
}