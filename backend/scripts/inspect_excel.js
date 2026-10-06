import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const xlsx = require('../../frontend/node_modules/xlsx');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '../../ORIGINAL DATA FOR SOFTWARE.xlsx');

const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
const rows = data.slice(2).filter(r => r && r.length > 0 && r.some(c => c !== null && c !== undefined && c !== ''));

const analysis = rows.map((r, i) => {
  return {
    index: i + 1,
    sr_no: r[0],
    reel_no: r[1],
    quality: r[2],
    size: r[3],
    weight: r[4],
    gsm: r[5],
    bf: r[6],
    head: r[7],
  };
});

console.log('--- Rows with Empty Head ---');
const emptyHeadRows = analysis.filter(r => !r.head || String(r.head).trim() === '');
console.log(emptyHeadRows);


const counts = {};
analysis.forEach(r => {
  const rn = String(r.reel_no).trim();
  counts[rn] = (counts[rn] || 0) + 1;
});

const duplicateReelNos = Object.entries(counts).filter(([rn, c]) => c > 1 && rn !== '-');
console.log('Duplicate Reel Numbers:', duplicateReelNos.map(([rn, c]) => `${rn} (${c} times)`));

duplicateReelNos.forEach(([rn]) => {
  console.log(`\nReel No: ${rn}`);
  const matching = analysis.filter(r => String(r.reel_no).trim() === rn);
  console.log(matching);
});


// Check any empty/invalid values in fields
const emptyFields = {
  sr_no: 0,
  reel_no: 0,
  quality: 0,
  size: 0,
  weight: 0,
  gsm: 0,
  bf: 0,
  head: 0,
};

analysis.forEach(row => {
  for (const [k, v] of Object.entries(row)) {
    if (k === 'index') continue;
    if (v === undefined || v === null || String(v).trim() === '') {
      emptyFields[k]++;
    }
  }
});

console.log('Empty field counts:', emptyFields);

// Check distinct qualities, bfs, gsms, sizes, weights
console.log('\nSample rows 1 to 10:');
console.log(analysis.slice(0, 10));

// Check rows where reel_no is '-' or duplicate or non-numeric
const dashRows = analysis.filter(r => String(r.reel_no).trim() === '-');
console.log(`\nRows with Reel No '-' count: ${dashRows.length}`);
console.log(dashRows);

// Check distinct BFs in full detail
const bfMap = {};
analysis.forEach(r => {
  const bf = String(r.bf || '').trim();
  bfMap[bf] = (bfMap[bf] || 0) + 1;
});
console.log('\nBF distribution:', bfMap);

// Check distinct GSMs in full detail
const gsmMap = {};
analysis.forEach(r => {
  const gsm = String(r.gsm || '').trim();
  gsmMap[gsm] = (gsmMap[gsm] || 0) + 1;
});
console.log('\nGSM distribution:', gsmMap);

// Check distinct Qualities in full detail
const qualityMap = {};
analysis.forEach(r => {
  const q = String(r.quality || '').trim();
  qualityMap[q] = (qualityMap[q] || 0) + 1;
});
console.log('\nQuality distribution:', qualityMap);

