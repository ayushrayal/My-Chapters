import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Space } from '../src/models/space.model.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';

describe('Auth - Signup Suite', () => {
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
    username: 'ayush_admin',
    email: 'ayush@example.com',
    password: 'StrongPassword123!',
    spaceName: 'My Space',
    accessCode: env.ACCESS_CODE
  };

  test('Successful signup creates Space and Admin user atomically (201)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send(validPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'User and Space registered successfully. Please sign in.');
    assert.ok(res.body.data.user.id);
    assert.equal(res.body.data.user.username, 'ayush_admin');
    assert.equal(res.body.data.user.email, 'ayush@example.com');
    assert.equal(res.body.data.user.role, 'ADMIN');
    assert.equal(res.body.data.space.name, 'My Space');
    assert.equal(res.body.data.space.slug, 'my-space');

    // Confirm database persistence and bidirectional atomic linking
    const userInDb = await User.findById(res.body.data.user.id);
    const spaceInDb = await Space.findById(res.body.data.space.id);

    assert.ok(userInDb);
    assert.ok(spaceInDb);
    assert.equal(userInDb.spaceId.toString(), spaceInDb._id.toString());
    assert.equal(spaceInDb.owner.toString(), userInDb._id.toString());
  });

  test('Missing fields fail with 400 Bad Request', async () => {
    const fields = ['username', 'email', 'password', 'spaceName', 'accessCode'];

    for (const field of fields) {
      const payload = { ...validPayload };
      delete payload[field];

      const res = await request(app)
        .post('/api/auth/signup')
        .set('x-bypass-test-ratelimit', 'true')
        .send(payload);

      assert.equal(res.status, 400, `Expected 400 when missing ${field}`);
      assert.equal(res.body.success, false);
      assert.ok(res.body.errors.length > 0);
    }
  });

  test('Invalid email fails with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({ ...validPayload, email: 'not-an-email' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.some((e) => e.field === 'email'));
  });

  test('Weak passwords fail with 400 Bad Request', async () => {
    const weakPasswords = [
      'short1!', // under 8 characters
      'alllowercase123!', // no uppercase
      'ALLUPPERCASE123!', // no lowercase
      'NoNumbersHere!' // no number
    ];

    for (const password of weakPasswords) {
      const res = await request(app)
        .post('/api/auth/signup')
        .set('x-bypass-test-ratelimit', 'true')
        .send({ ...validPayload, password });

      assert.equal(res.status, 400, `Password "${password}" should be rejected`);
      assert.equal(res.body.success, false);
      assert.ok(res.body.errors.some((e) => e.field === 'password'));
    }
  });

  test('Incorrect access code fails with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({ ...validPayload, accessCode: 'INVALID_ACCESS_CODE' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Invalid access code');
  });

  test('Duplicate username fails with 409 Conflict (case-insensitive)', async () => {
    // First signup
    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send(validPayload);

    // Attempt second signup with same username (different case, different email & space)
    const res = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        ...validPayload,
        username: 'AYUSH_ADMIN',
        email: 'other@example.com',
        spaceName: 'Another Space'
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /username is already taken/i);
  });

  test('Duplicate email fails with 409 Conflict (case-insensitive)', async () => {
    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send(validPayload);

    const res = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        ...validPayload,
        username: 'different_user',
        email: 'AYUSH@EXAMPLE.COM',
        spaceName: 'Different Space'
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /email is already registered/i);
  });

  test('Duplicate Space name fails with 409 Conflict (case-insensitive)', async () => {
    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send(validPayload);

    const res = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        ...validPayload,
        username: 'second_admin',
        email: 'second@example.com',
        spaceName: 'my space' // same normalized name
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /space name is already taken/i);
  });

  test('Slug collision is handled safely by generating unique slug', async () => {
    // First space creates slug "rayals-space"
    const res1 = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        ...validPayload,
        username: 'user_one',
        email: 'user1@example.com',
        spaceName: "Rayal's Space"
      });

    assert.equal(res1.status, 201);
    assert.equal(res1.body.data.space.slug, 'rayals-space');

    // Second space with different name that produces the same base slug: "Rayals Space"
    const res2 = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        ...validPayload,
        username: 'user_two',
        email: 'user2@example.com',
        spaceName: 'Rayals Space'
      });

    assert.equal(res2.status, 201);
    // Slug should have counter appended to prevent collision
    assert.equal(res2.body.data.space.slug, 'rayals-space-1');
  });

  test('Database transaction failure rolls back both Space and User', async () => {
    // We simulate a transaction failure: make User validation fail after Space is staged
    const preCountUsers = await User.countDocuments();
    const preCountSpaces = await Space.countDocuments();

    // Pass invalid user role or trigger validation error directly in transaction
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const space = new Space({
          name: 'Rollback Space',
          nameNormalized: 'rollback space',
          slug: 'rollback-space',
          owner: new mongoose.Types.ObjectId()
        });
        await space.save({ session });

        // Intentional failure: User without required spaceId or invalid email
        const user = new User({
          username: 'rollback_user',
          usernameNormalized: 'rollback_user',
          // missing required fields
        });
        await user.save({ session });
      });
    } catch {
      // Expected transaction abort
    } finally {
      await session.endSession();
    }

    const postCountUsers = await User.countDocuments();
    const postCountSpaces = await Space.countDocuments();

    assert.equal(postCountUsers, preCountUsers, 'Users collection must not contain orphaned records');
    assert.equal(postCountSpaces, preCountSpaces, 'Spaces collection must not contain orphaned records');
  });
});

