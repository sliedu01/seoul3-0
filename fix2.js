const fs = require('fs');

let content = fs.readFileSync('c:/서울3.0/src/app/budget/page.tsx', 'utf-8');

const t = '      </Card>\n        <div className="flex items-center gap-2">\n          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />';
const r = '      </Card>\n\n      {/* BOTTOM VIEW: 집행명세서 그리드 */}\n      <h2 id="bottom-view-heading" className="text-2xl font-black mt-12 mb-4 flex items-between gap-2 flex-wrap items-center">\n        <div className="flex items-center gap-2">\n          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />';

const t2 = '      </Card>\r\n        <div className="flex items-center gap-2">\r\n          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />';
const r2 = '      </Card>\r\n\r\n      {/* BOTTOM VIEW: 집행명세서 그리드 */}\r\n      <h2 id="bottom-view-heading" className="text-2xl font-black mt-12 mb-4 flex items-between gap-2 flex-wrap items-center">\r\n        <div className="flex items-center gap-2">\r\n          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />';

if (content.includes(t)) {
  content = content.replace(t, r);
  console.log('Fixed LF');
} else if (content.includes(t2)) {
  content = content.replace(t2, r2);
  console.log('Fixed CRLF');
} else {
  console.log('Target not found!');
}

fs.writeFileSync('c:/서울3.0/src/app/budget/page.tsx', content, 'utf-8');
