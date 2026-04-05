const fs = require('fs');
const path = 'c:/서울3.0/src/app/budget/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add sortOrder state
if (!content.includes('const [sortOrder, setSortOrder]')) {
    content = content.replace('const [expenditures, setExpenditures] = useState<any[]>([]);', 
        "const [expenditures, setExpenditures] = useState<any[]>([]);\n  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');");
}

// 2. Update filteredExpenditures logic
const oldFilterRegex = /const filteredExpenditures = expenditures\.filter\(exp => \{[\s\S]*?\}\);/;
const newFilter = `const filteredExpenditures = expenditures
    .filter(exp => {
      if (selectedTab === 'planned' && exp.executionDate) return false;
      if (selectedTab === 'completed' && !exp.executionDate) return false;
      if (selectedL2CategoryId && exp.categoryId !== selectedL2CategoryId) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.executionDate ? new Date(a.executionDate).getTime() : 0;
      const dateB = b.executionDate ? new Date(b.executionDate).getTime() : 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });`;

if (content.match(oldFilterRegex)) {
    content = content.replace(oldFilterRegex, newFilter);
}

// 3. Ensure the 3-column split is applied correctly (re-verifying)
const oldGridRegex = /<td className="px-3 py-3">\s*<div className="flex flex-col">\s*<span className="text-\[10px\] text-slate-400 leading-tight">\s*\{exp\.category\?\.parent\?\.parent\?\.name \|\| '비목없음'\} ➔ \{exp\.category\?\.parent\?\.name \|\| '세목없음'\}\s*<\/span>[\s\S]*?<\/td>/;
const gridReplacement = `<td className="px-3 py-3">
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

// Apply grid replacement if it hasn't been already
if (content.match(oldGridRegex)) {
    content = content.replace(oldGridRegex, gridReplacement);
}

fs.writeFileSync(path, content);
console.log("UI Update Script finished.");
