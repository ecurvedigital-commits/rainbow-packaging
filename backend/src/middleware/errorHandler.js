import { isApiError } from '../utils/ApiError.js';
import { sendError } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { logger } from '../config/logger.js';

/**
 * Centralized global error handling middleware.
 */
export function errorHandler(err, _req, res, _next) {
  if (isApiError(err)) {
    return sendError(res, err.status, err.code, err.message, err.details);
  }

  // Zod Validation Error
  if (err.name === 'ZodError') {
    const details = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return sendError(res, 422, ERROR_CODES.VALIDATION_ERROR, 'One or more fields are invalid.', details);
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.keys(err.errors || {}).map((key) => ({
      field: key,
      message: err.errors[key].message,
    }));
    return sendError(res, 422, ERROR_CODES.VALIDATION_ERROR, 'Mongoose validation failed.', details);
  }

  // Mongoose Cast Error (Invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    const details = [{ field: err.path, message: `Invalid format for ${err.path}` }];
    return sendError(res, 422, ERROR_CODES.VALIDATION_ERROR, 'Invalid parameter or document ID.', details);
  }

  // MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    let errorCode = ERROR_CODES.VALIDATION_ERROR;
    let message = 'A record with this unique identifier already exists.';
    const keyPattern = Object.keys(err.keyPattern || {});
    const keyValue = err.keyValue || {};

    if (keyPattern.includes('reel_no')) {
      errorCode = ERROR_CODES.DUPLICATE_REEL_NO;
      const dupVal = keyValue.reel_no || Object.values(keyValue)[0] || '';
      message = `Reel Number '${dupVal}' already exists in active inventory. Please enter or auto-generate a unique reel number.`;
    } else if (keyPattern.includes('username')) {
      errorCode = ERROR_CODES.DUPLICATE_USERNAME;
      const dupVal = keyValue.username || Object.values(keyValue)[0] || '';
      message = `Username '${dupVal}' is already registered.`;
    } else if (keyPattern.includes('email')) {
      errorCode = ERROR_CODES.DUPLICATE_EMAIL;
      const dupVal = keyValue.email || Object.values(keyValue)[0] || '';
      message = `Email address '${dupVal}' is already in use.`;
    } else if (keyPattern.includes('key')) {
      errorCode = ERROR_CODES.DUPLICATE_FIELD_KEY;
      const dupVal = keyValue.key || Object.values(keyValue)[0] || '';
      message = `Custom field key '${dupVal}' already exists.`;
    } else if (keyPattern.includes('sr_no')) {
      const dupVal = keyValue.sr_no || Object.values(keyValue)[0] || '';
      message = `Serial Number '${dupVal}' already exists in system sequences.`;
    } else if (keyPattern.length > 0) {
      const field = keyPattern[0];
      const val = keyValue[field] || '';
      message = `Duplicate entry: '${field}' with value '${val}' already exists.`;
    }

    return sendError(res, 409, errorCode, message);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, ERROR_CODES.UNAUTHENTICATED, 'Invalid token.');
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, ERROR_CODES.TOKEN_EXPIRED, 'Token has expired.');
  }

  // Unhandled internal server error
  logger.error({ err }, 'Unhandled Internal Server Error');
  console.error('[errorHandler] Unhandled error:', err.message);
  console.error('[errorHandler] Stack:', err.stack);
  const devMessage = process.env.NODE_ENV !== 'production'
    ? `${err.message || 'Unknown error'}`
    : 'An internal server error occurred.';
  return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, devMessage, process.env.NODE_ENV !== 'production' ? [{ field: 'stack', message: err.stack?.split('\n').slice(0, 5).join(' | ') || '' }] : undefined);
}
