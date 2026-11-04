import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../../../core/utils/apiResponse.js';
import { env } from '../../../core/config/env.js';

export async function login(req, res) {
  const { body } = req.validated;
  const result = await authService.login({
    input: body,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  if (result.refresh_token) {
    res.cookie('rp_refresh', result.refresh_token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAMESITE,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    delete result.refresh_token;
  }

  return sendSuccess(res, result);
}

export async function refreshSession(req, res) {
  const rawRefreshToken = req.cookies?.rp_refresh || req.body?.refresh_token;
  const result = await authService.refreshSession({
    rawRefreshToken,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  if (result.refresh_token) {
    res.cookie('rp_refresh', result.refresh_token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAMESITE,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    delete result.refresh_token;
  }

  return sendSuccess(res, result);
}

export async function logout(req, res) {
  const rawRefreshToken = req.cookies?.rp_refresh || req.body?.refresh_token;
  const result = await authService.logout({ rawRefreshToken });
  res.clearCookie('rp_refresh', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
  });
  return sendSuccess(res, result);
}

export async function logoutAll(req, res) {
  const result = await authService.logoutAll({ userId: req.user.id });
  res.clearCookie('rp_refresh', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
  });
  return sendSuccess(res, result);
}

export async function getMe(req, res) {
  const result = await authService.getMe({ userId: req.user.id });
  return sendSuccess(res, result);
}

export async function changePassword(req, res) {
  const { body } = req.validated;
  const result = await authService.changePassword({ userId: req.user.id, input: body });
  return sendSuccess(res, result);
}

export async function getMySessions(req, res) {
  const result = await authService.listUserSessions({
    userId: req.user.id,
    currentSessionId: req.sessionId,
  });
  return sendSuccess(res, result);
}

export async function revokeMySession(req, res) {
  const { sessionId } = req.params;
  const result = await authService.revokeUserSession({
    sessionId,
    actorUserId: req.user.id,
    targetUserId: req.user.id,
  });
  return sendSuccess(res, result);
}

export async function adminListActiveSessions(req, res) {
  const result = await authService.listAllActiveSessions({ query: req.query });
  return sendSuccess(res, result);
}

export async function adminListUserSessions(req, res) {
  const { id } = req.params;
  const result = await authService.listUserSessions({ userId: id });
  return sendSuccess(res, result);
}

export async function adminRevokeUserSession(req, res) {
  const { sessionId } = req.params;
  const result = await authService.revokeUserSession({
    sessionId,
    actorUserId: req.user.id,
    isAdmin: true,
  });
  return sendSuccess(res, result);
}
