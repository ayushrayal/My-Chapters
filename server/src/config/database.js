import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Sanitizes MongoDB connection string for safe logging without exposing credentials.
 * @param {string} uri
 * @returns {string} Sanitized URI
 */
function sanitizeMongoUri(uri) {
  if (!uri) return '';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

/**
 * Connect to MongoDB with production-grade pool settings and event listeners.
 * @param {string} [customUri] - Optional custom URI (e.g. for in-memory test databases)
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDatabase(customUri) {
  const targetUri = customUri || env.MONGODB_URI;
  const sanitizedUri = sanitizeMongoUri(targetUri);

  mongoose.connection.on('connected', () => {
    console.log(`[Database] MongoDB connected successfully to ${sanitizedUri}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error('[Database] MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] MongoDB disconnected');
  });

  try {
    const conn = await mongoose.connect(targetUri, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    return conn;
  } catch (error) {
    console.error(`[Database] Initial MongoDB connection failed: ${error.message}`);
    throw error;
  }
}

/**
 * Disconnect from MongoDB safely.
 * @returns {Promise<void>}
 */
export async function disconnectDatabase() {
  try {
    await mongoose.connection.close(false);
    console.log('[Database] MongoDB connection closed cleanly');
  } catch (error) {
    console.error('[Database] Error closing MongoDB connection:', error.message);
  }
}
