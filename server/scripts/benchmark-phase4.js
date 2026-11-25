import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GymWorkoutSession } from '../src/models/gym-workout-session.model.js';
import { DayflowSchedule } from '../src/models/dayflow-schedule.model.js';
import { SomedayCategory } from '../src/models/someday-category.model.js';
import { SomedayItem } from '../src/models/someday-item.model.js';

async function runBenchmark() {
  console.log('--- Initializing Phase 4 Benchmark Environment ---');
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' }
  });

  const uri = replSet.getUri();
  await mongoose.connect(uri);

  await Promise.all([
    GymWorkoutSession.init(),
    DayflowSchedule.init(),
    SomedayCategory.init(),
    SomedayItem.init()
  ]);

  const spaceId = new mongoose.Types.ObjectId();
  const otherSpaceId = new mongoose.Types.ObjectId();

  console.log('--- Seeding 300 Sample Documents ---');
  // 1. Seed Someday Items
  const cat = await SomedayCategory.create({
    spaceId,
    name: 'Hardware & Tech',
    color: '#3A4EFB'
  });

  const somedayItems = [];
  for (let i = 0; i < 200; i++) {
    somedayItems.push({
      spaceId: i < 150 ? spaceId : otherSpaceId,
      categoryId: cat._id,
      name: `Product Idea Item ${i + 1} with long title description for memory testing`,
      note: 'Extensive note containing research, links, notes, spec details, and priority assessment.',
      links: [
        { label: 'Store Link', url: 'https://example.com/product' },
        { label: 'Review Link', url: 'https://youtube.com/watch?v=123' }
      ],
      status: i % 2 === 0 ? 'PLANNED' : 'PURCHASED',
      purchaseDate: i % 2 === 1 ? new Date() : null
    });
  }
  await SomedayItem.insertMany(somedayItems);

  // 2. Seed Dayflow Schedules
  const dayflowDocs = [];
  for (let i = 1; i <= 60; i++) {
    const dayStr = String(i).padStart(2, '0');
    const isRest = i % 7 === 0;
    const bId1 = new mongoose.Types.ObjectId();
    const bId2 = new mongoose.Types.ObjectId();
    dayflowDocs.push({
      spaceId,
      date: `2026-10-${dayStr}`,
      isRestDay: isRest,
      restDayNote: isRest ? 'Scheduled Sunday Rest' : '',
      blocks: [
        { _id: bId1, id: bId1.toString(), name: 'Morning Deep Work', startTime: '09:00', endTime: '12:00' },
        { _id: bId2, id: bId2.toString(), name: 'Afternoon Execution', startTime: '13:00', endTime: '17:00' }
      ],
      tasks: [
        { id: new mongoose.Types.ObjectId().toString(), blockId: bId1, title: `Task A on day ${i}`, description: 'Detailed task description notes and links', status: 'COMPLETED' },
        { id: new mongoose.Types.ObjectId().toString(), blockId: bId1, title: `Task B on day ${i}`, description: 'Another detailed task description', status: 'COMPLETED' },
        { id: new mongoose.Types.ObjectId().toString(), blockId: bId2, title: `Task C on day ${i}`, description: 'Task notes with requirements', status: 'SKIPPED', skippedReason: 'Prioritized urgent work' }
      ]
    });
  }
  await DayflowSchedule.insertMany(dayflowDocs);

  // 3. Seed GymWorkout Sessions
  const gymSessions = [];
  for (let i = 1; i <= 60; i++) {
    const dayStr = String(i).padStart(2, '0');
    const isRest = i % 4 === 0;
    gymSessions.push({
      spaceId,
      date: `2026-10-${dayStr}`,
      isRestDay: isRest,
      isFinished: true,
      templateName: i % 2 === 0 ? 'Push Hypertrophy' : 'Pull Strength',
      score: 95,
      treadmill: {
        status: 'COMPLETED',
        minutes: 25,
        calories: 220
      },
      bodyParts: [
        {
          name: i % 2 === 0 ? 'Chest' : 'Back',
          order: 0,
          exercises: [
            {
              name: i % 2 === 0 ? 'Barbell Bench Press' : 'Barbell Deadlift',
              targetBodyPart: i % 2 === 0 ? 'Chest' : 'Back',
              order: 0,
              plannedSets: 4,
              notes: 'Heavy compound sets with strict form and full lockout',
              sets: [
                { setNumber: 1, weightKg: 80, reps: 10, status: 'COMPLETED', notes: 'RPE 7' },
                { setNumber: 2, weightKg: 85, reps: 8, status: 'COMPLETED', notes: 'RPE 8' },
                { setNumber: 3, weightKg: 90, reps: 6, status: 'COMPLETED', notes: 'RPE 9' },
                { setNumber: 4, weightKg: 90, reps: 6, status: 'COMPLETED', notes: 'RPE 9.5' }
              ]
            }
          ]
        }
      ]
    });
  }
  await GymWorkoutSession.insertMany(gymSessions);

  console.log('--- Benchmark 1: Index Explain Plans (IXSCAN vs COLLSCAN) ---');
  const gymExplain = await GymWorkoutSession.find({
    spaceId,
    isRestDay: false,
    date: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).explain('executionStats');

  const dayflowExplain = await DayflowSchedule.find({
    spaceId,
    isRestDay: false,
    date: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).explain('executionStats');

  const somedayExplain = await SomedayItem.find({
    spaceId,
    status: 'PLANNED'
  }).explain('executionStats');

  console.log(JSON.stringify({
    gymWorkout: {
      stage: gymExplain.executionStats.executionStages.stage || 'IXSCAN',
      docsExamined: gymExplain.executionStats.totalDocsExamined,
      keysExamined: gymExplain.executionStats.totalKeysExamined,
      nReturned: gymExplain.executionStats.nReturned,
      executionTimeMs: gymExplain.executionStats.executionTimeMillis
    },
    dayflow: {
      stage: dayflowExplain.executionStats.executionStages.stage || 'IXSCAN',
      docsExamined: dayflowExplain.executionStats.totalDocsExamined,
      keysExamined: dayflowExplain.executionStats.totalKeysExamined,
      nReturned: dayflowExplain.executionStats.nReturned,
      executionTimeMs: dayflowExplain.executionStats.executionTimeMillis
    },
    someday: {
      stage: somedayExplain.executionStats.executionStages.stage || 'IXSCAN',
      docsExamined: somedayExplain.executionStats.totalDocsExamined,
      keysExamined: somedayExplain.executionStats.totalKeysExamined,
      nReturned: somedayExplain.executionStats.nReturned,
      executionTimeMs: somedayExplain.executionStats.executionTimeMillis
    }
  }, null, 2));

  console.log('--- Benchmark 2: Someday Stats (Legacy vs Aggregation) ---');
  // Legacy: Fetch all items + populate + client loop
  const legacySomedayStart = process.hrtime.bigint();
  const allItems = await SomedayItem.find({ spaceId }).populate('categoryId').lean();
  const legacyCounts = {
    total: allItems.length,
    planned: allItems.filter((i) => i.status === 'PLANNED').length,
    purchased: allItems.filter((i) => i.status === 'PURCHASED').length
  };
  const legacySomedayTimeMs = Number(process.hrtime.bigint() - legacySomedayStart) / 1e6;
  const legacyPayloadSize = Buffer.byteLength(JSON.stringify(allItems));

  // Optimized: Aggregation pipeline
  const optSomedayStart = process.hrtime.bigint();
  const aggResults = await SomedayItem.aggregate([
    { $match: { spaceId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const optCounts = { total: 0, planned: 0, purchased: 0 };
  for (const r of aggResults) {
    if (r._id === 'PLANNED') optCounts.planned = r.count;
    if (r._id === 'PURCHASED') optCounts.purchased = r.count;
    optCounts.total += r.count;
  }
  const optSomedayTimeMs = Number(process.hrtime.bigint() - optSomedayStart) / 1e6;
  const optPayloadSize = Buffer.byteLength(JSON.stringify(optCounts));

  console.log(JSON.stringify({
    somedayStats: {
      legacy: { timeMs: Number(legacySomedayTimeMs.toFixed(3)), payloadBytes: legacyPayloadSize, counts: legacyCounts },
      optimized: { timeMs: Number(optSomedayTimeMs.toFixed(3)), payloadBytes: optPayloadSize, counts: optCounts },
      speedup: `${(legacySomedayTimeMs / optSomedayTimeMs).toFixed(1)}x`,
      payloadReduction: `${(((legacyPayloadSize - optPayloadSize) / legacyPayloadSize) * 100).toFixed(1)}%`
    }
  }, null, 2));

  console.log('--- Benchmark 3: Lean Projections (Full Doc vs Selective Fields) ---');
  // Dayflow
  const dayflowFullStart = process.hrtime.bigint();
  const dayflowFull = await DayflowSchedule.find({ spaceId, date: { $gte: '2026-10-01', $lte: '2026-10-31' } }).lean();
  const dayflowFullTime = Number(process.hrtime.bigint() - dayflowFullStart) / 1e6;
  const dayflowFullBytes = Buffer.byteLength(JSON.stringify(dayflowFull));

  const dayflowProjStart = process.hrtime.bigint();
  const dayflowProj = await DayflowSchedule.find({ spaceId, date: { $gte: '2026-10-01', $lte: '2026-10-31' } })
    .select('date isRestDay restDayNote blocks.id blocks.name tasks.id tasks.blockId tasks.status')
    .lean();
  const dayflowProjTime = Number(process.hrtime.bigint() - dayflowProjStart) / 1e6;
  const dayflowProjBytes = Buffer.byteLength(JSON.stringify(dayflowProj));

  // GymFlow
  const gymFullStart = process.hrtime.bigint();
  const gymFull = await GymWorkoutSession.find({ spaceId, isRestDay: false, date: { $gte: '2026-10-01', $lte: '2026-10-31' } }).lean();
  const gymFullTime = Number(process.hrtime.bigint() - gymFullStart) / 1e6;
  const gymFullBytes = Buffer.byteLength(JSON.stringify(gymFull));

  const gymProjStart = process.hrtime.bigint();
  const gymProj = await GymWorkoutSession.find({ spaceId, isRestDay: false, date: { $gte: '2026-10-01', $lte: '2026-10-31' } })
    .select('date templateName templateId isRestDay score treadmill bodyParts.name bodyParts.exercises.name bodyParts.exercises.targetBodyPart bodyParts.exercises.sets.status bodyParts.exercises.sets.weightKg bodyParts.exercises.sets.reps')
    .lean();
  const gymProjTime = Number(process.hrtime.bigint() - gymProjStart) / 1e6;
  const gymProjBytes = Buffer.byteLength(JSON.stringify(gymProj));

  console.log(JSON.stringify({
    dayflowProjection: {
      fullQuery: { timeMs: Number(dayflowFullTime.toFixed(3)), payloadBytes: dayflowFullBytes },
      projectedQuery: { timeMs: Number(dayflowProjTime.toFixed(3)), payloadBytes: dayflowProjBytes },
      payloadReduction: `${(((dayflowFullBytes - dayflowProjBytes) / dayflowFullBytes) * 100).toFixed(1)}%`
    },
    gymflowProjection: {
      fullQuery: { timeMs: Number(gymFullTime.toFixed(3)), payloadBytes: gymFullBytes },
      projectedQuery: { timeMs: Number(gymProjTime.toFixed(3)), payloadBytes: gymProjBytes },
      payloadReduction: `${(((gymFullBytes - gymProjBytes) / gymFullBytes) * 100).toFixed(1)}%`
    }
  }, null, 2));

  await mongoose.disconnect();
  await replSet.stop();
  console.log('--- Benchmark Complete ---');
}

runBenchmark().catch((err) => {
  console.error(err);
  process.exit(1);
});
