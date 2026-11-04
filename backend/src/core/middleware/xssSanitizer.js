/**
 * Recursive XSS Sanitizer Middleware
 * Strips script tags, executable event handlers, and javascript: protocols from
 * req.body, req.query, and req.params without corrupting valid business data.
 */

// Regular expressions detecting malicious markup and pseudo-protocols
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^>\s]+/gi,
  /javascript\s*:\s*[^\s"']+/gi,
  /data\s*:\s*text\/html[^\s"']*/gi,
];

// Sensitive fields that should not have their literal contents modified (e.g. passwords containing <, >, &)
const EXEMPT_FIELDS = new Set([
  'password',
  'current_password',
  'currentpassword',
  'new_password',
  'newpassword',
  'confirm_password',
  'confirmpassword',
  'token',
  'refreshtoken',
  'refresh_token',
  'authorization',
  'private_key',
  'secret',
]);

/**
 * Sanitizes a single string value
 * @param {string} str
 * @returns {string}
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  let sanitized = str;
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Neutralize stray unclosed script/iframe tags
  sanitized = sanitized.replace(/<(script|iframe|object|embed)\b/gi, '&lt;$1');

  return sanitized;
}

/**
 * Recursively cleans objects, arrays, and primitive strings
 * @param {any} data
 * @param {string} [currentKey]
 * @returns {any}
 */
export function sanitizeData(data, currentKey = '') {
  if (data === null || data === undefined) return data;

  if (currentKey && EXEMPT_FIELDS.has(currentKey.toLowerCase())) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeString(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned = {};
    for (const [key, val] of Object.entries(data)) {
      const cleanKey = sanitizeString(key);
      cleaned[cleanKey] = sanitizeData(val, cleanKey);
    }
    return cleaned;
  }

  return data;
}

/**
 * Express middleware applying sanitization to incoming requests.
 * Uses Object.defineProperty for req.query and req.params to be 100% compatible
 * with Express 5 where req.query is defined as a prototype getter without a setter.
 */
export function xssSanitizer(req, _res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeData(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = sanitizeData(req.query);
      Object.defineProperty(req, 'query', {
        value: sanitizedQuery,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    if (req.params && typeof req.params === 'object') {
      const sanitizedParams = sanitizeData(req.params);
      try {
        req.params = sanitizedParams;
      } catch (_e) {
        Object.defineProperty(req, 'params', {
          value: sanitizedParams,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    }
  } catch (_err) {
    // Fail-open for request processing if unexpected structure occurs
  }

  next();
}

