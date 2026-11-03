import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  calculateSheetArea,
  calculateSingleSheetWeight,
  calculateTotalWeight,
  calculateRemainingWeight,
  calculateConsumedWeight,
  deriveSheetStatus,
  validateSheetSpecs,
  roundTwoDecimals,
} from '../src/modules/sheets/utils/sheetCalculations.js';
import { parseSheetExcel } from '../src/modules/sheets/services/sheetImport.service.js';
import { SHEET_STATUS } from '../src/modules/sheets/constants/sheetStatus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const excelPath = path.resolve(__dirname, '../../board-stock-sheet.xlsx');

describe('Sheet (Board Stock) Calculation Engine', () => {
  it('1. Calculates sheet area accurately in m²', () => {
    // 66 cm × 100 cm = 6,600 cm² = 0.66 m²
    assert.equal(calculateSheetArea(66, 100), 0.66);
    // 20.25 cm × 30.4 cm = 615.6 cm² = 0.0616 m²
    assert.equal(calculateSheetArea(20.25, 30.4), 0.0616);
    // Handles invalid / zero
    assert.equal(calculateSheetArea(0, 100), 0);
    assert.equal(calculateSheetArea(-10, 50), 0);
  });

  it('2. Calculates individual sheet weight in kg', () => {
    // (66 × 100 × 240) / 10,000,000 = 0.1584 kg
    assert.equal(calculateSingleSheetWeight(66, 100, 240), 0.1584);
    // (20.25 × 30.4 × 320) / 10,000,000 = 0.0196992 kg
    const w = calculateSingleSheetWeight(20.25, 30.4, 320);
    assert.ok(Math.abs(w - 0.0196992) < 0.000001);
  });

  it('3. Calculates total lot weight for integer and fractional dimensions', () => {
    // Row 1: MAHALAXMI (66 × 100 × 240 × 8640) / 10,000,000 = 1368.576 => 1368.58 kg
    assert.equal(calculateTotalWeight(66, 100, 240, 8640), 1368.58);

    // Row 2: RAJATDEEP (68 × 73.5 × 263 × 3888) / 10,000,000 = 511.0674... => 511.07 kg
    assert.equal(calculateTotalWeight(68, 73.5, 263, 3888), 511.07);

    // Row 3: TUPPERWARE (20.25 × 30.4 × 320 × 5200) / 10,000,000 = 102.4358... => 102.44 kg
    assert.equal(calculateTotalWeight(20.25, 30.4, 320, 5200), 102.44);

    // Row 37: LUMINOUS (73 × 81 × 280 × 18720) / 10,000,000 = 3099.358... => 3099.36 kg
    assert.equal(calculateTotalWeight(73, 81, 280, 18720), 3099.36);
  });

  it('4. Avoids subtraction drift: derived remaining + consumed weights reconcile cleanly', () => {
    const deckle = 66;
    const cutting = 100;
    const gsm = 240;
    const initialQty = 8640;
    const consumedQty = 3640;
    const remainingQty = initialQty - consumedQty; // 5000

    const totalWeight = calculateTotalWeight(deckle, cutting, gsm, initialQty); // 1368.58
    const consumedWeight = calculateConsumedWeight(deckle, cutting, gsm, consumedQty); // 576.58
    const remainingWeight = calculateRemainingWeight(deckle, cutting, gsm, remainingQty); // 792.00

    assert.equal(totalWeight, 1368.58);
    assert.equal(consumedWeight, 576.58);
    assert.equal(remainingWeight, 792.00);
    assert.equal(roundTwoDecimals(consumedWeight + remainingWeight), totalWeight);
  });

  it('5. Derives sheet lifecycle status correctly', () => {
    assert.equal(deriveSheetStatus(1000, 1000), SHEET_STATUS.AVAILABLE);
    assert.equal(deriveSheetStatus(500, 1000), SHEET_STATUS.PARTIALLY_CONSUMED);
    assert.equal(deriveSheetStatus(0, 1000), SHEET_STATUS.DEPLETED);
    assert.equal(deriveSheetStatus(-1, 1000), SHEET_STATUS.DEPLETED);
  });

  it('6. Validates sheet specifications and inputs', () => {
    const valid = validateSheetSpecs({ deckle: 66, cutting: 100, gsm: 240, quantity: 5000 });
    assert.equal(valid.valid, true);
    assert.equal(valid.errors.length, 0);

    const invalid = validateSheetSpecs({ deckle: -5, cutting: 0, gsm: 'invalid', quantity: 2.5 });
    assert.equal(invalid.valid, false);
    assert.ok(invalid.errors.length >= 3);
  });
});

describe('Company Board Stock Excel Register Verification', () => {
  it('1. Parses board-stock-sheet.xlsx with exact reconciliation', () => {
    const parsed = parseSheetExcel(excelPath);

    // Exactly 40 records (excluding header and total)
    assert.equal(parsed.rows.length, 40);

    // Total quantity matches Excel sum: 238,945 sheets
    assert.equal(parsed.totalExcelQty, 238945);

    // Total weight approximates 30,985.33 kg
    assert.ok(Math.abs(parsed.totalExcelWt - 30985.33) < 0.1);

    // Verify date parsed as 2026-10-01
    assert.equal(parsed.effectiveDate.toISOString().slice(0, 10), '2026-10-01');
  });

  it('2. Preserves special cases without dropping data', () => {
    const parsed = parseSheetExcel(excelPath);

    // Row 18: formula =288+1296 must evaluate to 1584
    const row18 = parsed.rows.find((r) => r.source_sno === 16); // Excel S.No 16 is row index 15
    const desana = parsed.rows.find((r) => r.party_name === 'DESANA');
    assert.ok(desana);
    assert.equal(desana.quantity, 1584);

    // Blank job name handled for CARBORUNDOM
    const carborundom = parsed.rows.find((r) => r.party_name === 'CARBORUNDOM');
    assert.ok(carborundom);
    assert.equal(carborundom.job_name, '');
    assert.equal(carborundom.quantity, 16560);

    // Combined party name preserved
    const combined = parsed.rows.find((r) => r.party_name.includes('MILTON & DESANA'));
    assert.ok(combined);
    assert.equal(combined.party_name, 'MILTON & DESANA');

    // Fractional dimensions preserved
    const tupperware = parsed.rows.find((r) => r.party_name === 'TUPPERWARE' && r.deckle === 20.25);
    assert.ok(tupperware);
    assert.equal(tupperware.deckle, 20.25);
    assert.equal(tupperware.cutting, 30.4);
    assert.equal(tupperware.gsm, 320);

    // ANAND quality present
    const anandLots = parsed.rows.filter((r) => r.quality === 'ANAND');
    assert.equal(anandLots.length, 4);
  });
});

