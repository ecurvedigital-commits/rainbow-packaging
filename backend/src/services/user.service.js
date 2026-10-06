import { User } from '../models/user.model.js';
import { RefreshToken } from '../models/refreshToken.model.js';
import { ROLES } from '../constants/roles.js';
import { hashPassword, generateTempPassword } from '../utils/password.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { createApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Ensures at least one active Admin user exists in the system.
 */
export async function ensureAdmin() {
  try {
    const existingAdmin = await User.findOne({ role: ROLES.ADMIN, is_active: true });
    if (!existingAdmin) {
      const name = env.SEED_ADMIN_NAME || 'Super Admin';
      const username = (env.SEED_ADMIN_USERNAME || 'admin').toLowerCase().trim();
      const email = (env.SEED_ADMIN_EMAIL || 'admin@rainbowpackages.com').toLowerCase().trim();
      const password = env.SEED_ADMIN_PASSWORD || 'Admin@12345';
      const password_hash = await hashPassword(password);

      await User.create({
        name,
        username,
        email,
        password_hash,
        plain_password: password,
        role: ROLES.ADMIN,
        is_active: true,
        must_change_password: false,
      });
      logger.info({ username }, 'Auto-seeded initial Admin user');
    }
  } catch (err) {
    logger.error({ error: err.message }, 'Failed to ensure admin user');
  }
}


/**
 * Admin creates a SUPERVISOR or OPERATOR account (docs/routes/users.md).
 * @param {{ input: { name: string, username: string, role: string, email?: string, phone?: string, password?: string }, actor: object }} args
 * @returns {Promise<{ user: object, temporary_password?: string }>}
 */
export async function createUser({ input, actor }) {
  const { name, username, role, email, phone, password } = input;
  const normalizedUsername = username.toLowerCase().trim();
  const normalizedEmail = email ? email.toLowerCase().trim() : null;

  if (role === ROLES.ADMIN) {
    throw createApiError(422, ERROR_CODES.VALIDATION_ERROR, 'Cannot create an ADMIN account via this endpoint.');
  }

  const existingUsername = await User.findOne({ username: normalizedUsername });
  if (existingUsername) {
    throw createApiError(409, ERROR_CODES.DUPLICATE_USERNAME, 'A user with this username already exists.');
  }

  if (normalizedEmail) {
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      throw createApiError(409, ERROR_CODES.DUPLICATE_EMAIL, 'A user with this email already exists.');
    }
  }

  let plainPassword = password;
  let temporary_password;

  if (!plainPassword) {
    temporary_password = generateTempPassword();
    plainPassword = temporary_password;
  }

  const password_hash = await hashPassword(plainPassword);

  const user = await User.create({
    name: name.trim(),
    username: normalizedUsername,
    email: normalizedEmail,
    phone: phone ? phone.trim() : null,
    password_hash,
    plain_password: plainPassword,
    role,
    is_active: true,
    must_change_password: true,
    created_by: actor.id,
  });

  const response = {
    user: user.toJSON(),
  };

  if (temporary_password) {
    response.temporary_password = temporary_password;
  }

  return response;
}

/**
 * List users with pagination, sorting, and filters (docs/routes/users.md).
 * @param {{ filters: { role?: string, is_active?: boolean, q?: string, page?: number, limit?: number, sort?: string }, actor: object }} args
 * @returns {Promise<{ items: Array<object>, meta: object }>}
 */
