import { sendError } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * 404 handler for unregistered endpoints.
 */
export function notFound(_req, res) {
  sendError(res, 404, ERROR_CODES.NOT_FOUND, 'The requested resource or endpoint does not exist.');
}
