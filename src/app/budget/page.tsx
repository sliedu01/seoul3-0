"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { 
  Wallet, FileSpreadsheet, Plus, Search, Filter,
  ArrowDownToLine, Download, Upload, CheckCircle2,
  Trash2, Edit, AlertCircle, FileText, Settings, X as XIcon
} from "lucide-react";
import * as XLSX from "xlsx";

export default function BudgetPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [expenditures, setExpenditures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // Drill-down 필터 상태 (대시보드 행 클릭시 세세목 레벨 ID)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // 1. 단일명세서 입력 폼 상태
  const [showForm, setShowForm] = useState(false);
  const [formL1, setFormL1] = useState('');
  const [formL2, setFormL2] = useState('');
  
  const [formData, setFormData] = useState({
    executionDate: '',
    categoryId: '', // 관리세목(L2) ID (이제 지출은 L2에 귀속됨)
    subDetailName: '', // 직접 입력하는 세세목 명칭
    purpose: '',
    supplyAmount: '',
    taxAmount: '',
    totalAmount: '',
    evidenceType: '세금계산서',
    memo: '',
    evidenceFileName: undefined as string | undefined,
    evidenceFileId: undefined as string | undefined,
    originalFileName: undefined as string | undefined
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 2. 카테고리 관리(Setting) 모달 상태
  const [showSettings, setShowSettings] = useState(false);
  const [settingsViewLevel, setSettingsViewLevel] = useState(1);
  const [settingParentId, setSettingParentId] = useState<string | null>(null); // L2, L3 추가시 부모 식별용
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [newCatOrder, setNewCatOrder] = useState('1');

  // 3. 항목/카테고리 수정 및 선택 상태
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatBudget, setEditCatBudget] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // 4. 집행 내역(Expenditure) 인라인 수정/팝업 폼 상태 통합
  const [editingExpId, setEditingExpId] = useState<string | null>(null);

  // 데이터 로드
  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, expRes] = await Promise.all([
        fetch('/api/budget/categories'),
        fetch('/api/budget/expenditures')
      ]);
      setCategories(await catRes.json());
      setExpenditures(await expRes.json());
    } catch (e) {
      console.error(e);
      alert('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    let result = selectedCategoryId 
      ? expenditures.filter(exp => {
          if (selectedCategoryId.startsWith('virtual-l3-')) {
            const [,,l2Id, name] = selectedCategoryId.split('-');
            // virtual-l3-{l2Id}-{name} 형식인 경우 (API 수정 필요할 수 있음, 현재는 index 기반)
            // 임시로 categoryId(L2)와 subDetailName 매칭 시도
            const l2Child = categories.flatMap(c => c.children).find((c:any) => c.children.some((sub:any) => sub.id === selectedCategoryId));
            const virtualItem = l2Child?.children.find((sub:any) => sub.id === selectedCategoryId);
            return exp.categoryId === l2Child?.id && (exp.subDetailName || '미지정') === virtualItem?.name;
          }
          return exp.categoryId === selectedCategoryId;
        })
      : [...expenditures];

    return result.sort((a, b) => {
      if (!a.executionDate && b.executionDate) return 1;
      if (a.executionDate && !b.executionDate) return -1;
      if (!a.executionDate && !b.executionDate) return 0;
      
      const dateA = new Date(a.executionDate).getTime();
      const dateB = new Date(b.executionDate).getTime();
      
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [selectedCategoryId, expenditures, categories, sortOrder]);

  // ---- 폼 관련 로직 ----
  
  // 금액 입력 시 양방향 자동 계산
  const handleAmountChange = (field: 'supply' | 'tax' | 'total', valueStr: string) => {
    const raw = Number(valueStr.replace(/[^0-9]/g, ''));
    if (field === 'total') {
      const supply = Math.round(raw / 1.1);
      const tax = raw - supply;
      setFormData({...formData, totalAmount: raw.toString(), supplyAmount: supply.toString(), taxAmount: tax.toString()});
    } else if (field === 'supply') {
      const currentTax = Number(formData.taxAmount.replace(/[^0-9]/g, '')) || 0;
      setFormData({...formData, supplyAmount: raw.toString(), totalAmount: (raw + currentTax).toString()});
    } else if (field === 'tax') {
      const currentSupply = Number(formData.supplyAmount.replace(/[^0-9]/g, '')) || 0;
      setFormData({...formData, taxAmount: raw.toString(), totalAmount: (currentSupply + raw).toString()});
    }
  };

  const handleSubmitExpenditure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) return alert("세세목(항목)을 선택해주세요.");
    
    try {
      let evidenceFileName = formData.evidenceFileName, evidenceFileId = formData.evidenceFileId, originalFileName = formData.originalFileName;
      
      if (selectedFile) {
        const fileData = new FormData();
        fileData.append('file', selectedFile);
        fileData.append('executionDate', formData.executionDate);
        fileData.append('evidenceType', formData.evidenceType);
        
        const uploadRes = await fetch('/api/budget/evidence/upload', {
          method: 'POST', body: fileData
        });
        const uploadJson = await uploadRes.json();
        evidenceFileName = uploadJson.evidenceFileName;
        evidenceFileId = uploadJson.evidenceFileId;
        originalFileName = uploadJson.originalFileName;
      }

      const submitData = {
        ...formData,
        supplyAmount: Number(formData.supplyAmount),
        taxAmount: Number(formData.taxAmount),
        totalAmount: Number(formData.totalAmount),
        evidenceFileName,
        evidenceFileId,
        originalFileName
      };

      const url = editingExpId ? `/api/budget/expenditures/${editingExpId}` : '/api/budget/expenditures';
      const method = editingExpId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (res.ok) {
        alert(editingExpId ? "집행 내역이 수정되었습니다." : "집행 내역이 등록되었습니다.");
        setShowForm(false);
        setEditingExpId(null);
        setFormData({ executionDate: '', categoryId: '', subDetailName: '', purpose: '', supplyAmount: '', taxAmount: '', totalAmount: '', evidenceType: '세금계산서', memo: '', evidenceFileName: undefined, evidenceFileId: undefined, originalFileName: undefined });
        setFormL1(''); setFormL2('');
        setSelectedFile(null);
        fetchData();
      }
    } catch(e) {
      alert("등록/수정 중 오류가 발생했습니다.");
    }
  };

  const openAddModal = () => {
    setEditingExpId(null);
    setFormData({ executionDate: '', categoryId: '', subDetailName: '', purpose: '', supplyAmount: '', taxAmount: '', totalAmount: '', evidenceType: '세금계산서', memo: '', evidenceFileName: undefined, evidenceFileId: undefined, originalFileName: undefined });
    setFormL1(''); setFormL2('');
    setSelectedFile(null);
    setShowForm(true);
  };

  const openEditModal = (exp: any) => {
    setEditingExpId(exp.id);
    const parentId = exp.category?.parent?.id || '';
    setFormL1(parentId);
    setFormL2(exp.categoryId || '');
    setFormData({
      executionDate: exp.executionDate ? new Date(exp.executionDate).toISOString().split('T')[0] : '',
      categoryId: exp.categoryId || '',
      subDetailName: exp.subDetailName || '',
      purpose: exp.purpose || '',
      supplyAmount: exp.supplyAmount != null ? exp.supplyAmount.toString() : '',
      taxAmount: exp.taxAmount != null ? exp.taxAmount.toString() : '',
      totalAmount: exp.totalAmount != null ? exp.totalAmount.toString() : '',
      evidenceType: exp.evidenceType || '세금계산서',
      memo: exp.memo || '',
      evidenceFileName: exp.evidenceFileName,
      evidenceFileId: exp.evidenceFileId,
      originalFileName: exp.originalFileName
    } as any);
    setSelectedFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await fetch(`/api/budget/expenditures/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      alert("삭제 실패");
    }
  };

  // ---- 엑셀 다운로드 ----
  const handleExportAll = () => {
    window.open('/api/budget/export', '_blank'); // 서버 생성 총괄(배열)
  };

  const handleExportCurrentGrid = () => {
    // 프론트에서 화면에 표시된 상태 그대로 엑셀 생성
    const exportData = filteredExpenditures.map((exp, idx) => ({
      "No": idx + 1,
      "집행일": exp.executionDate ? new Date(exp.executionDate).toLocaleDateString() : '미정(사용예정)',
      "비목": exp.category?.parent?.name || exp.category?.name || '-',
      "관리세목": exp.category?.name || '-',
      "세세목": exp.subDetailName || '-',
      "집행 용도": exp.purpose || '',
      "공급가액": Number(exp.supplyAmount),
      "부가세액": Number(exp.taxAmount),
      "전체금액": Number(exp.totalAmount),
      "증빙종류": exp.evidenceType || '',
      "증빙파일": exp.originalFileName || '',
      "메모": exp.memo || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "세부집행명세");
    XLSX.writeFile(workbook, `예산집행명세_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ---- 카테고리 관리 ----
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/budget/categories', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            name: newCatName,
            level: settingsViewLevel,
            parentId: settingsViewLevel > 1 ? settingParentId : null,
            order: Number(newCatOrder),
            budgetAmount: Number(newCatBudget)
         })
      });
      if (res.ok) {
        setNewCatName(''); setNewCatBudget('0'); setNewCatOrder('1');
        fetchData();
      }
    } catch(e) {
      alert("추가 중 오류 발생");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if(!confirm("이 카테고리를 삭제하시겠습니까? (연관된 집행 내역이 있으면 삭제가 거부될 수 있습니다)")) return;
    try {
       const res = await fetch(`/api/budget/categories/${id}`, { method: 'DELETE' });
       const json = await res.json();
       if (!res.ok) {
         alert(json.error || "삭제 실패");
       } else {
         fetchData();
       }
    } catch(e) {
       alert("서버 연결 오류");
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editCatName) return alert("이름을 입력해주세요.");
    try {
      const res = await fetch(`/api/budget/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCatName,
          budgetAmount: Number(editCatBudget)
        })
      });
      if (res.ok) {
        setEditingCategoryId(null);
        fetchData();
      } else {
        const json = await res.json();
        alert(json.error || "수정 실패");
      }
    } catch(e) {
      alert("서버 연결 오류");
    }
  };

  const handleBulkDeleteCategory = async () => {
    if (selectedCategoryIds.length === 0) return alert("삭제할 항목을 먼저 선택해주세요.");
    if (!confirm(`선택한 ${selectedCategoryIds.length}개 항목을 삭제하시겠습니까?`)) return;
    
    try {
      const res = await fetch('/api/budget/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedCategoryIds })
      });
      const json = await res.json();
      if (res.ok) {
        alert(`${json.deletedCount}개 항목이 삭제되었습니다.`);
        setSelectedCategoryIds([]);
        fetchData();
      } else {
        alert(json.error || "삭제 실패");
      }
    } catch(e) {
      alert("서버 연결 오류");
    }
  };

  const toggleCategorySelection = (id: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const currentLevelCategories = useMemo(() => {
    if (settingsViewLevel === 1) return categories;
    if (settingsViewLevel === 2) return categories.flatMap(l1 => l1.children || []);
    if (settingsViewLevel === 3) return categories.flatMap(l1 => (l1.children || []).flatMap((l2: any) => l2.children || []));
    return [];
  }, [categories, settingsViewLevel]);

  const handleSelectAllCategories = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCategoryIds(currentLevelCategories.map((c: any) => c.id));
    } else {
      setSelectedCategoryIds([]);
    }
  };


  if (loading) return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">예산 데이터를 불러오는 중...</div>;

  return (
    <div className="max-w-[1600px] mx-auto pb-20 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-blue-600" />
            예산/정산 관리
          </h1>
          <p className="text-slate-500 mt-2 font-bold">산출내역서를 기준으로 한 실시간 집행 현황과 증빙 맵핑</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              document.getElementById('settings-frame')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm shadow-sm hover:bg-indigo-200"
          >
            <Settings className="w-4 h-4" /> 항목/카테고리 관리
          </button>
          <button 
            onClick={handleExportAll}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-emerald-700"
          >
            <Download className="w-4 h-4" /> 산출내역 총괄 엑셀
          </button>
        </div>
      </div>

      {/* TOP VIEW: 대시보드 (산출내역서) - 3단계 표시 반영 */}
      <Card className="border-none shadow-md overflow-hidden bg-white">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-black text-slate-800 flex items-center gap-2">
            📊 비목별 예산 현황 총괄 (산출내역서)
          </h2>
          <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            하위 행을 클릭하면 하단 집행명세가 <b>필터링</b>됩니다.
          </span>
        </div>
        
        <div className="overflow-x-auto max-h-[50vh] custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 bg-white shadow-sm z-10 text-slate-500">
              <tr className="uppercase text-[11px] font-black tracking-tighter bg-slate-100/80">
                <th className="px-4 py-3 min-w-[100px]">비목(L1)</th>
                <th className="px-4 py-3 border-l border-slate-200 min-w-[140px]">관리세목(L2)</th>
                <th className="px-4 py-3 border-l border-slate-200 text-right text-indigo-700 min-w-[140px]">배정예산(L2)</th>
                <th className="px-4 py-3 border-l border-slate-200 min-w-[180px]">세세목(L3)</th>
                <th className="px-4 py-3 text-right">사용액</th>
                <th className="px-4 py-3 text-right text-orange-600">사용예정액</th>
                <th className="px-4 py-3 text-right font-black text-slate-800 border-l border-slate-200">잔액(L2)</th>
                <th className="px-4 py-3 text-center border-l border-slate-200">사용률(L2)</th>
              </tr>
            </thead>
            <tbody>
               {categories.map((l1) => {
                 const l2List = l1.children || [];
                 const totalL3Rows = l2List.reduce((acc: number, l2: any) => acc + Math.max(l2.children?.length || 0, 1), 0);
                 const l1Rows = Math.max(totalL3Rows, 1);

                 return (
                   <React.Fragment key={l1.id}>
                     {l2List.length > 0 ? (
                       l2List.map((l2: any, i2: number) => {
                         const l3List = l2.children || [];
                         const l2Rows = Math.max(l3List.length, 1);

                         return (
                           <React.Fragment key={l2.id}>
                             {l3List.length > 0 ? (
                               l3List.map((l3: any, i3: number) => (
                                 <tr 
                                   key={l3.id} 
                                   onClick={() => setSelectedCategoryId(l3.id === selectedCategoryId ? null : l3.id)}
                                   className={`cursor-pointer transition-colors border-b border-slate-50
                                     ${l3.id === selectedCategoryId ? 'bg-blue-50/50 outline outline-1 outline-blue-200 z-10 relative' : 'hover:bg-slate-50'}`}
                                 >
                                   {i2 === 0 && i3 === 0 && (
                                     <td rowSpan={l1Rows} className="px-4 py-3 font-black text-slate-800 bg-white border-r border-slate-100 align-top text-center">
                                       {l1.name}
                                     </td>
                                   )}
                                   {i3 === 0 && (
                                     <>
                                       <td rowSpan={l2Rows} className="px-4 py-3 border-l border-slate-100 font-bold text-slate-600 bg-slate-50/20 align-top">
                                         {l2.name}
                                       </td>
                                       <td rowSpan={l2Rows} className="px-4 py-3 text-right font-black border-l border-slate-100 text-indigo-700 bg-indigo-50/10 align-top">
                                         {l2.budgetAmount > 0 ? l2.budgetAmount.toLocaleString() + '원' : '-'}
                                       </td>
                                     </>
                                   )}
                                   <td className="px-4 py-3 border-l border-slate-100 font-bold text-slate-500 italic">
                                     {l3.name}
                                   </td>
                                   <td className="px-4 py-3 text-right font-bold text-slate-700">
                                     {l3.totalUsed > 0 ? l3.totalUsed.toLocaleString() : '-'}
                                   </td>
                                   <td className="px-4 py-3 text-right font-bold text-orange-500">
                                     {l3.totalExpected > 0 ? l3.totalExpected.toLocaleString() : '-'}
                                   </td>
                                   {i3 === 0 && (
                                     <>
                                       <td rowSpan={l2Rows} className="px-4 py-3 text-right font-black text-slate-900 border-l border-slate-200 bg-slate-50/10 align-top">
                                         {l2.balance.toLocaleString()}원
                                       </td>
                                       <td rowSpan={l2Rows} className="px-4 py-3 border-l border-slate-100 align-top">
                                          <div className="flex flex-col items-center justify-center h-full min-h-[30px]">
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                                               <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(l2.usageRate, 100)}%` }}></div>
                                            </div>
                                            <span className="font-black text-[10px] text-slate-600">{l2.usageRate}%</span>
                                          </div>
                                       </td>
                                     </>
                                   )}
                                 </tr>
                               ))
                             ) : (
                               /* L2만 있고 L3가 없는 경우 (가상 상세 행) */
                               <tr className="hover:bg-slate-50 border-b border-slate-100">
                                 {i2 === 0 && (
                                   <td rowSpan={l1Rows} className="px-4 py-3 font-black text-slate-800 bg-white border-r border-slate-100 align-top text-center">
                                     {l1.name}
                                   </td>
                                 )}
                                 <td className="px-4 py-3 border-l border-slate-100 font-bold text-slate-600 bg-slate-50/20 align-top">
                                   {l2.name}
                                 </td>
                                 <td className="px-4 py-3 text-right font-black border-l border-slate-100 text-indigo-700 bg-indigo-50/10 align-top">
                                   {l2.budgetAmount > 0 ? l2.budgetAmount.toLocaleString() + '원' : '-'}
                                 </td>
                                 <td className="px-4 py-3 border-l border-slate-100 text-slate-300 italic">-</td>
                                 <td className="px-4 py-3 text-right text-slate-400">-</td>
                                 <td className="px-4 py-3 text-right text-slate-400">-</td>
                                 <td className="px-4 py-3 text-right font-black text-slate-900 border-l border-slate-200 bg-slate-50/10 align-top">
                                   {l2.balance.toLocaleString()}원
                                 </td>
                                 <td className="px-4 py-3 border-l border-slate-100 align-top">
                                    <div className="flex flex-col items-center justify-center">
                                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                                         <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(l2.usageRate, 100)}%` }}></div>
                                      </div>
                                      <span className="font-black text-[10px] text-slate-600">{l2.usageRate}%</span>
                                    </div>
                                 </td>
                               </tr>
                             )}
                           </React.Fragment>
                         );
                       })
                     ) : (
                       /* 하위가 아예 없는 비목 (일반관리비 등) */
                       <tr className="bg-blue-50/10 border-b border-slate-200">
                         <td className="px-4 py-4 font-black text-slate-900 bg-white border-r border-slate-100 text-center">{l1.name}</td>
                         <td className="px-4 py-4 font-bold text-slate-400 italic text-center" colSpan={1}>-</td>
                         <td className="px-4 py-4 text-right font-black border-l border-slate-100 text-indigo-700 bg-indigo-50/10">{l1.budgetAmount.toLocaleString()}원</td>
                         <td className="px-4 py-4 font-bold text-slate-400 italic text-center" colSpan={1}>-</td>
                         <td className="px-4 py-4 text-right font-bold text-slate-600">{l1.totalUsed.toLocaleString()}</td>
                         <td className="px-4 py-4 text-right font-bold text-orange-500">{l1.totalExpected.toLocaleString()}</td>
                         <td className="px-4 py-4 text-right font-black text-slate-900 border-l border-slate-200">{l1.balance.toLocaleString()}원</td>
                         <td className="px-4 py-4 font-black text-center text-blue-600 border-l border-slate-100">{l1.usageRate}%</td>
                       </tr>
                     )}
                     {/* L1 (비목) 단위 총합계 - 필요 시 주석 해제하여 사용 (현재는 가독성을 위해 생략 가능) */}
                     {l2List.length > 1 && (
                        <tr className="bg-slate-100/50 border-b-2 border-slate-300">
                          <td colSpan={2} className="px-4 py-2 font-black text-slate-500 text-right text-[10px] tracking-widest bg-white pr-4">
                            [{l1.name} 총계]
                          </td>
                          <td className="px-4 py-2 text-right font-black text-slate-900 border-l border-slate-100 bg-slate-50">{l1.budgetAmount.toLocaleString()}원</td>
                          <td className="bg-slate-50 border-l border-slate-100"></td>
                          <td className="px-4 py-2 text-right font-black text-blue-600 bg-slate-50">{l1.totalUsed.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right font-black text-orange-500 bg-slate-50">{l1.totalExpected.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right font-black text-slate-900 border-l border-slate-200 bg-slate-50">{l1.balance.toLocaleString()}원</td>
                          <td className="px-4 py-2 font-black text-center text-blue-600 text-[10px] border-l border-slate-100 bg-slate-50">{l1.usageRate}%</td>
                        </tr>
                     )}
                   </React.Fragment>
                 );
               })}

               {/* 최종 합계 (Grand Total) */}
               {(() => {
                 const gBudget = categories.reduce((s: number, c: any) => s + c.budgetAmount, 0);
                 const gUsed = categories.reduce((s: number, c: any) => s + (c.totalUsed || 0), 0);
                 const gExpected = categories.reduce((s: number, c: any) => s + (c.totalExpected || 0), 0);
                 const gBalance = gBudget - gUsed - gExpected;
                 const gRate = gBudget > 0 ? (((gUsed + gExpected) / gBudget) * 100).toFixed(1) : "0";

                 return (
                   <tr className="bg-slate-900 text-white border-t-4 border-double border-slate-500">
                     <td colSpan={3} className="px-4 py-4 font-black text-center tracking-[0.5em] text-sm italic">
                       최 종 합 계 (Total)
                     </td>
                     <td className="px-4 py-4 text-right font-black text-yellow-400 text-base">{gBudget.toLocaleString()}원</td>
                     <td className="px-4 py-4 text-right font-black text-blue-300">{gUsed.toLocaleString()}</td>
                     <td className="px-4 py-4 text-right font-black text-orange-300">{gExpected.toLocaleString()}</td>
                     <td className="px-4 py-4 text-right font-black text-white">{gBalance.toLocaleString()}원</td>
                     <td className="px-4 py-4 font-black text-center text-blue-400 text-sm border-l border-slate-700">{gRate}%</td>
                   </tr>
                 );
               })()}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MIDDLE VIEW: 예산 항목(비목/세목) 관리 */}
      <h2 className="text-2xl font-black mt-12 mb-4 flex items-center gap-2">
        <Settings className="w-6 h-6 text-indigo-600" />
        예산/정산 항목 관리
      </h2>
      <Card className="p-6 mb-12 border-indigo-200 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div className="flex border border-slate-200 bg-slate-50 p-1 rounded-lg w-fit">
               {[1, 2].map(lvl => (
                 <button key={lvl} onClick={() => {setSettingsViewLevel(lvl); setSettingParentId(null); setSelectedCategoryIds([]);}} className={`px-6 py-2 text-sm font-bold rounded-md transition ${settingsViewLevel === lvl ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                   {lvl===1 ? '1. 비목 관리' : '2. 관리세목 관리'}
                 </button>
               ))}
            </div>
            {selectedCategoryIds.length > 0 && (
              <button 
                onClick={handleBulkDeleteCategory}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold text-sm hover:bg-red-100 transition"
              >
                <Trash2 className="w-4 h-4" /> 선택 삭제 ({selectedCategoryIds.length})
              </button>
            )}
          </div>

          <div className="flex gap-6">
            <div className="flex-1 overflow-y-auto max-h-[400px] border border-slate-200 rounded-lg custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-slate-100/80 sticky top-0 text-slate-600 uppercase text-[11px] font-black tracking-wider z-10">
                  <tr>
                    <th className="p-3 text-center w-10">
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAllCategories}
                        checked={currentLevelCategories.length > 0 && selectedCategoryIds.length === currentLevelCategories.length}
                        className="w-4 h-4 rounded border-slate-300 transition cursor-pointer"
                      />
                    </th>
                    <th className="p-3 text-left">항목명</th>
                    <th className="p-3 text-left">소속 상위항목</th>
                    <th className="p-3 text-right">기본예산</th>
                    <th className="p-3 text-center w-40">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {settingsViewLevel === 1 && categories.map(c => (
                    <tr key={c.id} className={`border-b border-slate-100 transition-colors ${selectedCategoryIds.includes(c.id) ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}>
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedCategoryIds.includes(c.id)} 
                          onChange={() => toggleCategorySelection(c.id)}
                          className="w-4 h-4 rounded border-slate-300 transition cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        {editingCategoryId === c.id ? <input className="w-full p-2 border-2 border-indigo-200 rounded bg-white shadow-sm font-bold text-slate-900" value={editCatName} onChange={e=>setEditCatName(e.target.value)} autoFocus /> : <span className="pl-1">{c.name}</span>}
                      </td>
                      <td className="p-3 text-slate-400 font-medium">-</td>
                      <td className="p-3 text-right">
                        {editingCategoryId === c.id ? (
                          <div className="relative">
                            <input type="number" className="w-full p-2 border-2 border-indigo-200 rounded text-right bg-white shadow-sm font-black text-indigo-700" value={editCatBudget} onChange={e=>setEditCatBudget(e.target.value)} />
                            <span className="absolute right-3 top-2 text-xs text-slate-400">원</span>
                          </div>
                        ) : (
                          <span className="font-black text-slate-700 px-2">{c.budgetAmount.toLocaleString()}원</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          {editingCategoryId === c.id ? (
                            <>
                              <button onClick={() => handleUpdateCategory(c.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-black rounded-md shadow-sm hover:bg-blue-700 transition"><CheckCircle2 className="w-3.5 h-3.5"/> 저장</button>
                              <button onClick={() => setEditingCategoryId(null)} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-md hover:bg-slate-200 transition"><XIcon className="w-3.5 h-3.5"/> 취소</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingCategoryId(c.id); setEditCatName(c.name); setEditCatBudget(c.budgetAmount.toString()); }} className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-black rounded-md hover:bg-indigo-100 transition-all border border-indigo-100"><Edit className="w-3.5 h-3.5"/> 수정</button>
                              <button onClick={()=>handleDeleteCategory(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"><Trash2 className="w-4 h-4"/></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {settingsViewLevel === 2 && categories.flatMap(l1 => (l1.children || []).map((l2: any) => (
                    <tr key={l2.id} className={`border-b border-slate-100 transition-colors ${selectedCategoryIds.includes(l2.id) ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}>
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedCategoryIds.includes(l2.id)} 
                          onChange={() => toggleCategorySelection(l2.id)}
                          className="w-4 h-4 rounded border-slate-300 transition cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        {editingCategoryId === l2.id ? <input className="w-full p-2 border-2 border-indigo-200 rounded bg-white shadow-sm font-bold text-slate-900" value={editCatName} onChange={e=>setEditCatName(e.target.value)} autoFocus /> : <span className="pl-1">{l2.name}</span>}
                      </td>
                      <td className="p-3"><span className="text-[11px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ring-1 ring-slate-200">{l1.name}</span></td>
                      <td className="p-3 text-right">
                        {editingCategoryId === l2.id ? (
                          <div className="relative">
                            <input type="number" className="w-full p-2 border-2 border-indigo-200 rounded text-right bg-white shadow-sm font-black text-indigo-700" value={editCatBudget} onChange={e=>setEditCatBudget(e.target.value)} />
                            <span className="absolute right-3 top-2 text-xs text-slate-400">원</span>
                          </div>
                        ) : (
                          <span className="font-black text-slate-700 px-2">{l2.budgetAmount.toLocaleString()}원</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          {editingCategoryId === l2.id ? (
                            <>
                              <button onClick={() => handleUpdateCategory(l2.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-black rounded-md shadow-sm hover:bg-blue-700 transition"><CheckCircle2 className="w-3.5 h-3.5"/> 저장</button>
                              <button onClick={() => setEditingCategoryId(null)} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-md hover:bg-slate-200 transition"><XIcon className="w-3.5 h-3.5"/> 취소</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingCategoryId(l2.id); setEditCatName(l2.name); setEditCatBudget(l2.budgetAmount.toString()); }} className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-black rounded-md hover:bg-indigo-100 transition-all border border-indigo-100"><Edit className="w-3.5 h-3.5"/> 수정</button>
                              <button onClick={()=>handleDeleteCategory(l2.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"><Trash2 className="w-4 h-4"/></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )))}
                  {settingsViewLevel === 3 && categories.flatMap(l1 => (l1.children || []).flatMap((l2: any) => (l2.children || []).map((l3: any) => (
                    <tr key={l3.id} className={`border-b border-slate-100 transition-colors ${selectedCategoryIds.includes(l3.id) ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}>
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedCategoryIds.includes(l3.id)} 
                          onChange={() => toggleCategorySelection(l3.id)}
                          className="w-4 h-4 rounded border-slate-300 transition cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        {editingCategoryId === l3.id ? <input className="w-full p-2 border-2 border-indigo-200 rounded bg-white shadow-sm font-bold text-slate-900" value={editCatName} onChange={e=>setEditCatName(e.target.value)} autoFocus /> : <span className="pl-1">{l3.name}</span>}
                      </td>
                      <td className="p-3"><span className="text-[10px] font-black text-slate-400 tracking-tight uppercase leading-none">{l1.name} <span className="text-slate-300 text-[8px] mx-1">/</span> {l2.name}</span></td>
                      <td className="p-3 text-right">
                        {editingCategoryId === l3.id ? (
                          <div className="relative">
                            <input type="number" className="w-full p-2 border-2 border-indigo-200 rounded text-right bg-white shadow-sm font-black text-indigo-700" value={editCatBudget} onChange={e=>setEditCatBudget(e.target.value)} />
                            <span className="absolute right-3 top-2 text-xs text-slate-400">원</span>
                          </div>
                        ) : (
                          <span className="font-black text-indigo-600 px-2">{l3.budgetAmount.toLocaleString()}원</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          {editingCategoryId === l3.id ? (
                            <>
                              <button onClick={() => handleUpdateCategory(l3.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-black rounded-md shadow-sm hover:bg-blue-700 transition"><CheckCircle2 className="w-3.5 h-3.5"/> 저장</button>
                              <button onClick={() => setEditingCategoryId(null)} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-md hover:bg-slate-200 transition"><XIcon className="w-3.5 h-3.5"/> 취소</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingCategoryId(l3.id); setEditCatName(l3.name); setEditCatBudget(l3.budgetAmount.toString()); }} className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-black rounded-md hover:bg-indigo-100 transition-all border border-indigo-100"><Edit className="w-3.5 h-3.5"/> 수정</button>
                              <button onClick={()=>handleDeleteCategory(l3.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"><Trash2 className="w-4 h-4"/></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))))}

                </tbody>
              </table>
            </div>

            <div className="w-[320px] bg-white p-5 rounded-xl border border-indigo-100 self-start shadow-sm ring-1 ring-slate-200/50">
              <h3 className="text-xs font-black text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500"/> 신규 항목 등록
              </h3>
              <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
                {settingsViewLevel > 1 && (
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1.5"><span className="text-red-500">*</span> 상위 소속 항목 선택</label>
                    <select className="w-full p-2 text-sm font-bold border border-slate-300 rounded shadow-sm bg-white" required value={settingParentId||''} onChange={e=>setSettingParentId(e.target.value)}>
                      <option value="">-- 부모 항목 --</option>
                      {settingsViewLevel === 2 
                        ? categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)
                        : categories.flatMap(c => c.children?.map((c2:any)=><option key={c2.id} value={c2.id}>[{c.name}] {c2.name}</option>))
                      }
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-black text-slate-500 mb-1.5"><span className="text-red-500">*</span> 신규 항목 이름</label>
                  <input type="text" required placeholder="예: 여비, 강사료 등" className="w-full p-2 text-sm font-bold border border-slate-300 shadow-sm rounded bg-white" value={newCatName} onChange={e=>setNewCatName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 mb-1.5"><span className="text-red-500">*</span> 초기 배정 금액 (원)</label>
                  <input type="number" required placeholder="0" className="w-full p-2 text-sm font-black text-indigo-700 bg-white border border-slate-300 shadow-sm rounded text-right" value={newCatBudget} onChange={e=>setNewCatBudget(e.target.value)} />
                </div>
                <button type="submit" className="w-full mt-2 bg-indigo-600 text-white px-4 py-3 text-sm rounded-lg font-black tracking-wide shadow-md hover:bg-indigo-700 transition">
                  {settingsViewLevel === 1 ? '비목 등록' : settingsViewLevel === 2 ? '관리세목 등록' : '세세목 등록'}
                </button>
              </form>
            </div>
         </div>
      </Card>

      {/* BOTTOM VIEW: 집행명세서 그리드 */}
      <h2 id="bottom-view-heading" className="text-2xl font-black mt-12 mb-4 flex items-between gap-2 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
          상세 집행명세
          {selectedCategoryId && (
            <span className="ml-4 text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold flex items-center gap-1 cursor-pointer hover:bg-red-100 hover:text-red-600" onClick={() => setSelectedCategoryId(null)}>
              필터 해제 <XIcon className="w-3 h-3 ml-1" />
            </span>
          )}
        </div>
        <div className="ml-auto">
          <button onClick={handleExportCurrentGrid} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 rounded-lg text-sm font-bold transition">
            <ArrowDownToLine className="w-4 h-4" /> 현재 뷰 표 다운로드
          </button>
        </div>
      </h2>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input type="text" placeholder="명세서 내용 검색..." className="pl-9 pr-4 py-2 border rounded-xl text-sm font-bold text-slate-600 w-64 bg-white shadow-sm" />
          </div>
          <button 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-all"
          >
            {sortOrder === 'desc' ? '최신순' : '오래된순'}
          </button>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-600 transition-colors">
          <Plus className="w-4 h-4" /> 내역 추가 등록
        </button>
      </div>

      {/* 명세 그리드 */}
      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <div className="overflow-auto max-h-[520px]">
          <table className="w-full text-[13px] text-left border-collapse min-w-[1400px]">
             <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-widest border-b border-slate-100">
               <tr>
                 <th className="px-3 py-3 w-12 text-center">No</th>
                 <th className="px-3 py-3 w-32">상태 / 일자</th>
                 <th className="px-3 py-3 w-28">비목</th>
                 <th className="px-3 py-3 w-40">관리세목</th>
                 <th className="px-3 py-3 w-40">세세목</th>
                 <th className="px-4 py-3">집행 용도 / 적요</th>
                 <th className="px-3 py-3 w-32 text-right text-blue-700">금액(합계)</th>
                 <th className="px-3 py-3 w-28 text-right font-medium">공급가액</th>
                 <th className="px-3 py-3 w-28 text-right font-medium">부가세</th>
                 <th className="px-4 py-3 w-40">증빙 / 비고</th>
                 <th className="px-3 py-3 w-24 text-center">관리</th>
               </tr>
             </thead>
             <tbody>
               {filteredExpenditures.length === 0 ? (
                 <tr><td colSpan={11} className="py-20 text-center font-bold text-slate-400">등록된 집행 데이터가 없습니다.</td></tr>
               ) : (
                 filteredExpenditures.map((exp: any, idx: number) => (
                   <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                     <td className="px-3 py-3 text-slate-400 text-center font-black">{idx + 1}</td>
                     <td className="px-3 py-3">
                       <div className="flex flex-col gap-1">
                         {exp.executionDate ? (
                           <>
                             <span className="inline-flex items-center w-fit px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded">집행완료</span>
                             <span className="font-bold text-slate-700">{new Date(exp.executionDate).toLocaleDateString()}</span>
                           </>
                         ) : (
                           <>
                             <span className="inline-flex items-center w-fit px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black rounded">집행예정</span>
                             <span className="text-slate-400 text-[11px] italic">날짜 미지정</span>
                           </>
                         )}
                       </div>
                     </td>
                     <td className="px-3 py-3">
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
                        <span className="text-sm font-black text-slate-800">
                          {exp.subDetailName || exp.category?.name || '세세목 미지정'}
                        </span>
                      </td>
                     <td className="px-4 py-3">
                       <div className="font-bold text-slate-700">{exp.purpose}</div>
                       {exp.memo && <div className="text-[11px] text-slate-400 mt-0.5 italic">{exp.memo}</div>}
                     </td>
                     <td className="px-3 py-3 text-right font-black text-slate-900 bg-slate-50/30">
                       {Number(exp.totalAmount).toLocaleString()}
                     </td>
                     <td className="px-3 py-3 text-right font-bold text-slate-500">
                       {Number(exp.supplyAmount).toLocaleString()}
                     </td>
                     <td className="px-3 py-3 text-right font-bold text-slate-500">
                       {Number(exp.taxAmount).toLocaleString()}
                     </td>
                     <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-[11px] font-black text-slate-600">
                            <FileText className="w-3 h-3 text-slate-400" />
                            {exp.evidenceType || '-'}
                          </div>
                          {exp.originalFileName && (
                            <span className="text-[10px] text-emerald-600 truncate max-w-[140px] font-bold" title={exp.originalFileName}>
                              📎 {exp.originalFileName}
                            </span>
                          )}
                        </div>
                     </td>
                     <td className="px-3 py-3">
                        <div className="flex justify-center items-center gap-1.5 min-w-[120px]">
                          <button onClick={() => openEditModal(exp)} className="px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 text-[11px] font-black border border-blue-100" title="수정">
                            <Edit className="w-3.5 h-3.5" /> 수정
                          </button>
                          <button onClick={()=>handleDelete(exp.id)} className="px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1 text-[11px] font-black border border-red-100" title="삭제">
                            <Trash2 className="w-3.5 h-3.5" /> 삭제
                          </button>
                        </div>
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Overlay for Add / Edit Expenditure */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl p-6 rounded-2xl border-0 ring-1 ring-slate-200/50 relative">
            <form onSubmit={handleSubmitExpenditure} className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                  {editingExpId ? '집행명세 수정' : '새 집행명세 등록'}
                  {!editingExpId && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">3단계 선택</span>}
                </h3>
                <button type="button" onClick={() => {setShowForm(false); setEditingExpId(null);}} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><XIcon className="w-5 h-5"/></button>
              </div>
              
              {/* 3단계 Cascading Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-5 border-b border-slate-100">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-2 tracking-wider">비목 (Level 1) <span className="text-red-500">*</span></label>
                  <select className="w-full p-2.5 border-2 border-slate-200 rounded-lg text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-400 transition-colors outline-none" value={formL1} onChange={e => {setFormL1(e.target.value); setFormL2(''); setFormData({...formData, categoryId: ''});}} required>
                    <option value="">-- 비목 선택 --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-2 tracking-wider">관리세목 (Level 2) <span className="text-red-500">*</span></label>
                  <select className="w-full p-2.5 border-2 border-slate-200 rounded-lg text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-400 transition-colors outline-none" value={formL2} onChange={e => {setFormL2(e.target.value); setFormData({...formData, categoryId: e.target.value});}} required disabled={!formL1}>
                    <option value="">-- 관리세목 선택 --</option>
                    {categories.find(c => c.id === formL1)?.children?.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-2 tracking-wider">세세목명 (상세 내역) <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="직접 입력 (예: 강사료, 여비 등)" className="w-full p-2.5 border-2 border-indigo-200 rounded-lg text-sm font-black bg-indigo-50/50 text-indigo-900 focus:bg-white focus:border-indigo-400 transition-colors outline-none placeholder:font-normal placeholder:text-indigo-300" value={formData.subDetailName} onChange={e => setFormData({...formData, subDetailName: e.target.value})} required disabled={!formL2} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-2 tracking-wider">집행일 <span className="normal-case text-slate-400 font-bold ml-1">(비우면 예정)</span></label>
                  <input type="date" className="w-full p-2.5 border-2 border-slate-200 rounded-lg text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-400 transition-colors outline-none" value={formData.executionDate} onChange={e => setFormData({...formData, executionDate: e.target.value})} />
                </div>
                
                {/* 3개 금액 분할 입력 */}
                <div className="col-span-3 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-blue-600 mb-2 tracking-wider flex items-center justify-between">금액 (합계) <span className="text-[9px] text-slate-400 font-bold lowercase">*입력시 자동분리</span></label>
                    <input type="text" placeholder="예: 110,000" required className="w-full p-2.5 border-2 border-blue-300 rounded-lg text-base font-black text-slate-900 text-right bg-blue-50/30 focus:bg-white focus:border-blue-500 outline-none transition-colors" value={formData.totalAmount} onChange={e => handleAmountChange('total', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-2 tracking-wider">공급가액</label>
                    <input type="text" placeholder="0" className="w-full p-2.5 border-2 border-slate-200 rounded-lg text-sm font-bold text-slate-700 text-right bg-white focus:border-slate-400 outline-none transition-colors" value={formData.supplyAmount} onChange={e => handleAmountChange('supply', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-2 tracking-wider">부가세</label>
                    <input type="text" placeholder="0" className="w-full p-2.5 border-2 border-slate-200 rounded-lg text-sm font-bold text-slate-700 text-right bg-white focus:border-slate-400 outline-none transition-colors" value={formData.taxAmount} onChange={e => handleAmountChange('tax', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-2 tracking-wider">증빙 종류</label>
                  <select className="w-full p-2.5 border-2 border-slate-200 rounded-lg text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-colors" value={formData.evidenceType} onChange={e => setFormData({...formData, evidenceType: e.target.value})}>
                    <option>세금계산서</option><option>입금증</option><option>영수증</option><option>기타증빙</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-2 tracking-wider">증빙 파일 <span className="normal-case text-slate-400 font-bold ml-1">(PDF/Img)</span></label>
                  <input type="file" accept=".pdf,image/*" className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-slate-100 hover:file:bg-slate-200 file:font-black file:text-slate-700 cursor-pointer transition-colors" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                </div>
                <div className="col-span-2 flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-2 tracking-wider">집행 용도 / 적요</label>
                    <input type="text" placeholder="용도를 간단히 기록하세요" className="w-full p-2.5 border-2 border-slate-200 rounded-lg text-sm font-bold bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-colors" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-2 tracking-wider">메모</label>
                    <input type="text" placeholder="기타 참고사항" className="w-full p-2.5 border-2 border-slate-200 rounded-lg text-sm font-medium bg-slate-50 focus:bg-white focus:border-blue-400 outline-none transition-colors italic" value={formData.memo} onChange={e => setFormData({...formData, memo: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => {setShowForm(false); setEditingExpId(null);}} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                  취소
                </button>
                <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black shadow-md hover:bg-blue-700 flex items-center gap-2 transition-colors">
                  <CheckCircle2 className="w-5 h-5"/> {editingExpId ? '수정 내용 저장' : '목록에 추가'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
