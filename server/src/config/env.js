import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Load environment variables from .env file (supports root or server directory invocation)
dotenv.config();
try {
  dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
} catch {
  // Ignore fallback failure
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long for cryptographic security'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ACCESS_CODE: z.string().min(1, 'ACCESS_CODE is required'),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL (e.g. http://localhost:5173)'),
  COOKIE_DOMAIN: z.string().optional().default(''),
  AUTH_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(45),
  AUTH_CACHE_MAX_ENTRIES: z.coerce.number().int().positive().default(1000),
  SLOW_QUERY_THRESHOLD_MS: z.coerce.number().int().positive().default(100),
  ENABLE_QUERY_PROFILING: z.enum(['true', 'false']).default('true')
});

let parsedEnv;

try {
  parsedEnv = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    ACCESS_CODE: process.env.ACCESS_CODE,
    CLIENT_URL: process.env.CLIENT_URL,
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
    AUTH_CACHE_TTL_SECONDS: process.env.AUTH_CACHE_TTL_SECONDS,
    AUTH_CACHE_MAX_ENTRIES: process.env.AUTH_CACHE_MAX_ENTRIES,
    SLOW_QUERY_THRESHOLD_MS: process.env.SLOW_QUERY_THRESHOLD_MS,
    ENABLE_QUERY_PROFILING: process.env.ENABLE_QUERY_PROFILING
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    const issues = error.issues
      .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`\x1b[31m[Environment Validation Error] Application startup aborted:\n${issues}\x1b[0m`);
  } else {
    console.error('\x1b[31m[Environment Validation Error] Failed to load configuration.\x1b[0m');
  }
  process.exit(1);
}

export const env = Object.freeze(parsedEnv);

