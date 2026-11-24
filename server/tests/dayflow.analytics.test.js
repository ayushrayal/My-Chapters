import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

describe('Dayflow - Performance Analytics & Space Isolation Suite', () => {
  let authCookie;
  let otherSpaceCookie;

  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // Primary User
    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'analytics_user',
        email: 'analytics@example.com',
        password: 'Password123!',
        spaceName: 'Analytics Space',
        accessCode: env.ACCESS_CODE
      });

    const signinRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'analytics@example.com',
        password: 'Password123!'
      });

    authCookie = signinRes.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];

    // Other Space User
    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'other_user',
        email: 'other@example.com',
        password: 'Password123!',
        spaceName: 'Other Space',
        accessCode: env.ACCESS_CODE
      });

    const signinOther = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'other@example.com',
        password: 'Password123!'
      });

    otherSpaceCookie = signinOther.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];
  });

  test('Completion % calculation: 4 completed, 2 skipped gives exactly 66.67%', async () => {
    const blockId = '67431234567890abcdef3001';
    const taskIds = [
      '67431234567890abcdef4001',
      '67431234567890abcdef4002',
      '67431234567890abcdef4003',
      '67431234567890abcdef4004',
      '67431234567890abcdef4005',
      '67431234567890abcdef4006'
    ];

    await request(app)
      .post('/api/dayflow/schedule')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-20',
        blocks: [{ id: blockId, name: 'Work Block', startTime: '09:00', endTime: '17:00' }],
        tasks: taskIds.map((id, idx) => ({ id, blockId, title: `Task ${idx + 1}` }))
      });

    // Complete 4 tasks
    for (let i = 0; i < 4; i++) {
      await request(app)
        .patch(`/api/dayflow/schedule/tasks/${taskIds[i]}`)
        .set('Cookie', authCookie)
        .send({ date: '2026-11-20', status: 'COMPLETED' });
    }

    // Skip 2 tasks with mandatory reasons
    for (let i = 4; i < 6; i++) {
      await request(app)
        .patch(`/api/dayflow/schedule/tasks/${taskIds[i]}`)
        .set('Cookie', authCookie)
        .send({ date: '2026-11-20', status: 'SKIPPED', skippedReason: 'Reason for skipping' });
    }

    // Finish day
    await request(app)
      .post('/api/dayflow/schedule/finish')
      .set('Cookie', authCookie)
      .send({ date: '2026-11-20' });

    // Fetch analytics for 2026-11-20
    const analyticsRes = await request(app)
      .get('/api/dayflow/analytics?startDate=2026-11-20&endDate=2026-11-20&date=2026-11-20')
      .set('Cookie', authCookie);

    assert.equal(analyticsRes.status, 200);
    const { summary, timeBasedPerformance } = analyticsRes.body.data;

    assert.equal(summary.totalTasks, 6);
    assert.equal(summary.completedTasks, 4);
    assert.equal(summary.skippedTasks, 2);
    assert.equal(summary.overallCompletionRate, 66.67);

    assert.ok(timeBasedPerformance);
    assert.equal(timeBasedPerformance.totalTasks, 6);
    assert.equal(timeBasedPerformance.completedTasks, 4);
    assert.equal(timeBasedPerformance.skippedTasks, 2);
    assert.equal(timeBasedPerformance.finalRate, 66.67);
  });

  test('Rest Days and unscheduled days are excluded from performance calculations', async () => {
    // Day 1 (Scheduled & Finished): 2 tasks, 2 completed -> 100%
    const blockId1 = '67431234567890abcdef5001';
    await request(app)
      .post('/api/dayflow/schedule')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-21',
        blocks: [{ id: blockId1, name: 'Work', startTime: '09:00', endTime: '12:00' }],
        tasks: [
          { blockId: blockId1, title: 'Task A', status: 'COMPLETED' },
          { blockId: blockId1, title: 'Task B', status: 'COMPLETED' }
        ]
      });

    await request(app)
      .post('/api/dayflow/schedule/finish')
      .set('Cookie', authCookie)
      .send({ date: '2026-11-21' });

    // Day 2 (Rest Day): Has NO tasks and must NOT dilute completion % to 50%
    await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .set('Cookie', authCookie)
      .send({ date: '2026-11-22', isRestDay: true });

    // Query analytics for both days
    const res = await request(app)
      .get('/api/dayflow/analytics?startDate=2026-11-21&endDate=2026-11-22')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    const { summary } = res.body.data;

    // Overall completion rate remains 100% because Rest Day is excluded!
    assert.equal(summary.overallCompletionRate, 100);
    assert.equal(summary.totalTasks, 2);
    assert.equal(summary.completedTasks, 2);
    assert.equal(summary.scheduledDaysCount, 1);
    assert.equal(summary.restDaysCount, 1);
  });

  test('Template-wise analytics preserve historical attribution after template is renamed or deleted', async () => {
    // 1. Create template
    const templateRes = await request(app)
      .post('/api/dayflow/templates')
      .set('Cookie', authCookie)
      .send({
        name: 'Regular Working Day',
        blocks: [{ name: 'Deep Work', startTime: '09:00', endTime: '12:00' }]
      });

    const templateId = templateRes.body.data.id;
    const blockId = templateRes.body.data.blocks[0].id;

    // 2. Apply template to a day
    const applyRes = await request(app)
      .post('/api/dayflow/schedule/apply-template')
      .set('Cookie', authCookie)
      .send({
        templateId,
        targetDate: '2026-11-23',
        tasks: [{ blockId, title: 'Work task', status: 'COMPLETED' }]
      });

    const taskId = applyRes.body.data.tasks[0].id;
    await request(app)
      .patch(`/api/dayflow/schedule/tasks/${taskId}`)
      .set('Cookie', authCookie)
      .send({ date: '2026-11-23', status: 'COMPLETED' });

    // 3. Delete the original template
    await request(app)
      .delete(`/api/dayflow/templates/${templateId}`)
      .set('Cookie', authCookie);

    // 4. Analytics query preserves the historical template name 'Regular Working Day'
    const analyticsRes = await request(app)
      .get('/api/dayflow/analytics?startDate=2026-11-23&endDate=2026-11-23')
      .set('Cookie', authCookie);

    assert.equal(analyticsRes.status, 200);
    const { templateBreakdown } = analyticsRes.body.data;

    assert.equal(templateBreakdown.length, 1);
    assert.equal(templateBreakdown[0].templateName, 'Regular Working Day');
    assert.equal(templateBreakdown[0].totalTasks, 1);
    assert.equal(templateBreakdown[0].completedTasks, 1);
    assert.equal(templateBreakdown[0].completionRate, 100);
  });

  test('Space isolation: User from Space B cannot access Space A schedule or analytics', async () => {
    // Space A creates schedule
    await request(app)
      .post('/api/dayflow/schedule')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-24',
        blocks: [{ name: 'Secret Block', startTime: '10:00', endTime: '11:00' }]
      });

    // Space B queries schedule for 2026-11-24 -> returns NOT_SCHEDULED (empty for Space B)
    const resB = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-24')
      .set('Cookie', otherSpaceCookie);

    assert.equal(resB.status, 200);
    assert.equal(resB.body.data.status, 'NOT_SCHEDULED');
    assert.equal(resB.body.data.blocks.length, 0);

    // Space B analytics are completely empty
    const analyticsB = await request(app)
      .get('/api/dayflow/analytics?startDate=2026-11-24&endDate=2026-11-24')
      .set('Cookie', otherSpaceCookie);

    assert.equal(analyticsB.status, 200);
    assert.equal(analyticsB.body.data.summary.totalTasks, 0);
  });
});
