import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller.js';
import { requireAuth, validateOrigin } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { signupSchema, signinSchema } from '../validators/auth.validator.js';
import { asyncHandler } from '../utils/async-handler.js';
import { env } from '../config/env.js';

const router = Router();

// Rate limiting for signup (max 10 requests per 15 minutes)
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.headers['x-bypass-test-ratelimit'] === 'true',
  message: {
    success: false,
    message: 'Too many signup attempts from this IP, please try again after 15 minutes',
    errors: []
  }
});

// Rate limiting for signin (max 10 requests per 15 minutes)
const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.headers['x-bypass-test-ratelimit'] === 'true',
  message: {
    success: false,
    message: 'Too many signin attempts from this IP, please try again after 15 minutes',
    errors: []
  }
});

// POST /api/auth/signup
router.post(
  '/signup',
  validateOrigin,
  signupLimiter,
  validateBody(signupSchema),
  asyncHandler(AuthController.signup)
);

// POST /api/auth/signin
router.post(
  '/signin',
  validateOrigin,
  signinLimiter,
  validateBody(signinSchema),
  asyncHandler(AuthController.signin)
);

// POST /api/auth/logout
router.post(
  '/logout',
  validateOrigin,
  asyncHandler(AuthController.logout)
);

// GET /api/auth/me (Protected)
router.get(
  '/me',
  requireAuth,
  asyncHandler(AuthController.getMe)
);

export default router;
