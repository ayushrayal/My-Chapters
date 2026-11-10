import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { AuthSession } from '../src/models/auth-session.model.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

describe('Auth - Signin Suite', () => {
  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // Register a standard user for signin tests
    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'ayush_user',
        email: 'ayush@example.com',
        password: 'Password123!',
        spaceName: 'Ayush Space',
        accessCode: env.ACCESS_CODE
      });
  });

  test('Signin with correct email and password succeeds and sets HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'ayush@example.com',
        password: 'Password123!'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Signed in successfully');
    assert.equal(res.body.data.user.email, 'ayush@example.com');
    assert.equal(res.body.data.user.username, 'ayush_user');
    assert.equal(res.body.data.space.name, 'Ayush Space');

    // Security check: JWT must NEVER be returned in response JSON
    assert.equal(res.body.data.token, undefined);
    assert.equal(res.body.token, undefined);

    // Verify Set-Cookie header
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies, 'set-cookie header must be present');
    const authCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    assert.ok(authCookie, `${AUTH_COOKIE_NAME} cookie must be set`);
    assert.match(authCookie, /HttpOnly/i, 'Cookie must have HttpOnly flag');
    assert.match(authCookie, /Path=\//i, 'Cookie must have Path=/ flag');

    // Verify AuthSession was created in MongoDB
    const sessionInDb = await AuthSession.findOne({ userId: res.body.data.user.id });
    assert.ok(sessionInDb);
    assert.equal(sessionInDb.isActive(), true);
  });

  test('Signin with correct username and password succeeds', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'AYUSH_USER', // Case-insensitive username check
        password: 'Password123!'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.username, 'ayush_user');
  });

  test('Signin with incorrect password fails with generic 401 error', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'ayush@example.com',
        password: 'WrongPassword999!'
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    // Generic error message to prevent user enumeration
    assert.equal(res.body.message, 'Invalid credentials');
    assert.equal(res.headers['set-cookie'], undefined);
  });

  test('Signin with nonexistent user fails with generic 401 error', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'nonexistent@example.com',
        password: 'Password123!'
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    // Exact same generic message as incorrect password
    assert.equal(res.body.message, 'Invalid credentials');
    assert.equal(res.headers['set-cookie'], undefined);
  });

  test('Missing fields fail with 400 Bad Request', async () => {
    const missingIdentifier = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({ password: 'Password123!' });

    assert.equal(missingIdentifier.status, 400);
    assert.equal(missingIdentifier.body.success, false);

    const missingPassword = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({ identifier: 'ayush@example.com' });

    assert.equal(missingPassword.status, 400);
    assert.equal(missingPassword.body.success, false);
  });

  test('Rate limiting triggers 429 when threshold is exceeded', async () => {
    // Send 11 requests without bypass header to exceed 10-request limit
    let lastResponse;
    for (let i = 0; i < 11; i++) {
      lastResponse = await request(app)
        .post('/api/auth/signin')
        .send({
          identifier: 'ayush@example.com',
          password: 'Password123!'
        });
    }

    assert.equal(lastResponse.status, 429);
    assert.equal(lastResponse.body.success, false);
    assert.match(lastResponse.body.message, /too many signin attempts/i);
  });
});

