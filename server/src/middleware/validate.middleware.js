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

/**
 * Middleware factory to validate request query parameters with a Zod schema.
 * @param {import('zod').ZodSchema} schema
 */
export const validateQuery = (schema) => (req, _res, next) => {
  try {
    const parsed = schema.parse(req.query);
    req.validatedQuery = parsed;
    // Mutate existing query object to avoid getter re-assignment error in Express 5
    if (req.query && typeof req.query === 'object') {
      Object.keys(req.query).forEach((key) => {
        if (!(key in parsed)) {
          delete req.query[key];
        }
      });
      Object.assign(req.query, parsed);
    }
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

/**
 * Middleware factory to validate request URL path parameters with a Zod schema.
 * @param {import('zod').ZodSchema} schema
 */
export const validateParams = (schema) => (req, _res, next) => {
  try {
    const parsed = schema.parse(req.params);
    req.validatedParams = parsed;
    // Mutate existing params object to avoid getter re-assignment error in Express 5
    if (req.params && typeof req.params === 'object') {
      Object.assign(req.params, parsed);
    }
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

