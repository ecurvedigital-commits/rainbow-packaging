import { User } from '../models/user.model.js';
import { RefreshToken } from '../models/refreshToken.model.js';
import { signAccessToken, createRefreshToken, hashToken } from './token.service.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * User login with username + password (docs/routes/auth.md).
 * @param {{ input: { username: string, password: string }, ip?: string, userAgent?: string }} args
 * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number, user: object }>}
 */
export async function login({ input, ip, userAgent }) {
  const { username, password } = input;
  const normalizedUsername = username.toLowerCase().trim();

  const user = await User.findOne({ username: normalizedUsername }).select('+password_hash');

  if (!user) {
    throw createApiError(401, ERROR_CODES.UNAUTHENTICATED, 'Incorrect username or password.');
  }

  if (!user.is_active) {
    throw createApiError(403, ERROR_CODES.ACCOUNT_DISABLED, 'Account is deactivated.');
  }

  if (user.locked_until && user.locked_until > new Date()) {
    throw createApiError(
      423,
      ERROR_CODES.ACCOUNT_LOCKED,
      'Account is locked due to too many failed login attempts. Please try again after 15 minutes.'
    );
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
    if (user.failed_login_attempts >= 5) {
      user.locked_until = new Date(Date.now() + 15 * 60 * 1000);
    }
    await user.save();
    throw createApiError(401, ERROR_CODES.UNAUTHENTICATED, 'Incorrect username or password.');
  }

  // Reset login failures on success
  user.failed_login_attempts = 0;
  user.locked_until = null;
  user.last_login_at = new Date();
  await user.save();

  const access_token = signAccessToken(user);
  const { token: refresh_token } = await createRefreshToken({ userId: user._id, ip, userAgent });

  return {
    access_token,
    refresh_token,
    expires_in: 900,
    user: {
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      role: user.role,
      must_change_password: user.must_change_password,
    },
  };
}

/**
 * Rotates refresh token session (docs/routes/auth.md).
 * @param {{ rawRefreshToken: string, ip?: string, userAgent?: string }} args
 * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number }>}
 */
export async function refreshSession({ rawRefreshToken, ip, userAgent }) {
  if (!rawRefreshToken) {
    throw createApiError(401, ERROR_CODES.UNAUTHENTICATED, 'Refresh token cookie is missing.');
  }

  const token_hash = hashToken(rawRefreshToken);
  const tokenDoc = await RefreshToken.findOne({ token_hash });

  if (!tokenDoc) {
    throw createApiError(401, ERROR_CODES.UNAUTHENTICATED, 'Invalid refresh token.');
  }

  // Token reuse detection: if a revoked token is presented, revoke all active sessions for this user
  if (tokenDoc.revoked_at) {
    await RefreshToken.updateMany({ user_id: tokenDoc.user_id, revoked_at: null }, { $set: { revoked_at: new Date() } });
    throw createApiError(401, ERROR_CODES.UNAUTHENTICATED, 'Refresh token has been revoked. All sessions invalidated.');
  }

  if (tokenDoc.expires_at < new Date()) {
    throw createApiError(401, ERROR_CODES.TOKEN_EXPIRED, 'Refresh token has expired.');
  }

  const user = await User.findById(tokenDoc.user_id);
  if (!user || !user.is_active) {
    throw createApiError(403, ERROR_CODES.ACCOUNT_DISABLED, 'User account is deactivated.');
  }

  // Revoke current refresh token and issue rotated one
  tokenDoc.revoked_at = new Date();
  await tokenDoc.save();

  const { token: new_refresh_token } = await createRefreshToken({ userId: user._id, ip, userAgent });
  const access_token = signAccessToken(user);

  return {
    access_token,
    refresh_token: new_refresh_token,
    expires_in: 900,
  };
}

/**
 * Revokes current session (docs/routes/auth.md).
 * @param {{ rawRefreshToken: string }} args
 * @returns {Promise<{ message: string }>}
 */
export async function logout({ rawRefreshToken }) {
  if (rawRefreshToken) {
    const token_hash = hashToken(rawRefreshToken);
    await RefreshToken.updateOne({ token_hash, revoked_at: null }, { $set: { revoked_at: new Date() } });
  }
  return { message: 'Signed out.' };
}

/**
 * Revokes all sessions for user (docs/routes/auth.md).
 * @param {{ userId: string }} args
 * @returns {Promise<{ message: string }>}
 */
export async function logoutAll({ userId }) {
  await RefreshToken.updateMany({ user_id: userId, revoked_at: null }, { $set: { revoked_at: new Date() } });
  return { message: 'Signed out everywhere.' };
}

/**
 * Gets currently logged in user profile (docs/routes/auth.md).
 * @param {{ userId: string }} args
 * @returns {Promise<object>}
 */
export async function getMe({ userId }) {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'User not found.');
  }

  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role,
    must_change_password: user.must_change_password,
    last_login_at: user.last_login_at || null,
  };
}

/**
 * Changes password for logged in user (docs/routes/auth.md).
 * @param {{ userId: string, input: { current_password: string, new_password: string } }} args
 * @returns {Promise<{ message: string }>}
 */
export async function changePassword({ userId, input }) {
  const { current_password, new_password } = input;

  const user = await User.findById(userId).select('+password_hash');
  if (!user) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'User not found.');
  }

  const isMatch = await comparePassword(current_password, user.password_hash);
  if (!isMatch) {
    throw createApiError(401, ERROR_CODES.UNAUTHENTICATED, 'Incorrect current password.');
  }

  user.password_hash = await hashPassword(new_password);
  user.must_change_password = false;
  user.password_changed_at = new Date();
  await user.save();

  // Revoke all other refresh token sessions
  await RefreshToken.updateMany({ user_id: userId, revoked_at: null }, { $set: { revoked_at: new Date() } });

  return { message: 'Password changed.' };
}
