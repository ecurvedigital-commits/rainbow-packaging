import { createRequire } from 'module';
import { Sheet } from '../models/sheet.model.js';
import { SheetEvent } from '../models/sheetEvent.model.js';
import { AuditLog } from '../../audit/models/auditLog.model.js';
import { SHEET_STATUS, SHEET_RECORD_STATUS, SHEET_EVENT_TYPES } from '../constants/sheetStatus.js';
import { APPROVAL_STATUS } from '../../../core/constants/approvalStatus.js';
import { withTransaction } from '../../../core/database/db.js';
import { getNextSequence } from '../../../core/database/counter.service.js';
import {
  calculateTotalWeight,
  validateSheetSpecs,
  roundTwoDecimals,
} from '../utils/sheetCalculations.js';

const require = createRequire(import.meta.url);

/**
 * Parses the Excel workbook buffer or file path into structured sheet rows.
 * @param {Buffer|string} source Buffer or filepath
 * @returns {{ effectiveDate: Date, rows: Array<object>, totalExcelQty: number, totalExcelWt: number }}
 */
export function parseSheetExcel(source) {
  const xlsx = require('../../../../../frontend/node_modules/xlsx');
  const wb = typeof source === 'string' ? xlsx.readFile(source) : xlsx.read(source, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  // Extract date from header cell A1 if present (e.g. "Stock of Board on 01-10-2026")
  let effectiveDate = new Date(Date.UTC(2026, 9, 1, 0, 0, 0)); // Default 2026-10-01
  const titleCell = sheet['A1'] ? String(sheet['A1'].v || '').trim() : '';
  const dateMatch = titleCell.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const year = parseInt(dateMatch[3], 10);
    effectiveDate = new Date(Date.UTC(year, month, day, 0, 0, 0));
  }

  // Parse table rows starting from header row (row index 1 in 0-based indexing)
  const rawData = xlsx.utils.sheet_to_json(sheet, { range: 1, raw: true });

  const rows = [];
  let totalExcelQty = 0;
  let totalExcelWt = 0;

  for (let i = 0; i < rawData.length; i++) {
    const r = rawData[i];
    const sNo = r['S.No'];

    // Ignore empty lines or the TOTAL row
    if (!sNo || typeof sNo !== 'number') continue;

    const party_name = String(r['PARTY NAMRE'] || '').trim();
    const job_name = String(r['Job Name'] || '').trim();
    const quality = String(r['Quality'] || '').trim().toUpperCase();
    const deckle = roundTwoDecimals(Number(r['Dackle(cm)']));
    const cutting = roundTwoDecimals(Number(r['Cutting(cm)']));
    const gsm = Number(r['GSM']);
    const quantity = Math.floor(Number(r['Qty']));
    const excel_weight = roundTwoDecimals(Number(r['Total wt (kg)']));

    const calculated_weight = calculateTotalWeight(deckle, cutting, gsm, quantity);
    const weight_diff = roundTwoDecimals(Math.abs(calculated_weight - excel_weight));

    totalExcelQty += quantity;
    totalExcelWt += excel_weight;

    rows.push({
      source_sno: sNo,
      party_name,
      job_name,
      quality,
      deckle,
      cutting,
      gsm,
      quantity,
      excel_weight,
      calculated_weight,
      weight_diff,
    });
  }

  return {
    effectiveDate,
    rows,
    totalExcelQty,
    totalExcelWt: roundTwoDecimals(totalExcelWt),
  };
}

/**
 * Imports parsed sheet records into MongoDB in a transaction.
 * @param {{ records: Array<object>, effectiveDate?: Date, importSource?: string, force?: boolean, actor: object }} args
 * @returns {Promise<object>} Detailed import report
 */
