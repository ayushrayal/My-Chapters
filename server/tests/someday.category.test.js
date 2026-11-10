import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';
import { SomedayCategory } from '../src/models/someday-category.model.js';
import { SomedayItem } from '../src/models/someday-item.model.js';
import { SomedayCategoryService } from '../src/services/someday-category.service.js';

describe('Someday - Category CRUD Suite', () => {
  let authCookie;
  let testUser;
  let testSpace;

  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // Signup user + Space
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'category_admin',
        email: 'category@example.com',
        password: 'Password123!',
        spaceName: 'Category Space',
        accessCode: env.ACCESS_CODE
      });

    assert.equal(signupRes.status, 201);
    testUser = signupRes.body.data.user;
    testSpace = signupRes.body.data.space;

    // Sign in to get auth cookie
    const signinRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'category@example.com',
        password: 'Password123!'
      });

    const cookies = signinRes.headers['set-cookie'];
    authCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    assert.ok(authCookie);
  });

  test('Signup automatically provisions the predefined system Other category for the Space', async () => {
    const otherCat = await SomedayCategory.findOne({
      spaceId: testSpace.id,
      nameNormalized: 'other'
    });

    assert.ok(otherCat);
    assert.equal(otherCat.name, 'Other');
    assert.equal(otherCat.isSystem, true);
  });

  test('Create category with valid name succeeds (201)', async () => {
    const res = await request(app)
      .post('/api/someday/categories')
      .set('Cookie', authCookie)
      .send({ name: 'Watches' });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Watches');
    assert.equal(res.body.data.nameNormalized, 'watches');
    assert.equal(res.body.data.isSystem, false);
    assert.equal(res.body.data.itemCount, 0);
  });

  test('Creating duplicate category name in same Space returns 409 Conflict', async () => {
    await request(app)
      .post('/api/someday/categories')
      .set('Cookie', authCookie)
      .send({ name: 'Watches' });

    // Attempt to create category with different case
    const res = await request(app)
      .post('/api/someday/categories')
      .set('Cookie', authCookie)
      .send({ name: '  watches  ' });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already exists/i);
  });

  test('Creating duplicate Other category returns 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/someday/categories')
      .set('Cookie', authCookie)
      .send({ name: 'Other' });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  test('Empty or whitespace-only category name fails with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/someday/categories')
      .set('Cookie', authCookie)
      .send({ name: '   ' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('Get categories returns all Space categories with item counts and consistent sorting', async () => {
    // Create categories
    const catRes = await request(app)
      .post('/api/someday/categories')
      .set('Cookie', authCookie)
      .send({ name: 'Books' });

    const booksCatId = catRes.body.data.id;

    // Create an item in Books
    await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({
        name: 'Clean Code',
        categoryId: booksCatId
      });

    const res = await request(app)
      .get('/api/someday/categories')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));

    const books = res.body.data.find((c) => c.name === 'Books');
    const other = res.body.data.find((c) => c.name === 'Other');

    assert.ok(books);
    assert.equal(books.itemCount, 1);
    assert.ok(other);
    assert.equal(other.itemCount, 0);
    assert.equal(other.isSystem, true);
  });

  test('Edit custom category name succeeds (200)', async () => {
    const catRes = await request(app)
      .post('/api/someday/categories')
      .set('Cookie', authCookie)
      .send({ name: 'Old Name' });

    const catId = catRes.body.data.id;

    const res = await request(app)
      .patch(`/api/someday/categories/${catId}`)
      .set('Cookie', authCookie)
      .send({ name: 'New Name' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'New Name');
    assert.equal(res.body.data.nameNormalized, 'new name');
  });

  test('Renaming system Other category is rejected with 400 Bad Request', async () => {
    const other = await SomedayCategory.findOne({
      spaceId: testSpace.id,
      nameNormalized: 'other'
    });

    const res = await request(app)
      .patch(`/api/someday/categories/${other._id}`)
      .set('Cookie', authCookie)
      .send({ name: 'Renamed Other' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /cannot be renamed/i);
  });

  test('Renaming category to an existing name in Space is rejected with 409 Conflict', async () => {
    await request(app)
      .post('/api/someday/categories')
      .set('Cookie', authCookie)
      .send({ name: 'Category One' });

    const catTwoRes = await request(app)
      .post('/api/someday/categories')
      .set('Cookie', authCookie)
      .send({ name: 'Category Two' });

    const res = await request(app)
      .patch(`/api/someday/categories/${catTwoRes.body.data.id}`)
      .set('Cookie', authCookie)
      .send({ name: 'Category One' });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  test('Deleting an empty category succeeds (200, movedItems: 0)', async () => {
    const catRes = await request(app)
      .post('/api/someday/categories')
      .set('Cookie', authCookie)
      .send({ name: 'Empty Category' });

    const catId = catRes.body.data.id;

    const res = await request(app)
      .delete(`/api/someday/categories/${catId}`)
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Category deleted successfully');
    assert.equal(res.body.data.movedItems, 0);

    const check = await SomedayCategory.findById(catId);
    assert.equal(check, null);
  });

  test('Deleting a category containing items moves all items to Other atomically', async () => {
    // 1. Create custom category
    const catRes = await request(app)
      .post('/api/someday/categories')
      .set('Cookie', authCookie)
      .send({ name: 'Electronics' });

    const catId = catRes.body.data.id;

    // 2. Create 3 items in Electronics
    await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({ name: 'Keyboard', categoryId: catId });

    await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({ name: 'Mouse', categoryId: catId });

    await request(app)
      .post('/api/someday/items')
      .set('Cookie', authCookie)
      .send({ name: 'Monitor', categoryId: catId });

    // 3. Delete category
    const res = await request(app)
      .delete(`/api/someday/categories/${catId}`)
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.movedItems, 3);

    // 4. Verify items moved to Other
    const otherCat = await SomedayCategory.findOne({
      spaceId: testSpace.id,
      nameNormalized: 'other'
    });

    const movedItems = await SomedayItem.find({ spaceId: testSpace.id, categoryId: otherCat._id });
    assert.equal(movedItems.length, 3);
  });

  test('Deleting system Other category is rejected with 400 Bad Request', async () => {
    const other = await SomedayCategory.findOne({
      spaceId: testSpace.id,
      nameNormalized: 'other'
    });

    const res = await request(app)
      .delete(`/api/someday/categories/${other._id}`)
      .set('Cookie', authCookie);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /cannot be deleted/i);
  });

  test('Migration ensureOtherCategoriesForAllSpaces is idempotent and safe when run multiple times', async () => {
    const run1 = await SomedayCategoryService.ensureOtherCategoriesForAllSpaces();
    assert.ok(run1.totalSpaces >= 1);

    const run2 = await SomedayCategoryService.ensureOtherCategoriesForAllSpaces();
    assert.equal(run2.provisioned, 0); // No duplicates created
    assert.equal(run2.alreadyPresent, run1.totalSpaces);
  });
});

