import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

describe('Dayflow - Schedule Lifecycle & Business Rules Suite', () => {
  let authCookie;

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
        username: 'dayflow_scheduler',
        email: 'scheduler@example.com',
        password: 'Password123!',
        spaceName: 'Dayflow Space',
        accessCode: env.ACCESS_CODE
      });

    const signinRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'scheduler@example.com',
        password: 'Password123!'
      });

    authCookie = signinRes.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];
  });

  test('Mandatory block rule: schedule cannot be saved if mandatory block has no task', async () => {
    const blockId1 = '67431234567890abcdef0001';
    const blockId2 = '67431234567890abcdef0002';

    // Attempt to save schedule with mandatory blockId1 having NO task
    const res = await request(app)
      .post('/api/dayflow/schedule')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-25',
        blocks: [
          {
            id: blockId1,
            name: 'Critical Meeting',
            startTime: '10:00',
            endTime: '11:00',
            tasksRequired: true // MANDATORY
          },
          {
            id: blockId2,
            name: 'Break',
            startTime: '11:00',
            endTime: '11:30',
            tasksRequired: false // OPTIONAL
          }
        ],
        tasks: [
          // Only task for optional blockId2, none for blockId1!
          {
            blockId: blockId2,
            title: 'Have coffee'
          }
        ]
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Critical Meeting.*requires at least one task/i);
  });

  test('Optional block can have zero tasks, mandatory block with task succeeds', async () => {
    const blockId1 = '67431234567890abcdef0001';
    const blockId2 = '67431234567890abcdef0002';

    const res = await request(app)
      .post('/api/dayflow/schedule')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-25',
        blocks: [
          {
            id: blockId1,
            name: 'Critical Meeting',
            startTime: '10:00',
            endTime: '11:00',
            tasksRequired: true
          },
          {
            id: blockId2,
            name: 'Open Flex Time',
            startTime: '11:00',
            endTime: '12:00',
            tasksRequired: false
          }
        ],
        tasks: [
          {
            blockId: blockId1,
            title: 'Present slide deck'
          }
        ]
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.blocks.length, 2);
    assert.equal(res.body.data.tasks.length, 1);
  });

  test('Applying a template creates an independent daily schedule', async () => {
    // 1. Create reusable template
    const templateRes = await request(app)
      .post('/api/dayflow/templates')
      .set('Cookie', authCookie)
      .send({
        name: 'Engineering Sprint',
        blocks: [
          {
            name: 'Morning Standup',
            startTime: '09:30',
            endTime: '10:00',
            tasksRequired: false
          },
          {
            name: 'Feature Work',
            startTime: '10:00',
            endTime: '13:00',
            tasksRequired: false
          }
        ]
      });

    const templateId = templateRes.body.data.id;

    // 2. Apply template to target date
    const applyRes = await request(app)
      .post('/api/dayflow/schedule/apply-template')
      .set('Cookie', authCookie)
      .send({
        templateId,
        targetDate: '2026-11-26'
      });

    assert.equal(applyRes.status, 201);
    assert.equal(applyRes.body.data.date, '2026-11-26');
    assert.equal(applyRes.body.data.templateName, 'Engineering Sprint');
    assert.equal(applyRes.body.data.blocks.length, 2);

    // 3. Edit original template
    await request(app)
      .put(`/api/dayflow/templates/${templateId}`)
      .set('Cookie', authCookie)
      .send({
        name: 'Renamed Sprint Template',
        blocks: [
          {
            name: 'Brand New Block Only',
            startTime: '14:00',
            endTime: '15:00'
          }
        ]
      });

    // 4. Verify existing schedule remains completely UNCHANGED
    const scheduleRes = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-26')
      .set('Cookie', authCookie);

    assert.equal(scheduleRes.status, 200);
    // Preserves original snapshot block count (2) and original historical template name
    assert.equal(scheduleRes.body.data.blocks.length, 2);
    assert.equal(scheduleRes.body.data.blocks[0].name, 'Morning Standup');
    assert.equal(scheduleRes.body.data.templateName, 'Engineering Sprint');
  });

  test('Move schedule: shifts unfinished schedule to another day', async () => {
    const blockId = '67431234567890abcdef1004';
    // Create schedule for 2026-11-27
    const createRes = await request(app)
      .post('/api/dayflow/schedule')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-27',
        blocks: [{ id: blockId, name: 'Task Block', startTime: '10:00', endTime: '12:00' }],
        tasks: [{ blockId, title: 'Task to shift' }]
      });

    assert.equal(createRes.status, 200);

    // Move to 2026-11-28
    const moveRes = await request(app)
      .post('/api/dayflow/schedule/move')
      .set('Cookie', authCookie)
      .send({
        sourceDate: '2026-11-27',
        targetDate: '2026-11-28'
      });

    assert.equal(moveRes.status, 200);
    assert.equal(moveRes.body.data.date, '2026-11-28');

    // Source date is now unscheduled
    const oldRes = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-27')
      .set('Cookie', authCookie);

    assert.equal(oldRes.body.data.status, 'NOT_SCHEDULED');

    // Target date has the moved schedule
    const newRes = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-28')
      .set('Cookie', authCookie);

    assert.equal(newRes.body.data.status, 'SCHEDULED');
    assert.equal(newRes.body.data.tasks.length, 1);
  });

  test('Rest Day: sets rest day and excludes tasks', async () => {
    // Set rest day
    const restRes = await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-29',
        isRestDay: true
      });

    assert.equal(restRes.status, 200);
    assert.equal(restRes.body.data.status, 'REST_DAY');
    assert.equal(restRes.body.data.isRestDay, true);
    assert.equal(restRes.body.data.blocks.length, 0);
    assert.equal(restRes.body.data.tasks.length, 0);

    // Get Schedule reflects Rest Day
    const getRes = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-29')
      .set('Cookie', authCookie);

    assert.equal(getRes.body.data.status, 'REST_DAY');
    assert.equal(getRes.body.data.isRestDay, true);
  });
});
