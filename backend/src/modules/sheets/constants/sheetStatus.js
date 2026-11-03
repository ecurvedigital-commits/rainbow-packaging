/**
 * Sheet (Board Stock) Domain Constants
 */

export const SHEET_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  PARTIALLY_CONSUMED: 'PARTIALLY_CONSUMED',
  DEPLETED: 'DEPLETED',
  VOIDED: 'VOIDED',
});

export const SHEET_RECORD_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  VOIDED: 'VOIDED',
});

export const SHEET_EVENT_TYPES = Object.freeze({
  CREATED: 'CREATED',
  CONSUMED: 'CONSUMED',
  ADJUSTED: 'ADJUSTED',
  RETURNED: 'RETURNED',
  VOIDED: 'VOIDED',
  CONFIRMED: 'CONFIRMED',
  DECLINED: 'DECLINED',
});

export const SHEET_STATIONS = Object.freeze([
  'Offset Printing',
  'Die Cutting',
  'Pasting',
  'Corrugation Liner',
  'Scrap/Trim',
  'Sheater Output',
  'Others',
]);

