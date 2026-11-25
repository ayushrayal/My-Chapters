/**
 * Bounded In-Memory Authentication Cache
 *
 * Provides high-speed, bounded TTL caching for active sessions, user metadata,
 * and Space identities to eliminate redundant MongoDB lookups on authenticated requests.
 *
 * Security & Design Guarantees:
 * 1. Bounded size with LRU eviction to prevent memory exhaustion.
 * 2. Short configurable TTL (30-60s) to limit exposure window if an out-of-band change occurs.
 * 3. Never stores password hashes, JWT secrets, raw tokens, or credentials.
 * 4. Keys are strictly namespaced: session:{sid}, user:{uid}, space:{spid}.
 * 5. Concurrent cache misses are coalesced into a single in-flight promise.
 * 6. Detailed diagnostics: hits, misses, evictions, expirations.
 */

import { env } from '../config/env.js';

export class BoundedAuthCache {
  /**
   * @param {object} [options]
   * @param {number} [options.maxEntries=1000] - Maximum total cached items across all types
   * @param {number} [options.defaultTtlMs=45000] - Default TTL in milliseconds (45s)
   */
  constructor(options = {}) {
    this.maxEntries = options.maxEntries || 1000;
    this.defaultTtlMs = options.defaultTtlMs || 45000;

    /** @type {Map<string, { value: any, expiresAt: number }>} */
    this.store = new Map();

    /** @type {Map<string, Promise<any>>} In-flight deduplication */
    this.inFlight = new Map();

    // Diagnostics counters
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.expirations = 0;
  }

  /**
   * Get an entry from the cache. Handles TTL expiration and LRU promotion.
   * @param {string} key
   * @returns {any | undefined}
   */
  get(key) {
    const entry = this.store.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.expirations++;
      this.misses++;
      return undefined;
    }

    // LRU promotion: re-insert key at end of Map iteration order
    this.store.delete(key);
    this.store.set(key, entry);

    this.hits++;
    return entry.value;
  }

  /**
   * Set an entry in the cache with bounded eviction.
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlMs]
   */
  set(key, value, ttlMs) {
    if (!key || value === undefined) {
      return;
    }

    // If already exists, delete first to refresh position
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      // Evict oldest entry (first item in Map)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
        this.evictions++;
      }
    }

    const duration = typeof ttlMs === 'number' && ttlMs > 0 ? ttlMs : this.defaultTtlMs;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + duration
    });
  }

  /**
   * Delete an entry immediately.
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Clear all cached entries and pending in-flight promises.
   */
  clear() {
    this.store.clear();
    this.inFlight.clear();
  }

  /**
   * Coalesce concurrent calls for the same key to avoid stampedes.
   * @param {string} key
   * @param {() => Promise<any>} fetchFn
   * @param {number} [ttlMs]
   * @returns {Promise<any>}
   */
  async coalesce(key, fetchFn, ttlMs) {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    let promise = this.inFlight.get(key);
    if (!promise) {
      promise = (async () => {
        try {
          const fresh = await fetchFn();
          if (fresh !== undefined && fresh !== null) {
            this.set(key, fresh, ttlMs);
          }
          return fresh;
        } finally {
          this.inFlight.delete(key);
        }
      })();
      this.inFlight.set(key, promise);
    }

    return promise;
  }

  // --- Scoped Domain Methods ---

  /**
   * Invalidate session by session ID.
   * @param {string} sessionId
   */
  invalidateSession(sessionId) {
    if (!sessionId) return;
    this.delete(`session:${sessionId.toString()}`);
  }

  /**
   * Invalidate user by user ID.
   * @param {string} userId
   */
  invalidateUser(userId) {
    if (!userId) return;
    this.delete(`user:${userId.toString()}`);
  }

  /**
   * Invalidate Space by space ID.
   * @param {string} spaceId
   */
  invalidateSpace(spaceId) {
    if (!spaceId) return;
    this.delete(`space:${spaceId.toString()}`);
  }

  /**
   * Returns diagnostic metrics and hit ratios.
   * @returns {object}
   */
  getStats() {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? Number(((this.hits / totalRequests) * 100).toFixed(2)) : 0;

    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
      defaultTtlMs: this.defaultTtlMs,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      evictions: this.evictions,
      expirations: this.expirations,
      inFlightCount: this.inFlight.size
    };
  }
}

// Global singleton instance for application authentication
export const authCache = new BoundedAuthCache({
  maxEntries: env.AUTH_CACHE_MAX_ENTRIES,
  defaultTtlMs: env.AUTH_CACHE_TTL_SECONDS * 1000
});
