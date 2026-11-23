import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { Space } from '../models/space.model.js';
import { AuthSession } from '../models/auth-session.model.js';
import { AppError } from '../utils/app-error.js';
import { AUTH_COOKIE_NAME } from '../utils/cookie-options.js';

/**
 * Reusable authentication middleware.
 * Verifies JWT from HttpOnly cookie, verifies active session in MongoDB,
 * confirms user existence, and derives Space identity securely.
 */
export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      throw AppError.unauthorized('Authentication required. No session cookie provided.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw AppError.unauthorized('Authentication session has expired. Please sign in again.');
      }
      throw AppError.unauthorized('Invalid authentication token');
    }

    if (!decoded || !decoded.sub || !decoded.sid) {
      throw AppError.unauthorized('Malformed authentication token');
    }

    // Fetch active session from MongoDB
    const session = await AuthSession.findById(decoded.sid);
    if (!session || !session.isActive()) {
      throw AppError.unauthorized('Session has expired or been revoked. Please sign in again.');
    }

    // Verify session belongs to the user specified in the JWT subject
    if (session.userId.toString() !== decoded.sub) {
      throw AppError.unauthorized('Session ownership mismatch');
    }

    // Fetch the authenticated user
    const user = await User.findById(decoded.sub);
    if (!user) {
      throw AppError.unauthorized('User associated with this session no longer exists');
    }

    // Multi-tenant check: Fetch the Space that user belongs to
    const space = await Space.findById(user.spaceId);
    if (!space) {
      throw AppError.forbidden('Access denied. No valid Space linked to this account.');
    }

    // Attach verified context to request
    req.user = user;
    req.space = space;
    req.authSession = session;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Origin validation middleware for state-changing authentication requests (CSRF mitigation).
 * Validates that incoming state-changing requests originate from the trusted frontend.
 */
export function validateOrigin(req, _res, next) {
  const origin = req.headers.origin;

  // If Origin header is present (standard in browsers for POST requests)
  if (origin) {
    const clientOrigin = new URL(env.CLIENT_URL).origin;
    const isDevPort = env.NODE_ENV === 'development' && /^http:\/\/localhost:(5173|5174|5175)$/.test(origin);
    if (origin !== clientOrigin && !isDevPort) {
      return next(AppError.forbidden(`Cross-site request blocked: untrusted origin ${origin}`));
    }
  }

  next();
}