export async function listUsers({ filters = {}, actor }) {
  const { page, limit, skip } = parsePagination(filters);
  const query = {};

  if (filters.role) {
    const roles = filters.role.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean);
    if (roles.length === 1) {
      query.role = roles[0];
    } else if (roles.length > 1) {
      query.role = { $in: roles };
    }
  }

  if (typeof filters.is_active === 'boolean') {
    query.is_active = filters.is_active;
  }

  if (filters.q) {
    const searchRegex = new RegExp(filters.q.trim(), 'i');
    query.$or = [{ name: searchRegex }, { username: searchRegex }];
  }

  const sortOption = {};
  if (filters.sort) {
    const isDesc = filters.sort.startsWith('-');
    const field = isDesc ? filters.sort.substring(1) : filters.sort;
    sortOption[field] = isDesc ? -1 : 1;
    if (field !== '_id') {
      sortOption._id = -1;
    }
  } else {
    sortOption.created_at = -1;
    sortOption._id = -1;
  }

  const [users, total] = await Promise.all([
    User.find(query).sort(sortOption).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  return {
    items: users.map((u) => u.toJSON()),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

/**
 * Get user by id (docs/routes/users.md).
 * @param {{ id: string, actor: object }} args
 * @returns {Promise<object>}
 */
export async function getUser({ id, actor }) {
  const user = await User.findById(id);
  if (!user) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'User not found.');
  }
  return user.toJSON();
}

/**
 * Update user details (docs/routes/users.md).
 * @param {{ id: string, input: { name?: string, email?: string, phone?: string, role?: string }, actor: object }} args
 * @returns {Promise<object>}
 */
export async function updateUser({ id, input, actor }) {
  const user = await User.findById(id);
  if (!user) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'User not found.');
  }

  if (user.role === ROLES.ADMIN && actor.role !== ROLES.ADMIN) {
    throw createApiError(403, ERROR_CODES.FORBIDDEN, 'Cannot modify an ADMIN account.');
  }

  if (input.email) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: id } });
    if (existing) {
      throw createApiError(409, ERROR_CODES.DUPLICATE_EMAIL, 'A user with this email already exists.');
    }
    user.email = normalizedEmail;
  } else if (input.email === null) {
    user.email = null;
  }

  if (input.username) {
    const normalizedUsername = input.username.toLowerCase().trim();
    const existing = await User.findOne({ username: normalizedUsername, _id: { $ne: id } });
    if (existing) {
      throw createApiError(409, ERROR_CODES.DUPLICATE_USERNAME, 'A user with this username already exists.');
    }
    user.username = normalizedUsername;
  }

  if (input.name) user.name = input.name.trim();
  if (input.phone !== undefined) user.phone = input.phone ? input.phone.trim() : null;

  if (input.password && input.password.trim()) {
    user.password_hash = await hashPassword(input.password.trim());
    user.plain_password = input.password.trim();
    user.must_change_password = false;
    user.failed_login_attempts = 0;
    user.locked_until = null;
  }

  if (typeof input.is_active === 'boolean') {
    user.is_active = input.is_active;
  }

  if (input.role && input.role !== user.role) {
    user.role = input.role;
    // Revoke existing sessions so new role applies at next login
    await RefreshToken.updateMany({ user_id: id, revoked_at: null }, { $set: { revoked_at: new Date() } });
  }

  await user.save();
  return user.toJSON();
}

/**
 * Delete user account permanently (docs/routes/users.md).
 * @param {{ id: string, actor: object }} args
 * @returns {Promise<object>}
 */
export async function deleteUser({ id, actor }) {
  const user = await User.findById(id);
  if (!user) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'User not found.');
  }

  if (user._id.toString() === actor.id.toString()) {
    throw createApiError(400, ERROR_CODES.VALIDATION_ERROR, 'Cannot delete your own account.');
  }

  await User.deleteOne({ _id: id });
  await RefreshToken.deleteMany({ user_id: id });
  return { message: 'User deleted successfully.' };
}


/**
 * Activate or deactivate user (docs/routes/users.md).
 * @param {{ id: string, input: { is_active: boolean }, actor: object }} args
 * @returns {Promise<object>}
 */
export async function setUserStatus({ id, input, actor }) {
  const user = await User.findById(id);
  if (!user) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'User not found.');
  }

  if (user.role === ROLES.ADMIN) {
    throw createApiError(403, ERROR_CODES.FORBIDDEN, 'Cannot modify status of an ADMIN account.');
  }

  user.is_active = input.is_active;

  if (!input.is_active) {
    // Revoke all active sessions
    await RefreshToken.updateMany({ user_id: id, revoked_at: null }, { $set: { revoked_at: new Date() } });
  }

  await user.save();
  return user.toJSON();
}

/**
 * Reset user password (docs/routes/users.md).
 * @param {{ id: string, input: { password?: string }, actor: object }} args
 * @returns {Promise<{ user: object, temporary_password?: string }>}
 */
export async function resetUserPassword({ id, input = {}, actor }) {
  const user = await User.findById(id);
  if (!user) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'User not found.');
  }

  let plainPassword = input.password;
  let temporary_password;

  if (!plainPassword) {
    temporary_password = generateTempPassword();
    plainPassword = temporary_password;
  }

  user.password_hash = await hashPassword(plainPassword);
  user.plain_password = plainPassword;
  user.must_change_password = true;
  user.failed_login_attempts = 0;
  user.locked_until = null;
  await user.save();

  // Revoke all existing sessions
  await RefreshToken.updateMany({ user_id: id, revoked_at: null }, { $set: { revoked_at: new Date() } });

  const response = {
    user: user.toJSON(),
  };

  if (temporary_password) {
    response.temporary_password = temporary_password;
  }

  return response;
}

/**
 * Unlock locked user account (docs/routes/users.md).
 * @param {{ id: string, actor: object }} args
 * @returns {Promise<object>}
 */
export async function unlockUser({ id, actor }) {
  const user = await User.findById(id);
  if (!user) {
    throw createApiError(404, ERROR_CODES.NOT_FOUND, 'User not found.');
  }

  user.locked_until = null;
  user.failed_login_attempts = 0;
  await user.save();

  return user.toJSON();
}
