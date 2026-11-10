import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

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

  await Promise.all([
    User.init(),
    Space.init(),
    AuthSession.init(),
    SomedayCategory.init(),
    SomedayItem.init()
  ]);
}

/**
 * Clears all documents across all collections in the test database.
 */
export async function clearTestDatabase() {
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
