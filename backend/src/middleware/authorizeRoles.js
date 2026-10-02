import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Role guard middleware enforcing allowed roles.
 * @param {...string} roles
 * @returns {import('express').RequestHandler}
 */
export function authorizeRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(createApiError(403, ERROR_CODES.FORBIDDEN, 'You do not have permission to perform this action'));
    }
    next();
  };
}
