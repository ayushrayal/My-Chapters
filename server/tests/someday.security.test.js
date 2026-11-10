import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';
import { SomedayCategory } from '../src/models/someday-category.model.js';
import { SomedayItem } from '../src/models/someday-item.model.js';

describe('Someday - Multi-Tenant Security & Space Isolation Suite', () => {
  let cookieA;
  let userA;
  let spaceA;
  let catA;
  let itemA;

  let cookieB;
  let userB;
  let spaceB;
  let catB;
  let itemB;

  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // 1. Setup Tenant A
    const signupA = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'user_a',
        email: 'user_a@example.com',
        password: 'Password123!',
        spaceName: "User A's Space",
        accessCode: env.ACCESS_CODE
      });

    userA = signupA.body.data.user;
    spaceA = signupA.body.data.space;

    const signinA = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'user_a@example.com',
        password: 'Password123!'
      });

    cookieA = signinA.headers['set-cookie'].find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));

    const catARes = await request(app)
      .post('/api/someday/categories')
      .set('Cookie', cookieA)
      .send({ name: 'Category Alpha' });
    catA = catARes.body.data;

    const itemARes = await request(app)
      .post('/api/someday/items')
      .set('Cookie', cookieA)
      .send({ name: 'Alpha Secret Item', categoryId: catA.id });
    itemA = itemARes.body.data;

    // 2. Setup Tenant B
    const signupB = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'user_b',
        email: 'user_b@example.com',
        password: 'Password123!',
        spaceName: "User B's Space",
        accessCode: env.ACCESS_CODE
      });

    userB = signupB.body.data.user;
    spaceB = signupB.body.data.space;

    const signinB = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'user_b@example.com',
        password: 'Password123!'
      });

    cookieB = signinB.headers['set-cookie'].find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));

    const catBRes = await request(app)
      .post('/api/someday/categories')
      .set('Cookie', cookieB)
      .send({ name: 'Category Beta' });
    catB = catBRes.body.data;

    const itemBRes = await request(app)
      .post('/api/someday/items')
      .set('Cookie', cookieB)
      .send({ name: 'Beta Secret Item', categoryId: catB.id });
    itemB = itemBRes.body.data;
  });

  test('Unauthenticated requests are rejected (401)', async () => {
    const res = await request(app).get('/api/someday/items');
    assert.equal(res.status, 401);
  });

  test("User A cannot view User B's items in list query", async () => {
    const res = await request(app)
      .get('/api/someday/items')
      .set('Cookie', cookieA);

    assert.equal(res.status, 200);
    const names = res.body.data.map((i) => i.name);
    assert.ok(names.includes('Alpha Secret Item'));
    assert.ok(!names.includes('Beta Secret Item'));
  });

  test("User A cannot view User B's item details (404)", async () => {
    const res = await request(app)
      .get(`/api/someday/items/${itemB.id}`)
      .set('Cookie', cookieA);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test("User A cannot edit User B's item (404)", async () => {
    const res = await request(app)
      .patch(`/api/someday/items/${itemB.id}`)
      .set('Cookie', cookieA)
      .send({ name: 'Hacked Item' });

    assert.equal(res.status, 404);

    // Verify item remains untouched in database
    const unchangedItem = await SomedayItem.findById(itemB.id);
    assert.equal(unchangedItem.name, 'Beta Secret Item');
  });

  test("User A cannot delete User B's item (404)", async () => {
    const res = await request(app)
      .delete(`/api/someday/items/${itemB.id}`)
      .set('Cookie', cookieA);

    assert.equal(res.status, 404);

    const checkItem = await SomedayItem.findById(itemB.id);
    assert.ok(checkItem);
  });

  test("User A cannot view User B's categories in list", async () => {
    const res = await request(app)
      .get('/api/someday/categories')
      .set('Cookie', cookieA);

    assert.equal(res.status, 200);
    const names = res.body.data.map((c) => c.name);
    assert.ok(names.includes('Category Alpha'));
    assert.ok(!names.includes('Category Beta'));
  });

  test("User A cannot edit User B's category (404)", async () => {
    const res = await request(app)
      .patch(`/api/someday/categories/${catB.id}`)
      .set('Cookie', cookieA)
      .send({ name: 'Tampered Category' });

    assert.equal(res.status, 404);

    const checkCat = await SomedayCategory.findById(catB.id);
    assert.equal(checkCat.name, 'Category Beta');
  });

  test("User A cannot delete User B's category (404)", async () => {
    const res = await request(app)
      .delete(`/api/someday/categories/${catB.id}`)
      .set('Cookie', cookieA);

    assert.equal(res.status, 404);

    const checkCat = await SomedayCategory.findById(catB.id);
    assert.ok(checkCat);
  });

  test("User A cannot assign User B's category to an item (400)", async () => {
    const res = await request(app)
      .post('/api/someday/items')
      .set('Cookie', cookieA)
      .send({
        name: 'Sneaky Cross-Tenant Item',
        categoryId: catB.id
      });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /not found in your space/i);
  });

  test("User A cannot update item to assign User B's category (400)", async () => {
    const res = await request(app)
      .patch(`/api/someday/items/${itemA.id}`)
      .set('Cookie', cookieA)
      .send({ categoryId: catB.id });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /not found in your space/i);
  });

  test('Cross-Space category deletion does not affect or move items in another Space', async () => {
    // Delete Category Alpha in Space A
    const res = await request(app)
      .delete(`/api/someday/categories/${catA.id}`)
      .set('Cookie', cookieA);

    assert.equal(res.status, 200);

    // Verify Space B's item is untouched and still points to Category Beta
    const itemBCheck = await SomedayItem.findById(itemB.id);
    assert.equal(itemBCheck.categoryId.toString(), catB.id);
  });

  test('Client-provided spaceId in payload is ignored and derived exclusively from session', async () => {
    const res = await request(app)
      .post('/api/someday/items')
      .set('Cookie', cookieA)
      .send({
        name: 'Spoofed Item',
        categoryId: catA.id,
        spaceId: spaceB.id // Attempting to inject Space B
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.spaceId, spaceA.id); // Derived securely from User A
  });
});

