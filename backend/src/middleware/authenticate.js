import { verifyAccessToken } from '../services/token.service.js';
import { User } from '../models/user.model.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Authentication middleware verifying JWT Bearer token and attaching active user to req.user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createApiError(401, ERROR_CODES.UNAUTHENTICATED, 'Missing or invalid authorization header'));
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next(createApiError(401, ERROR_CODES.UNAUTHENTICATED, 'Bearer token is empty'));
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    return next(error);
  }

  try {
    const user = await User.findById(decoded.sub).lean();
    if (!user) {
      return next(createApiError(401, ERROR_CODES.UNAUTHENTICATED, 'User no longer exists'));
    }

    if (!user.is_active) {
      return next(createApiError(403, ERROR_CODES.ACCOUNT_DISABLED, 'Account is deactivated'));
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      username: user.username,
      must_change_password: user.must_change_password,
    };

    next();
  } catch (dbError) {
    next(dbError);
  }
}
