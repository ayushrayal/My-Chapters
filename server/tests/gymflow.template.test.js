import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Space } from '../src/models/space.model.js';
import { GymTemplate } from '../src/models/gym-template.model.js';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from './setup.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

describe('GymFlow - Template Creation & API Suite', () => {
  let cookieHeader;
  let testSpace;
  let testUser;

  before(async () => {
    await setupTestDatabase();
    await clearTestDatabase();

    // Signup user
    await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: 'gymflowuser',
        email: 'test_gymflow_user@example.com',
        password: 'Password123!',
        spaceName: 'Gym Space',
        accessCode: env.ACCESS_CODE
      });

    // Signin user
    const signinRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: 'test_gymflow_user@example.com',
        password: 'Password123!'
      });

    cookieHeader = signinRes.headers['set-cookie']
      ?.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];

    testUser = await User.findOne({ email: 'test_gymflow_user@example.com' });
    testSpace = await Space.findOne({ owner: testUser._id });
  });

  after(async () => {
    await teardownTestDatabase();
  });

  it('POST /api/gymflow/templates creates a template with nested body parts and exercises', async () => {
    const payload = {
      name: 'Push Day A',
      description: 'Heavy chest and triceps focus',
      bodyParts: [
        {
          name: 'Chest',
          order: 0,
          exercises: [
            { name: 'Barbell Bench Press', plannedSets: 4, notes: 'Warm up thoroughly' },
            { name: 'Incline Dumbbell Press', plannedSets: 3 }
          ]
        },
        {
          name: 'Triceps',
          order: 1,
          exercises: [
            { name: 'Rope Pushdowns', plannedSets: 3 }
          ]
        }
      ]
    };

    const res = await request(app)
      .post('/api/gymflow/templates')
      .set('Cookie', cookieHeader)
      .send(payload);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.template.name, 'Push Day A');
    assert.strictEqual(res.body.data.template.bodyParts.length, 2);
    assert.strictEqual(res.body.data.template.bodyParts[0].name, 'Chest');
    assert.strictEqual(res.body.data.template.bodyParts[0].exercises.length, 2);
    assert.strictEqual(res.body.data.template.bodyParts[0].exercises[0].name, 'Barbell Bench Press');
    assert.strictEqual(res.body.data.template.bodyParts[0].exercises[0].plannedSets, 4);

    // Verify persistence in MongoDB directly
    const saved = await GymTemplate.findOne({ spaceId: testSpace._id, name: 'Push Day A' });
    assert.ok(saved);
    assert.strictEqual(saved.bodyParts.length, 2);
  });

  it('GET /api/gymflow/templates lists the newly created template and preserves all nested data', async () => {
    const res = await request(app)
      .get('/api/gymflow/templates')
      .set('Cookie', cookieHeader);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.templates));
    const pushTemplate = res.body.data.templates.find((t) => t.name === 'Push Day A');
    assert.ok(pushTemplate);
    assert.strictEqual(pushTemplate.bodyParts.length, 2);
    assert.strictEqual(pushTemplate.bodyParts[0].exercises[0].plannedSets, 4);
  });

  it('POST /api/gymflow/templates rejects duplicate template names with 400', async () => {
    const payload = {
      name: 'Push Day A',
      bodyParts: []
    };

    const res = await request(app)
      .post('/api/gymflow/templates')
      .set('Cookie', cookieHeader)
      .send(payload);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('already exists'));
  });

  it('PUT /api/gymflow/templates/:id updates an existing template without duplicating it', async () => {
    const existing = await GymTemplate.findOne({ spaceId: testSpace._id, name: 'Push Day A' });
    assert.ok(existing);

    const updatePayload = {
      name: 'Push Day A (Updated)',
      description: 'Updated chest & shoulders routine',
      bodyParts: [
        {
          _id: existing.bodyParts[0]._id,
          name: 'Upper Chest',
          order: 0,
          exercises: [
            {
              _id: existing.bodyParts[0].exercises[0]._id,
              name: 'Incline Bench Press',
              plannedSets: 4,
              notes: 'Focus on contraction'
            }
          ]
        }
      ]
    };

    const res = await request(app)
      .put(`/api/gymflow/templates/${existing._id}`)
      .set('Cookie', cookieHeader)
      .send(updatePayload);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.template.name, 'Push Day A (Updated)');
    assert.strictEqual(res.body.data.template._id.toString(), existing._id.toString());
    assert.strictEqual(res.body.data.template.bodyParts[0].name, 'Upper Chest');
    assert.strictEqual(res.body.data.template.bodyParts[0].exercises[0].name, 'Incline Bench Press');

    // Confirm no duplicate templates were created
    const count = await GymTemplate.countDocuments({ spaceId: testSpace._id });
    assert.strictEqual(count, 1);
  });

  it('DELETE /api/gymflow/workout/:date/discard discards an unfinished workout session and frees the date', async () => {
    const testDate = '2026-11-28';
    const { GymWorkoutSession } = await import('../src/models/gym-workout-session.model.js');
    await GymWorkoutSession.deleteMany({ spaceId: testSpace._id, date: testDate });

    // 1. Start an unfinished workout
    const startRes = await request(app)
      .post('/api/gymflow/workout/start')
      .set('Cookie', cookieHeader)
      .send({ date: testDate });

    assert.strictEqual(startRes.status, 201);
    assert.strictEqual(startRes.body.data.session.isFinished, false);

    // 2. Discard the unfinished workout
    const discardRes = await request(app)
      .delete(`/api/gymflow/workout/${testDate}/discard`)
      .set('Cookie', cookieHeader);

    assert.strictEqual(discardRes.status, 200);
    assert.strictEqual(discardRes.body.success, true);

    // Verify session document was deleted
    const sessionInDb = await GymWorkoutSession.findOne({ spaceId: testSpace._id, date: testDate });
    assert.strictEqual(sessionInDb, null);

    // 3. Verify date is free to start another workout
    const restartRes = await request(app)
      .post('/api/gymflow/workout/start')
      .set('Cookie', cookieHeader)
      .send({ date: testDate });

    assert.strictEqual(restartRes.status, 201);

    // Clean up
    await GymWorkoutSession.deleteMany({ spaceId: testSpace._id, date: testDate });
  });

  it('DELETE /api/gymflow/workout/:date/discard rejects finished workout session with 400', async () => {
    const testDate = '2026-11-29';
    const { GymWorkoutSession } = await import('../src/models/gym-workout-session.model.js');
    await GymWorkoutSession.deleteMany({ spaceId: testSpace._id, date: testDate });

    // Start workout
    await request(app)
      .post('/api/gymflow/workout/start')
      .set('Cookie', cookieHeader)
      .send({ date: testDate });

    // Finish workout
    await request(app)
      .post(`/api/gymflow/workout/${testDate}/finish`)
      .set('Cookie', cookieHeader)
      .send({ isFinished: true });

    // Try to discard finished workout
    const discardRes = await request(app)
      .delete(`/api/gymflow/workout/${testDate}/discard`)
      .set('Cookie', cookieHeader);

    assert.strictEqual(discardRes.status, 400);
    assert.strictEqual(discardRes.body.success, false);
    assert.ok(discardRes.body.message.includes('Cannot discard a finished workout session'));

    // Clean up
    await GymWorkoutSession.deleteMany({ spaceId: testSpace._id, date: testDate });
  });

  it('PUT /api/gymflow/workout/:date handles rapid concurrent updates without VersionError', async () => {
    const testDate = '2026-11-30';
    const { GymWorkoutSession } = await import('../src/models/gym-workout-session.model.js');
    await GymWorkoutSession.deleteMany({ spaceId: testSpace._id, date: testDate });

    // Start session
    await request(app)
      .post('/api/gymflow/workout/start')
      .set('Cookie', cookieHeader)
      .send({ date: testDate });

    // Simulate 5 rapid concurrent updates from frontend typing
    const updates = [1, 2, 3, 4, 5].map((i) =>
      request(app)
        .put(`/api/gymflow/workout/${testDate}`)
        .set('Cookie', cookieHeader)
        .send({
          bodyParts: [
            {
              name: 'Back',
              order: 0,
              exercises: [
                {
                  name: 'Lat Pulldowns',
                  targetBodyPart: 'Back',
                  sets: [
                    { setNumber: 1, weightKg: 50 + i * 2, reps: 10, status: 'COMPLETED' },
                    { setNumber: 2, weightKg: 55, reps: 8, status: 'INCOMPLETE' }
                  ]
                }
              ]
            }
          ]
        })
    );

    const results = await Promise.all(updates);

    // Verify all succeeded with 200 and zero 500 VersionErrors
    results.forEach((res) => {
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${res.body?.message}`);
      assert.strictEqual(res.body.success, true);
    });

    const finalSession = await GymWorkoutSession.findOne({ spaceId: testSpace._id, date: testDate });
    assert.ok(finalSession);
    assert.strictEqual(finalSession.bodyParts.length, 1);
    assert.strictEqual(finalSession.bodyParts[0].exercises.length, 1);

    // Clean up
    await GymWorkoutSession.deleteMany({ spaceId: testSpace._id, date: testDate });
  });

  it('GET /api/gymflow/analytics accurately filters volume, reps, and exercises with AND logic', async () => {
    const testDate = '2026-11-25';
    const { GymWorkoutSession } = await import('../src/models/gym-workout-session.model.js');
    await GymWorkoutSession.deleteMany({ spaceId: testSpace._id, date: testDate });

    // Create session with Chest and Back
    const sessionRes = await request(app)
      .post('/api/gymflow/workout/start')
      .set('Cookie', cookieHeader)
      .send({ date: testDate });

    await request(app)
      .put(`/api/gymflow/workout/${testDate}`)
      .set('Cookie', cookieHeader)
      .send({
        bodyParts: [
          {
            name: 'Chest',
            order: 0,
            exercises: [
              {
                name: 'Bench Press',
                targetBodyPart: 'Chest',
                sets: [
                  { setNumber: 1, weightKg: 80, reps: 10, status: 'COMPLETED' }, // 800 kg
                  { setNumber: 2, weightKg: 80, reps: 8, status: 'COMPLETED' },  // 640 kg
                  { setNumber: 3, weightKg: 80, reps: 0, status: 'SKIPPED' }    // 0 (excluded)
                ]
              }
            ]
          },
          {
            name: 'Back',
            order: 1,
            exercises: [
              {
                name: 'Pullups',
                targetBodyPart: 'Back',
                sets: [
                  { setNumber: 1, weightKg: 0, reps: 12, status: 'COMPLETED' }, // 0 kg, 12 reps
                  { setNumber: 2, weightKg: 10, reps: 10, status: 'COMPLETED' } // 100 kg, 10 reps
                ]
              }
            ]
          }
        ]
      });

    await request(app)
      .post(`/api/gymflow/workout/${testDate}/finish`)
      .set('Cookie', cookieHeader)
      .send({ isFinished: true });

    // 1. Unfiltered query
    const resAll = await request(app)
      .get(`/api/gymflow/analytics?startDate=2026-11-01&endDate=2026-11-30`)
      .set('Cookie', cookieHeader);

    assert.strictEqual(resAll.status, 200);
    // Total Volume = 800 + 640 + 0 + 100 = 1540 kg
    assert.strictEqual(resAll.body.data.analytics.overall.totalVolume, 1540);
    // Total Reps = 10 + 8 + 12 + 10 = 40 reps
    assert.strictEqual(resAll.body.data.analytics.overall.totalReps, 40);
    assert.strictEqual(resAll.body.data.analytics.overall.totalCompletedExercises, 2);

    // 2. Filter by Body Part "Chest"
    const resChest = await request(app)
      .get(`/api/gymflow/analytics?startDate=2026-11-01&endDate=2026-11-30&bodyPart=Chest`)
      .set('Cookie', cookieHeader);

    assert.strictEqual(resChest.status, 200);
    assert.strictEqual(resChest.body.data.analytics.overall.totalVolume, 1440); // 800 + 640
    assert.strictEqual(resChest.body.data.analytics.overall.totalReps, 18);     // 10 + 8
    assert.strictEqual(resChest.body.data.analytics.overall.totalCompletedExercises, 1);

    // 3. Filter by Body Part "Back" AND exercise "Pullups"
    const resBackPullups = await request(app)
      .get(`/api/gymflow/analytics?startDate=2026-11-01&endDate=2026-11-30&bodyPart=Back&exerciseName=Pullups`)
      .set('Cookie', cookieHeader);

    assert.strictEqual(resBackPullups.status, 200);
    assert.strictEqual(resBackPullups.body.data.analytics.overall.totalVolume, 100);
    assert.strictEqual(resBackPullups.body.data.analytics.overall.totalReps, 22); // 12 + 10
    assert.strictEqual(resBackPullups.body.data.analytics.overall.totalCompletedExercises, 1);

    // Clean up
    await GymWorkoutSession.deleteMany({ spaceId: testSpace._id, date: testDate });
  });
});

