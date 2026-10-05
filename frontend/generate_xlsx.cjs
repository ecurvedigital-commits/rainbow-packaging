const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const today = new Date().toISOString().slice(0, 10);

const headers = [
  'Reel Number',
  'Quality',
  'Supplier Name',
  'Reel Weight (kg)',
  'Rate / KG (₹)',
  'GSM',
  'BF',
  'Size (cm)',
  'Size/Width (cm)',
  'Purchase Date'
];

const data = [];
let startingReelNumber = 10001;

for (let i = 0; i < 258; i++) {
  data.push({
    'Reel Number': startingReelNumber + i,
    'Quality': 'VK',
    'Supplier Name': 'Test Supplier',
    'Reel Weight (kg)': 1500 + Math.floor(Math.random() * 100),
    'Rate / KG (₹)': 55,
    'GSM': 120,
    'BF': 18,
    'Size (cm)': 40,
    'Size/Width (cm)': 40,
    'Purchase Date': today
  });
}

const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Reels');

const outputPath = path.join(__dirname, 'test_258_reels.xlsx');
XLSX.writeFile(workbook, outputPath);
console.log(`Generated XLSX with 258 reels at: ${outputPath}`);
