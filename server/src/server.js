import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import dns from 'dns';

if (process.env.USE_CUSTOM_DNS === 'true' || (process.env.NODE_ENV !== 'production' && process.env.USE_CUSTOM_DNS !== 'false')) {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (e) {
    // Ignore DNS set errors if unsupported
  }
}
let server;

async function startServer() {
  try {
    // 1. Establish MongoDB connection before starting HTTP listener
    await connectDatabase();

    // 2. Start HTTP server
    server = app.listen(env.PORT, () => {
      console.log(`[Server] My Chapters API backend running on port ${env.PORT} [${env.NODE_ENV}]`);
      console.log(`[Server] Health check available at http://localhost:${env.PORT}/api/health`);
    });
  } catch (error) {
    console.error('[Server] Fatal startup failure:', error.message);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler.
 * Closes HTTP listener to finish in-flight requests and cleanly disconnects from MongoDB.
 */
async function gracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP listener closed.');
      await disconnectDatabase();
      console.log('[Server] Graceful shutdown completed.');
      process.exit(0);
    });

    // Force shutdown after timeout if pending requests do not drain
    setTimeout(() => {
      console.error('[Server] Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000).unref();
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
}

// Process signal listeners
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

startServer();

