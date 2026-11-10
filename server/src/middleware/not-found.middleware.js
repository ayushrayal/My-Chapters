import { ApiResponse } from '../utils/api-response.js';

/**
 * 404 Not Found Middleware.
 * Catches all unmatched routes and returns a standardized error response.
 */
export function notFoundHandler(req, res, _next) {
  return ApiResponse.error(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    [],
    404
  );
}

