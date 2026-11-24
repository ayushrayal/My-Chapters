import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

describe('Dayflow - Tasks Lifecycle, Time-Based Status & Day Locking Suite', () => {
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
        username: 'dayflow_locking',
        email: 'locking@example.com',
        password: 'Password123!',
        spaceName: 'Locking Space',
        accessCode: env.ACCESS_CODE
      });

    const signinRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'locking@example.com',
        password: 'Password123!'
      });

    authCookie = signinRes.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];
  });

  test('Time-based task status: UPCOMING -> CURRENT -> PENDING (never automatically skipped)', async () => {
    const blockId = '67431234567890abcdef1001';

    // Create schedule for date 2026-11-25 with block 09:00 - 11:00
    await request(app)
      .post('/api/dayflow/schedule')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-25',
        blocks: [{ id: blockId, name: 'Morning Focus', startTime: '09:00', endTime: '11:00' }],
        tasks: [{ blockId, title: 'Write specifications' }]
      });

    // 1. Before block starts (08:30) -> UPCOMING
    const beforeRes = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-25&clientDate=2026-11-25&clientTime=08:30')
      .set('Cookie', authCookie);

    assert.equal(beforeRes.body.data.tasks[0].status, 'UPCOMING');

    // 2. During block (10:15) -> CURRENT
    const duringRes = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-25&clientDate=2026-11-25&clientTime=10:15')
      .set('Cookie', authCookie);

    assert.equal(duringRes.body.data.tasks[0].status, 'CURRENT');
    assert.equal(duringRes.body.data.currentBlockId, blockId);

    // 3. After block ends (11:30) -> PENDING (Never Skipped!)
    const afterRes = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-25&clientDate=2026-11-25&clientTime=11:30')
      .set('Cookie', authCookie);

    assert.equal(afterRes.body.data.tasks[0].status, 'PENDING');
  });

  test('Skipping a task requires a mandatory reason', async () => {
    const blockId = '67431234567890abcdef1002';
    const taskId = '67431234567890abcdef2002';

    await request(app)
      .post('/api/dayflow/schedule')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-25',
        blocks: [{ id: blockId, name: 'Task Block', startTime: '10:00', endTime: '12:00' }],
        tasks: [{ id: taskId, blockId, title: 'Read documentation' }]
      });

    // Attempt to mark SKIPPED without a reason (400 Bad Request)
    const skipFailRes = await request(app)
      .patch(`/api/dayflow/schedule/tasks/${taskId}`)
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-25',
        status: 'SKIPPED'
        // Missing skippedReason
      });

    assert.equal(skipFailRes.status, 400);
    assert.match(skipFailRes.body.message, /mandatory reason/i);

    // Skip with valid reason succeeds
    const skipSuccessRes = await request(app)
      .patch(`/api/dayflow/schedule/tasks/${taskId}`)
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-25',
        status: 'SKIPPED',
        skippedReason: 'Postponed due to server emergency'
      });

    assert.equal(skipSuccessRes.status, 200);
    const updatedTask = skipSuccessRes.body.data.tasks.find((t) => t.id === taskId);
    assert.equal(updatedTask.status, 'SKIPPED');
    assert.equal(updatedTask.skippedReason, 'Postponed due to server emergency');
  });

  test('Day cannot be finished with unresolved tasks; succeeds when all Completed or Skipped', async () => {
    const blockId = '67431234567890abcdef1003';
    const taskId1 = '67431234567890abcdef2003';
    const taskId2 = '67431234567890abcdef2004';

    await request(app)
      .post('/api/dayflow/schedule')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-25',
        blocks: [{ id: blockId, name: 'Work Block', startTime: '09:00', endTime: '17:00' }],
        tasks: [
          { id: taskId1, blockId, title: 'Task 1' },
          { id: taskId2, blockId, title: 'Task 2' }
        ]
      });

    // 1. Attempt to finish while tasks are still unresolved (400 Bad Request)
    const finishFailRes = await request(app)
      .post('/api/dayflow/schedule/finish')
      .set('Cookie', authCookie)
      .send({ date: '2026-11-25' });

    assert.equal(finishFailRes.status, 400);
    assert.match(finishFailRes.body.message, /must be completed or skipped/i);

    // 2. Mark Task 1 as COMPLETED
    await request(app)
      .patch(`/api/dayflow/schedule/tasks/${taskId1}`)
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-25',
        status: 'COMPLETED'
      });

    // Still cannot finish with Task 2 unresolved
    const finishFail2 = await request(app)
      .post('/api/dayflow/schedule/finish')
      .set('Cookie', authCookie)
      .send({ date: '2026-11-25' });
    assert.equal(finishFail2.status, 400);

    // 3. Mark Task 2 as SKIPPED with reason
    await request(app)
      .patch(`/api/dayflow/schedule/tasks/${taskId2}`)
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-25',
        status: 'SKIPPED',
        skippedReason: 'Priority shifted to release review'
      });

    // 4. Now Finish Day succeeds
    const finishSuccess = await request(app)
      .post('/api/dayflow/schedule/finish')
      .set('Cookie', authCookie)
      .send({ date: '2026-11-25' });

    assert.equal(finishSuccess.status, 200);
    assert.equal(finishSuccess.body.data.isFinished, true);
    assert.equal(finishSuccess.body.data.status, 'FINISHED');
  });

  test('Finished day is permanently locked against backend modifications', async () => {
    const blockId = '67431234567890abcdef1005';
    const taskId = '67431234567890abcdef2005';

    // Create schedule
    await request(app)
      .post('/api/dayflow/schedule')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-25',
        blocks: [{ id: blockId, name: 'Work Block', startTime: '09:00', endTime: '12:00' }],
        tasks: [{ id: taskId, blockId, title: 'Single task' }]
      });

    // Complete task
    await request(app)
      .patch(`/api/dayflow/schedule/tasks/${taskId}`)
      .set('Cookie', authCookie)
      .send({ date: '2026-11-25', status: 'COMPLETED' });

    // Finish day
    await request(app)
      .post('/api/dayflow/schedule/finish')
      .set('Cookie', authCookie)
      .send({ date: '2026-11-25' });

    // 1. Attempt to edit task in finished day (400)
    const editTaskRes = await request(app)
      .patch(`/api/dayflow/schedule/tasks/${taskId}`)
      .set('Cookie', authCookie)
      .send({ date: '2026-11-25', title: 'Hacked task title' });

    assert.equal(editTaskRes.status, 400);
    assert.match(editTaskRes.body.message, /permanently locked/i);

    // 2. Attempt to delete task in finished day (400)
    const deleteTaskRes = await request(app)
      .delete(`/api/dayflow/schedule/tasks/${taskId}?date=2026-11-25`)
      .set('Cookie', authCookie);

    assert.equal(deleteTaskRes.status, 400);
    assert.match(deleteTaskRes.body.message, /permanently locked/i);

    // 3. Attempt to save/overwrite finished day (400)
    const saveRes = await request(app)
      .post('/api/dayflow/schedule')
      .set('Cookie', authCookie)
      .send({ date: '2026-11-25', blocks: [], tasks: [] });

    assert.equal(saveRes.status, 400);
    assert.match(saveRes.body.message, /permanently locked/i);

    // 4. Attempt to move finished day (400)
    const moveRes = await request(app)
      .post('/api/dayflow/schedule/move')
      .set('Cookie', authCookie)
      .send({ sourceDate: '2026-11-25', targetDate: '2026-11-26' });

    assert.equal(moveRes.status, 400);
    assert.match(moveRes.body.message, /permanently locked/i);
  });
});
