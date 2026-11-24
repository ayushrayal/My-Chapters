import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import somedayCategoryRoutes from './routes/someday-category.routes.js';
import somedayItemRoutes from './routes/someday-item.routes.js';
import dayflowTemplateRoutes from './routes/dayflow-template.routes.js';
import dayflowScheduleRoutes from './routes/dayflow-schedule.routes.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { ApiResponse } from './utils/api-response.js';

const app = express();

// 1. HTTP Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
  })
);

// 2. Strict Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: env.CLIENT_URL,
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
    uptime: `${Math.floor(process.uptime())}s`
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

// 10. 404 Not Found Catch-All
app.use(notFoundHandler);

// 11. Centralized Error Handler
app.use(errorHandler);

export default app;

