/**
 * Creates an operational API error.
 * @param {number} status
 * @param {string} code
 * @param {string} message
 * @param {Array<object>} [details]
 * @returns {Error & { status: number, code: string, details?: Array<object>, isApiError: true }}
 */
export function createApiError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  err.isApiError = true;
  return err;
}

/**
 * Checks if an error is a custom ApiError.
 * @param {any} err
 * @returns {boolean}
 */
export function isApiError(err) {
  return Boolean(err && err.isApiError === true);
}
