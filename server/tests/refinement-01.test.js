import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

describe('Major Refinement 01: Dayflow Reversals, GymFlow Measurements & Dashboard', () => {
  let authCookie;
  let spaceId;

  let otherAuthCookie;
  let otherSpaceId;

  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    // 1. Sign up Primary User
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'refinement_user',
        email: 'refinement@example.com',
        password: 'Password123!',
        spaceName: 'Refinement Space',
        accessCode: env.ACCESS_CODE
      });
    spaceId = signupRes.body.data.space.id;

    const signinRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'refinement@example.com',
        password: 'Password123!'
      });

    authCookie = signinRes.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];

    // 2. Sign up Secondary User (for Space Isolation tests)
    const otherSignupRes = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'other_tenant',
        email: 'other_tenant@example.com',
        password: 'Password123!',
        spaceName: 'Isolated Space',
        accessCode: env.ACCESS_CODE
      });
    otherSpaceId = otherSignupRes.body.data.space.id;

    const otherSigninRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'other_tenant@example.com',
        password: 'Password123!'
      });

    otherAuthCookie = otherSigninRes.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];
  });

  // ===========================================================================
  // 1. DAYFLOW: TASK STATUS REVERSAL & FINISHED-DAY LOCKING
  // ===========================================================================
  describe('Dayflow Task Status Reversal', () => {
    const testDate = '2026-11-26';
    const blockId = '67431234567890abcdef1001';

    beforeEach(async () => {
      // Create initial schedule with 2 tasks
      await request(app)
        .post('/api/dayflow/schedule')
        .set('Cookie', authCookie)
        .send({
          date: testDate,
          blocks: [{ id: blockId, name: 'Deep Work', startTime: '09:00', endTime: '12:00' }],
          tasks: [
            { blockId, title: 'Draft system design' },
            { blockId, title: 'Write tests' }
          ]
        });
    });

    test('Completed task can be reversed back to PENDING while day is in progress', async () => {
      // 1. Fetch created schedule
      const schedRes = await request(app)
        .get(`/api/dayflow/schedule?date=${testDate}`)
        .set('Cookie', authCookie);
      const taskId = schedRes.body.data.tasks[0].id;

      // 2. Mark as COMPLETED
      const compRes = await request(app)
        .patch(`/api/dayflow/schedule/tasks/${taskId}`)
        .set('Cookie', authCookie)
        .send({ date: testDate, status: 'COMPLETED' });

      assert.equal(compRes.status, 200);
      const completedTask = compRes.body.data.tasks.find((t) => t.id === taskId);
      assert.equal(completedTask.status, 'COMPLETED');
      assert.ok(completedTask.completedAt);
      assert.equal(compRes.body.data.stats.completed, 1);
      assert.equal(compRes.body.data.stats.completionRate, 50);

      // 3. Reverse back to PENDING
      const revertRes = await request(app)
        .patch(`/api/dayflow/schedule/tasks/${taskId}`)
        .set('Cookie', authCookie)
        .send({ date: testDate, status: 'PENDING' });

      assert.equal(revertRes.status, 200);
      const revertedTask = revertRes.body.data.tasks.find((t) => t.id === taskId);
      assert.equal(revertedTask.status, 'PENDING');
      assert.equal(revertedTask.completedAt, null, 'completedAt must be cleared when reverted to PENDING');
      assert.equal(revertRes.body.data.stats.completed, 0);
      assert.equal(revertRes.body.data.stats.completionRate, 0);
    });

    test('Completed task can be changed to SKIPPED with mandatory reason', async () => {
      const schedRes = await request(app)
        .get(`/api/dayflow/schedule?date=${testDate}`)
        .set('Cookie', authCookie);
      const taskId = schedRes.body.data.tasks[0].id;

      // Complete first
      await request(app)
        .patch(`/api/dayflow/schedule/tasks/${taskId}`)
        .set('Cookie', authCookie)
        .send({ date: testDate, status: 'COMPLETED' });

      // Attempt to change to SKIPPED without reason -> should fail 400
      const failSkipRes = await request(app)
        .patch(`/api/dayflow/schedule/tasks/${taskId}`)
        .set('Cookie', authCookie)
        .send({ date: testDate, status: 'SKIPPED' });
      assert.equal(failSkipRes.status, 400);

      // Change to SKIPPED with valid reason
      const skipRes = await request(app)
        .patch(`/api/dayflow/schedule/tasks/${taskId}`)
        .set('Cookie', authCookie)
        .send({ date: testDate, status: 'SKIPPED', skippedReason: 'Meeting priority shifted' });

      assert.equal(skipRes.status, 200);
      const skippedTask = skipRes.body.data.tasks.find((t) => t.id === taskId);
      assert.equal(skippedTask.status, 'SKIPPED');
      assert.equal(skippedTask.skippedReason, 'Meeting priority shifted');
      assert.ok(skippedTask.skippedAt);
      assert.equal(skippedTask.completedAt, null, 'completedAt must be cleared when task is skipped');
    });

    test('Skipped task can be changed back to PENDING while day remains unfinished', async () => {
      const schedRes = await request(app)
        .get(`/api/dayflow/schedule?date=${testDate}`)
        .set('Cookie', authCookie);
      const taskId = schedRes.body.data.tasks[0].id;

      // Mark SKIPPED
      await request(app)
        .patch(`/api/dayflow/schedule/tasks/${taskId}`)
        .set('Cookie', authCookie)
        .send({ date: testDate, status: 'SKIPPED', skippedReason: 'Postponed' });

      // Change back to PENDING
      const revertRes = await request(app)
        .patch(`/api/dayflow/schedule/tasks/${taskId}`)
        .set('Cookie', authCookie)
        .send({ date: testDate, status: 'PENDING' });

      assert.equal(revertRes.status, 200);
      const revertedTask = revertRes.body.data.tasks.find((t) => t.id === taskId);
      assert.equal(revertedTask.status, 'PENDING');
      assert.equal(revertedTask.skippedReason, null);
      assert.equal(revertedTask.skippedAt, null);
    });

    test('Finished days permanently lock tasks and reject all status changes', async () => {
      const schedRes = await request(app)
        .get(`/api/dayflow/schedule?date=${testDate}`)
        .set('Cookie', authCookie);
      const task1Id = schedRes.body.data.tasks[0].id;
      const task2Id = schedRes.body.data.tasks[1].id;

      // Complete all tasks and finish day
      await request(app)
        .patch(`/api/dayflow/schedule/tasks/${task1Id}`)
        .set('Cookie', authCookie)
        .send({ date: testDate, status: 'COMPLETED' });
      await request(app)
        .patch(`/api/dayflow/schedule/tasks/${task2Id}`)
        .set('Cookie', authCookie)
        .send({ date: testDate, status: 'COMPLETED' });

      const finishRes = await request(app)
        .post('/api/dayflow/schedule/finish')
        .set('Cookie', authCookie)
        .send({ date: testDate });
      assert.equal(finishRes.status, 200);
      assert.equal(finishRes.body.data.isFinished, true);

      // Attempt to revert completed task on finished day -> must be rejected with 400
      const revertRes = await request(app)
        .patch(`/api/dayflow/schedule/tasks/${task1Id}`)
        .set('Cookie', authCookie)
        .send({ date: testDate, status: 'PENDING' });

      assert.equal(revertRes.status, 400);
      assert.match(revertRes.body.message, /locked/i);
    });
  });

  // ===========================================================================
  // 2. GYMFLOW: EXERCISE MEASUREMENT TYPES & UNIT SEPARATION
  // ===========================================================================
  describe('GymFlow Exercise Measurement Types', () => {
    test('Creates template with configurable measurement types (WEIGHT_REPS, BODYWEIGHT_REPS, DURATION)', async () => {
      const tplRes = await request(app)
        .post('/api/gymflow/templates')
        .set('Cookie', authCookie)
        .send({
          name: 'Functional Conditioning',
          description: 'Mixed modality workout',
          bodyParts: [
            {
              name: 'Core & Upper',
              order: 0,
              exercises: [
                {
                  name: 'Bench Press',
                  plannedSets: 3,
                  measurementType: 'WEIGHT_REPS'
                },
                {
                  name: 'Pull-ups',
                  plannedSets: 3,
                  measurementType: 'BODYWEIGHT_REPS'
                },
                {
                  name: 'Plank',
                  plannedSets: 2,
                  measurementType: 'DURATION'
                }
              ]
            }
          ]
        });

      assert.equal(tplRes.status, 201);
      const ex1 = tplRes.body.data.template.bodyParts[0].exercises[0];
      const ex2 = tplRes.body.data.template.bodyParts[0].exercises[1];
      const ex3 = tplRes.body.data.template.bodyParts[0].exercises[2];

      assert.equal(ex1.measurementType, 'WEIGHT_REPS');
      assert.equal(ex2.measurementType, 'BODYWEIGHT_REPS');
      assert.equal(ex3.measurementType, 'DURATION');
    });

    test('Logs workout with WEIGHT_REPS, BODYWEIGHT_REPS, and DURATION (including decimals) without mixing units', async () => {
      const date = '2026-11-26';

      // Start blank session
      await request(app)
        .post('/api/gymflow/workout/start')
        .set('Cookie', authCookie)
        .send({ date });

      // Save workout with all 3 types
      const saveRes = await request(app)
        .put(`/api/gymflow/workout/${date}`)
        .set('Cookie', authCookie)
        .send({
          bodyParts: [
            {
              name: 'Full Body',
              exercises: [
                {
                  name: 'Squat',
                  measurementType: 'WEIGHT_REPS',
                  sets: [
                    { setNumber: 1, weightKg: 100, reps: 5, status: 'COMPLETED' },
                    { setNumber: 2, weightKg: 100, reps: 5, status: 'COMPLETED' }
                  ]
                },
                {
                  name: 'Weighted Pull-ups',
                  measurementType: 'BODYWEIGHT_REPS',
                  sets: [
                    { setNumber: 1, reps: 8, extraWeightKg: 10, status: 'COMPLETED' },
                    { setNumber: 2, reps: 8, extraWeightKg: 10, status: 'COMPLETED' }
                  ]
                },
                {
                  name: 'Plank',
                  measurementType: 'DURATION',
                  sets: [
                    { setNumber: 1, durationMinutes: 1.5, status: 'COMPLETED' },
                    { setNumber: 2, durationMinutes: 2.25, status: 'COMPLETED' }
                  ]
                }
              ]
            }
          ]
        });

      assert.equal(saveRes.status, 200);

      // Finish session
      await request(app)
        .post(`/api/gymflow/workout/${date}/finish`)
        .set('Cookie', authCookie)
        .send({ isFinished: true });

      // Query Analytics to verify unit correctness:
      // Volume = 100*5 + 100*5 = 1000 kg (WEIGHT_REPS only, Plank minutes never added to kg!)
      // Reps = 10 (Squats) + 16 (Pull-ups) = 26 reps
      const analyticsRes = await request(app)
        .get(`/api/gymflow/analytics?startDate=${date}&endDate=${date}`)
        .set('Cookie', authCookie);

      assert.equal(analyticsRes.status, 200);
      const { summary } = analyticsRes.body.data.analytics;
      assert.equal(summary.totalVolume, 1000, 'Volume must strictly equal 1000 kg');
      assert.equal(summary.totalReps, 26, 'Reps must equal 26');
      assert.equal(summary.totalCompletedSets, 6, 'Total completed sets must equal 6');
    });

    test('Backward compatibility: existing exercises without measurementType default cleanly to WEIGHT_REPS', async () => {
      const date = '2026-11-20';

      // Start and save legacy payload (no measurementType specified)
      await request(app)
        .post('/api/gymflow/workout/start')
        .set('Cookie', authCookie)
        .send({ date });

      const res = await request(app)
        .put(`/api/gymflow/workout/${date}`)
        .set('Cookie', authCookie)
        .send({
          bodyParts: [
            {
              name: 'Legs',
              exercises: [
                {
                  name: 'Leg Press',
                  sets: [{ setNumber: 1, weightKg: 150, reps: 10, status: 'COMPLETED' }]
                }
              ]
            }
          ]
        });

      assert.equal(res.status, 200);
      const ex = res.body.data.session.bodyParts[0].exercises[0];
      assert.equal(ex.measurementType, 'WEIGHT_REPS');
    });
  });

  // ===========================================================================
  // 3. GYMFLOW: MONTHLY CALENDAR OVERVIEW
  // ===========================================================================
  describe('GymFlow Monthly Workout History API', () => {
    test('Returns lean monthly calendar overview identifying workouts and rest days', async () => {
      // 1. Create a workout session on 2026-11-15
      await request(app)
        .post('/api/gymflow/workout/start')
        .set('Cookie', authCookie)
        .send({ date: '2026-11-15' });

      await request(app)
        .put('/api/gymflow/workout/2026-11-15')
        .set('Cookie', authCookie)
        .send({
          templateName: 'Upper Body Blast',
          bodyParts: [
            {
              name: 'Chest',
              exercises: [{ name: 'Pushups', sets: [{ setNumber: 1, reps: 20, status: 'COMPLETED' }] }]
            }
          ]
        });

      // 2. Mark a Rest Day on 2026-11-16
      await request(app)
        .post('/api/gymflow/workout/2026-11-16/rest-day')
        .set('Cookie', authCookie)
        .send({ reason: 'Active recovery walk' });

      // 3. Fetch monthly overview for November 2026
      const overviewRes = await request(app)
        .get('/api/gymflow/workout/calendar/overview?startDate=2026-11-01&endDate=2026-11-30')
        .set('Cookie', authCookie);

      assert.equal(overviewRes.status, 200);
      const days = overviewRes.body.data.days;
      assert.ok(Array.isArray(days));
      assert.equal(days.length, 2);

      const d1 = days.find((d) => d.date === '2026-11-15');
      assert.equal(d1.isRestDay, false);
      assert.equal(d1.templateName, 'Upper Body Blast');
      assert.equal(d1.completedSets, 1);

      const d2 = days.find((d) => d.date === '2026-11-16');
      assert.equal(d2.isRestDay, true);
      assert.equal(d2.restDayReason, 'Active recovery walk');
    });
  });

  // ===========================================================================
  // 4. CONSOLIDATED DASHBOARD & SPACE ISOLATION
  // ===========================================================================
  describe('Consolidated Dashboard Overview & Space Isolation', () => {
    beforeEach(async () => {
      // Tenant 1 Setup:
      // - Dayflow schedule with 1 completed day and 1 rest day
      await request(app)
        .post('/api/dayflow/schedule')
        .set('Cookie', authCookie)
        .send({
          date: '2026-11-20',
          blocks: [{ id: '67431234567890abcdef1001', name: 'Work', startTime: '09:00', endTime: '11:00' }],
          tasks: [{ blockId: '67431234567890abcdef1001', title: 'Task A', status: 'COMPLETED' }]
        });
      await request(app)
        .post('/api/dayflow/schedule/finish')
        .set('Cookie', authCookie)
        .send({ date: '2026-11-20' });

      await request(app)
        .post('/api/dayflow/schedule/rest-day')
        .set('Cookie', authCookie)
        .send({ date: '2026-11-21', isRestDay: true });

      // - GymFlow workout
      await request(app)
        .post('/api/gymflow/workout/start')
        .set('Cookie', authCookie)
        .send({ date: '2026-11-20' });
      await request(app)
        .put('/api/gymflow/workout/2026-11-20')
        .set('Cookie', authCookie)
        .send({
          templateName: 'Leg Day',
          bodyParts: [
            {
              name: 'Quads',
              exercises: [{ name: 'Squat', sets: [{ setNumber: 1, weightKg: 80, reps: 10, status: 'COMPLETED' }] }]
            }
          ]
        });
      await request(app)
        .post('/api/gymflow/workout/2026-11-20/finish')
        .set('Cookie', authCookie)
        .send({ isFinished: true });

      // - Someday Item
      const catRes = await request(app)
        .post('/api/someday/categories')
        .set('Cookie', authCookie)
        .send({ name: 'Work Equipment' });
      const catId = catRes.body.data.id;

      await request(app)
        .post('/api/someday/items')
        .set('Cookie', authCookie)
        .send({
          name: 'Ergonomic Desk',
          categoryId: catId,
          status: 'PLANNED'
        });

      // Tenant 2 (Other Space) Setup:
      // Completely separate Dayflow and Someday records
      const otherCatRes = await request(app)
        .post('/api/someday/categories')
        .set('Cookie', otherAuthCookie)
        .send({ name: 'Personal' });
      const otherCatId = otherCatRes.body.data.id;

      await request(app)
        .post('/api/someday/items')
        .set('Cookie', otherAuthCookie)
        .send({
          name: 'Secret Other Item',
          categoryId: otherCatId,
          status: 'PURCHASED'
        });
    });

    test('Consolidated dashboard calculates accurate metrics across all 3 modules', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview?range=30d')
        .set('Cookie', authCookie);

      assert.equal(res.status, 200);
      const data = res.body.data;

      // Overall section
      assert.equal(data.overall.dayflowCompletionRate, 100);
      assert.equal(data.overall.gymWorkoutCount, 1);
      assert.equal(data.overall.somedayTotal, 1);
      assert.equal(data.overall.somedayPlanned, 1);

      // Dayflow section: 1 scheduled day, 1 rest day, 0 failures from rest day
      assert.equal(data.dayflow.totalScheduledDays, 1);
      assert.equal(data.dayflow.completedDays, 1);
      assert.equal(data.dayflow.restDays, 1);
      assert.equal(data.dayflow.completedTasks, 1);

      // GymFlow section
      assert.equal(data.gymflow.completedWorkouts, 1);
      assert.equal(data.gymflow.totalVolume, 800); // 80 * 10
      assert.equal(data.gymflow.totalSets, 1);

      // Someday section
      assert.equal(data.someday.totalItems, 1);
      assert.equal(data.someday.plannedItems, 1);
      assert.equal(data.someday.recentAdditions[0].title, 'Ergonomic Desk');
    });

    test('Multi-tenant Space isolation: Tenant A never sees Tenant B data in dashboard', async () => {
      const resA = await request(app)
        .get('/api/dashboard/overview')
        .set('Cookie', authCookie);

      const resB = await request(app)
        .get('/api/dashboard/overview')
        .set('Cookie', otherAuthCookie);

      assert.equal(resA.status, 200);
      assert.equal(resB.status, 200);

      // Tenant A should only see 1 someday item ('Ergonomic Desk')
      assert.equal(resA.body.data.someday.totalItems, 1);
      assert.equal(resA.body.data.someday.recentAdditions[0].title, 'Ergonomic Desk');

      // Tenant B should only see their own item ('Secret Other Item') and 0 workouts/dayflow
      assert.equal(resB.body.data.someday.totalItems, 1);
      assert.equal(resB.body.data.someday.recentAdditions[0].title, 'Secret Other Item');
      assert.equal(resB.body.data.dayflow.totalScheduledDays, 0);
      assert.equal(resB.body.data.gymflow.totalWorkoutSessions, 0);
    });

    test('Handles empty dataset cleanly without division-by-zero or errors', async () => {
      // Query for date range in far future where no records exist
      const res = await request(app)
        .get('/api/dashboard/overview?range=custom&startDate=2030-01-01&endDate=2030-01-31')
        .set('Cookie', authCookie);

      assert.equal(res.status, 200);
      const data = res.body.data;
      assert.equal(data.dayflow.totalScheduledDays, 0);
      assert.equal(data.dayflow.taskCompletionRate, 0);
      assert.equal(data.gymflow.completedWorkouts, 0);
      assert.equal(data.gymflow.workoutConsistency, 0);
      assert.equal(data.gymflow.totalVolume, 0);
      assert.ok(Array.isArray(data.combinedActivity));
    });
  });
});
