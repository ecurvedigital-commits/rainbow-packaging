/**
 * Frontend Sheet Calculation Utilities
 * Mirrors backend calculation engine for real-time live UI updates.
 */

export const roundTwoDecimals = (val) => {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.round(val * 100) / 100;
};

export function calculateSheetArea(deckle, cutting) {
  const d = Number(deckle);
  const c = Number(cutting);
  if (!d || d <= 0 || !c || c <= 0) return 0;
  return roundTwoDecimals((d * c) / 10000);
}

export function calculateSingleSheetWeight(deckle, cutting, gsm) {
  const d = Number(deckle);
  const c = Number(cutting);
  const g = Number(gsm);
  if (!d || d <= 0 || !c || c <= 0 || !g || g <= 0) return 0;
  return (d * c * g) / 10000000;
}

export function calculateTotalWeight(deckle, cutting, gsm, quantity) {
  const d = Number(deckle);
  const c = Number(cutting);
  const g = Number(gsm);
  const q = Number(quantity);
  if (!d || d <= 0 || !c || c <= 0 || !g || g <= 0 || !q || q <= 0) return 0;
  return roundTwoDecimals((d * c * g * q) / 10000000);
}

export function calculateConsumedWeight(deckle, cutting, gsm, consumedQuantity) {
  return calculateTotalWeight(deckle, cutting, gsm, consumedQuantity);
}

export function calculateRemainingWeight(deckle, cutting, gsm, remainingQuantity) {
  return calculateTotalWeight(deckle, cutting, gsm, remainingQuantity);
}

