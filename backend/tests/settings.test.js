import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ensureSettings, getSettings, updateSettings } from '../src/services/setting.service.js';

describe('Settings Service Unit Tests', () => {
  test('ensureSettings, getSettings and updateSettings function exports exist and are callable', () => {
    assert.strictEqual(typeof ensureSettings, 'function');
    assert.strictEqual(typeof getSettings, 'function');
    assert.strictEqual(typeof updateSettings, 'function');
  });
});
