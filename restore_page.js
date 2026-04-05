const fs = require('fs');
const path = 'c:/서울3.0/src/app/budget/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Restore useEffect for fetchData
const brokenEffect = /useEffect\(\(\\) => \{\s*\}, \[selectedCategoryId, expenditures, categories\]\);/;
const restoredEffect = `useEffect(() => {
    fetchData();
  }, []);

  // 평탄화된 세세목 가져오기 (폼/검색용)
  const allSubCategories = useMemo(() => {
    const flat: any[] = [];
    categories.forEach(l1 => {
      l1.children?.forEach((l2: any) => {
        l2.children?.forEach((l3: any) => {
          flat.push({...l3, l2Name: l2.name, l1Name: l1.name});
        });
      });
    });
    return flat;
  }, [categories]);

  // 필터링 및 정렬 적용된 명세
  const filteredExpenditures = useMemo(() => {
    let list = selectedCategoryId 
      ? expenditures.filter(exp => {
          if (selectedCategoryId.startsWith('virtual-l3-')) {
            const parts = selectedCategoryId.split('-');
            const l2Id = parts[2];
            const name = parts.slice(3).join('-');
            return exp.categoryId === l2Id && (exp.subDetailName || '기타 상세') === name;
          }
          const l2Child = categories.flatMap(l1 => l1.children).find(l2 => l2.children?.some((l3:any) => l3.id === selectedCategoryId));
          if (l2Child) {
            const virtualItem = l2Child?.children.find((sub:any) => sub.id === selectedCategoryId);
            return exp.categoryId === l2Child?.id && (exp.subDetailName || '미지정') === virtualItem?.name;
          }
          return exp.categoryId === selectedCategoryId;
        })
      : expenditures;

    return [...list].sort((a, b) => {
      const dateA = a.executionDate ? new Date(a.executionDate).getTime() : 0;
      const dateB = b.executionDate ? new Date(b.executionDate).getTime() : 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [selectedCategoryId, expenditures, categories, sortOrder]);`;

if (content.match(brokenEffect)) {
    content = content.replace(brokenEffect, restoredEffect);
}

fs.writeFileSync(path, content);
console.log("Restoration and Sort Logic applied.");
