/**
 * Higher-order function to catch asynchronous errors in Express route handlers
 * and pass them to the next middleware (centralized error handler).
 * @param {Function} fn - Async controller function
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

