import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import somedayCategoryRoutes from './routes/someday-category.routes.js';
import somedayItemRoutes from './routes/someday-item.routes.js';
import dayflowTemplateRoutes from './routes/dayflow-template.routes.js';
import dayflowScheduleRoutes from './routes/dayflow-schedule.routes.js';
import gymTemplateRoutes from './routes/gym-template.routes.js';
import gymWeeklyScheduleRoutes from './routes/gym-weekly-schedule.routes.js';
import gymWorkoutSessionRoutes from './routes/gym-workout-session.routes.js';
import gymAnalyticsRoutes from './routes/gym-analytics.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { ApiResponse } from './utils/api-response.js';
import { authCache } from './utils/auth-cache.js';
import { queryProfiler } from './utils/query-profiler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(__dirname, '../public');

const app = express();

// Trust reverse proxy (Render / Heroku / load balancers for HTTPS header detection)
app.set('trust proxy', 1);

// 1. HTTP Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production'
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            connectSrc: ["'self'"]
          }
        }
      : false,
    crossOriginEmbedderPolicy: false
  })
);

// 2. Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or standard same-origin requests)
      if (!origin) return callback(null, true);
      try {
        const clientOrigin = new URL(env.CLIENT_URL).origin;
        if (origin === clientOrigin) return callback(null, true);
      } catch {}
      // Allow same-origin or localhost during development/testing
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  })
);

// 3. Response compression
app.use(compression());

// 4. Body parsing with strict size limits (10kb) to guard against payload-based DoS
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Cookie parsing for secure HttpOnly cookie handling
app.use(cookieParser());

// 6. Health check endpoint (Does not expose credentials, DB URI or internal secrets)
app.get('/api/health', (_req, res) => {
  return ApiResponse.success(res, 'My Chapters API service is operational', {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    cache: authCache.getStats(),
    database: {
      queries: queryProfiler.totalQueries,
      slowQueries: queryProfiler.slowQueries,
      avgQueryDurationMs: queryProfiler.getStats().avgDurationMs
    }
  });
});

// 7. Core Authentication Routes
app.use('/api/auth', authRoutes);

// 8. Someday Feature Routes
app.use('/api/someday/categories', somedayCategoryRoutes);
app.use('/api/someday/items', somedayItemRoutes);

// 9. Dayflow Feature Routes
app.use('/api/dayflow/templates', dayflowTemplateRoutes);
app.use('/api/dayflow/schedule', dayflowScheduleRoutes);
app.use('/api/dayflow', dayflowScheduleRoutes);

// 10. GymFlow Feature Routes
app.use('/api/gymflow/templates', gymTemplateRoutes);
app.use('/api/gymflow/schedule', gymWeeklyScheduleRoutes);
app.use('/api/gymflow/workout', gymWorkoutSessionRoutes);
app.use('/api/gymflow/analytics', gymAnalyticsRoutes);

// 11. Consolidated Dashboard Route
app.use('/api/dashboard', dashboardRoutes);

// 12. API 404 Catch-All: ensures unmatched /api routes always return a JSON 404 and never index.html
app.use('/api', notFoundHandler);

// 12. Serve Static Frontend Files from server/public directory
app.use(
  express.static(publicPath, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      // Content-hashed assets in /assets/ get 1 year immutable caching
      if (filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // index.html and root static files must always revalidate
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  })
);

// 13. React SPA Fallback: for all non-API GET routes, serve index.html with no-cache revalidation
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(indexPath);
  }
  next();
});

// 14. 404 Not Found Catch-All
app.use(notFoundHandler);

// 15. Centralized Error Handler
app.use(errorHandler);

export default app;

