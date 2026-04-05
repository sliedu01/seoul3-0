const fs = require('fs');
let lines = fs.readFileSync('c:/서울3.0/src/app/budget/page.tsx', 'utf-8').split('\n');
lines = lines.map(l => l.replace(/\r$/, ''));
let fixed = false;
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('</Card>') && lines[i+1] && lines[i+1].includes('<div className="flex items-center gap-2">')) {
    lines.splice(i+1, 0, '', '      {/* BOTTOM VIEW: 집행명세서 그리드 */}', '      <h2 id="bottom-view-heading" className="text-2xl font-black mt-12 mb-4 flex items-between gap-2 flex-wrap items-center">');
    console.log('Fixed at line ' + i);
    fixed = true;
    break;
  }
}
if (!fixed) console.log('Not found');
fs.writeFileSync('c:/서울3.0/src/app/budget/page.tsx', lines.join('\n'), 'utf-8');
