import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateMasterKey } from '../src/utils/masterKeyGenerator.js';

describe('Master Code & Technical Master Key Resolution Unit Tests', () => {
  it('verifies Master Code structure and properties', () => {
    const mockCode = {
      master_code: '7',
      master_code_name: 'VK 120 GSM Standard',
      quality: 'VK',
      gsm: 120,
      bf: 18,
      size: 100,
      status: 'ACTIVE',
    };

    assert.equal(mockCode.master_code, '7');
    assert.equal(mockCode.quality, 'VK');
    assert.equal(mockCode.gsm, 120);
    assert.equal(mockCode.bf, 18);
    assert.equal(mockCode.size, 100);
    assert.equal(mockCode.status, 'ACTIVE');
  });

  it('Case 1: Derives canonical Technical Master Key VK-G120-BF18-S100 for Master Code 7 specs', () => {
    const spec = {
      quality: 'VK',
      gsm: 120,
      bf: 18,
      size: 100,
    };
    const keyResult = generateMasterKey(spec);

    assert.equal(keyResult.master_key, 'VK-G120-BF18-S100');
    assert.equal(keyResult.parameter_codes.quality, 'VK');
    assert.equal(keyResult.parameter_codes.gsm, 'G120');
    assert.equal(keyResult.parameter_codes.bf, 'BF18');
    assert.equal(keyResult.parameter_codes.size, 'S100');
  });

  it('Case 1 (Re-use): Multiple Reels with identical specifications produce identical Master Key', () => {
    const reelA_spec = { quality: 'VK', gsm: 120, bf: 18, size: 100 };
    const reelB_spec = { quality: 'VK', gsm: 120, bf: 18, size: 100 };

    const keyA = generateMasterKey(reelA_spec).master_key;
    const keyB = generateMasterKey(reelB_spec).master_key;

    assert.equal(keyA, 'VK-G120-BF18-S100');
    assert.equal(keyB, 'VK-G120-BF18-S100');
    assert.equal(keyA, keyB);
  });

  it('Case 2: Different technical specifications produce distinct Technical Master Keys', () => {
    const reelA_spec = { quality: 'VK', gsm: 120, bf: 18, size: 100 };
    const reelB_spec = { quality: 'VK', gsm: 120, bf: 20, size: 100 };

    const keyA = generateMasterKey(reelA_spec).master_key;
    const keyB = generateMasterKey(reelB_spec).master_key;

    assert.equal(keyA, 'VK-G120-BF18-S100');
    assert.equal(keyB, 'VK-G120-BF20-S100');
    assert.notEqual(keyA, keyB);
  });

  it('Case 3 & 4: Changing specification parameters updates derived Master Key automatically', () => {
    let spec = { quality: 'SPECTRA', gsm: 140, bf: 20, size: 110 };
    let key = generateMasterKey(spec).master_key;
    assert.equal(key, 'SPC-G140-BF20-S110');

    // Update BF to 24
    spec.bf = 24;
    key = generateMasterKey(spec).master_key;
    assert.equal(key, 'SPC-G140-BF24-S110');

    // Update Quality to ULTRA and Size to 125
    spec.quality = 'ULTRA';
    spec.size = 125;
    key = generateMasterKey(spec).master_key;
    assert.equal(key, 'ULT-G140-BF24-S125');
  });

  it('Case 5: Handles padded GSM values under 100 correctly (e.g., 80 GSM => G080)', () => {
    const spec = { quality: 'SK', gsm: 80, bf: 16, size: 85.5 };
    const keyResult = generateMasterKey(spec);

    assert.equal(keyResult.master_key, 'SK-G080-BF16-S85.5');
    assert.equal(keyResult.parameter_codes.gsm, 'G080');
    assert.equal(keyResult.parameter_codes.size, 'S85.5');
  });
});
