import { AppError } from '../utils/app-error.js';

/**
 * Middleware factory to validate request body with a Zod schema.
 * @param {import('zod').ZodSchema} schema
 */
export const validateBody = (schema) => (req, _res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed; // replace with stripped & sanitized data
    next();
  } catch (error) {
    if (error.issues) {
      const formattedErrors = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return next(new AppError('Validation failed', 400, formattedErrors));
    }
    return next(error);
  }
};

