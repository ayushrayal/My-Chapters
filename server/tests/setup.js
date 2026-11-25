import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { authCache } from '../src/utils/auth-cache.js';

let replSetInstance = null;

/**
 * Initializes an in-memory MongoDB replica set to support transactions and indexes.
 */
export async function setupTestDatabase() {
  if (replSetInstance) {
    return;
  }

  replSetInstance = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' }
  });

  const uri = replSetInstance.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });

  // Pre-initialize indexes so catalog changes don't interfere with transactions
  const { User } = await import('../src/models/user.model.js');
  const { Space } = await import('../src/models/space.model.js');
  const { AuthSession } = await import('../src/models/auth-session.model.js');
  const { SomedayCategory } = await import('../src/models/someday-category.model.js');
  const { SomedayItem } = await import('../src/models/someday-item.model.js');
  const { DayflowTemplate } = await import('../src/models/dayflow-template.model.js');
  const { DayflowSchedule } = await import('../src/models/dayflow-schedule.model.js');
  const { GymTemplate } = await import('../src/models/gym-template.model.js');
  const { GymWeeklySchedule } = await import('../src/models/gym-weekly-schedule.model.js');
  const { GymWorkoutSession } = await import('../src/models/gym-workout-session.model.js');

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
}

/**
 * Clears all documents across all collections in the test database.
 */
export async function clearTestDatabase() {
  authCache.clear();
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }
}

/**
 * Stops the in-memory MongoDB replica set and closes mongoose connection.
 */
export async function teardownTestDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (replSetInstance) {
    await replSetInstance.stop();
    replSetInstance = null;
  }
}
