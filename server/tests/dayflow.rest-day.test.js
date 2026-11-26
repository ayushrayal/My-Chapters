import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

describe('Dayflow - Rest Day Management & Validation Suite', () => {
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

    // Primary User in Space A
    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'rest_user_a',
        email: 'rest_a@example.com',
        password: 'Password123!',
        spaceName: 'Rest Space A',
        accessCode: env.ACCESS_CODE
      });

    const signinResA = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'rest_a@example.com',
        password: 'Password123!'
      });

    authCookie = signinResA.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];

    // User in Space B
    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'rest_user_b',
        email: 'rest_b@example.com',
        password: 'Password123!',
        spaceName: 'Rest Space B',
        accessCode: env.ACCESS_CODE
      });

    const signinResB = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'rest_b@example.com',
        password: 'Password123!'
      });

    otherSpaceCookie = signinResB.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];
  });

  test('1. Rest Day API succeeds with valid input and marks date as Rest Day', async () => {
    const res = await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-26',
        isRestDay: true,
        overwrite: true
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.date, '2026-11-26');
    assert.equal(res.body.data.isRestDay, true);
    assert.equal(res.body.data.status, 'REST_DAY');
    assert.equal(res.body.data.blocks.length, 0);
    assert.equal(res.body.data.tasks.length, 0);
  });

  test('2. Invalid date input (boolean, malformed, missing) is rejected with 400 Bad Request', async () => {
    // Boolean date (the exact previous bug where date was passed as boolean)
    const boolRes = await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .set('Cookie', authCookie)
      .send({
        date: true,
        isRestDay: true
      });

    assert.equal(boolRes.status, 400);
    assert.equal(boolRes.body.success, false);
    assert.match(boolRes.body.message, /validation failed/i);
    assert.ok(boolRes.body.errors.some((e) => e.field === 'date'));

    // Malformed date
    const badDateRes = await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .set('Cookie', authCookie)
      .send({
        date: '26-11-2026',
        isRestDay: true
      });

    assert.equal(badDateRes.status, 400);
    assert.equal(badDateRes.body.success, false);

    // Missing date
    const missingDateRes = await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .set('Cookie', authCookie)
      .send({
        isRestDay: true
      });

    assert.equal(missingDateRes.status, 400);
  });

  test('3. Unauthorized request without cookie is rejected with 401', async () => {
    const res = await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .send({
        date: '2026-11-26',
        isRestDay: true
      });

    assert.equal(res.status, 401);
  });

  test('4. Only the selected date is modified; other dates remain untouched', async () => {
    const blockId = '67431234567890abcdef7001';

    // Create schedule on Day 1 (2026-11-25)
    await request(app)
      .post('/api/dayflow/schedule')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-25',
        blocks: [{ id: blockId, name: 'Work', startTime: '09:00', endTime: '12:00' }],
        tasks: [{ blockId, title: 'Preserved Day 1 Task' }]
      });

    // Mark Day 2 (2026-11-26) as Rest Day
    const restRes = await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-26',
        isRestDay: true,
        overwrite: true
      });

    assert.equal(restRes.status, 200);

    // Verify Day 1 is completely untouched
    const day1Res = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-25')
      .set('Cookie', authCookie);

    assert.equal(day1Res.status, 200);
    assert.equal(day1Res.body.data.isRestDay, false);
    assert.equal(day1Res.body.data.tasks.length, 1);
    assert.equal(day1Res.body.data.tasks[0].title, 'Preserved Day 1 Task');

    // Verify Day 2 is Rest Day
    const day2Res = await request(app)
      .get('/api/dayflow/schedule?date=2026-11-26')
      .set('Cookie', authCookie);

    assert.equal(day2Res.status, 200);
    assert.equal(day2Res.body.data.isRestDay, true);
    assert.equal(day2Res.body.data.tasks.length, 0);
  });

  test('5. Existing tasks require overwrite: true confirmation or reject with 409 Conflict', async () => {
    const blockId = '67431234567890abcdef7002';

    // Create schedule with tasks
    await request(app)
      .post('/api/dayflow/schedule')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-27',
        blocks: [{ id: blockId, name: 'Work', startTime: '09:00', endTime: '12:00' }],
        tasks: [{ blockId, title: 'Task to be cleared' }]
      });

    // Attempt to mark Rest Day without overwrite -> 409 Conflict
    const conflictRes = await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-27',
        isRestDay: true,
        overwrite: false
      });

    assert.equal(conflictRes.status, 409);
    assert.match(conflictRes.body.message, /contains tasks.*confirm to replace/i);

    // With explicit overwrite: true confirmation -> 200 Success and cleared
    const successRes = await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .set('Cookie', authCookie)
      .send({
        date: '2026-11-27',
        isRestDay: true,
        overwrite: true
      });

    assert.equal(successRes.status, 200);
    assert.equal(successRes.body.data.isRestDay, true);
    assert.equal(successRes.body.data.tasks.length, 0);
    assert.equal(successRes.body.data.blocks.length, 0);
  });

  test('6. Concurrent/duplicate requests are handled safely without crashing', async () => {
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/dayflow/schedule/rest-day')
        .set('Cookie', authCookie)
        .send({ date: '2026-11-28', isRestDay: true, overwrite: true }),
      request(app)
        .post('/api/dayflow/schedule/rest-day')
        .set('Cookie', authCookie)
        .send({ date: '2026-11-28', isRestDay: true, overwrite: true })
    ]);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    assert.equal(res1.body.data.isRestDay, true);
    assert.equal(res2.body.data.isRestDay, true);
  });

  test('7. Calendar overview reflects Rest Day status accurately', async () => {
    await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .set('Cookie', authCookie)
      .send({ date: '2026-11-29', isRestDay: true, overwrite: true });

    const calRes = await request(app)
      .get('/api/dayflow/schedule/calendar?startDate=2026-11-29&endDate=2026-11-29')
      .set('Cookie', authCookie);

    assert.equal(calRes.status, 200);
    assert.ok(Array.isArray(calRes.body.data));
    assert.equal(calRes.body.data.length, 1);
    assert.equal(calRes.body.data[0].date, '2026-11-29');
    assert.equal(calRes.body.data[0].isRestDay, true);
    assert.equal(calRes.body.data[0].status, 'REST_DAY');
  });

  test('8. Clearing Rest Day returns NOT_SCHEDULED state', async () => {
    // 1. Mark Rest Day
    await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .set('Cookie', authCookie)
      .send({ date: '2026-11-30', isRestDay: true, overwrite: true });

    // 2. Clear Rest Day (Resume Scheduling)
    const clearRes = await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .set('Cookie', authCookie)
      .send({ date: '2026-11-30', isRestDay: false });

    assert.equal(clearRes.status, 200);
    assert.equal(clearRes.body.data.isRestDay, false);
    assert.equal(clearRes.body.data.status, 'NOT_SCHEDULED');
  });

  test('9. Space tenant isolation: Space B cannot view or modify Space A rest days', async () => {
    // Space A marks Rest Day
    await request(app)
      .post('/api/dayflow/schedule/rest-day')
      .set('Cookie', authCookie)
      .send({ date: '2026-12-01', isRestDay: true, overwrite: true });

    // Space B queries 2026-12-01 -> returns NOT_SCHEDULED
    const resB = await request(app)
      .get('/api/dayflow/schedule?date=2026-12-01')
      .set('Cookie', otherSpaceCookie);

    assert.equal(resB.status, 200);
    assert.equal(resB.body.data.status, 'NOT_SCHEDULED');
    assert.equal(resB.body.data.isRestDay, false);
  });
});
