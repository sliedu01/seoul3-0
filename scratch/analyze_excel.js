const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const downloadsDir = path.join(process.env.USERPROFILE, 'Downloads');
const files = fs.readdirSync(downloadsDir).filter(f => f.includes('진로캠퍼스') && f.endsWith('.xlsx'));

console.log(`Found ${files.length} candidate files in Downloads.\n`);

files.forEach(file => {
  console.log(`--- Analyzing File: ${file} ---`);
  try {
    const workbook = XLSX.readFile(path.join(downloadsDir, file));
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`Sheet Name: ${sheetName}`);
    console.log(`Total Rows: ${rows.length}`);
    
    console.log("First 10 rows:");
    rows.slice(0, 10).forEach((row, i) => {
      console.log(`Row ${i}:`, JSON.stringify(row));
    });
    
    // Check if we can find 57
    let found57 = false;
    rows.forEach(row => {
      if (Array.isArray(row)) {
        row.forEach(cell => {
          if (cell == 57 || String(cell).includes('57')) found57 = true;
        });
      }
    });
    console.log(`Found 57 in any cell: ${found57}`);
    
  } catch (err) {
    console.log(`Error reading ${file}: ${err.message}`);
  }
  console.log("\n");
});
