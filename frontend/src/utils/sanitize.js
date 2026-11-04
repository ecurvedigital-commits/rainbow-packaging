/**
 * Frontend Sanitization & XSS Defense Utilities
 */

/**
 * Escapes characters with special meaning in HTML to prevent XSS injection.
 * @param {any} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates and sanitizes a URL against malicious protocols like javascript: or data:
 * @param {string} url
 * @param {string} [fallback='#']
 * @returns {string}
 */
export function sanitizeUrl(url, fallback = '#') {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();

  // Block javascript: and data: pseudo-protocols
  if (/^(?:javascript|data|vbscript):/i.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

/**
 * Strips dangerous HTML tags from a text string
 * @param {string} text
 * @returns {string}
 */
export function stripHtml(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/<[^>]*>?/gm, '');
}

