import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { AuthSession } from '../src/models/auth-session.model.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

describe('Auth - Logout Suite', () => {
  let authCookie;
  let userId;

  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // Signup user
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'ayush_logout',
        email: 'ayush_logout@example.com',
        password: 'Password123!',
        spaceName: 'Logout Space',
        accessCode: env.ACCESS_CODE
      });

    userId = signupRes.body.data.user.id;

    // Signin
    const signinRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'ayush_logout@example.com',
        password: 'Password123!'
      });

    const cookies = signinRes.headers['set-cookie'];
    authCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  });

  test('Successful logout revokes session and clears authentication cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Logged out successfully');

    // Verify cookie clearing in response header
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies);
    const clearedCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    assert.ok(clearedCookie);
    // Expires in the past or max-age=0
    assert.match(clearedCookie, /Expires=Thu, 01 Jan 1970/i);

    // Verify session in MongoDB is marked as revoked
    const session = await AuthSession.findOne({ userId });
    assert.ok(session.revokedAt, 'Session must have revokedAt timestamp');
    assert.equal(session.isActive(), false, 'Session must no longer be active');
  });

  test('Repeated logout is idempotent and succeeds without error', async () => {
    // First logout
    const res1 = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie);
    assert.equal(res1.status, 200);

    // Repeated logout with same cookie
    const res2 = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie);
    assert.equal(res2.status, 200);
    assert.equal(res2.body.success, true);
  });

  test('Logout with expired or invalid cookie clears cookie cleanly', async () => {
    const bogusCookie = `${AUTH_COOKIE_NAME}=invalid.bogus.jwt.token; Path=/; HttpOnly`;
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', bogusCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies);
    const clearedCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    assert.ok(clearedCookie);
    assert.match(clearedCookie, /Expires=Thu, 01 Jan 1970/i);
  });

  test('Logout with missing cookie succeeds safely and clears cookie header', async () => {
    const res = await request(app).post('/api/auth/logout');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
});

