import mongoose from 'mongoose';
import { authCache } from '../utils/auth-cache.js';

const authSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for authentication session'],
      index: true
    },
    expiresAt: {
      type: Date,
      required: [true, 'Session expiration time is required']
    },
    revokedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// TTL index to automatically purge expired sessions from MongoDB
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for active session lookups
authSessionSchema.index({ userId: 1, revokedAt: 1 });

/**
 * Check if the session is currently active (not revoked and not expired).
 * @returns {boolean}
 */
authSessionSchema.methods.isActive = function () {
  return !this.revokedAt && this.expiresAt.getTime() > Date.now();
};

// Auto-invalidate session cache whenever an auth session is modified or deleted
authSessionSchema.post('findOneAndUpdate', function (doc) {
  if (doc && doc._id) {
    authCache.invalidateSession(doc._id.toString());
  } else {
    const filter = this.getQuery ? this.getQuery() : null;
    if (filter && (filter._id || filter.id)) {
      authCache.invalidateSession(filter._id || filter.id);
    }
  }
});

authSessionSchema.post('findOneAndDelete', function (doc) {
  if (doc && doc._id) {
    authCache.invalidateSession(doc._id.toString());
  } else {
    const filter = this.getQuery ? this.getQuery() : null;
    if (filter && (filter._id || filter.id)) {
      authCache.invalidateSession(filter._id || filter.id);
    }
  }
});

authSessionSchema.post('save', function (doc) {
  if (doc && doc._id) {
    authCache.invalidateSession(doc._id.toString());
  }
});

export const AuthSession = mongoose.model('AuthSession', authSessionSchema);

