import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';
import { GymWorkoutSession } from '../src/models/gym-workout-session.model.js';
import { DayflowSchedule } from '../src/models/dayflow-schedule.model.js';
import { SomedayItem } from '../src/models/someday-item.model.js';
import { SomedayCategory } from '../src/models/someday-category.model.js';

describe('Phase 4 - Analytics Engine & MongoDB Database Optimization Suite', () => {
  let authCookieA;
  let authCookieB;
  let spaceIdA;
  let spaceIdB;

  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // Setup Tenant A
    const signupResA = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'tenant_a',
        email: 'tenanta@example.com',
        password: 'Password123!',
        spaceName: 'Space A',
        accessCode: env.ACCESS_CODE
      });

    spaceIdA = signupResA.body.data.space.id;

    const signinResA = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'tenanta@example.com',
        password: 'Password123!'
      });

    authCookieA = signinResA.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];

    // Setup Tenant B
    const signupResB = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'tenant_b',
        email: 'tenantb@example.com',
        password: 'Password123!',
        spaceName: 'Space B',
        accessCode: env.ACCESS_CODE
      });

    spaceIdB = signupResB.body.data.space.id;

    const signinResB = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'tenantb@example.com',
        password: 'Password123!'
      });

    authCookieB = signinResB.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];
  });

  // =========================================================================
  // 1. INDEX EXPLAIN PLANS (IXSCAN vs COLLSCAN)
  // =========================================================================
  describe('Index Explain Execution Plans', () => {
    test('GymWorkoutSession date range query uses IXSCAN on spaceId + isRestDay + date', async () => {
      await GymWorkoutSession.create({
        spaceId: new mongoose.Types.ObjectId(spaceIdA),
        date: '2026-11-20',
        isRestDay: false,
        isFinished: true,
        score: 90
      });

      const explanation = await GymWorkoutSession.find({
        spaceId: new mongoose.Types.ObjectId(spaceIdA),
        isRestDay: false,
        date: { $gte: '2026-11-01', $lte: '2026-11-30' }
      }).explain('executionStats');

      const winningPlan = explanation.queryPlanner?.winningPlan;
      assert.ok(winningPlan, 'Query plan should exist');

      const hasIxScan = JSON.stringify(winningPlan).includes('"stage":"IXSCAN"');
      assert.equal(hasIxScan, true, 'Execution plan must utilize an index scan (IXSCAN)');

      const usedIndex = JSON.stringify(winningPlan);
      assert.ok(
        usedIndex.includes('spaceId_1_isRestDay_1_date_1') || usedIndex.includes('spaceId_1_date_1'),
        'Must use spaceId compound index'
      );
    });

    test('DayflowSchedule date range query uses IXSCAN on spaceId + date', async () => {
      await DayflowSchedule.create({
        spaceId: new mongoose.Types.ObjectId(spaceIdA),
        date: '2026-11-20',
        isRestDay: false,
        blocks: [],
        tasks: []
      });

      const explanation = await DayflowSchedule.find({
        spaceId: new mongoose.Types.ObjectId(spaceIdA),
        isRestDay: false,
        date: { $gte: '2026-11-01', $lte: '2026-11-30' }
      }).explain('executionStats');

      const winningPlan = explanation.queryPlanner?.winningPlan;
      assert.ok(winningPlan, 'Query plan should exist');

      const hasIxScan = JSON.stringify(winningPlan).includes('"stage":"IXSCAN"');
      assert.equal(hasIxScan, true, 'Execution plan must utilize an index scan (IXSCAN)');
    });

    test('SomedayItem status query uses IXSCAN on compound index', async () => {
      const category = await SomedayCategory.create({
        spaceId: new mongoose.Types.ObjectId(spaceIdA),
        name: 'Tech',
        color: '#3A4EFB'
      });

      await SomedayItem.create({
        spaceId: new mongoose.Types.ObjectId(spaceIdA),
        categoryId: category._id,
        name: 'New GPU',
        status: 'PLANNED'
      });

      const explanation = await SomedayItem.find({
        spaceId: new mongoose.Types.ObjectId(spaceIdA),
        status: 'PLANNED'
      }).explain('executionStats');

      const winningPlan = explanation.queryPlanner?.winningPlan;
      const hasIxScan = JSON.stringify(winningPlan).includes('"stage":"IXSCAN"');
      assert.equal(hasIxScan, true, 'SomedayItem query must utilize index scan');
    });
  });

  // =========================================================================
  // 2. DASHBOARD DATA RETRIEVAL & SOMEDAY AGGREGATION
  // =========================================================================
  describe('Someday Stats Aggregation & Multi-Tenant Space Isolation', () => {
    test('GET /api/someday/items/stats returns accurate counts and excludes other space data', async () => {
      // Seed Space A
      const catA = await SomedayCategory.create({
        spaceId: new mongoose.Types.ObjectId(spaceIdA),
        name: 'Gear A',
        color: '#3A4EFB'
      });

      await SomedayItem.create([
        { spaceId: new mongoose.Types.ObjectId(spaceIdA), categoryId: catA._id, name: 'Item 1', status: 'PLANNED' },
        { spaceId: new mongoose.Types.ObjectId(spaceIdA), categoryId: catA._id, name: 'Item 2', status: 'PLANNED' },
        { spaceId: new mongoose.Types.ObjectId(spaceIdA), categoryId: catA._id, name: 'Item 3', status: 'PURCHASED' },
        { spaceId: new mongoose.Types.ObjectId(spaceIdA), categoryId: catA._id, name: 'Item 4', status: 'PURCHASED' }
      ]);

      // Seed Space B
      const catB = await SomedayCategory.create({
        spaceId: new mongoose.Types.ObjectId(spaceIdB),
        name: 'Gear B',
        color: '#E3FF3B'
      });

      await SomedayItem.create([
        { spaceId: new mongoose.Types.ObjectId(spaceIdB), categoryId: catB._id, name: 'Item B1', status: 'PLANNED' }
      ]);

      // Request Stats as Tenant A
      const resA = await request(app)
        .get('/api/someday/items/stats')
        .set('Cookie', authCookieA);

      assert.equal(resA.status, 200);
      assert.deepEqual(resA.body.data, {
        total: 4,
        planned: 2,
        purchased: 2
      });

      // Request Stats as Tenant B
      const resB = await request(app)
        .get('/api/someday/items/stats')
        .set('Cookie', authCookieB);

      assert.equal(resB.status, 200);
      assert.deepEqual(resB.body.data, {
        total: 1,
        planned: 1,
        purchased: 0
      });
    });

    test('GET /api/someday/items/stats returns zeroes for empty space', async () => {
      const res = await request(app)
        .get('/api/someday/items/stats')
        .set('Cookie', authCookieA);

      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data, {
        total: 0,
        planned: 0,
        purchased: 0
      });
    });
  });

  // =========================================================================
  // 3. PAGINATION & HISTORICAL DATA LIMITS
  // =========================================================================
  describe('Pagination & Historical Data Endpoints', () => {
    test('GET /api/someday/items supports page and limit pagination', async () => {
      const cat = await SomedayCategory.create({
        spaceId: new mongoose.Types.ObjectId(spaceIdA),
        name: 'Reading List',
        color: '#3A4EFB'
      });

      for (let i = 1; i <= 5; i++) {
        await SomedayItem.create({
          spaceId: new mongoose.Types.ObjectId(spaceIdA),
          categoryId: cat._id,
          name: `Book ${i}`,
          status: 'PLANNED'
        });
      }

      // Page 1 with limit 2
      const page1Res = await request(app)
        .get('/api/someday/items?page=1&limit=2')
        .set('Cookie', authCookieA);

      assert.equal(page1Res.status, 200);
      assert.equal(page1Res.body.data.length, 2);

      // Page 2 with limit 2
      const page2Res = await request(app)
        .get('/api/someday/items?page=2&limit=2')
        .set('Cookie', authCookieA);

      assert.equal(page2Res.status, 200);
      assert.equal(page2Res.body.data.length, 2);

      // Page 3 with limit 2 (should return the remaining 1 item)
      const page3Res = await request(app)
        .get('/api/someday/items?page=3&limit=2')
        .set('Cookie', authCookieA);

      assert.equal(page3Res.status, 200);
      assert.equal(page3Res.body.data.length, 1);
    });
  });

  // =========================================================================
  // 4. ANALYTICS BOUNDARIES & EMPTY DATASETS
  // =========================================================================
  describe('GymFlow & Dayflow Analytics Boundaries', () => {
    test('GymFlow analytics handles empty dataset gracefully without NaN or errors', async () => {
      const res = await request(app)
        .get('/api/gymflow/analytics?startDate=2026-11-01&endDate=2026-11-30')
        .set('Cookie', authCookieA);

      assert.equal(res.status, 200);
      const analytics = res.body.data.analytics;
      assert.ok(analytics);
      assert.equal(analytics.overall.totalWorkouts, 0);
      assert.equal(analytics.overall.totalVolume, 0);
      assert.equal(analytics.overall.averageScore, 0);
      assert.equal(analytics.treadmill.totalSessions, 0);
      assert.deepEqual(analytics.dailyVolumeTrend, []);
      assert.deepEqual(analytics.templatesBreakdown, []);
      assert.ok(analytics.filterOptions);
      assert.ok(Array.isArray(analytics.filterOptions.routines));
    });

    test('GymFlow analytics excludes rest days from volume calculations', async () => {
      // 1 Rest Day session
      await GymWorkoutSession.create({
        spaceId: new mongoose.Types.ObjectId(spaceIdA),
        date: '2026-11-15',
        isRestDay: true,
        isFinished: true,
        restDayNote: 'Sunday rest'
      });

      // 1 Finished Workout session with 1 exercise, 2 completed sets (100kg x 10 = 1000kg each -> 2000kg)
      await GymWorkoutSession.create({
        spaceId: new mongoose.Types.ObjectId(spaceIdA),
        date: '2026-11-16',
        isRestDay: false,
        isFinished: true,
        templateName: 'Push Day',
        score: 100,
        bodyParts: [
          {
            name: 'Chest',
            order: 0,
            exercises: [
              {
                name: 'Bench Press',
                targetBodyPart: 'Chest',
                order: 0,
                plannedSets: 2,
                sets: [
                  { setNumber: 1, weightKg: 100, reps: 10, status: 'COMPLETED' },
                  { setNumber: 2, weightKg: 100, reps: 10, status: 'COMPLETED' }
                ]
              }
            ]
          }
        ]
      });

      const res = await request(app)
        .get('/api/gymflow/analytics?startDate=2026-11-01&endDate=2026-11-30')
        .set('Cookie', authCookieA);

      assert.equal(res.status, 200);
      const { overall, filterOptions } = res.body.data.analytics;
      assert.equal(overall.totalWorkouts, 1);
      assert.equal(overall.restDaysCount, 1);
      assert.equal(overall.totalVolume, 2000);
      assert.ok(filterOptions.routines.includes('Push Day'));
      assert.ok(filterOptions.allBodyParts.includes('Chest'));
      assert.ok(filterOptions.allExercises.includes('Bench Press'));
    });
  });
});
