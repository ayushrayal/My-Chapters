import { AppError } from '../utils/app-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { env } from '../config/env.js';

/**
 * Maps MongoDB duplicate key error (code 11000) to a user-friendly AppError (409 Conflict).
 * @param {any} err
 * @returns {AppError}
 */
function handleMongoDuplicateKeyError(err) {
  const keyValue = err.keyValue || {};
  const fields = Object.keys(keyValue);

  if (fields.includes('spaceId') && fields.includes('nameNormalized')) {
    return AppError.conflict('A category with this name already exists in your Space');
  }
  if (fields.includes('usernameNormalized')) {
    return AppError.conflict('Username is already taken');
  }
  if (fields.includes('emailNormalized')) {
    return AppError.conflict('Email is already registered');
  }
  if (fields.includes('nameNormalized')) {
    return AppError.conflict('Space name is already taken');
  }
  if (fields.includes('slug')) {
    return AppError.conflict('A space with a similar name already exists, please choose another name');
  }

  const field = fields[0] || 'resource';
  return AppError.conflict(`Duplicate value for ${field}. Please choose another.`);
}

/**
 * Maps Mongoose validation error to AppError (400 Bad Request).
 * @param {any} err
 * @returns {AppError}
 */
function handleMongoValidationError(err) {
  const errors = Object.values(err.errors || {}).map((item) => ({
    field: item.path,
    message: item.message
  }));
  return AppError.badRequest('Database validation failed', errors);
}

/**
 * Centralized error-handling middleware.
 */
export function errorHandler(err, req, res, _next) {
  let error = err;

  // Handle Mongoose duplicate key error (11000)
  if (err.code === 11000) {
    error = handleMongoDuplicateKeyError(err);
  }
  // Handle Mongoose validation errors
  else if (err.name === 'ValidationError') {
    error = handleMongoValidationError(err);
  }
  // Handle Mongoose CastError (e.g. invalid ObjectId)
  else if (err.name === 'CastError') {
    error = AppError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    error = AppError.unauthorized('Invalid authentication token');
  } else if (err.name === 'TokenExpiredError') {
    error = AppError.unauthorized('Authentication token has expired');
  }

  const statusCode = error.statusCode || 500;
  const message =
    error.isOperational || statusCode < 500
      ? error.message
      : env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message || 'Internal server error';

  const errors = error.errors || [];

  // Log server errors (500) internally
  if (statusCode >= 500) {
    console.error(`[Error] 500 Internal Error on ${req.method} ${req.originalUrl}:`, err);
  }

  return ApiResponse.error(res, message, errors, statusCode);
}

