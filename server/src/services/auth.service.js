import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { Space } from '../models/space.model.js';
import { AuthSession } from '../models/auth-session.model.js';
import { SomedayCategory } from '../models/someday-category.model.js';
import { SOMEDAY_SYSTEM_CATEGORY } from '../constants/someday.js';
import { ROLES } from '../constants/roles.js';
import { AppError } from '../utils/app-error.js';
import { generateUniqueSlug } from '../utils/generate-slug.js';
import { parseDurationToMs } from '../utils/cookie-options.js';
import { authCache } from '../utils/auth-cache.js';

/**
 * Constant-time comparison for ACCESS_CODE to prevent timing attacks.
 * Never logs or exposes the submitted code.
 *
 * @param {string} candidateCode
 * @returns {boolean}
 */
export function verifyAccessCode(candidateCode) {
  if (!candidateCode || typeof candidateCode !== 'string') {
    return false;
  }

  const expectedBuffer = Buffer.from(env.ACCESS_CODE.trim());
  const candidateBuffer = Buffer.from(candidateCode.trim());

  if (expectedBuffer.length !== candidateBuffer.length) {
    // Constant time dummy comparison to mitigate timing leakage on string length
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, candidateBuffer);
}

/**
 * Signs a cryptographically secure JWT containing subject (userId) and session ID (sid).
 * @param {string} userId
 * @param {string} sessionId
 * @returns {string} JWT token string
 */
export function generateToken(userId, sessionId) {
  return jwt.sign(
    {
      sub: userId,
      sid: sessionId
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN
    }
  );
}

export class AuthService {
  /**
   * Registers a new Space and its Admin user atomically.
   *
   * @param {object} payload
   * @param {string} payload.username
   * @param {string} payload.email
   * @param {string} payload.password
   * @param {string} payload.spaceName
   * @param {string} payload.accessCode
   * @returns {Promise<object>} Sanitized user and space objects
   */
  static async signup({ username, email, password, spaceName, accessCode }) {
    // 1. Verify access code with timing-safe comparison
    if (!verifyAccessCode(accessCode)) {
      throw AppError.badRequest('Invalid access code');
    }

    // 2. Normalize inputs
    const usernameNormalized = username.toLowerCase().trim();
    const emailNormalized = email.toLowerCase().trim();
    const spaceNameTrimmed = spaceName.trim();
    const spaceNameNormalized = spaceNameTrimmed.toLowerCase();

    // 3. Pre-check uniqueness before opening transaction
    const existingUser = await User.findOne({
      $or: [{ usernameNormalized }, { emailNormalized }]
    }).lean();

    if (existingUser) {
      if (existingUser.usernameNormalized === usernameNormalized) {
        throw AppError.conflict('Username is already taken');
      }
      if (existingUser.emailNormalized === emailNormalized) {
        throw AppError.conflict('Email is already registered');
      }
    }

    const existingSpace = await Space.findOne({ nameNormalized: spaceNameNormalized }).lean();
    if (existingSpace) {
      throw AppError.conflict('Space name is already taken');
    }

    // 4. Generate unique slug
    const slug = await generateUniqueSlug(spaceNameTrimmed, Space);

    // 5. Pre-allocate ObjectIds to link Space and User atomically
    const userId = new mongoose.Types.ObjectId();
    const spaceId = new mongoose.Types.ObjectId();

    // 6. Execute atomic creation using MongoDB transaction
    const session = await mongoose.startSession();
    let createdUser;
    let createdSpace;

    try {
      const spaceDoc = new Space({
        _id: spaceId,
        name: spaceNameTrimmed,
        nameNormalized: spaceNameNormalized,
        slug,
        owner: userId
      });

      const userDoc = new User({
        _id: userId,
        username: username.trim(),
        usernameNormalized,
        email: email.trim(),
        emailNormalized,
        password,
        spaceId,
        role: ROLES.ADMIN
      });

      // Provision the predefined system 'Other' category for the new Space
      const otherCategoryDoc = new SomedayCategory({
        spaceId,
        name: SOMEDAY_SYSTEM_CATEGORY.NAME,
        nameNormalized: SOMEDAY_SYSTEM_CATEGORY.NAME_NORMALIZED,
        isSystem: true
      });

      try {
        await session.withTransaction(async () => {
          await spaceDoc.save({ session });
          await userDoc.save({ session });
          await otherCategoryDoc.save({ session });
        });
      } catch (txErr) {
        // If standalone MongoDB does not support transactions, save cleanly for local dev
        if (
          txErr.message &&
          txErr.message.includes('Transaction numbers are only allowed on a replica set member or mongos')
        ) {
          await spaceDoc.save();
          await userDoc.save();
          await otherCategoryDoc.save();
        } else {
          throw txErr;
        }
      }

      createdUser = userDoc;
      createdSpace = spaceDoc;
    } finally {
      await session.endSession();
    }

    return {
      user: {
        id: createdUser._id.toString(),
        username: createdUser.username,
        email: createdUser.email,
        role: createdUser.role,
        createdAt: createdUser.createdAt
      },
      space: {
        id: createdSpace._id.toString(),
        name: createdSpace.name,
        slug: createdSpace.slug
      }
    };
  }

  /**
   * Authenticates a user by email or username, creates an AuthSession, and signs a JWT.
   *
   * @param {object} payload
   * @param {string} payload.identifier
   * @param {string} payload.password
   * @returns {Promise<object>} Token and sanitized user & space records
   */
  static async signin({ identifier, password }) {
    const normalizedIdentifier = identifier.toLowerCase().trim();

    // Find user by normalized email or normalized username, selecting password hash
    const user = await User.findOne({
      $or: [
        { emailNormalized: normalizedIdentifier },
        { usernameNormalized: normalizedIdentifier }
      ]
    }).select('+password');

    // Generic error message for both non-existent user and incorrect password
    if (!user) {
      throw AppError.unauthorized('Invalid credentials');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid credentials');
    }

    // Create a new MongoDB authentication session
    const sessionDurationMs = parseDurationToMs(env.JWT_EXPIRES_IN);
    const expiresAt = new Date(Date.now() + sessionDurationMs);

    const authSession = await AuthSession.create({
      userId: user._id,
      expiresAt
    });

    // Sign JWT containing sub (userId) and sid (sessionId)
    const token = generateToken(user._id.toString(), authSession._id.toString());

    // Fetch user's Space
    const space = await Space.findById(user.spaceId).lean();
    if (!space) {
      throw AppError.notFound('Associated Space not found for this user');
    }

    return {
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      space: {
        id: space._id.toString(),
        name: space.name,
        slug: space.slug
      }
    };
  }

  /**
   * Revokes the active authentication session linked to the provided JWT.
   *
   * @param {string} [token]
   * @returns {Promise<void>}
   */
  static async logout(token) {
    if (!token) {
      return;
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (decoded && decoded.sid) {
        await AuthSession.findByIdAndUpdate(decoded.sid, {
          revokedAt: new Date()
        });
        authCache.invalidateSession(decoded.sid);
        if (decoded.sub) {
          authCache.invalidateUser(decoded.sub);
        }
      }
    } catch {
      // If token is invalid or expired, session is already inactive; safe to succeed.
    }
  }
}
