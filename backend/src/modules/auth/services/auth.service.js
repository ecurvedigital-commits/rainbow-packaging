import { User } from '../../users/models/user.model.js';
import { RefreshToken } from '../models/refreshToken.model.js';
import { UserSession } from '../models/userSession.model.js';
import { signAccessToken, createRefreshToken, hashToken } from './token.service.js';
import { parseUserAgent } from '../../../core/utils/deviceParser.js';
import { comparePassword, hashPassword } from '../../../core/utils/password.js';
import { createApiError } from '../../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../../core/constants/errorCodes.js';

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

  // Parse client device & persist active UserSession
  const device = parseUserAgent(userAgent);
  const session = await UserSession.create({
    user_id: user._id,
    device_name: device.device_name,
    device_type: device.device_type,
    os: device.os,
    browser: device.browser,
    ip: ip || null,
    user_agent: userAgent || null,
    is_active: true,
    login_at: new Date(),
    last_active_at: new Date(),
  });

  const access_token = signAccessToken(user, session._id);
  const { token: refresh_token } = await createRefreshToken({
    userId: user._id,
    sessionId: session._id,
    ip,
    userAgent,
  });

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
    session: {
      id: session._id.toString(),
      device_name: session.device_name,
      device_type: session.device_type,
      os: session.os,
      browser: session.browser,
      ip: session.ip,
      login_at: session.login_at,
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

  // Verify linked session status
  let sessionId = tokenDoc.session_id;
  if (sessionId) {
    const session = await UserSession.findById(sessionId);
    if (session && (!session.is_active || session.revoked_at)) {
      throw createApiError(401, ERROR_CODES.UNAUTHENTICATED, 'Device session has been revoked.');
    }
    if (session) {
      session.last_active_at = new Date();
      if (ip) session.ip = ip;
      await session.save();
    }
  }

  // Revoke current refresh token and issue rotated one
  tokenDoc.revoked_at = new Date();
  await tokenDoc.save();

  const { token: new_refresh_token } = await createRefreshToken({
    userId: user._id,
    sessionId,
    ip,
    userAgent,
  });
  const access_token = signAccessToken(user, sessionId);

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
    const tokenDoc = await RefreshToken.findOne({ token_hash });
    if (tokenDoc) {
      tokenDoc.revoked_at = new Date();
      await tokenDoc.save();

      if (tokenDoc.session_id) {
        await UserSession.findByIdAndUpdate(tokenDoc.session_id, {
          is_active: false,
          revoked_at: new Date(),
          revocation_reason: 'LOGOUT',
        });
      }
    }
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
  await UserSession.updateMany(
    { user_id: userId, is_active: true },
    { $set: { is_active: false, revoked_at: new Date(), revocation_reason: 'LOGOUT_ALL' } }
  );
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
  user.plain_password = new_password;
  user.must_change_password = false;
  user.password_changed_at = new Date();
  await user.save();

  // Revoke all other refresh token sessions
  await RefreshToken.updateMany({ user_id: userId, revoked_at: null }, { $set: { revoked_at: new Date() } });
  await UserSession.updateMany(
    { user_id: userId, is_active: true },
    { $set: { is_active: false, revoked_at: new Date(), revocation_reason: 'SECURITY_PASSWORD_CHANGED' } }
  );

  return { message: 'Password changed.' };
}

/**
 * Lists active and recent device sessions for a user.
 * @param {{ userId: string, currentSessionId?: string }} args
 * @returns {Promise<Array<object>>}
 */
export async function listUserSessions({ userId, currentSessionId }) {
  const sessions = await UserSession.find({ user_id: userId })
    .sort({ last_active_at: -1 })
    .limit(30)
    .lean();

  return sessions.map((s) => ({
    id: s._id.toString(),
    device_name: s.device_name,
    device_type: s.device_type,
    os: s.os,
    browser: s.browser,
    ip: s.ip,
    is_active: s.is_active,
    is_current: currentSessionId ? s._id.toString() === currentSessionId.toString() : false,
    login_at: s.login_at,
    last_active_at: s.last_active_at,
    revoked_at: s.revoked_at,
    revocation_reason: s.revocation_reason,
  }));
}

/**
 * Revokes a specific device session (terminates user login on that device).
 * @param {{ sessionId: string, actorUserId: string, isAdmin?: boolean, targetUserId?: string }} args
 * @returns {Promise<{ message: string, session_id: string }>}
 */
export async function revokeUserSession({ sessionId, actorUserId, isAdmin = false, targetUserId }) {
  const query = { _id: sessionId };
  if (!isAdmin && targetUserId) {
    query.user_id = targetUserId;
  }

  const session = await UserSession.findOne(query);
  if (!session) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'Session not found.');
  }

  session.is_active = false;
  session.revoked_at = new Date();
  session.revoked_by = actorUserId;
  session.revocation_reason = isAdmin ? 'ADMIN_REVOKED' : 'USER_REVOKED';
  await session.save();

  // Invalidate any refresh tokens tied to this session
  await RefreshToken.updateMany(
    { session_id: session._id, revoked_at: null },
    { $set: { revoked_at: new Date() } }
  );

  return { message: 'Device session revoked successfully.', session_id: sessionId };
}

/**
 * Admin: List all currently active device sessions across the entire system.
 * @param {{ query?: { search?: string, device_type?: string, limit?: number } }} args
 * @returns {Promise<{ items: Array<object>, total_active: number }>}
 */
export async function listAllActiveSessions({ query = {} }) {
  const filter = { is_active: true };

  if (query.device_type && query.device_type !== 'all') {
    filter.device_type = query.device_type;
  }

  const limit = Math.min(Number(query.limit) || 100, 200);

  const [sessions, total_active] = await Promise.all([
    UserSession.find(filter)
      .populate('user_id', 'name username role email is_active')
      .sort({ last_active_at: -1 })
      .limit(limit)
      .lean(),
    UserSession.countDocuments(filter),
  ]);

  const items = sessions
    .filter((s) => s.user_id)
    .map((s) => ({
      id: s._id.toString(),
      user: {
        id: s.user_id._id.toString(),
        name: s.user_id.name,
        username: s.user_id.username,
        role: s.user_id.role,
        email: s.user_id.email || null,
        is_active: s.user_id.is_active,
      },
      device_name: s.device_name,
      device_type: s.device_type,
      os: s.os,
      browser: s.browser,
      ip: s.ip,
      is_active: s.is_active,
      login_at: s.login_at,
      last_active_at: s.last_active_at,
    }));

  return {
    items,
    total_active,
  };
}
