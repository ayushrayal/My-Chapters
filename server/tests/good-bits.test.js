import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';
import { GoodBit } from '../src/models/good-bit.model.js';

describe('Good Bits - Comprehensive Backend Suite', () => {
  let authCookie;
  let testUser;
  let testSpace;
  let otherAuthCookie;
  let otherUser;
  let otherSpace;

  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // User A
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'goodbit_user',
        email: 'goodbit@example.com',
        password: 'Password123!',
        spaceName: 'Good Space',
        accessCode: env.ACCESS_CODE
      });

    testUser = signupRes.body.data.user;
    testSpace = signupRes.body.data.space;

    const signinRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'goodbit@example.com',
        password: 'Password123!'
      });

    const cookies = signinRes.headers['set-cookie'];
    authCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));

    // User B (for Space isolation testing)
    const otherSignupRes = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'other_user',
        email: 'other@example.com',
        password: 'Password123!',
        spaceName: 'Other Space',
        accessCode: env.ACCESS_CODE
      });

    otherUser = otherSignupRes.body.data.user;
    otherSpace = otherSignupRes.body.data.space;

    const otherSigninRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'other@example.com',
        password: 'Password123!'
      });

    const otherCookies = otherSigninRes.headers['set-cookie'];
    otherAuthCookie = otherCookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  });

  describe('1. Entry Creation and Validation', () => {
    test('successfully creates a single Good Bit entry on a past or current date', async () => {
      const res = await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({
          date: '2026-11-20',
          title: 'Great Team Lunch',
          description: 'Had an inspiring conversation with colleagues over ramen.'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.title, 'Great Team Lunch');
      assert.equal(res.body.data.date, '2026-11-20');
      assert.equal(res.body.data.description, 'Had an inspiring conversation with colleagues over ramen.');
      assert.equal(res.body.data.spaceId.toString(), testSpace.id.toString());
    });

    test('successfully creates multiple independent entries on the same date', async () => {
      const entry1 = await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({
          date: '2026-11-20',
          title: 'Morning Run',
          description: 'Ran 5k in crisp autumn morning air.'
        });

      const entry2 = await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({
          date: '2026-11-20',
          title: 'Evening Coffee',
          description: 'Brewed freshly roasted beans while reading a book.'
        });

      assert.equal(entry1.status, 201);
      assert.equal(entry2.status, 201);
      assert.notEqual(entry1.body.data._id, entry2.body.data._id);

      // Verify retrieval by date returns both
      const listRes = await request(app)
        .get('/api/goodbits/date/2026-11-20')
        .set('Cookie', authCookie);

      assert.equal(listRes.status, 200);
      assert.equal(listRes.body.data.totalCount, 2);
      assert.equal(listRes.body.data.entries.length, 2);
    });

    test('supports optional title and long-form description up to 5000 characters', async () => {
      const longDescription = 'A'.repeat(4500);

      const res = await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({
          date: '2026-11-15',
          description: longDescription
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.title, '');
      assert.equal(res.body.data.description.length, 4500);
    });

    test('rejects empty or whitespace-only description', async () => {
      const res = await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({
          date: '2026-11-20',
          title: 'Empty Moment',
          description: '   '
        });

      assert.equal(res.status, 400);
    });

    test('rejects future-dated entries', async () => {
      const res = await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({
          date: '2099-12-31',
          title: 'Future memory',
          description: 'This has not happened yet.'
        });

      assert.equal(res.status, 400);
      const errors = res.body.errors || [];
      assert.ok(errors.some((e) => /future/i.test(e.message)));
    });
  });

  describe('2. Monthly Calendar Retrieval and Day Counts', () => {
    test('returns entries for a month and calculates correct day counts', async () => {
      // 2 entries on 2026-11-05
      await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({ date: '2026-11-05', description: 'Morning yoga session' });
      await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({ date: '2026-11-05', description: 'Cooked nice dinner' });

      // 1 entry on 2026-11-18
      await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({ date: '2026-11-18', description: 'Learned new guitar chord' });

      // 1 entry on 2026-10-18 (different month)
      await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({ date: '2026-10-18', description: 'October memory' });

      const res = await request(app)
        .get('/api/goodbits/month?monthKey=2026-11')
        .set('Cookie', authCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.monthKey, '2026-11');
      assert.equal(res.body.data.totalCount, 3);
      assert.equal(res.body.data.dayCounts['2026-11-05'], 2);
      assert.equal(res.body.data.dayCounts['2026-11-18'], 1);
      assert.equal(res.body.data.dayCounts['2026-10-18'], undefined);
    });
  });

  describe('3. Historical Memory Reminders', () => {
    test('retrieves memories matching day-of-month from past months and years', async () => {
      // Create entries on the 27th across various months and years
      await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({
          date: '2026-10-27',
          title: 'One month ago',
          description: 'Completed a major milestone.'
        });

      await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({
          date: '2025-11-27',
          title: 'One year ago',
          description: 'Anniversary celebration with family.'
        });

      await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({
          date: '2026-11-26', // Different day (26th) -> Should NOT match
          title: 'Yesterday',
          description: 'Quiet evening.'
        });

      const res = await request(app)
        .get('/api/goodbits/memories?date=2026-11-27')
        .set('Cookie', authCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.totalCount, 2);
      const memoryDates = res.body.data.memories.map((m) => m.date);
      assert.ok(memoryDates.includes('2026-10-27'));
      assert.ok(memoryDates.includes('2025-11-27'));
      assert.ok(!memoryDates.includes('2026-11-26'));
    });

    test('safely handles leap years and invalid dates like Feb 29 on non-leap years', async () => {
      // 2024 is a leap year (Feb 29 exists)
      await GoodBit.create({
        spaceId: testSpace.id,
        userId: testUser.id,
        date: '2024-02-29',
        title: 'Leap Year Memory',
        description: 'Happens once every 4 years!'
      });

      // Target date: 2026-02-28 (non-leap year, 28th) -> Should NOT match Feb 29!
      const resNonLeap = await request(app)
        .get('/api/goodbits/memories?date=2026-02-28')
        .set('Cookie', authCookie);

      assert.equal(resNonLeap.status, 200);
      const dates = resNonLeap.body.data.memories.map((m) => m.date);
      assert.ok(!dates.includes('2024-02-29'));

      // Target date: 2028-02-29 (leap year, 29th) -> SHOULD match 2024-02-29!
      const resLeap = await request(app)
        .get('/api/goodbits/memories?date=2028-02-29')
        .set('Cookie', authCookie);

      assert.equal(resLeap.status, 200);
      const leapDates = resLeap.body.data.memories.map((m) => m.date);
      assert.ok(leapDates.includes('2024-02-29'));
    });
  });

  describe('4. Update and Delete Lifecycle', () => {
    test('updates title and description', async () => {
      const created = await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({
          date: '2026-11-10',
          title: 'Initial Title',
          description: 'Initial Description'
        });

      const entryId = created.body.data._id;

      const updateRes = await request(app)
        .patch(`/api/goodbits/${entryId}`)
        .set('Cookie', authCookie)
        .send({
          title: 'Updated Title',
          description: 'Updated Description'
        });

      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.data.title, 'Updated Title');
      assert.equal(updateRes.body.data.description, 'Updated Description');
    });

    test('deletes one entry while retaining others on the same date', async () => {
      const e1 = await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({ date: '2026-11-12', description: 'Keep me' });

      const e2 = await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({ date: '2026-11-12', description: 'Delete me' });

      const deleteRes = await request(app)
        .delete(`/api/goodbits/${e2.body.data._id}`)
        .set('Cookie', authCookie);

      assert.equal(deleteRes.status, 200);

      const listRes = await request(app)
        .get('/api/goodbits/date/2026-11-12')
        .set('Cookie', authCookie);

      assert.equal(listRes.body.data.totalCount, 1);
      assert.equal(listRes.body.data.entries[0]._id, e1.body.data._id);
    });
  });

  describe('5. Space Isolation & Security', () => {
    test('User B cannot view User A entries', async () => {
      const created = await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({
          date: '2026-11-14',
          title: 'Private to User A',
          description: 'User B must not see this.'
        });

      // User B queries date
      const listRes = await request(app)
        .get('/api/goodbits/date/2026-11-14')
        .set('Cookie', otherAuthCookie);

      assert.equal(listRes.status, 200);
      assert.equal(listRes.body.data.totalCount, 0);

      // User B tries to update User A entry
      const updateRes = await request(app)
        .patch(`/api/goodbits/${created.body.data._id}`)
        .set('Cookie', otherAuthCookie)
        .send({ description: 'Hacked description' });

      assert.equal(updateRes.status, 404);

      // User B tries to delete User A entry
      const deleteRes = await request(app)
        .delete(`/api/goodbits/${created.body.data._id}`)
        .set('Cookie', otherAuthCookie);

      assert.equal(deleteRes.status, 404);
    });

    test('Client-provided spaceId in payload is ignored and derived exclusively from session', async () => {
      const fakeSpaceId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .post('/api/goodbits')
        .set('Cookie', authCookie)
        .send({
          spaceId: fakeSpaceId,
          date: '2026-11-15',
          description: 'Space isolation check'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.spaceId.toString(), testSpace.id.toString());
      assert.notEqual(res.body.data.spaceId.toString(), fakeSpaceId);
    });
  });
});
