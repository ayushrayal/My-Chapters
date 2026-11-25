import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/user.model.js';
import { Space } from '../src/models/space.model.js';
import { AuthSession } from '../src/models/auth-session.model.js';
import { BoundedAuthCache, authCache } from '../src/utils/auth-cache.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

describe('Auth Caching & Security Suite', () => {
  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    authCache.clear();
  });

  // --- UNIT TESTS: BoundedAuthCache ---
  describe('BoundedAuthCache Unit Tests', () => {
    test('Cache hit and miss behavior', () => {
      const cache = new BoundedAuthCache({ maxEntries: 10, defaultTtlMs: 5000 });
      assert.equal(cache.get('test:1'), undefined);
      assert.equal(cache.misses, 1);

      cache.set('test:1', { name: 'Alpha' });
      assert.deepEqual(cache.get('test:1'), { name: 'Alpha' });
      assert.equal(cache.hits, 1);
    });

    test('TTL expiration treats expired entries as misses', async () => {
      const cache = new BoundedAuthCache({ maxEntries: 10, defaultTtlMs: 50 }); // 50ms TTL
      cache.set('temp:1', { data: 'expiring' });
      assert.deepEqual(cache.get('temp:1'), { data: 'expiring' });

      // Wait 70ms for entry to expire
      await new Promise((resolve) => setTimeout(resolve, 70));

      assert.equal(cache.get('temp:1'), undefined);
      assert.equal(cache.expirations, 1);
      assert.equal(cache.store.has('temp:1'), false);
    });

    test('Maximum size eviction enforces bounded memory (LRU)', () => {
      const cache = new BoundedAuthCache({ maxEntries: 3, defaultTtlMs: 60000 });
      cache.set('k1', 'val1');
      cache.set('k2', 'val2');
      cache.set('k3', 'val3');
      assert.equal(cache.store.size, 3);

      // Access k1 so it becomes recently used
      assert.equal(cache.get('k1'), 'val1');

      // Add k4; k2 should be evicted because k1 was refreshed
      cache.set('k4', 'val4');
      assert.equal(cache.store.size, 3);
      assert.equal(cache.evictions, 1);
      assert.equal(cache.get('k2'), undefined, 'k2 should have been evicted as oldest');
      assert.equal(cache.get('k1'), 'val1', 'k1 should still exist');
      assert.equal(cache.get('k3'), 'val3', 'k3 should still exist');
      assert.equal(cache.get('k4'), 'val4', 'k4 should still exist');
    });

    test('Concurrent requests are coalesced to a single fetch execution', async () => {
      const cache = new BoundedAuthCache({ maxEntries: 10, defaultTtlMs: 5000 });
      let fetchCount = 0;

      const fetchFn = async () => {
        fetchCount++;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { loaded: true };
      };

      // Launch 5 concurrent coalesce calls for the same key
      const results = await Promise.all([
        cache.coalesce('shared:key', fetchFn),
        cache.coalesce('shared:key', fetchFn),
        cache.coalesce('shared:key', fetchFn),
        cache.coalesce('shared:key', fetchFn),
        cache.coalesce('shared:key', fetchFn)
      ]);

      assert.equal(fetchCount, 1, 'Underlying fetch should execute exactly once');
      results.forEach((r) => assert.deepEqual(r, { loaded: true }));
    });

    test('User and Space cache isolation', () => {
      const cache = new BoundedAuthCache();
      cache.set('user:101', { id: '101', role: 'ADMIN' });
      cache.set('user:102', { id: '102', role: 'MEMBER' });
      cache.set('space:s1', { id: 's1', name: 'Space 1' });
      cache.set('space:s2', { id: 's2', name: 'Space 2' });

      assert.equal(cache.get('user:101').role, 'ADMIN');
      assert.equal(cache.get('user:102').role, 'MEMBER');
      assert.notEqual(cache.get('user:101'), cache.get('user:102'));

      assert.equal(cache.get('space:s1').name, 'Space 1');
      assert.equal(cache.get('space:s2').name, 'Space 2');
      assert.notEqual(cache.get('space:s1'), cache.get('space:s2'));
    });
  });

  // --- INTEGRATION TESTS: Authorization & Invalidation ---
  describe('Authorization Flow & Cache Invalidation Integration', () => {
    let authCookie;
    let userId;
    let spaceId;
    let sessionId;

    beforeEach(async () => {
      // 1. Signup user
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .set('x-bypass-test-ratelimit', 'true')
        .send({
          username: 'cache_user',
          email: 'cache_user@example.com',
          password: 'Password123!',
          spaceName: 'Cache Space',
          accessCode: env.ACCESS_CODE
        });

      userId = signupRes.body.data.user.id;
      spaceId = signupRes.body.data.space.id;

      // 2. Signin
      const signinRes = await request(app)
        .post('/api/auth/signin')
        .set('x-bypass-test-ratelimit', 'true')
        .send({
          identifier: 'cache_user@example.com',
          password: 'Password123!'
        });

      const cookies = signinRes.headers['set-cookie'];
      authCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));

      const session = await AuthSession.findOne({ userId });
      sessionId = session._id.toString();
    });

    test('Subsequent authenticated requests hit the cache and avoid DB re-fetch', async () => {
      const initialHits = authCache.hits;

      // First call (populates cache)
      const res1 = await request(app).get('/api/auth/me').set('Cookie', authCookie);
      assert.equal(res1.status, 200);

      // Second call (hits cached session, user, space)
      const res2 = await request(app).get('/api/auth/me').set('Cookie', authCookie);
      assert.equal(res2.status, 200);
      assert.equal(res2.body.data.user.id, userId);

      // Verify hits increased
      assert.ok(authCache.hits > initialHits, 'Cache hits should increase on repeat authenticated requests');

      // Cached user object never includes password hash
      const cachedUser = authCache.get(`user:${userId}`);
      assert.ok(cachedUser);
      assert.equal(cachedUser.password, undefined);
    });

    test('Session logout invalidates cache and blocks immediate subsequent requests', async () => {
      // Warm the cache
      await request(app).get('/api/auth/me').set('Cookie', authCookie);
      assert.ok(authCache.get(`session:${sessionId}`), 'Session should be cached');

      // Perform logout
      const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', authCookie);
      assert.equal(logoutRes.status, 200);

      // Verify session was removed from cache
      assert.equal(authCache.get(`session:${sessionId}`), undefined);

      // Subsequent authenticated request must be rejected
      const meRes = await request(app).get('/api/auth/me').set('Cookie', authCookie);
      assert.equal(meRes.status, 401);
      assert.match(meRes.body.message, /expired or been revoked/i);
    });

    test('Direct database session revocation invalidates cache via model hook', async () => {
      // Warm the cache
      await request(app).get('/api/auth/me').set('Cookie', authCookie);

      // Revoke in DB directly (simulating admin or background revocation)
      await AuthSession.findByIdAndUpdate(sessionId, { revokedAt: new Date() });

      // Cache hook should have purged it
      assert.equal(authCache.get(`session:${sessionId}`), undefined);

      // Request must be rejected
      const meRes = await request(app).get('/api/auth/me').set('Cookie', authCookie);
      assert.equal(meRes.status, 401);
      assert.match(meRes.body.message, /expired or been revoked/i);
    });

    test('Deleting user invalidates cache and rejects subsequent requests', async () => {
      // Warm the cache
      await request(app).get('/api/auth/me').set('Cookie', authCookie);
      assert.ok(authCache.get(`user:${userId}`));

      // Delete user from DB
      await User.findByIdAndDelete(userId);

      // Request must be rejected with 401
      const meRes = await request(app).get('/api/auth/me').set('Cookie', authCookie);
      assert.equal(meRes.status, 401);
      assert.match(meRes.body.message, /no longer exists/i);
    });

    test('Deleting Space invalidates cache and denies access', async () => {
      // Warm the cache
      await request(app).get('/api/auth/me').set('Cookie', authCookie);
      assert.ok(authCache.get(`space:${spaceId}`));

      // Delete space from DB
      await Space.findByIdAndDelete(spaceId);

      // Request must be rejected with 403 Forbidden
      const meRes = await request(app).get('/api/auth/me').set('Cookie', authCookie);
      assert.equal(meRes.status, 403);
      assert.match(meRes.body.message, /no valid space/i);
    });

    test('Invalid or forged JWT is rejected without consulting cache', async () => {
      const forgedToken = jwt.sign(
        { sub: userId, sid: sessionId },
        'wrong-secret-key-that-does-not-match-env-jwt-secret-crypto-string',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${forgedToken}`);

      assert.equal(res.status, 401);
      assert.match(res.body.message, /invalid authentication/i);
    });

    test('Expired JWT is rejected without consulting cache', async () => {
      const expiredToken = jwt.sign(
        { sub: userId, sid: sessionId },
        env.JWT_SECRET,
        { expiresIn: '-10s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `${AUTH_COOKIE_NAME}=${expiredToken}`);

      assert.equal(res.status, 401);
      assert.match(res.body.message, /expired/i);
    });
  });
});
