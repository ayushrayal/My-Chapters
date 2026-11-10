/**
 * Standardized API Response formatter.
 * Ensures consistent payload format across all endpoints:
 * Success: { success: true, message: string, data: object }
 * Error:   { success: false, message: string, errors: array }
 */
export class ApiResponse {
  /**
   * Send a successful response.
   * @param {import('express').Response} res
   * @param {string} [message='Operation successful']
   * @param {object} [data={}]
   * @param {number} [statusCode=200]
   */
  static success(res, message = 'Operation successful', data = {}, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Send a 201 Created response.
   * @param {import('express').Response} res
   * @param {string} [message='Resource created successfully']
   * @param {object} [data={}]
   */
  static created(res, message = 'Resource created successfully', data = {}) {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Send an error response.
   * @param {import('express').Response} res
   * @param {string} [message='An error occurred']
   * @param {Array<any>} [errors=[]]
   * @param {number} [statusCode=500]
   */
  static error(res, message = 'An error occurred', errors = [], statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: Array.isArray(errors) ? errors : [errors]
    });
  }
}

