import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long for cryptographic security'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ACCESS_CODE: z.string().min(1, 'ACCESS_CODE is required'),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL (e.g. http://localhost:5173)'),
  COOKIE_DOMAIN: z.string().optional().default('')
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
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN
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

