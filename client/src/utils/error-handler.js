/**
 * Parses Axios or runtime errors into user-friendly message and field errors.
 * Formats errors originating from the standardized My Chapters backend:
 * { success: false, message: string, errors: Array<{ field: string, message: string }> }
 *
 * @param {any} error
 * @returns {{ message: string, fieldErrors: Record<string, string>, status: number | null, isNetworkError: boolean }}
 */
export function parseApiError(error) {
  // 1. Network / Connection errors (Backend offline or unreachable)
  if (!error.response) {
    const isNetwork = error.code === 'ERR_NETWORK' || error.message?.includes('Network');
    return {
      message: isNetwork
        ? 'Cannot connect to the server. Please check your internet connection or verify the backend is running.'
        : error.message || 'An unexpected error occurred.',
      fieldErrors: {},
      status: null,
      isNetworkError: true
    };
  }

  const { status, data } = error.response;
  const backendMessage = data?.message;
  const rawErrors = data?.errors || [];

  // Map array of field errors to a key-value dictionary for easy lookup by input name
  const fieldErrors = {};
  if (Array.isArray(rawErrors)) {
    rawErrors.forEach((err) => {
      if (err.field && err.message) {
        fieldErrors[err.field] = err.message;
      }
    });
  }

  // Determine user-friendly fallback message based on HTTP status
  let message = backendMessage;
  if (message === 'Validation failed' && rawErrors.length > 0) {
    const errorDetails = rawErrors.map((e) => e.message).filter(Boolean).join('. ');
    if (errorDetails) {
      message = `Validation failed: ${errorDetails}`;
    }
  } else if (!message) {
    switch (status) {
      case 400:
        message = 'Please check the entered information and try again.';
        break;
      case 401:
        message = 'Invalid credentials or your session has expired.';
        break;
      case 403:
        message = 'You do not have permission to perform this action.';
        break;
      case 404:
        message = 'The requested resource could not be found.';
        break;
      case 409:
        message = 'A resource with this information already exists.';
        break;
      case 429:
        message = 'Too many requests. Please slow down and try again later.';
        break;
      case 500:
      default:
        message = 'An unexpected server error occurred. Please try again later.';
        break;
    }
  }

  return {
    message,
    fieldErrors,
    status,
    isNetworkError: false
  };
}

