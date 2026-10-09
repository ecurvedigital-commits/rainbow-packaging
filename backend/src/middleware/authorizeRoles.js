import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Role guard middleware enforcing allowed roles.
 * @param {...string} roles
 * @returns {import('express').RequestHandler}
 */
export function authorizeRoles(...roles) {
  const allowed = new Set(roles);
  if (allowed.has('SUPERVISOR')) allowed.add('MIS');
  if (allowed.has('MIS')) allowed.add('SUPERVISOR');

  return (req, _res, next) => {
    const userRole = req.user?.role;
    if (!req.user || !allowed.has(userRole)) {
      return next(createApiError(403, ERROR_CODES.FORBIDDEN, 'You do not have permission to perform this action'));
    }
    next();
  };
}
