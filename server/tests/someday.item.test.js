import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';
import { SomedayCategory } from '../src/models/someday-category.model.js';
import { SomedayItem } from '../src/models/someday-item.model.js';

describe('Someday - Item CRUD & Lifecycle Suite', () => {
  let authCookie;
  let testUser;
  let testSpace;
  let testCategory;

  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    const signupRes = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'item_admin',
        email: 'item_admin@example.com',
        password: 'Password123!',
        spaceName: 'Items Space',
        accessCode: env.ACCESS_CODE
      });

    testUser = signupRes.body.data.user;
    testSpace = signupRes.body.data.space;

    const signinRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'item_admin@example.com',
        password: 'Password123!'
      });

    const cookies = signinRes.headers['set-cookie'];
    authCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));

    // Create a custom category
    const catRes = await request(app)
      .post('/api/someday/categories')
      .set('Cookie', authCookie)
      .send({ name: 'Gadgets' });

    testCategory = catRes.body.data;
  });

  test('Create item without links defaults to PLANNED status and null purchaseDate (201)', async () => {
    const res = await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Sony Headphones',
        categoryId: testCategory.id,
        note: 'Noise cancelling'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Sony Headphones');
    assert.equal(res.body.data.status, 'PLANNED');
    assert.equal(res.body.data.purchaseDate, null);
    assert.deepEqual(res.body.data.links, []);
    assert.equal(res.body.data.note, 'Noise cancelling');
    assert.equal(res.body.data.category.name, 'Gadgets');
  });

  test('Create item with 1, 2, and 3 links succeeds', async () => {
    // 1 link
    const res1 = await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Item 1',
        categoryId: testCategory.id,
        links: [{ label: 'Store 1', url: 'https://store1.example.com' }]
      });
    assert.equal(res1.status, 201);
    assert.equal(res1.body.data.links.length, 1);

    // 2 links
    const res2 = await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Item 2',
        categoryId: testCategory.id,
        links: [
          { label: 'Store 1', url: 'https://store1.example.com' },
          { label: 'Store 2', url: 'https://store2.example.com' }
        ]
      });
    assert.equal(res2.status, 201);
    assert.equal(res2.body.data.links.length, 2);

    // 3 links
    const res3 = await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Item 3',
        categoryId: testCategory.id,
        links: [
          { label: 'Store 1', url: 'https://store1.example.com' },
          { label: 'Store 2', url: 'https://store2.example.com' },
          { label: 'Store 3', url: 'https://store3.example.com' }
        ]
      });
    assert.equal(res3.status, 201);
    assert.equal(res3.body.data.links.length, 3);
  });

  test('Reject item with 4 links (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Excess Links Item',
        categoryId: testCategory.id,
        links: [
          { label: '1', url: 'https://one.com' },
          { label: '2', url: 'https://two.com' },
          { label: '3', url: 'https://three.com' },
          { label: '4', url: 'https://four.com' }
        ]
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /validation failed/i);
  });

  test('Reject invalid link URL (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Bad Link Item',
        categoryId: testCategory.id,
        links: [{ label: 'Invalid', url: 'not-a-valid-url' }]
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('Get item details returns populated record (200)', async () => {
    const createRes = await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Mechanical Keyboard',
        categoryId: testCategory.id,
        note: 'Cherry MX Brown'
      });

    const itemId = createRes.body.data.id;

    const res = await request(app)
      .get(`/api/someday/items/${itemId}`)
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, itemId);
    assert.equal(res.body.data.name, 'Mechanical Keyboard');
    assert.equal(res.body.data.category.name, 'Gadgets');
  });

  test('Get items supports categoryId and status filters', async () => {
    // Item 1: Gadgets, PLANNED
    await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Smart Watch',
        categoryId: testCategory.id,
        status: 'PLANNED'
      });

    // Item 2: Gadgets, PURCHASED
    await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'USB-C Cable',
        categoryId: testCategory.id,
        status: 'PURCHASED'
      });

    // Create another category
    const catOtherRes = await request(app)
      .post('/api/someday/categories')
      .set('Cookie', authCookie)
      .send({ name: 'Furniture' });

    // Item 3: Furniture, PLANNED
    await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Standing Desk',
        categoryId: catOtherRes.body.data.id,
        status: 'PLANNED'
      });

    // 1. All items (3 total)
    const allRes = await request(app)
      .get('/api/someday/items')
      .set('Cookie', authCookie);
    assert.equal(allRes.body.data.length, 3);

    // 2. Filter by category
    const catRes = await request(app)
      .get(`/api/someday/items?categoryId=${testCategory.id}`)
      .set('Cookie', authCookie);
    assert.equal(catRes.body.data.length, 2);

    // 3. Filter by status PLANNED
    const plannedRes = await request(app)
      .get('/api/someday/items?status=PLANNED')
      .set('Cookie', authCookie);
    assert.equal(plannedRes.body.data.length, 2);

    // 4. Filter by status PURCHASED
    const purchasedRes = await request(app)
      .get('/api/someday/items?status=PURCHASED')
      .set('Cookie', authCookie);
    assert.equal(purchasedRes.body.data.length, 1);
    assert.equal(purchasedRes.body.data[0].name, 'USB-C Cable');

    // 5. Combined filter: categoryId + status
    const combinedRes = await request(app)
      .get(`/api/someday/items?categoryId=${testCategory.id}&status=PLANNED`)
      .set('Cookie', authCookie);
    assert.equal(combinedRes.body.data.length, 1);
    assert.equal(combinedRes.body.data[0].name, 'Smart Watch');
  });

  test('Edit item preserves existing fields when omitted', async () => {
    const createRes = await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Original Title',
        categoryId: testCategory.id,
        links: [{ label: 'Site', url: 'https://orig.com' }],
        note: 'Original Note'
      });

    const itemId = createRes.body.data.id;

    // Update only name
    const res = await request(app)
      .patch(`/api/someday/items/${itemId}`)
      .set('Cookie', authCookie)
      .send({ name: 'Updated Title' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Updated Title');
    assert.equal(res.body.data.note, 'Original Note');
    assert.equal(res.body.data.links.length, 1);
    assert.equal(res.body.data.category.id, testCategory.id);
  });

  test('Changing status to PURCHASED defaults to current date if omitted', async () => {
    const createRes = await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Desk Chair',
        categoryId: testCategory.id,
        status: 'PLANNED'
      });

    const itemId = createRes.body.data.id;
    assert.equal(createRes.body.data.purchaseDate, null);

    const res = await request(app)
      .patch(`/api/someday/items/${itemId}`)
      .set('Cookie', authCookie)
      .send({ status: 'PURCHASED' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'PURCHASED');
    assert.ok(res.body.data.purchaseDate);
  });

  test('Changing status to PURCHASED with explicit manual date preserves user date', async () => {
    const createRes = await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Vintage Camera',
        categoryId: testCategory.id
      });

    const itemId = createRes.body.data.id;
    const manualDate = '2025-05-15T00:00:00.000Z';

    const res = await request(app)
      .patch(`/api/someday/items/${itemId}`)
      .set('Cookie', authCookie)
      .send({
        status: 'PURCHASED',
        purchaseDate: manualDate
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'PURCHASED');
    assert.equal(new Date(res.body.data.purchaseDate).toISOString(), manualDate);
  });

  test('Changing status back to PLANNED clears purchaseDate', async () => {
    const createRes = await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Tablet',
        categoryId: testCategory.id,
        status: 'PURCHASED'
      });

    const itemId = createRes.body.data.id;
    assert.ok(createRes.body.data.purchaseDate);

    const res = await request(app)
      .patch(`/api/someday/items/${itemId}`)
      .set('Cookie', authCookie)
      .send({ status: 'PLANNED' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'PLANNED');
    assert.equal(res.body.data.purchaseDate, null);
  });

  test('Delete item succeeds (200)', async () => {
    const createRes = await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Item to delete',
        categoryId: testCategory.id
      });

    const itemId = createRes.body.data.id;

    const res = await request(app)
      .delete(`/api/someday/items/${itemId}`)
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Item deleted successfully');

    const check = await SomedayItem.findById(itemId);
    assert.equal(check, null);
  });
});

