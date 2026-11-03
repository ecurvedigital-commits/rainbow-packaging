import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { execSync } from 'child_process';
import { parseSheetExcel, importSheetRecords } from '../src/modules/sheets/services/sheetImport.service.js';
import { User } from '../src/modules/users/models/user.model.js';
import { ROLES } from '../src/core/constants/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function configureDns() {
  if (process.platform === 'win32') {
    try {
      const output = execSync(
        'powershell -NoProfile -Command "(Get-DnsClientServerAddress -AddressFamily IPv4).ServerAddresses"',
        { encoding: 'utf8' }
      );
      const ips = output.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      dns.setServers(Array.from(new Set([...ips, '8.8.8.8', '1.1.1.1', '8.8.4.4'])));
    } catch {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    }
  }
}

async function main() {
  configureDns();
  const args = process.argv.slice(2);

  const isDryRun = args.includes('--dry-run');
  const isForce = args.includes('--force');
  let customFilePath = path.resolve(__dirname, '../../board-stock-sheet.xlsx');

  for (const arg of args) {
    if (arg.startsWith('--file=')) {
      customFilePath = path.resolve(process.cwd(), arg.replace('--file=', '').trim());
    }
  }

  console.log('===============================================================');
  console.log('Rainbow Packages — Sheet Opening Stock Importer');
  console.log(`Source File : ${customFilePath}`);
  console.log(`Dry Run     : ${isDryRun ? 'YES (Preview only, no DB writes)' : 'NO'}`);
  console.log(`Force Mode  : ${isForce ? 'YES (Overwrite existing import)' : 'NO'}`);
  console.log('===============================================================\n');

  // 1. Parse Excel file
  const parsed = parseSheetExcel(customFilePath);
  console.log(`Effective Inventory Date: ${parsed.effectiveDate.toISOString().slice(0, 10)}`);
  console.log(`Rows Found in Register  : ${parsed.rows.length}`);
  console.log(`Total Excel Quantity    : ${parsed.totalExcelQty.toLocaleString()} sheets`);
  console.log(`Total Excel Weight      : ${parsed.totalExcelWt.toLocaleString()} kg (~${(parsed.totalExcelWt / 1000).toFixed(2)} tons)\n`);

  console.log('Sample parsed records (First 5):');
  console.table(
    parsed.rows.slice(0, 5).map((r) => ({
      'S.No': r.source_sno,
      Party: r.party_name,
      Job: r.job_name || '(Blank)',
      Quality: r.quality,
      Dimensions: `${r.deckle} × ${r.cutting} cm`,
      GSM: r.gsm,
      Qty: r.quantity,
      'Calc Wt (kg)': r.calculated_weight,
      'Excel Wt (kg)': r.excel_weight,
    }))
  );

  // Reconciliation checks against company register expectations
  const expectedRows = 40;
  const expectedQty = 238945;
  const expectedWeight = 30985.33;

  const rowMatch = parsed.rows.length === expectedRows;
  const qtyMatch = parsed.totalExcelQty === expectedQty;
  const wtDiff = Math.abs(parsed.totalExcelWt - expectedWeight);

  console.log('\n--- Reconciliation Checks ---');
  console.log(`[${rowMatch ? 'PASS' : 'FAIL'}] Row Count       : ${parsed.rows.length} (Expected: ${expectedRows})`);
  console.log(`[${qtyMatch ? 'PASS' : 'FAIL'}] Total Quantity   : ${parsed.totalExcelQty} (Expected: ${expectedQty})`);
  console.log(`[${wtDiff < 0.1 ? 'PASS' : 'WARN'}] Total Excel Wt   : ${parsed.totalExcelWt} kg (Expected: ~${expectedWeight} kg)`);

  if (isDryRun) {
    console.log('\n[Dry Run Complete] No records were written to the database.');
    return;
  }

  // Connect to Database
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in backend/.env');
  }

  console.log('\nConnecting to MongoDB Atlas...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected successfully.');

  let adminUser = await User.findOne({ role: ROLES.ADMIN, is_active: true });
  if (!adminUser) {
    adminUser = await User.findOne({});
  }

  const actor = {
    id: adminUser ? adminUser._id : new mongoose.Types.ObjectId(),
    name: adminUser ? adminUser.name : 'System Admin',
    role: ROLES.ADMIN,
  };

  console.log(`Executing database import transaction with Actor: ${actor.name} (${actor.role})...`);

  const result = await importSheetRecords({
    records: parsed.rows,
    effectiveDate: parsed.effectiveDate,
    importSource: path.basename(customFilePath),
    force: isForce,
    actor,
  });

  if (!result.success && result.already_imported) {
    console.warn(`\n[WARNING] ${result.message}`);
    console.log('To overwrite previously imported opening stock, re-run with: node scripts/importSheetsFromExcel.js --force');
  } else {
    console.log('\n===============================================================');
    console.log('IMPORT SUCCESSFUL!');
    console.log(`Imported Lots   : ${result.total_records}`);
    console.log(`Total Quantity  : ${result.total_quantity.toLocaleString()} sheets`);
    console.log(`Total Weight    : ${result.total_calculated_weight.toLocaleString()} kg (~${(result.total_calculated_weight / 1000).toFixed(2)} tons)`);
    console.log(`Effective Date  : ${result.effective_date}`);
    console.log('===============================================================\n');
  }

  await mongoose.disconnect();
  console.log('Database connection closed.');
}

main().catch((err) => {
  console.error('\n[FATAL ERROR during import]:', err);
  process.exit(1);
});

