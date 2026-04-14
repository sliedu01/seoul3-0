const fs = require('fs');

const filePath = 'c:\\서울3.0\\src\\app\\surveys\\page.tsx';
console.log('Reading:', filePath);

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);

// Remove lines at index 1254 through 1510 (0-indexed)
const kept = [...lines.slice(0, 1254), ...lines.slice(1511)];
console.log('Lines after:', kept.length);

fs.writeFileSync(filePath, kept.join('\n'), 'utf8');
console.log('Done!');
