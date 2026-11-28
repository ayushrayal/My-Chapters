import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

describe('Dayflow - Template Application Date & Task Persistence Suite', () => {
  let authCookie;
  let templateId;
  let block1Id;
  let block2Id;

  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'date_tester',
        email: 'date_tester@example.com',
        password: 'Password123!',
        spaceName: 'Date Test Space',
        accessCode: env.ACCESS_CODE
      });

    const signinRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'date_tester@example.com',
        password: 'Password123!'
      });

    authCookie = signinRes.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];

    // Create a routine template with Gym Time (19:30-21:00) and Study Time (21:30-22:00)
    const tplRes = await request(app)
      .post('/api/dayflow/templates')
      .set('Cookie', authCookie)
      .send({
        name: 'Evening Routine',
        blocks: [
          {
            name: 'Gym Time',
            startTime: '19:30',
            endTime: '21:00',
            description: 'Workout and stretching',
            tasksRequired: true
          },
          {
            name: 'Study Time',
            startTime: '21:30',
            endTime: '22:00',
            description: 'Read documentation',
            tasksRequired: false
          }
        ]
      });

    assert.equal(tplRes.status, 201);
    templateId = (tplRes.body.data.id || tplRes.body.data._id).toString();
    block1Id = (tplRes.body.data.blocks[0].id || tplRes.body.data.blocks[0]._id).toString();
    block2Id = (tplRes.body.data.blocks[1].id || tplRes.body.data.blocks[1]._id).toString();
  });

  test('1. Applying template to 2026-11-28 creates schedule specifically on 2026-11-28 with all tasks', async () => {
    const applyRes = await request(app)
      .post('/api/dayflow/schedule/apply-template')
      .set('Cookie', authCookie)
      .send({
        templateId,
        targetDate: '2026-11-28',
        overwrite: false,
        tasks: [
          {
            blockId: block1Id,
            title: 'Bench Press & Core'
          },
          {
            blockId: block2Id,
            title: 'Read System Architecture'
          }
        ]
      });

    assert.equal(applyRes.status, 201);
    assert.equal(applyRes.body.data.date, '2026-11-28');
    assert.equal(applyRes.body.data.templateName, 'Evening Routine');
    assert.equal(applyRes.body.data.blocks.length, 2);
    assert.equal(applyRes.body.data.tasks.length, 2);
    assert.equal(applyRes.body.data.stats.total, 2);

    // Verify GET /api/dayflow/schedule?date=2026-11-28
    const getRes = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-28')
      .set('Cookie', authCookie);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.date, '2026-11-28');
    assert.equal(getRes.body.data.status, 'SCHEDULED');
    assert.equal(getRes.body.data.tasks.length, 2);
    assert.equal(getRes.body.data.tasks[0].title, 'Bench Press & Core');
    assert.equal(getRes.body.data.tasks[1].title, 'Read System Architecture');

    // Confirm 2026-11-29 remains completely empty / untouched
    const getNextDayRes = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-29')
      .set('Cookie', authCookie);

    assert.equal(getNextDayRes.status, 200);
    assert.equal(getNextDayRes.body.data.date, '2026-11-29');
    assert.equal(getNextDayRes.body.data.status, 'NOT_SCHEDULED');
    assert.equal(getNextDayRes.body.data.tasks.length, 0);
  });

  test('2. Re-applying without overwrite to 2026-11-28 reports conflict for 2026-11-28 specifically', async () => {
    // First application
    await request(app)
      .post('/api/dayflow/schedule/apply-template')
      .set('Cookie', authCookie)
      .send({
        templateId,
        targetDate: '2026-11-28',
        overwrite: false,
        tasks: [{ blockId: block1Id, title: 'Initial Task' }]
      });

    // Second application without overwrite
    const conflictRes = await request(app)
      .post('/api/dayflow/schedule/apply-template')
      .set('Cookie', authCookie)
      .send({
        templateId,
        targetDate: '2026-11-28',
        overwrite: false,
        tasks: [{ blockId: block1Id, title: 'Updated Task' }]
      });

    assert.equal(conflictRes.status, 409);
    assert.ok(conflictRes.body.message.includes('2026-11-28'));
    assert.ok(!conflictRes.body.message.includes('2026-11-29'));
  });

  test('3. Re-applying with overwrite: true replaces schedule on 2026-11-28 cleanly', async () => {
    // First application
    await request(app)
      .post('/api/dayflow/schedule/apply-template')
      .set('Cookie', authCookie)
      .send({
        templateId,
        targetDate: '2026-11-28',
        overwrite: false,
        tasks: [{ blockId: block1Id, title: 'Old Task' }]
      });

    // Overwrite application
    const overwriteRes = await request(app)
      .post('/api/dayflow/schedule/apply-template')
      .set('Cookie', authCookie)
      .send({
        templateId,
        targetDate: '2026-11-28',
        overwrite: true,
        tasks: [
          { blockId: block1Id, title: 'New Gym Task' },
          { blockId: block2Id, title: 'New Study Task' }
        ]
      });

    assert.equal(overwriteRes.status, 201);
    assert.equal(overwriteRes.body.data.date, '2026-11-28');
    assert.equal(overwriteRes.body.data.tasks.length, 2);
    assert.equal(overwriteRes.body.data.tasks[0].title, 'New Gym Task');
    assert.equal(overwriteRes.body.data.tasks[1].title, 'New Study Task');
  });

  test('4. Separate schedules on 2026-11-28 and 2026-11-29 remain completely isolated', async () => {
    // Apply on Nov 28
    await request(app)
      .post('/api/dayflow/schedule/apply-template')
      .set('Cookie', authCookie)
      .send({
        templateId,
        targetDate: '2026-11-28',
        overwrite: false,
        tasks: [{ blockId: block1Id, title: 'Saturday Workout' }]
      });

    // Apply on Nov 29
    await request(app)
      .post('/api/dayflow/schedule/apply-template')
      .set('Cookie', authCookie)
      .send({
        templateId,
        targetDate: '2026-11-29',
        overwrite: false,
        tasks: [{ blockId: block1Id, title: 'Sunday Workout' }]
      });

    const satRes = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-28')
      .set('Cookie', authCookie);
    const sunRes = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-29')
      .set('Cookie', authCookie);

    assert.equal(satRes.body.data.tasks[0].title, 'Saturday Workout');
    assert.equal(sunRes.body.data.tasks[0].title, 'Sunday Workout');
  });
});
