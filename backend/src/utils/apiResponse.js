/**
 * Sends a standardized JSON success response.
 * @param {import('express').Response} res
 * @param {any} data
 * @param {{ status?: number, meta?: object }} [options]
 */
export function sendSuccess(res, data, { status = 200, meta } = {}) {
  const body = { success: true, data };
  if (meta !== undefined) {
    body.meta = meta;
  }
  return res.status(status).json(body);
}

/**
 * Sends a standardized JSON error response.
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} code
 * @param {string} message
 * @param {Array<object>} [details]
 */
export function sendError(res, status, code, message, details) {
  const errorPayload = { code, message };
  if (details && details.length > 0) {
    errorPayload.details = details;
  }
  return res.status(status).json({
    success: false,
    error: errorPayload,
  });
}
