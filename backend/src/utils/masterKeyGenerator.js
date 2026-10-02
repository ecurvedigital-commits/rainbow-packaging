import { QUALITIES } from '../constants/qualities.js';

export const QUALITY_CODES = Object.freeze({
  VK: 'VK',
  SPECTRA: 'SPC',
  ULTRA: 'ULT',
  SK: 'SK',
  IMPORTANT: 'IMP',
  SBS: 'SBS',
  FBB: 'FBB',
  DCB: 'DCB',
});

const QUALITY_REVERSE_MAP = Object.freeze({
  VK: 'VK',
  SPC: 'SPECTRA',
  ULT: 'ULTRA',
  SK: 'SK',
  IMP: 'IMPORTANT',
  SBS: 'SBS',
  FBB: 'FBB',
  DCB: 'DCB',
});

/**
 * Normalizes quality string and returns canonical code and full value.
 * @param {string} quality
 * @returns {{ value: string, code: string }}
 */
export function normalizeQuality(quality) {
  if (!quality || typeof quality !== 'string') {
    throw new Error('Quality is required and must be a string.');
  }
  const normalized = quality.trim().toUpperCase();
  
  if (QUALITY_REVERSE_MAP[normalized]) {
    const value = QUALITY_REVERSE_MAP[normalized];
    const code = normalized;
    return { value, code };
  }

  if (!QUALITIES.includes(normalized)) {
    throw new Error(`Invalid quality value: ${quality}. Must be one of ${QUALITIES.join(', ')}.`);
  }
  const code = QUALITY_CODES[normalized] || normalized;
  return { value: normalized, code };
}

/**
 * Normalizes GSM and returns canonical code (e.g. 120 -> G120, 80 -> G080).
 * @param {number|string} gsm
 * @returns {{ value: number, code: string }}
 */
export function normalizeGsm(gsm) {
  const num = parseInt(gsm, 10);
  if (isNaN(num) || num <= 0) {
    throw new Error('GSM must be a positive integer.');
  }
  const code = `G${num < 100 ? String(num).padStart(3, '0') : num}`;
  return { value: num, code };
}

/**
 * Normalizes BF and returns canonical code (e.g. 18 -> BF18).
 * @param {number|string} bf
 * @returns {{ value: number, code: string }}
 */
export function normalizeBf(bf) {
  const num = parseInt(bf, 10);
  if (isNaN(num) || num <= 0) {
    throw new Error('BF must be a positive integer.');
  }
  const code = `BF${num}`;
  return { value: num, code };
}

/**
 * Normalizes Size and returns canonical code (e.g. 32 -> S32, 45.5 -> S45.5).
 * @param {number|string} size
 * @returns {{ value: number, code: string }}
 */
export function normalizeSize(size) {
  const num = parseFloat(size);
  if (isNaN(num) || num <= 0) {
    throw new Error('Size must be a positive number.');
  }
  const rounded = Math.round(num * 10) / 10;
  const formatted = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
  const code = `S${formatted}`;
  return { value: rounded, code };
}

/**
 * Generates deterministic Master Key and normalized parameter object.
 * @param {{ quality: string, gsm: number|string, bf: number|string, size: number|string }} params
 * @returns {{
 *   master_key: string,
 *   name: string,
 *   quality: string,
 *   gsm: number,
 *   bf: number,
 *   size: number,
 *   parameter_codes: { quality: string, gsm: string, bf: string, size: string }
 * }}
 */
export function generateMasterKey({ quality, gsm, bf, size }) {
  const normQuality = normalizeQuality(quality);
  const normGsm = normalizeGsm(gsm);
  const normBf = normalizeBf(bf);
  const normSize = normalizeSize(size);

  const master_key = `${normQuality.code}-${normGsm.code}-${normBf.code}-${normSize.code}`;
  const name = `${normQuality.value} ${normGsm.value}GSM ${normBf.value}BF ${normSize.value}"`;

  return {
    master_key,
    name,
    quality: normQuality.value,
    gsm: normGsm.value,
    bf: normBf.value,
    size: normSize.value,
    parameter_codes: {
      quality: normQuality.code,
      gsm: normGsm.code,
      bf: normBf.code,
      size: normSize.code,
    },
  };
}
