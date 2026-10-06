const fs = require('fs');
const path = require('path');

const today = new Date().toISOString().slice(0, 10);
const headers = ['Reel Number', 'Quality', 'Supplier Name', 'Mill Name', 'Reel Weight (kg)', 'Rate / KG (₹)', 'GSM', 'BF', 'Size (cm)', 'Size/Width (cm)', 'Purchase Date'];
const rows = [];
rows.push(headers.join(','));

let startingReelNumber = 20001;
for (let i = 0; i < 258; i++) {
  const row = [
    `R-${startingReelNumber + i}`,
    'VK',
    'Test Supplier',
    'Century Paper Mill',
    1500 + Math.floor(Math.random() * 100),
    55,
    120,
    18,
    40,
    40,
    today
  ];
  rows.push(row.join(','));
}

const csvData = rows.join('\n');
const outputPath = path.join(__dirname, 'test_258_reels.csv');
fs.writeFileSync(outputPath, csvData);
console.log(`Generated CSV with 258 reels at: ${outputPath}`);
