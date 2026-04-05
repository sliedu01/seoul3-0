const fs = require('fs');
const path = 'c:/서울3.0/src/app/budget/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Header colSpan fix
content = content.replace('colSpan={9}', 'colSpan={11}');

// Correcting the item grid columns
// The block from <td className="px-3 py-3"> (line 905ish) down to the next </td> (line 926ish)
const regex = /<td className="px-3 py-3">\s*<div className="flex flex-col">\s*<span className="text-\[10px\] text-slate-400 leading-tight">\s*\{exp\.category\?\.parent\?\.parent\?\.name \|\| '비목없음'\} ➔ \{exp\.category\?\.parent\?\.name \|\| '세목없음'\}\s*<\/span>\s*\{editingExpId === exp\.id \? \([\s\S]*?\}\s*<\/div>\s*<\/td>/;

const replacement = `<td className="px-3 py-3">
                        <span className="text-[11px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          {exp.category?.parent?.name || '비목없음'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-bold text-slate-600">
                          {exp.category?.name || '관리세목없음'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {editingExpId === exp.id ? (
                          <div className="flex items-center gap-1">
                            <input 
                              className="p-1 text-sm border-2 border-blue-200 rounded w-full bg-white shadow-sm font-bold text-blue-700" 
                              value={editSubDetailName} 
                              onChange={e => setEditSubDetailName(e.target.value)}
                              onKeyDown={e => { if(e.key==='Enter') handleUpdateSubDetail(exp.id); }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span className="text-sm font-black text-slate-800 cursor-pointer hover:underline decoration-blue-300 underline-offset-4" onClick={() => { setEditingExpId(exp.id); setEditSubDetailName(exp.subDetailName || ''); }}>
                            {exp.subDetailName || exp.category?.name || '세세목 미지정'}
                          </span>
                        )}
                      </td>`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(path, content);
    console.log("File updated successfully using Regex.");
} else {
    console.log("Regex failed. Checking content snippet...");
    const snippet = content.substring(content.indexOf('<td className="px-3 py-3">'), content.indexOf('<td className="px-3 py-3">') + 500);
    // Try a simpler match for the critical part
}
