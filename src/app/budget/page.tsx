"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { 
  Wallet, FileSpreadsheet, Plus, Search, Filter,
  ArrowDownToLine, Download, Upload, CheckCircle2,
  Trash2, Edit, AlertCircle, FileText
} from "lucide-react";

export default function BudgetPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [expenditures, setExpenditures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Drill-down 필터 상태
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // 새 명세서 입력 상태
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    executionDate: '',
    categoryId: '',
    purpose: '',
    totalAmount: '',
    evidenceType: '세금계산서',
    memo: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 1. 초기 데이터 로드
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

  // 2. 단일명세서 등록 핸들러
  const handleCreateExpenditure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) return alert("세세목(항목)을 선택해주세요.");
    
    try {
      let evidenceFileName, evidenceFileId, originalFileName;
      
      // 파일이 첨부된 경우 Upload API 먼저 전송
      if (selectedFile) {
        const fileData = new FormData();
        fileData.append('file', selectedFile);
        fileData.append('executionDate', formData.executionDate);
        fileData.append('evidenceType', formData.evidenceType);
        
        const uploadRes = await fetch('/api/budget/evidence/upload', {
          method: 'POST',
          body: fileData
        });
        
        const uploadJson = await uploadRes.json();
        evidenceFileName = uploadJson.evidenceFileName;
        evidenceFileId = uploadJson.evidenceFileId;
        originalFileName = uploadJson.originalFileName;
      }

      // 등록 API 전송 (부가세 10/11 자동 분리를 위해 totalAmount만 전송)
      const submitData = {
        ...formData,
        totalAmount: Number(formData.totalAmount.replace(/,/g, '')),
        evidenceFileName,
        evidenceFileId,
        originalFileName
      };

      const res = await fetch('/api/budget/expenditures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (res.ok) {
        alert("집행 내역이 등록되었습니다.");
        setShowForm(false);
        setFormData({ executionDate: '', categoryId: '', purpose: '', totalAmount: '', evidenceType: '세금계산서', memo: '' });
        setSelectedFile(null);
        fetchData();
      }
    } catch(e) {
      alert("등록 중 오류가 발생했습니다.");
    }
  };

  // 3. 삭제 핸들러
  const handleDelete = async (id: string) => {
    if(!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await fetch(`/api/budget/expenditures/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      alert("삭제 실패");
    }
  };

  // 4. 엑셀 내보내기 다운로드
  const handleExport = () => {
    window.open('/api/budget/export', '_blank');
  };

  // UI 필터 보조
  const getFlatChildCategories = () => {
    const flat: any[] = [];
    categories.forEach(p => {
      p.children.forEach((c: any) => flat.push({...c, parentName: p.name}));
    });
    return flat;
  };
  const allSubCategories = getFlatChildCategories();

  const filteredExpenditures = selectedCategoryId 
    ? expenditures.filter(exp => exp.categoryId === selectedCategoryId)
    : expenditures;

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
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-emerald-700"
          >
            <Download className="w-4 h-4" /> 산출내역서/집행명세 엑셀 다운로드
          </button>
        </div>
      </div>

      {/* TOP VIEW: 대시보드 (산출내역서) */}
      <Card className="border-none shadow-md overflow-hidden bg-white">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-black text-slate-800 flex items-center gap-2">
            📊 비목별 예산 현황 총괄 (산출내역서)
          </h2>
          <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            행을 클릭하면 하단 집행명세가 <b>필터링</b>됩니다.
          </span>
        </div>
        
        <div className="overflow-x-auto max-h-[50vh] custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white shadow-sm z-10 text-slate-500">
              <tr className="uppercase text-[11px] font-black tracking-tighter bg-slate-100/80">
                <th className="px-4 py-3 min-w-[120px]">구분(비목)</th>
                <th className="px-4 py-3 border-l border-slate-200 min-w-[200px]">항목(세세목)</th>
                <th className="px-4 py-3 border-l border-slate-200 text-right text-blue-700">배정예산</th>
                <th className="px-4 py-3 text-right">사용액</th>
                <th className="px-4 py-3 text-right text-orange-600">사용예정액(미정)</th>
                <th className="px-4 py-3 text-right">잔액</th>
                <th className="px-4 py-3 text-center border-l border-slate-200">사용률</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((parent) => (
                <React.Fragment key={parent.id}>
                  {parent.children.map((child: any, idx: number) => (
                    <tr 
                      key={child.id} 
                      onClick={() => setSelectedCategoryId(child.id === selectedCategoryId ? null : child.id)}
                      className={`cursor-pointer transition-colors border-b border-slate-50
                        ${child.id === selectedCategoryId ? 'bg-blue-50/50 outline outline-1 outline-blue-200 z-10 relative' : 'hover:bg-slate-50'}`}
                    >
                      {idx === 0 && (
                        <td rowSpan={parent.children.length} className="px-4 py-3 align-top font-black text-slate-800 bg-white border-b border-slate-100">
                          {parent.name}
                        </td>
                      )}
                      <td className="px-4 py-3 border-l border-slate-100 font-bold text-slate-700 flex items-center gap-2">
                        {child.name}
                      </td>
                      <td className="px-4 py-3 text-right font-black border-l border-slate-100 text-slate-800">
                        {child.budgetAmount.toLocaleString()}원
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-600">
                        {child.totalUsed > 0 ? child.totalUsed.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-orange-500">
                        {child.totalExpected > 0 ? child.totalExpected.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-700">
                        {child.balance.toLocaleString()}원
                      </td>
                      <td className="px-4 py-3 border-l border-slate-100">
                        <div className="flex items-center gap-2">
                           <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(child.usageRate, 100)}%` }}></div>
                           </div>
                           <span className="w-10 text-right font-black text-[11px] text-slate-600">{child.usageRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* 소계 렌더링 */}
                  <tr className="bg-slate-50/80 border-b-2 border-slate-200">
                    <td colSpan={2} className="px-4 py-2.5 font-black text-slate-500 text-center tracking-widest text-[11px]">
                      [{parent.name} 소계]
                    </td>
                    <td className="px-4 py-2.5 text-right font-black text-slate-800 border-l border-slate-100">{parent.budgetAmount.toLocaleString()}원</td>
                    <td className="px-4 py-2.5 text-right font-black text-blue-600">{parent.totalUsed.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-black text-orange-500">{parent.totalExpected.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-black text-slate-800">{parent.balance.toLocaleString()}원</td>
                    <td className="px-4 py-2.5 font-black text-center text-blue-600 text-xs border-l border-slate-100">{parent.usageRate}%</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* BOTTOM VIEW: 집행명세서 그리드 */}
      <h2 className="text-2xl font-black mt-12 mb-4 flex items-center gap-2">
        <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
        상세 집행명세
        {selectedCategoryId && (
          <span className="ml-4 text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold flex items-center gap-1 cursor-pointer hover:bg-red-100 hover:text-red-600" onClick={() => setSelectedCategoryId(null)}>
            필터됨: {allSubCategories.find((c:any) => c.id === selectedCategoryId)?.name} <X className="w-3 h-3 ml-1" />
          </span>
        )}
      </h2>

      {showForm ? (
        <Card className="p-6 mb-6 border-blue-200 shadow-xl shadow-blue-900/5 items-center">
          <form onSubmit={handleCreateExpenditure} className="space-y-4">
             <div className="flex justify-between items-center mb-2">
                <h3 className="font-black text-lg text-slate-800">새 집행명세 등록</h3>
                <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">닫기</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">비목/세세목 <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full p-2 border rounded-lg text-sm bg-slate-50 font-bold" 
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                  >
                    <option value="">-- 항목 선택 --</option>
                    {allSubCategories.map((c:any) => (
                      <option key={c.id} value={c.id}>[{c.parentName}] {c.name}</option>
                    ))}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">집행일 (비우면 사용예정액)</label>
                  <input 
                    type="date" 
                    className="w-full p-2 border rounded-lg text-sm font-bold"
                    value={formData.executionDate}
                    onChange={(e) => setFormData({...formData, executionDate: e.target.value})}
                  />
               </div>
               <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">전체 금액 (입력 시 10/11 분리) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="숫자 입력 (원)"
                      required
                      className="w-full p-2 pl-4 pr-8 border rounded-lg text-sm font-black text-slate-800 bg-white"
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({...formData, totalAmount: e.target.value.replace(/[^0-9]/g, '')})}
                    />
                    <span className="absolute right-3 top-2 text-slate-400 font-bold text-sm">원</span>
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">증빙 종류</label>
                  <select 
                    className="w-full p-2 border rounded-lg text-sm"
                    value={formData.evidenceType}
                    onChange={(e) => setFormData({...formData, evidenceType: e.target.value})}
                  >
                    <option>세금계산서</option>
                    <option>입금증</option>
                    <option>영수증</option>
                    <option>기타증빙</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">파일 업로드 (PDF/Img)</label>
                  <input 
                    type="file" 
                    accept=".pdf,image/*" 
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
               </div>
               <div className="col-span-6 flex gap-3 mt-2">
                  <div className="flex-1">
                     <input type="text" placeholder="집행 용도" className="w-full p-2 border rounded-lg text-sm" value={formData.purpose} onChange={(e) => setFormData({...formData, purpose: e.target.value})} />
                  </div>
                  <div className="flex-1">
                     <input type="text" placeholder="비고 메모" className="w-full p-2 border rounded-lg text-sm" value={formData.memo} onChange={(e) => setFormData({...formData, memo: e.target.value})} />
                  </div>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-black text-sm shadow-md hover:bg-blue-700">
                    저장하기
                  </button>
               </div>
             </div>
          </form>
        </Card>
      ) : (
        <div className="flex justify-between items-center mb-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input type="text" placeholder="집행 내역 검색..." className="pl-9 pr-4 py-2 border rounded-xl text-sm font-bold text-slate-600 w-64 bg-white shadow-sm" />
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> 항목 추가 / 등록
          </button>
        </div>
      )}

      {/* 명세 그리드 */}
      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left border-collapse min-w-[1200px]">
            <thead className="bg-slate-50/80 text-slate-500 font-bold text-[11px] uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3 text-center">집행일 / 상태</th>
                <th className="px-4 py-3">비목 / 세세목</th>
                <th className="px-4 py-3">집행 용도</th>
                <th className="px-4 py-3 text-right">공급가액</th>
                <th className="px-4 py-3 text-right">부가세액</th>
                <th className="px-4 py-3 text-right text-blue-700">합계금액</th>
                <th className="px-4 py-3">증빙 종류 / 파일</th>
                <th className="px-4 py-3 text-center">동작</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenditures.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center font-bold text-slate-400">데이터가 없습니다.</td>
                </tr>
              ) : (
                filteredExpenditures.map((exp: any, idx: number) => (
                  <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-black">{idx + 1}</td>
                    <td className="px-4 py-3 text-center">
                      {exp.executionDate ? (
                        <span className="font-bold text-slate-700">{new Date(exp.executionDate).toLocaleDateString()}</span>
                      ) : (
                        <span className="px-2 py-1 bg-orange-100 text-orange-600 text-[10px] font-black rounded-lg">미정(사용예정)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                        {exp.category.parent?.name}
                      </span><br/>
                      {exp.category.name}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-600 line-clamp-2">{exp.purpose}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-500">{Number(exp.supplyAmount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-500">{Number(exp.taxAmount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">{Number(exp.totalAmount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black text-slate-500">{exp.evidenceType || '-'}</span>
                        {exp.evidenceFileId && (
                           <div className="flex items-center gap-1">
                             <FileText className="w-3 h-3 text-emerald-500" />
                             <span className="text-[10px] font-bold text-emerald-600 truncate max-w-[120px]" title={exp.originalFileName}>
                               {exp.evidenceFileId}
                             </span>
                           </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={()=>handleDelete(exp.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}

// X 아이콘용 컴포넌트 추가
function X({ className, ...props }:any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
}
