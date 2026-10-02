import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeQuality,
  normalizeGsm,
  normalizeBf,
  normalizeSize,
  generateMasterKey,
} from '../src/utils/masterKeyGenerator.js';

test('Master Key Unit Tests - Parameter Normalization & Generation', async (t) => {
  await t.test('1. normalizeQuality handles all standard qualities and quality codes', () => {
    assert.deepEqual(normalizeQuality('VK'), { value: 'VK', code: 'VK' });
    assert.deepEqual(normalizeQuality('spectra'), { value: 'SPECTRA', code: 'SPC' });
    assert.deepEqual(normalizeQuality('ULTRA'), { value: 'ULTRA', code: 'ULT' });
    assert.deepEqual(normalizeQuality('sk'), { value: 'SK', code: 'SK' });
    assert.deepEqual(normalizeQuality('IMPORTANT'), { value: 'IMPORTANT', code: 'IMP' });
    assert.deepEqual(normalizeQuality('SBS'), { value: 'SBS', code: 'SBS' });
    assert.deepEqual(normalizeQuality('FBB'), { value: 'FBB', code: 'FBB' });
    assert.deepEqual(normalizeQuality('DCB'), { value: 'DCB', code: 'DCB' });
    assert.deepEqual(normalizeQuality('SPC'), { value: 'SPECTRA', code: 'SPC' });

    assert.throws(() => normalizeQuality('INVALID_QUAL'), /Invalid quality value/);
    assert.throws(() => normalizeQuality(null), /Quality is required/);
  });

  await t.test('2. normalizeGsm pads values under 100 to 3 digits', () => {
    assert.deepEqual(normalizeGsm(80), { value: 80, code: 'G080' });
    assert.deepEqual(normalizeGsm('120'), { value: 120, code: 'G120' });
    assert.deepEqual(normalizeGsm(150), { value: 150, code: 'G150' });
    assert.throws(() => normalizeGsm(0), /GSM must be a positive integer/);
    assert.throws(() => normalizeGsm(-10), /GSM must be a positive integer/);
  });

  await t.test('3. normalizeBf formats positive integers with BF prefix', () => {
    assert.deepEqual(normalizeBf(18), { value: 18, code: 'BF18' });
    assert.deepEqual(normalizeBf('20'), { value: 20, code: 'BF20' });
    assert.throws(() => normalizeBf(0), /BF must be a positive integer/);
  });

  await t.test('4. normalizeSize formats size with S prefix and rounds to 1 decimal place', () => {
    assert.deepEqual(normalizeSize(32), { value: 32, code: 'S32' });
    assert.deepEqual(normalizeSize(45.5), { value: 45.5, code: 'S45.5' });
    assert.deepEqual(normalizeSize('45.500'), { value: 45.5, code: 'S45.5' });
    assert.throws(() => normalizeSize(0), /Size must be a positive number/);
  });

  await t.test('5. generateMasterKey returns deterministic key and metadata', () => {
    const res = generateMasterKey({ quality: 'VK', gsm: 120, bf: 18, size: 32 });
    assert.equal(res.master_key, 'VK-G120-BF18-S32');
    assert.equal(res.name, 'VK 120GSM 18BF 32"');
    assert.deepEqual(res.parameter_codes, {
      quality: 'VK',
      gsm: 'G120',
      bf: 'BF18',
      size: 'S32',
    });

    const res2 = generateMasterKey({ quality: 'SPECTRA', gsm: 80, bf: 20, size: 45.5 });
    assert.equal(res2.master_key, 'SPC-G080-BF20-S45.5');
    assert.equal(res2.name, 'SPECTRA 80GSM 20BF 45.5"');
  });
});
