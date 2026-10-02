import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderDailyDigest } from '../src/templates/dailyDigest.template.js';
import { previewDigest, sendDigest, listDigestLogs } from '../src/services/digest.service.js';

describe('Digest Service & Template Unit Tests', () => {
  test('service functions are defined and exported', () => {
    assert.strictEqual(typeof previewDigest, 'function');
    assert.strictEqual(typeof sendDigest, 'function');
    assert.strictEqual(typeof listDigestLogs, 'function');
  });

  test('renderDailyDigest generates valid subject, text, and html', () => {
    const template = renderDailyDigest({
      date: '2026-09-28',
      counts: { created: 5, usage: 10, confirmed: 8, declined: 1, admin_corrected: 0, still_pending: 2 },
      oldest_pending_hours: 4,
      deep_link: 'http://localhost:5173/admin/audit?date=2026-09-28',
    });

    assert.ok(template.subject.includes('2026-09-28'));
    assert.ok(template.text.includes('Reels Created: 5'));
    assert.ok(template.html.includes('Rainbow Packages Activity Digest'));
    assert.ok(template.html.includes('http://localhost:5173/admin/audit?date=2026-09-28'));
  });
});
