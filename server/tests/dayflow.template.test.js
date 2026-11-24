import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

describe('Dayflow - Template CRUD & Multi-Tenant Isolation Suite', () => {
  let userACookie;
  let userBCookie;

  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // Create User A
    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'dayflow_user_a',
        email: 'user_a@example.com',
        password: 'Password123!',
        spaceName: 'Space A',
        accessCode: env.ACCESS_CODE
      });

    const signinA = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'user_a@example.com',
        password: 'Password123!'
      });

    userACookie = signinA.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];

    // Create User B
    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'dayflow_user_b',
        email: 'user_b@example.com',
        password: 'Password123!',
        spaceName: 'Space B',
        accessCode: env.ACCESS_CODE
      });

    const signinB = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'user_b@example.com',
        password: 'Password123!'
      });

    userBCookie = signinB.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];
  });

  test('Create template with valid non-overlapping blocks succeeds', async () => {
    const res = await request(app)
      .post('/api/dayflow/templates')
      .set('Cookie', userACookie)
      .send({
        name: 'Deep Work Day',
        description: 'Template for focused work sessions',
        blocks: [
          {
            name: 'Morning Routine',
            startTime: '08:00',
            endTime: '09:00',
            description: 'Exercise and planning',
            order: 0,
            tasksRequired: false
          },
          {
            name: 'Focus Block 1',
            startTime: '09:00',
            endTime: '12:00',
            description: 'Core product engineering',
            order: 1,
            tasksRequired: true
          }
        ]
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Deep Work Day');
    assert.equal(res.body.data.blocks.length, 2);
    assert.equal(res.body.data.blocks[1].tasksRequired, true);
  });

  test('Reject template with overlapping blocks (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/dayflow/templates')
      .set('Cookie', userACookie)
      .send({
        name: 'Invalid Overlap Day',
        blocks: [
          {
            name: 'Block A',
            startTime: '09:00',
            endTime: '11:00'
          },
          {
            name: 'Block B',
            startTime: '10:30', // Overlaps with Block A!
            endTime: '12:00'
          }
        ]
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const hasOverlapError = res.body.errors
      ? res.body.errors.some((e) => /overlap/i.test(e.message))
      : /overlap/i.test(res.body.message);
    assert.ok(hasOverlapError);
  });

  test('Reject template with end time before start time (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/dayflow/templates')
      .set('Cookie', userACookie)
      .send({
        name: 'Backwards Time',
        blocks: [
          {
            name: 'Impossible Block',
            startTime: '14:00',
            endTime: '13:00'
          }
        ]
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('Prevent duplicate template name in same Space (409 Conflict)', async () => {
    await request(app)
      .post('/api/dayflow/templates')
      .set('Cookie', userACookie)
      .send({ name: 'Standard Day' });

    const duplicateRes = await request(app)
      .post('/api/dayflow/templates')
      .set('Cookie', userACookie)
      .send({ name: 'standard day' }); // Case-insensitive duplicate

    assert.equal(duplicateRes.status, 409);
    assert.equal(duplicateRes.body.success, false);
  });

  test('Template CRUD: Get list, get by ID, edit and delete', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/dayflow/templates')
      .set('Cookie', userACookie)
      .send({
        name: 'Weekend Relax',
        description: 'Unstructured rest',
        blocks: [
          {
            name: 'Morning Walk',
            startTime: '08:00',
            endTime: '09:30'
          }
        ]
      });

    const templateId = createRes.body.data.id;

    // Get List
    const listRes = await request(app)
      .get('/api/dayflow/templates')
      .set('Cookie', userACookie);

    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.data.length, 1);
    assert.equal(listRes.body.data[0].id, templateId);

    // Get Single
    const singleRes = await request(app)
      .get(`/api/dayflow/templates/${templateId}`)
      .set('Cookie', userACookie);

    assert.equal(singleRes.status, 200);
    assert.equal(singleRes.body.data.name, 'Weekend Relax');

    // Update
    const updateRes = await request(app)
      .put(`/api/dayflow/templates/${templateId}`)
      .set('Cookie', userACookie)
      .send({
        name: 'Weekend Recharged',
        description: 'Updated description'
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.name, 'Weekend Recharged');

    // Delete
    const deleteRes = await request(app)
      .delete(`/api/dayflow/templates/${templateId}`)
      .set('Cookie', userACookie);

    assert.equal(deleteRes.status, 200);

    // Verify Deleted
    const verifyRes = await request(app)
      .get(`/api/dayflow/templates/${templateId}`)
      .set('Cookie', userACookie);

    assert.equal(verifyRes.status, 404);
  });

  test('Multi-Tenant Isolation: User B cannot access or modify User A templates', async () => {
    // User A creates template
    const createRes = await request(app)
      .post('/api/dayflow/templates')
      .set('Cookie', userACookie)
      .send({ name: 'User A Secret Routine' });

    const templateId = createRes.body.data.id;

    // User B cannot view User A's template list
    const listB = await request(app)
      .get('/api/dayflow/templates')
      .set('Cookie', userBCookie);

    assert.equal(listB.status, 200);
    assert.equal(listB.body.data.length, 0); // Completely empty for User B

    // User B cannot view by ID (404)
    const singleB = await request(app)
      .get(`/api/dayflow/templates/${templateId}`)
      .set('Cookie', userBCookie);

    assert.equal(singleB.status, 404);

    // User B cannot edit User A template (404)
    const editB = await request(app)
      .put(`/api/dayflow/templates/${templateId}`)
      .set('Cookie', userBCookie)
      .send({ name: 'Hacked Routine' });

    assert.equal(editB.status, 404);

    // User B cannot delete User A template (404)
    const deleteB = await request(app)
      .delete(`/api/dayflow/templates/${templateId}`)
      .set('Cookie', userBCookie);

    assert.equal(deleteB.status, 404);
  });
});
