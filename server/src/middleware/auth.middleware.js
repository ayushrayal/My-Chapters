import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { Space } from '../models/space.model.js';
import { AuthSession } from '../models/auth-session.model.js';
import { AppError } from '../utils/app-error.js';
import { AUTH_COOKIE_NAME } from '../utils/cookie-options.js';
import { authCache } from '../utils/auth-cache.js';

/**
 * Reusable authentication middleware.
 * Verifies JWT from HttpOnly cookie, verifies active session using bounded in-memory cache
 * or database lookup, confirms user identity and Space association securely.
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

    // 1. Fetch active session (cached or database lookup)
    const sessionKey = `session:${decoded.sid}`;
    let session = authCache.get(sessionKey);

    if (!session) {
      session = await authCache.coalesce(sessionKey, async () => {
        const doc = await AuthSession.findById(decoded.sid).lean();
        if (!doc) return null;
        return {
          _id: doc._id,
          id: doc._id.toString(),
          userId: doc.userId,
          expiresAt: new Date(doc.expiresAt),
          revokedAt: doc.revokedAt ? new Date(doc.revokedAt) : null,
          isActive() {
            const expiresMs = this.expiresAt instanceof Date ? this.expiresAt.getTime() : new Date(this.expiresAt).getTime();
            return !this.revokedAt && expiresMs > Date.now();
          }
        };
      });
    }

    if (!session || !session.isActive()) {
      throw AppError.unauthorized('Session has expired or been revoked. Please sign in again.');
    }

    // Verify session belongs to the user specified in the JWT subject
    if (session.userId.toString() !== decoded.sub) {
      throw AppError.unauthorized('Session ownership mismatch');
    }

    // 2. Fetch authenticated user (cached or database lookup)
    const userKey = `user:${decoded.sub}`;
    let user = authCache.get(userKey);

    if (!user) {
      user = await authCache.coalesce(userKey, async () => {
        const doc = await User.findById(decoded.sub).lean();
        if (!doc) return null;
        return {
          _id: doc._id,
          id: doc._id.toString(),
          username: doc.username,
          email: doc.email,
          role: doc.role,
          spaceId: doc.spaceId,
          createdAt: doc.createdAt
        };
      });
    }

    if (!user) {
      throw AppError.unauthorized('User associated with this session no longer exists');
    }

    // 3. Multi-tenant check: Fetch the Space that user belongs to
    const spaceKey = `space:${user.spaceId.toString()}`;
    let space = authCache.get(spaceKey);

    if (!space) {
      space = await authCache.coalesce(spaceKey, async () => {
        const doc = await Space.findById(user.spaceId).lean();
        if (!doc) return null;
        return {
          _id: doc._id,
          id: doc._id.toString(),
          name: doc.name,
          slug: doc.slug,
          owner: doc.owner
        };
      });
    }

    if (!space) {
      throw AppError.forbidden('Access denied. No valid Space linked to this account.');
    }

    // Attach verified context to request
    user.activeSpaceId = user.spaceId;
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
    let clientOrigin;
    try {
      clientOrigin = new URL(env.CLIENT_URL).origin;
    } catch {
      clientOrigin = env.CLIENT_URL;
    }
    const host = req.get('host');
    const isSameHost = host && (origin === `http://${host}` || origin === `https://${host}`);

    if (origin !== clientOrigin && !isSameHost) {
      return next(AppError.forbidden(`Cross-site request blocked: untrusted origin ${origin}`));
    }
  }

  next();
}