export async function importSheetRecords({
  records,
  effectiveDate = new Date(Date.UTC(2026, 9, 1, 0, 0, 0)),
  importSource = 'board-stock-sheet.xlsx',
  force = false,
  actor,
}) {
  if (!records || !Array.isArray(records) || records.length === 0) {
    throw new Error('No sheet records provided for import.');
  }

  // Check if opening stock already exists
  const existingCount = await Sheet.countDocuments({
    'custom_fields.import_source': importSource,
    record_status: SHEET_RECORD_STATUS.ACTIVE,
  });

  if (existingCount > 0 && !force) {
    return {
      success: false,
      already_imported: true,
      existing_records_count: existingCount,
      message: `Opening stock from ${importSource} has already been imported (${existingCount} records found). Use force=true to re-import.`,
    };
  }

  return withTransaction(async (session) => {
    // If forcing re-import, remove prior imported records from this source
    if (existingCount > 0 && force) {
      const priorSheets = await Sheet.find({
        'custom_fields.import_source': importSource,
      }).session(session);

      const priorIds = priorSheets.map((s) => s._id);
      await Sheet.deleteMany({ _id: { $in: priorIds } }).session(session);
      await SheetEvent.deleteMany({ sheet_id: { $in: priorIds } }).session(session);
    }

    const createdSheets = [];
    const createdEvents = [];
    const auditLogs = [];
    const reportRows = [];
    let totalImportedQty = 0;
    let totalImportedWeight = 0;

    for (const row of records) {
      const validation = validateSheetSpecs({
        deckle: row.deckle,
        cutting: row.cutting,
        gsm: row.gsm,
        quantity: row.quantity,
      });

      if (!validation.valid || !row.party_name) {
        throw new Error(`Row S.No ${row.source_sno} failed validation: ${validation.errors.join(' ')}`);
      }

      const sr_no = await getNextSequence('sheet_sr_no', session);
      const calculatedWeight = calculateTotalWeight(row.deckle, row.cutting, row.gsm, row.quantity);

      const sheetDoc = new Sheet({
        sr_no,
        lot_no: `OPN-${String(row.source_sno).padStart(3, '0')}`,
        party_name: row.party_name,
        job_name: row.job_name || '',
        quality: row.quality,
        deckle: roundTwoDecimals(row.deckle),
        cutting: roundTwoDecimals(row.cutting),
        gsm: Number(row.gsm),
        initial_quantity: row.quantity,
        current_quantity: row.quantity,
        initial_weight: calculatedWeight,
        current_weight: calculatedWeight,
        status: SHEET_STATUS.AVAILABLE,
        supplier_name: 'Opening Inventory',
        received_date: effectiveDate,
        pending_count: 0,
        record_status: SHEET_RECORD_STATUS.ACTIVE,
        notes: `Opening stock imported from ${importSource} (Row #${row.source_sno})`,
        custom_fields: {
          import_source: importSource,
          excel_sno: row.source_sno,
          excel_reported_weight: row.excel_weight,
          effective_date: effectiveDate.toISOString().slice(0, 10),
        },
        created_by: actor.id,
        last_activity_at: effectiveDate,
      });

      await sheetDoc.save({ session });
      createdSheets.push(sheetDoc);

      const eventDoc = new SheetEvent({
        sheet_id: sheetDoc._id,
        sr_no: sheetDoc.sr_no,
        event_type: SHEET_EVENT_TYPES.CREATED,
        approval_status: APPROVAL_STATUS.CONFIRMED,
        performed_by: actor.id,
        performed_by_name: actor.name || 'System / Admin',
        performed_by_role: actor.role || 'ADMIN',
        performed_at: effectiveDate,
        approved_by: actor.id,
        approved_by_name: actor.name || 'System / Admin',
        approved_at: effectiveDate,
        payload: {
          import_source: importSource,
          source_sno: row.source_sno,
          party_name: sheetDoc.party_name,
          job_name: sheetDoc.job_name,
          quality: sheetDoc.quality,
          deckle: sheetDoc.deckle,
          cutting: sheetDoc.cutting,
          gsm: sheetDoc.gsm,
          initial_quantity: sheetDoc.initial_quantity,
          initial_weight: sheetDoc.initial_weight,
          excel_reported_weight: row.excel_weight,
        },
      });

      await eventDoc.save({ session });
      createdEvents.push(eventDoc);

      totalImportedQty += row.quantity;
      totalImportedWeight += calculatedWeight;

      reportRows.push({
        sr_no: sheetDoc.sr_no,
        excel_sno: row.source_sno,
        party_name: sheetDoc.party_name,
        job_name: sheetDoc.job_name,
        quality: sheetDoc.quality,
        dimensions: `${sheetDoc.deckle} × ${sheetDoc.cutting} cm`,
        gsm: sheetDoc.gsm,
        quantity: sheetDoc.initial_quantity,
        calculated_weight: sheetDoc.initial_weight,
        excel_weight: row.excel_weight,
        variance: roundTwoDecimals(sheetDoc.initial_weight - row.excel_weight),
      });
    }

    // Universal audit trail entry
    await AuditLog.create(
      [
        {
          module: 'SHEETS',
          resource_type: 'SHEET_BATCH_IMPORT',
          resource_id: 'OPENING_STOCK',
          resource_label: `Opening Stock Import (${createdSheets.length} lots)`,
          action: 'CREATED',
          performed_by: actor.id,
          performed_by_name: actor.name || 'System Admin',
          performed_by_role: actor.role || 'ADMIN',
          performed_at: new Date(),
          metadata: {
            import_source: importSource,
            total_records: createdSheets.length,
            total_quantity: totalImportedQty,
            total_weight: roundTwoDecimals(totalImportedWeight),
            effective_date: effectiveDate.toISOString().slice(0, 10),
          },
        },
      ],
      { session }
    );

    return {
      success: true,
      total_records: createdSheets.length,
      total_quantity: totalImportedQty,
      total_calculated_weight: roundTwoDecimals(totalImportedWeight),
      total_excel_weight: roundTwoDecimals(records.reduce((acc, r) => acc + (r.excel_weight || 0), 0)),
      effective_date: effectiveDate.toISOString().slice(0, 10),
      report: reportRows,
    };
  });
}

