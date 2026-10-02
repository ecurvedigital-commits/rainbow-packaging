import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Middleware blocking access when user must change temporary password.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requirePasswordChange(req, _res, next) {
  if (req.user && req.user.must_change_password) {
    return next(createApiError(403, ERROR_CODES.PASSWORD_CHANGE_REQUIRED, 'Password change is required before proceeding'));
  }
  next();
}
