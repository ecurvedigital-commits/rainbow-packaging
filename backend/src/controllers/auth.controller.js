import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

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
  const rawRefreshToken = req.cookies?.rp_refresh;
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
  const rawRefreshToken = req.cookies?.rp_refresh;
  const result = await authService.logout({ rawRefreshToken });
  res.clearCookie('rp_refresh');
  return sendSuccess(res, result);
}

export async function logoutAll(req, res) {
  const result = await authService.logoutAll({ userId: req.user.id });
  res.clearCookie('rp_refresh');
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
