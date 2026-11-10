import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

describe('Security & Hardening Suite', () => {
  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  const validPayload = {
    username: 'sec_admin',
    email: 'sec@example.com',
    password: 'SecurePassword123!',
    spaceName: 'Security Space',
    accessCode: env.ACCESS_CODE
  };

  test('Password hash is never exposed in signup response', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send(validPayload);

    assert.equal(res.status, 201);
    const bodyStr = JSON.stringify(res.body);
    assert.equal(bodyStr.includes('password'), false);
    assert.equal(res.body.data.user.password, undefined);
  });

  test('Password hash is never exposed in signin response', async () => {
    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send(validPayload);

    const res = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'sec@example.com',
        password: 'SecurePassword123!'
      });

    assert.equal(res.status, 200);
    const bodyStr = JSON.stringify(res.body);
    assert.equal(bodyStr.includes('password'), false);
    assert.equal(res.body.data.user.password, undefined);
  });

  test('Access code is never exposed in API responses or errors', async () => {
    // 1. Success signup
    const successRes = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send(validPayload);

    assert.equal(JSON.stringify(successRes.body).includes(env.ACCESS_CODE), false);

    // 2. Failed signup with wrong code
    const failRes = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({ ...validPayload, accessCode: 'WRONG_CODE' });

    assert.equal(JSON.stringify(failRes.body).includes('WRONG_CODE'), false);
    assert.equal(JSON.stringify(failRes.body).includes(env.ACCESS_CODE), false);
  });

  test('JWT token is never returned in JSON response body', async () => {
    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send(validPayload);

    const res = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'sec@example.com',
        password: 'SecurePassword123!'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.token, undefined);
    assert.equal(res.body.data.token, undefined);
    assert.equal(res.body.jwt, undefined);
    assert.equal(res.body.data.jwt, undefined);
  });

  test('Origin validation blocks state-changing requests from untrusted origins', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .set('Origin', 'http://malicious-attacker-website.com')
      .set('x-bypass-test-ratelimit', 'true')
      .send(validPayload);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Cross-site request blocked: untrusted origin/i);
  });

  test('Origin validation allows requests matching CLIENT_URL', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .set('Origin', env.CLIENT_URL)
      .set('x-bypass-test-ratelimit', 'true')
      .send(validPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
  });

  test('CORS headers allow credentials and mirror CLIENT_URL', async () => {
    const res = await request(app)
      .options('/api/auth/signin')
      .set('Origin', env.CLIENT_URL)
      .set('Access-Control-Request-Method', 'POST');

    assert.equal(res.headers['access-control-allow-origin'], env.CLIENT_URL);
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });

  test('Health check endpoint does not leak database credentials or environment secrets', async () => {
    const res = await request(app).get('/api/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'UP');

    const bodyStr = JSON.stringify(res.body);
    assert.equal(bodyStr.includes(env.MONGODB_URI), false);
    assert.equal(bodyStr.includes(env.JWT_SECRET), false);
    assert.equal(bodyStr.includes(env.ACCESS_CODE), false);
  });
});

