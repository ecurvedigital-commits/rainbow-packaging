/**
 * Placeholder Schema Reference for Sheets Inventory
 * 
 * Domain: Cut Paper & Board Sheets
 * Planned attributes:
 * - lot_no / bundle_id (String, required)
 * - quality (String: DUPLEX, VK, etc.)
 * - flute_type (String: E, B, Narrow, None)
 * - length_cm (Number, length in cm)
 * - width_cm (Number, width in cm)
 * - gsm (Number / Mixed)
 * - sheet_count_initial (Number of sheets)
 * - sheet_count_balance (Running balance of sheets)
 * - calculated_weight_kg (Derived via Length x Width x GSM x Sheets)
 * - rate_per_sheet / rate_per_thousand (Number, valuation)
 * - status (AVAILABLE, PARTIAL, DEPLETED)
 */

export const SHEET_SCHEMA_SPEC = Object.freeze({
  category: 'SHEET',
  unit: 'pieces',
  status: 'UNDER_DEVELOPMENT',
});
