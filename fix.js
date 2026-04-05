const fs = require('fs');

let content = fs.readFileSync('c:/서울3.0/src/app/budget/page.tsx', 'utf-8');

const target = `      </Card>\n        <div className="flex items-center gap-2">\n          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />`;
const replacement = `      </Card>\n\n      {/* BOTTOM VIEW: 집행명세서 그리드 */}\n      <h2 id="bottom-view-heading" className="text-2xl font-black mt-12 mb-4 flex items-between gap-2 flex-wrap items-center">\n        <div className="flex items-center gap-2">\n          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />`;

content = content.replace(target, replacement);

const targetCrlf = `      </Card>\r\n        <div className="flex items-center gap-2">\r\n          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />`;
const replacementCrlf = `      </Card>\r\n\r\n      {/* BOTTOM VIEW: 집행명세서 그리드 */}\r\n      <h2 id="bottom-view-heading" className="text-2xl font-black mt-12 mb-4 flex items-between gap-2 flex-wrap items-center">\r\n        <div className="flex items-center gap-2">\r\n          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />`;

content = content.replace(targetCrlf, replacementCrlf);

fs.writeFileSync('c:/서울3.0/src/app/budget/page.tsx', content, 'utf-8');
console.log('Done fixing h2.');
