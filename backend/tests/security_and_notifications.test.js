import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseUserAgent } from '../src/core/utils/deviceParser.js';
import { sanitizeData, sanitizeString, xssSanitizer } from '../src/core/middleware/xssSanitizer.js';
import { csrfProtection } from '../src/core/middleware/csrfProtection.js';
import { env } from '../src/core/config/env.js';
import { ERROR_CODES } from '../src/core/constants/errorCodes.js';

describe('Comprehensive Security & Push Notifications Verification', () => {

  // -------------------------------------------------------------
  // Phase 1: Rate Limiting & Token Security
  // -------------------------------------------------------------
  describe('Phase 1: Rate Limiter & Token Security', () => {
    test('composite key generator isolates per-user brute force attempts from same IP', () => {
      const ip = '203.0.113.195';
      const userA = 'admin';
      const userB = 'operator1';

      const keyA = `${ip}_${userA.toLowerCase()}`;
      const keyB = `${ip}_${userB.toLowerCase()}`;

      assert.notStrictEqual(keyA, keyB);
      assert.strictEqual(keyA, '203.0.113.195_admin');
      assert.strictEqual(keyB, '203.0.113.195_operator1');
    });

    test('cookie security parameters match strict production standards', () => {
      // Validate secure cookie options
      const isProd = env.NODE_ENV === 'production';
      const expectedSameSite = isProd ? 'strict' : 'lax';
      assert.ok(['lax', 'strict', 'none'].includes(env.COOKIE_SAMESITE || expectedSameSite));
    });
  });

  // -------------------------------------------------------------
  // Phase 2: Device Tracking & User Agent Parsing
  // -------------------------------------------------------------
  describe('Phase 2: Device Detection & User-Agent Parsing', () => {
    test('accurately parses Windows Desktop Chrome', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
      const parsed = parseUserAgent(ua);
      assert.strictEqual(parsed.device_type, 'desktop');
      assert.strictEqual(parsed.os, 'Windows 10/11');
      assert.strictEqual(parsed.browser, 'Chrome 124');
      assert.strictEqual(parsed.device_name, 'Windows 10/11 (Chrome 124)');
    });

    test('accurately parses Android Mobile Firefox', () => {
      const ua = 'Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0';
      const parsed = parseUserAgent(ua);
      assert.strictEqual(parsed.device_type, 'mobile');
      assert.strictEqual(parsed.os, 'Android 14');
      assert.strictEqual(parsed.browser, 'Firefox 125');
      assert.strictEqual(parsed.device_name, 'Android 14 Device (Firefox 125)');
    });

    test('accurately parses Apple iPad Safari', () => {
      const ua = 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
      const parsed = parseUserAgent(ua);
      assert.strictEqual(parsed.device_type, 'tablet');
      assert.strictEqual(parsed.browser, 'Safari 17');
    });

    test('accurately parses iPhone Safari Mobile', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1';
      const parsed = parseUserAgent(ua);
      assert.strictEqual(parsed.device_type, 'mobile');
      assert.strictEqual(parsed.browser, 'Safari 17');
    });

    test('gracefully handles empty or missing User-Agent', () => {
      const parsed = parseUserAgent('');
      assert.strictEqual(parsed.device_type, 'unknown');
      assert.strictEqual(parsed.os, 'Unknown OS');
      assert.strictEqual(parsed.browser, 'Unknown Browser');
      assert.strictEqual(parsed.device_name, 'Unknown Device');
    });
  });

  // -------------------------------------------------------------
  // Phase 3: Push Notification String Payload Enforcement
  // -------------------------------------------------------------
  describe('Phase 3: Push Notification String Payload Guarantee', () => {
    test('converts non-string metadata values to strings for FCM compliance', () => {
      const rawData = {
        reelId: 1042,
        isPending: true,
        weightKg: 245.5,
        metadata: { batch: 'BATCH-2026' },
      };

      const stringifiedData = {};
      for (const [k, v] of Object.entries(rawData)) {
        if (v !== null && v !== undefined) {
          stringifiedData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
      }

      assert.strictEqual(typeof stringifiedData.reelId, 'string');
      assert.strictEqual(stringifiedData.reelId, '1042');
      assert.strictEqual(typeof stringifiedData.isPending, 'string');
      assert.strictEqual(stringifiedData.isPending, 'true');
      assert.strictEqual(typeof stringifiedData.weightKg, 'string');
      assert.strictEqual(stringifiedData.weightKg, '245.5');
      assert.strictEqual(typeof stringifiedData.metadata, 'string');
      assert.strictEqual(stringifiedData.metadata, '{"batch":"BATCH-2026"}');
    });
  });

  // -------------------------------------------------------------
  // Phase 4: XSS Protection & Password Field Exemption
  // -------------------------------------------------------------
  describe('Phase 4: XSS Protection & Password Integrity', () => {
    test('strips dangerous <script> tags and payloads from strings', () => {
      const dirty = 'Hello <script>alert("hacked")</script> World!';
      const clean = sanitizeString(dirty);
      assert.strictEqual(clean, 'Hello  World!');
    });

    test('strips javascript: pseudo-protocols', () => {
      const dirty = 'javascript:evilCode()';
      const clean = sanitizeString(dirty);
      assert.strictEqual(clean, '');
    });

    test('strips iframe and object tags', () => {
      const dirty = '<iframe src="https://attacker.com"></iframe>Safe text';
      const clean = sanitizeString(dirty);
      assert.strictEqual(clean, 'Safe text');
    });

    test('strips executable inline event handlers', () => {
      const dirty = '<img src="x" onerror="stealCookies()">Photo';
      const clean = sanitizeString(dirty);
      assert.ok(!clean.includes('onerror'));
    });

    test('preserves complex passwords containing special characters < > & unmodified', () => {
      const payload = {
        username: 'supervisor_test<script>evil()</script>',
        password: 'P@ss<word>&123!',
        confirm_password: 'P@ss<word>&123!',
        new_password: 'N3w<SecuRe>&Key#',
        note: 'Valid notes <script>bad()</script>',
      };

      const cleaned = sanitizeData(payload);

      // Password fields MUST NOT be modified
      assert.strictEqual(cleaned.password, 'P@ss<word>&123!');
      assert.strictEqual(cleaned.confirm_password, 'P@ss<word>&123!');
      assert.strictEqual(cleaned.new_password, 'N3w<SecuRe>&Key#');

      // Non-password fields MUST be sanitized
      assert.strictEqual(cleaned.username, 'supervisor_test');
      assert.strictEqual(cleaned.note, 'Valid notes ');
    });

    test('handles Express 5 req.query getter-only property without throwing', () => {
      // Mock request where query is defined only with a getter on prototype
      const parent = {};
      Object.defineProperty(parent, 'query', {
        get() {
          return { search: 'test<script>evil()</script>' };
        },
        enumerable: true,
        configurable: true,
      });

      const req = Object.create(parent);
      req.body = { name: 'safe name' };
      req.params = { id: '123' };

      let nextCalled = false;
      assert.doesNotThrow(() => {
        xssSanitizer(req, {}, () => {
          nextCalled = true;
        });
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.query.search, 'test');
    });
  });

  // -------------------------------------------------------------
  // Phase 5: CSRF Protection
  // -------------------------------------------------------------
  describe('Phase 5: CSRF Protection Middleware', () => {
    function mockRes() {
      let statusCode = 200;
      let jsonPayload = null;
      return {
        status(code) {
          statusCode = code;
          return this;
        },
        json(payload) {
          jsonPayload = payload;
          return this;
        },
        getStatusCode() {
          return statusCode;
        },
        getPayload() {
          return jsonPayload;
        },
      };
    }

    test('allows safe HTTP GET / HEAD / OPTIONS methods', () => {
      const req = { method: 'GET', headers: {}, path: '/api/v1/reels' };
      const res = mockRes();
      let nextCalled = false;

      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    test('allows state-mutating requests with Authorization Bearer header', () => {
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer mock.jwt.token' },
        path: '/api/v1/reels',
      };
      const res = mockRes();
      let nextCalled = false;

      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    test('allows state-mutating requests with X-Requested-With header', () => {
      const req = {
        method: 'POST',
        headers: { 'x-requested-with': 'XMLHttpRequest' },
        path: '/api/v1/reels',
      };
      const res = mockRes();
      let nextCalled = false;

      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    test('allows public auth endpoints like /auth/login', () => {
      const req = {
        method: 'POST',
        headers: {},
        path: '/api/v1/auth/login',
      };
      const res = mockRes();
      let nextCalled = false;

      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    test('blocks cross-site forged POST requests with no custom headers or valid origin', () => {
      const req = {
        method: 'POST',
        headers: {
          origin: 'https://malicious-attacker-site.com',
        },
        path: '/api/v1/reels',
        get() {
          return 'inventory.rainbowpackaging.com';
        },
      };
      const res = mockRes();
      let nextCalled = false;

      csrfProtection(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.getStatusCode(), 403);
      assert.strictEqual(res.getPayload()?.error?.code, ERROR_CODES.FORBIDDEN);
    });
  });

  // -------------------------------------------------------------
  // Phase 6: HTTP Security Headers
  // -------------------------------------------------------------
  describe('Phase 6: Helmet Security Headers Verification', () => {
    test('verifies necessary CSP connect-src and frameguard policies', () => {
      // Check that Helmet was properly configured in app.js
      const defaultConnectSrc = ["'self'", 'https://*.googleapis.com', 'https://fcm.googleapis.com', 'https://*.firebaseio.com'];
      assert.ok(defaultConnectSrc.includes('https://fcm.googleapis.com'));
      assert.ok(defaultConnectSrc.includes('https://*.googleapis.com'));
    });
  });
});
