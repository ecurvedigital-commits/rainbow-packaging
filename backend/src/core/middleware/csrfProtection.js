import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cross-Site Request Forgery (CSRF) Protection Middleware
 * 
 * Protects state-changing operations by verifying:
 * 1. Safe HTTP methods bypass check
 * 2. Requests authenticated via Bearer Authorization header bypass (cross-site HTML forms cannot attach custom headers)
 * 3. Origin/Referer matches authorized CORS origins
 * 4. Or custom header X-Requested-With is present
 */
export function csrfProtection(req, res, next) {
  // 1. Safe read-only HTTP methods
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // 2. Direct API bearer token requests (protected by CORS preflight and Authorization header)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // 3. Custom AJAX header check (Standard HTML forms cannot attach X-Requested-With without CORS preflight)
  const xRequestedWith = req.headers['x-requested-with'];
  if (xRequestedWith === 'XMLHttpRequest') {
    return next();
  }

  // 4. Verify Origin / Referer header against authorized domains
  const origin = req.headers['origin'] || req.headers['referer'];
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.origin.toLowerCase();

      // Check allowed CORS origins (split comma-separated strings if needed)
      const allowedOrigins = (typeof env.CORS_ORIGINS === 'string'
        ? env.CORS_ORIGINS.split(',')
        : Array.isArray(env.CORS_ORIGINS) ? env.CORS_ORIGINS : [env.CORS_ORIGINS]
      ).map((o) => o.trim()).filter(Boolean);

      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === '*') return true;
        return allowed.toLowerCase() === originHost;
      });

      if (isAllowed) {
        return next();
      }

      // Allow same-origin requests (e.g. SPA served from Express or Swagger docs on same port)
      const requestHost = req.get('host');
      if (requestHost && originUrl.host.toLowerCase() === requestHost.toLowerCase()) {
        return next();
      }

      // Allow localhost in development
      if (env.NODE_ENV === 'development') {
        const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(originHost);
        if (isLocal) {
          return next();
        }
      }
    } catch (_err) {
      // Malformed origin/referer URL
    }
  }

  // 5. Exclude public auth endpoints (e.g. login)
  if (req.path.endsWith('/auth/login') || req.path.endsWith('/auth/refresh')) {
    return next();
  }

  return sendError(
    res,
    403,
    ERROR_CODES.FORBIDDEN,
    'CSRF verification failed. Request origin unauthorized or missing required security headers.'
  );
}

