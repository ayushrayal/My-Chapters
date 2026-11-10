import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { AuthSession } from '../src/models/auth-session.model.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

describe('Auth - Get Me Suite', () => {
  let authCookie;
  let testUser;
  let testSpace;
  let sessionId;

  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // Register user
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'ayush_me',
        email: 'ayush_me@example.com',
        password: 'Password123!',
        spaceName: 'My Me Space',
        accessCode: env.ACCESS_CODE
      });

    testUser = signupRes.body.data.user;
    testSpace = signupRes.body.data.space;

    // Sign in to receive cookie
    const signinRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'ayush_me@example.com',
        password: 'Password123!'
      });

    const cookies = signinRes.headers['set-cookie'];
    authCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));

    // Extract session id from database
    const session = await AuthSession.findOne({ userId: testUser.id });
    sessionId = session._id.toString();
  });

  test('Valid authentication returns sanitized user and Space details', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'User fetched successfully');
    assert.equal(res.body.data.user.id, testUser.id);
    assert.equal(res.body.data.user.username, 'ayush_me');
    assert.equal(res.body.data.user.email, 'ayush_me@example.com');
    assert.equal(res.body.data.user.role, 'ADMIN');
    assert.equal(res.body.data.space.id, testSpace.id);
    assert.equal(res.body.data.space.name, 'My Me Space');
    assert.equal(res.body.data.space.slug, 'my-me-space');

    // Never expose password or internal session fields
    assert.equal(res.body.data.user.password, undefined);
  });

  test('Missing cookie rejects with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/auth/me');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /authentication required/i);
  });

  test('Invalid JWT signature rejects with 401 Unauthorized', async () => {
    const bogusToken = 'invalid.jwt.token';
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${bogusToken}`);

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /invalid authentication/i);
  });

  test('Expired JWT rejects with 401 Unauthorized', async () => {
    const expiredToken = jwt.sign(
      { sub: testUser.id, sid: sessionId },
      env.JWT_SECRET,
      { expiresIn: '-1s' } // Expired 1 second ago
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${expiredToken}`);

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /expired/i);
  });

  test('Revoked session in MongoDB rejects with 401 Unauthorized', async () => {
    // Revoke the session in database directly
    await AuthSession.findByIdAndUpdate(sessionId, { revokedAt: new Date() });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie);

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /expired or been revoked/i);
  });

  test('Deleted user rejects with 401 Unauthorized', async () => {
    // Delete the user from database
    await User.findByIdAndDelete(testUser.id);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie);

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /no longer exists/i);
  });
});

