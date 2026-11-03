/**
 * Centralized Sheet / Board Stock Calculation Utilities
 *
 * All weight and dimension formulas for sheet stock are defined here.
 * Formulas match company specifications:
 * - Area (m²) = (Deckle × Cutting) / 10,000
 * - Weight per sheet (kg) = (Deckle × Cutting × GSM) / 10,000,000
 * - Total Weight (kg) = (Deckle × Cutting × GSM × Quantity) / 10,000,000
 * - Remaining Weight (kg) = (Deckle × Cutting × GSM × Current Quantity) / 10,000,000
 * - Consumed Weight (kg) = (Deckle × Cutting × GSM × Consumed Quantity) / 10,000,000
 */

import { SHEET_STATUS } from '../constants/sheetStatus.js';

export const roundTwoDecimals = (val) => {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.round(val * 100) / 100;
};

/**
 * Calculates surface area of a single sheet in square meters (m²).
 * @param {number} deckle Deckle width in cm
 * @param {number} cutting Cutting length in cm
 * @returns {number} Area in m² rounded to 4 decimals
 */
export function calculateSheetArea(deckle, cutting) {
  const d = Number(deckle);
  const c = Number(cutting);
  if (!d || d <= 0 || !c || c <= 0) return 0;
  const area = (d * c) / 10000;
  return Math.round(area * 10000) / 10000;
}

/**
 * Calculates weight of an individual sheet in kilograms (kg).
 * @param {number} deckle Deckle in cm
 * @param {number} cutting Cutting in cm
 * @param {number} gsm GSM (g/m²)
 * @returns {number} Weight in kg rounded to 6 decimals
 */
export function calculateSingleSheetWeight(deckle, cutting, gsm) {
  const d = Number(deckle);
  const c = Number(cutting);
  const g = Number(gsm);
  if (!d || d <= 0 || !c || c <= 0 || !g || g <= 0) return 0;
  return (d * c * g) / 10000000;
}

/**
 * Calculates total weight of a given sheet quantity in kilograms (kg).
 * @param {number} deckle Deckle in cm
 * @param {number} cutting Cutting in cm
 * @param {number} gsm GSM (g/m²)
 * @param {number} quantity Sheet quantity (pieces)
 * @returns {number} Total weight in kg rounded to 2 decimals
 */
export function calculateTotalWeight(deckle, cutting, gsm, quantity) {
  const d = Number(deckle);
  const c = Number(cutting);
  const g = Number(gsm);
  const q = Number(quantity);
  if (!d || d <= 0 || !c || c <= 0 || !g || g <= 0 || !q || q <= 0) return 0;
  const rawWeight = (d * c * g * q) / 10000000;
  return roundTwoDecimals(rawWeight);
}

/**
 * Calculates remaining weight in kg based on remaining quantity.
 * Recalculates directly from specifications and current quantity to avoid subtraction drift.
 * @param {number} deckle
 * @param {number} cutting
 * @param {number} gsm
 * @param {number} currentQuantity
 * @returns {number} Remaining weight in kg (rounded to 2 decimals)
 */
export function calculateRemainingWeight(deckle, cutting, gsm, currentQuantity) {
  return calculateTotalWeight(deckle, cutting, gsm, currentQuantity);
}

/**
 * Calculates consumed weight in kg based on consumed quantity.
 * @param {number} deckle
 * @param {number} cutting
 * @param {number} gsm
 * @param {number} consumedQuantity
 * @returns {number} Consumed weight in kg (rounded to 2 decimals)
 */
export function calculateConsumedWeight(deckle, cutting, gsm, consumedQuantity) {
  return calculateTotalWeight(deckle, cutting, gsm, consumedQuantity);
}

/**
 * Derives sheet stock status from current and initial quantity.
 * @param {number} currentQuantity
 * @param {number} initialQuantity
 * @returns {string} AVAILABLE | PARTIALLY_CONSUMED | DEPLETED
 */
export function deriveSheetStatus(currentQuantity, initialQuantity) {
  const cur = Number(currentQuantity) || 0;
  const init = Number(initialQuantity) || 0;
  if (cur <= 0) return SHEET_STATUS.DEPLETED;
  if (cur < init) return SHEET_STATUS.PARTIALLY_CONSUMED;
  return SHEET_STATUS.AVAILABLE;
}

/**
 * Validates specifications and quantities for a Sheet lot.
 * @param {{ deckle: number, cutting: number, gsm: number, quantity?: number }} params
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSheetSpecs({ deckle, cutting, gsm, quantity }) {
  const errors = [];
  const d = Number(deckle);
  const c = Number(cutting);
  const g = Number(gsm);

  if (isNaN(d) || d <= 0) errors.push('Deckle must be a positive number greater than 0.');
  if (isNaN(c) || c <= 0) errors.push('Cutting must be a positive number greater than 0.');
  if (isNaN(g) || g <= 0) errors.push('GSM must be a positive number greater than 0.');

  if (quantity !== undefined) {
    const q = Number(quantity);
    if (isNaN(q) || q < 0 || !Number.isInteger(q)) {
      errors.push('Quantity must be a non-negative whole integer.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

