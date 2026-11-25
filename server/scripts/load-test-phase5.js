import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { AUTH_COOKIE_NAME } from '../src/utils/cookie-options.js';

// Preload models
import { User } from '../src/models/user.model.js';
import { Space } from '../src/models/space.model.js';
import { AuthSession } from '../src/models/auth-session.model.js';
import { SomedayCategory } from '../src/models/someday-category.model.js';
import { SomedayItem } from '../src/models/someday-item.model.js';
import { DayflowTemplate } from '../src/models/dayflow-template.model.js';
import { DayflowSchedule } from '../src/models/dayflow-schedule.model.js';
import { GymTemplate } from '../src/models/gym-template.model.js';
import { GymWeeklySchedule } from '../src/models/gym-weekly-schedule.model.js';
import { GymWorkoutSession } from '../src/models/gym-workout-session.model.js';
import { authCache } from '../src/utils/auth-cache.js';
import { queryProfiler } from '../src/utils/query-profiler.js';

/**
 * Calculates percentile from a sorted array of numbers.
 */
function calculatePercentile(sortedArr, p) {
  if (!sortedArr.length) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
}

async function runPhase5LoadTest() {
  console.log('=== PHASE 5.2: Controlled Load & Concurrency Benchmark ===');
  console.log('[Setup] Launching isolated MongoDB test replica set...');

  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' }
  });
  const uri = replSet.getUri();
  await mongoose.connect(uri);

  await Promise.all([
    User.init(),
    Space.init(),
    AuthSession.init(),
    SomedayCategory.init(),
    SomedayItem.init(),
    DayflowTemplate.init(),
    DayflowSchedule.init(),
    GymTemplate.init(),
    GymWeeklySchedule.init(),
    GymWorkoutSession.init()
  ]);

  console.log('[Setup] Seeding 5 distinct multi-tenant user accounts with realistic data...');
  const users = [];

  for (let i = 1; i <= 5; i++) {
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        username: `load_user_${i}`,
        email: `loaduser${i}@example.com`,
        password: 'Password123!',
        spaceName: `Space Load ${i}`,
        accessCode: env.ACCESS_CODE
      });

    const signinRes = await request(app)
      .post('/api/auth/signin')
      .set('x-bypass-test-ratelimit', 'true')
      .send({
        identifier: `loaduser${i}@example.com`,
        password: 'Password123!'
      });

    const cookie = signinRes.headers['set-cookie']
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split(';')[0];

    const spaceId = new mongoose.Types.ObjectId(signupRes.body.data.space.id);

    // Seed realistic categories & Someday items
    const cat = await SomedayCategory.create({
      spaceId,
      name: `Category ${i}`,
      color: '#3A4EFB'
    });

    const items = [];
    for (let j = 1; j <= 40; j++) {
      items.push({
        spaceId,
        categoryId: cat._id,
        name: `Item ${j} for Space ${i}`,
        note: 'Sample notes for load testing payload examination.',
        links: [{ label: 'Product Link', url: 'https://example.com/product' }],
        status: j % 2 === 0 ? 'PLANNED' : 'PURCHASED',
        purchaseDate: j % 2 === 1 ? new Date() : null
      });
    }
    await SomedayItem.insertMany(items);

    // Seed Dayflow schedules
    for (let d = 1; d <= 14; d++) {
      const dateStr = `2026-11-${String(d).padStart(2, '0')}`;
      const bId = new mongoose.Types.ObjectId();
      await DayflowSchedule.create({
        spaceId,
        date: dateStr,
        isRestDay: d % 7 === 0,
        blocks: [{ _id: bId, id: bId.toString(), name: 'Main Work Block', startTime: '09:00', endTime: '17:00' }],
        tasks: [
          { id: new mongoose.Types.ObjectId().toString(), blockId: bId, title: 'Task 1', status: 'COMPLETED' },
          { id: new mongoose.Types.ObjectId().toString(), blockId: bId, title: 'Task 2', status: 'COMPLETED' },
          { id: new mongoose.Types.ObjectId().toString(), blockId: bId, title: 'Task 3', status: 'SKIPPED', skippedReason: 'Deferred' }
        ]
      });
    }

    // Seed GymWorkout sessions
    for (let d = 1; d <= 14; d++) {
      const dateStr = `2026-11-${String(d).padStart(2, '0')}`;
      await GymWorkoutSession.create({
        spaceId,
        date: dateStr,
        isRestDay: d % 4 === 0,
        isFinished: true,
        templateName: 'Upper Hypertrophy',
        score: 90,
        treadmill: { status: 'COMPLETED', minutes: 20, calories: 180 },
        bodyParts: [
          {
            name: 'Chest',
            order: 0,
            exercises: [
              {
                name: 'Bench Press',
                targetBodyPart: 'Chest',
                order: 0,
                plannedSets: 3,
                sets: [
                  { setNumber: 1, weightKg: 80, reps: 10, status: 'COMPLETED' },
                  { setNumber: 2, weightKg: 80, reps: 10, status: 'COMPLETED' },
                  { setNumber: 3, weightKg: 80, reps: 8, status: 'COMPLETED' }
                ]
              }
            ]
          }
        ]
      });
    }

    users.push({ id: i, cookie, spaceId });
  }

  console.log('[Setup] Seeding completed. 5 active spaces with full schedules, workouts, and items.');

  // Workflow definitions (Realistic user browsing journey)
  const workflowSteps = [
    { name: 'Auth Check', path: '/api/auth/me', method: 'get' },
    { name: 'Dashboard Stats', path: '/api/someday/items/stats', method: 'get' },
    { name: 'Dayflow Schedule', path: '/api/dayflow/schedule?date=2026-11-10', method: 'get' },
    { name: 'Dayflow Analytics', path: '/api/dayflow/analytics?startDate=2026-11-01&endDate=2026-11-14', method: 'get' },
    { name: 'GymFlow Analytics', path: '/api/gymflow/analytics?startDate=2026-11-01&endDate=2026-11-14', method: 'get' },
    { name: 'GymFlow Session', path: '/api/gymflow/workout/2026-11-10', method: 'get' },
    { name: 'Someday Items Paginated', path: '/api/someday/items?page=1&limit=20', method: 'get' }
  ];

  const concurrencyLevels = [10, 25, 50, 100];
  const resultsByConcurrency = {};

  for (const C of concurrencyLevels) {
    console.log(`\n--- Running Load Test: Concurrency = ${C} ---`);
    const totalRequests = C * 20; // 20 requests per concurrent user (e.g. 200, 500, 1000, 2000 requests)
    const latencies = [];
    let errorCount = 0;
    let timeoutCount = 0;
    let totalBytesTransferred = 0;

    const memBefore = process.memoryUsage();
    const startTime = process.hrtime.bigint();

    // Semaphore-style concurrency queue
    let completedRequests = 0;
    let activeWorkers = 0;
    let requestIdx = 0;

    await new Promise((resolve) => {
      function next() {
        if (completedRequests >= totalRequests) {
          return resolve();
        }

        while (activeWorkers < C && requestIdx < totalRequests) {
          const currentReqNum = requestIdx++;
          activeWorkers++;

          const user = users[currentReqNum % users.length];
          const step = workflowSteps[currentReqNum % workflowSteps.length];

          const reqStart = process.hrtime.bigint();
          request(app)
            .get(step.path)
            .set('Cookie', user.cookie)
            .set('x-bypass-test-ratelimit', 'true')
            .timeout(10000)
            .then((res) => {
              const reqDurationMs = Number(process.hrtime.bigint() - reqStart) / 1e6;
              latencies.push(reqDurationMs);

              const byteLength = res.text ? Buffer.byteLength(res.text) : 0;
              totalBytesTransferred += byteLength;

              if (res.status >= 400) {
                errorCount++;
              }
            })
            .catch((err) => {
              const reqDurationMs = Number(process.hrtime.bigint() - reqStart) / 1e6;
              latencies.push(reqDurationMs);
              errorCount++;
              if (err.timeout) timeoutCount++;
            })
            .finally(() => {
              activeWorkers--;
              completedRequests++;
              next();
            });
        }
      }

      next();
    });

    const totalDurationSec = Number(process.hrtime.bigint() - startTime) / 1e9;
    const memAfter = process.memoryUsage();

    latencies.sort((a, b) => a - b);

    const rps = totalRequests / totalDurationSec;
    const p50 = calculatePercentile(latencies, 50);
    const p95 = calculatePercentile(latencies, 95);
    const p99 = calculatePercentile(latencies, 99);
    const avgLatency = latencies.reduce((sum, v) => sum + v, 0) / latencies.length;
    const avgPayloadBytes = totalBytesTransferred / totalRequests;

    resultsByConcurrency[C] = {
      concurrency: C,
      totalRequests,
      durationSec: Number(totalDurationSec.toFixed(2)),
      requestsPerSec: Number(rps.toFixed(2)),
      avgLatencyMs: Number(avgLatency.toFixed(2)),
      p50Ms: Number(p50.toFixed(2)),
      p95Ms: Number(p95.toFixed(2)),
      p99Ms: Number(p99.toFixed(2)),
      minLatencyMs: Number(latencies[0].toFixed(2)),
      maxLatencyMs: Number(latencies[latencies.length - 1].toFixed(2)),
      errorCount,
      errorRatePct: Number(((errorCount / totalRequests) * 100).toFixed(2)),
      timeoutCount,
      timeoutRatePct: Number(((timeoutCount / totalRequests) * 100).toFixed(2)),
      avgPayloadBytes: Math.round(avgPayloadBytes),
      memory: {
        rssBeforeMb: Math.round(memBefore.rss / (1024 * 1024)),
        rssAfterMb: Math.round(memAfter.rss / (1024 * 1024)),
        heapUsedBeforeMb: Math.round(memBefore.heapUsed / (1024 * 1024)),
        heapUsedAfterMb: Math.round(memAfter.heapUsed / (1024 * 1024))
      }
    };

    console.log(`Results for Concurrency ${C}:`, JSON.stringify(resultsByConcurrency[C], null, 2));
  }

  console.log('\n=== Final Load Test Summary Across All Concurrency Tiers ===');
  console.log(JSON.stringify(resultsByConcurrency, null, 2));

  await mongoose.disconnect();
  await replSet.stop();
  console.log('[Teardown] In-memory load test environment closed cleanly.');
}

runPhase5LoadTest().catch((err) => {
  console.error('[Fatal Load Test Failure]', err);
  process.exit(1);
});
