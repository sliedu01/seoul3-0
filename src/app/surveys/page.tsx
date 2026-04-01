"use client"
import React, { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, FileText, ChevronLeft, ChevronRight, User, Calendar as CalendarIcon, Building, Trash2, Edit3, Plus, X, Globe, FileUp, Eye, Save, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import * as XLSX from 'xlsx';

export default function SurveysPage() {
  const router = useRouter()
  const { canEdit, canDelete, isMember } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  // Filters state
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([])
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([])
  const [selectedInstructor, setSelectedInstructor] = useState("")
  const [surveyTypeFilter, setSurveyTypeFilter] = useState("ALL") // ALL, PRE, POST, SATISFACTION
  const [researchTargetFilter, setResearchTargetFilter] = useState("")
  
  const [isInitialized, setIsInitialized] = useState(false)
  
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<any>(null)
  const [editFormData, setEditFormData] = useState<any>({ respondentId: "", researchTarget: "", answers: [] })

  // Options state
  const [programs, setPrograms] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [instructors, setInstructors] = useState<string[]>([])

  const fetchData = () => {
    setLoading(true)
    const params = new URLSearchParams({ 
      page: page.toString(),
      search: search,
      sortBy,
      sortOrder,
    })
    if (startDate) params.append("startDate", startDate)
    if (endDate) params.append("endDate", endDate)
    if (selectedProgramIds.length > 0) params.append("programIds", selectedProgramIds.join(","))
    if (selectedPartnerIds.length > 0) params.append("partnerIds", selectedPartnerIds.join(","))
    if (selectedInstructor) params.append("instructor", selectedInstructor)
    if (surveyTypeFilter !== "ALL") params.append("type", surveyTypeFilter)
    if (researchTargetFilter) params.append("researchTarget", researchTargetFilter)

    fetch(`/api/surveys?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        setData(json)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchData()
  }, [page, search, startDate, endDate, selectedProgramIds, selectedPartnerIds, selectedInstructor, surveyTypeFilter, sortBy, sortOrder])

  useEffect(() => {
    const initFilters = async () => {
      try {
        const [programsRes, partnersRes, sessionsRes] = await Promise.all([
          fetch("/api/programs").then(res => res.json()),
          fetch("/api/partners").then(res => res.json()),
          fetch("/api/sessions").then(res => res.json())
        ]);

        if (Array.isArray(programsRes)) setPrograms(programsRes);
        if (Array.isArray(partnersRes)) setPartners(partnersRes);
        
        // Find earliest date from programs/sessions
        let minDate: Date | null = null;
        if (Array.isArray(programsRes)) {
          programsRes.forEach(p => {
            (p.sessions || []).forEach((s: any) => {
              const d = new Date(s.date);
              if (!minDate || d < minDate) minDate = d;
            });
          });
        }

        // Set default dates
        const today = new Date();
        const endDateStr = today.toISOString().split('T')[0];
        setEndDate(endDateStr);

        if (minDate) {
          const startDateStr = (minDate as Date).toISOString().split('T')[0];
          setStartDate(startDateStr);
        } else {
          // Fallback if no data
          setStartDate(endDateStr);
        }

        if (Array.isArray(sessionsRes)) {
          console.log("Sessions fetched:", sessionsRes.length);
          const uniqueInstructors = Array.from(new Set(sessionsRes.map((s: any) => s.instructorName).filter(Boolean))) as string[];
          setInstructors(uniqueInstructors);
        }
        
        setIsInitialized(true);
        console.log("Filters initialized with:", { minDate, endDate: endDateStr });
      } catch (err) {
        console.error("Filter initialization error:", err);
        // Ensure at least today's date if fetch fails
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
        setIsInitialized(true);
      }
    };

    initFilters();
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 설문 응답을 삭제하시겠습니까?")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/surveys/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteAll = async (items: any[]) => {
    if (!confirm(`해당 세션의 모든 응답(${items.length}건)을 일괄 삭제하시겠습니까?`)) return
    setLoading(true)
    try {
      // Direct deletion for each item (simplest without changing API)
      await Promise.all(items.map(item => fetch(`/api/surveys/${item.id}`, { method: 'DELETE' })))
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEdit = (survey: any) => {
    setEditingSurvey(survey)
    setEditFormData({
      respondentId: survey.respondentId,
      researchTarget: survey.researchTarget,
      answers: survey.answers.map((a: any) => ({
        id: a.id,
        questionId: a.questionId,
        score: a.score,
        preScore: a.preScore,
        postChange: a.postChange,
        text: a.text,
        // UI helper info
        questionContent: survey.template?.questions?.find((q: any) => q.id === a.questionId)?.content,
        questionType: survey.template?.questions?.find((q: any) => q.id === a.questionId)?.type,
        growthType: survey.template?.questions?.find((q: any) => q.id === a.questionId)?.growthType
      }))
    })
    setShowEditModal(true)
  }

  const handleInlineUpdate = async (id: string, field: string, value: any, isAnswer: boolean = true, extra: any = {}) => {
    try {
      const url = isAnswer ? `/api/surveys/answers/${id}` : `/api/surveys/${id}`;
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value, ...extra })
      });
      fetchData(); // Refresh to recalculate averages
    } catch (err) {
      console.error("Inline update failed:", err);
    }
  };

  // Dynamic filter lists
  const filteredPrograms = React.useMemo(() => {
    if (!startDate || !endDate) return programs;
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    eDate.setHours(23, 59, 59, 999);
    
    return programs.filter(p => {
      const sessions = p.sessions || [];
      if (sessions.length === 0) return false;
      return sessions.some((s: any) => {
        const d = new Date(s.date);
        return d >= sDate && d <= eDate;
      });
    });
  }, [programs, startDate, endDate]);

  const filteredPartners = React.useMemo(() => {
    return partners.filter(pt => {
      // Filter by Programs
      const matchesProgram = selectedProgramIds.length === 0 || (pt.programIds || []).some((id: string) => selectedProgramIds.includes(id));
      if (!matchesProgram) return false;
      
      // Filter by Dates
      if (!startDate || !endDate) return true;
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      
      const dates = pt.sessionDates || [];
      // If partner has no sessions, it should probably not show up if date range is set
      if (dates.length === 0) return false;

      return dates.some((dStr: string) => {
        const d = new Date(dStr);
        return d >= sDate && d <= eDate;
      });
    });
  }, [partners, selectedProgramIds, startDate, endDate]);

  const handleUpdate = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/surveys/${editingSurvey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      })
      if (res.ok) {
        setShowEditModal(false)
        fetchData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadExcel = async (groupName: string, items: any[]) => {
    if (items.length === 0) return;
    const XLSX = await import("xlsx");
    
    // 1. Identify questions from the template
    const template = items[0].template;
    const questions = template?.questions || [];
    
    const isSat = (q: any) => q.growthType === 'NONE' || q.category?.includes('만족') || q.content?.includes('만족');
    const isMat = (q: any) => q.type === 'MCQ' && !isSat(q);
    
    const matQs = questions.filter(isMat).sort((a:any, b:any) => a.order - b.order);
    const satQs = questions.filter((q:any) => q.type === 'MCQ' && isSat(q)).sort((a:any, b:any) => a.order - b.order);
    const essayQs = questions.filter((q:any) => q.type === 'ESSAY');

    const getCat = (q: any) => {
        if (!q.category) return "문항";
        return q.category.includes('|') ? q.category.split('|').pop() : q.category;
    };

    // 2. Build Headers
    const headers = ["성명", "대상"];
    matQs.forEach((q: any) => headers.push(`사전_${getCat(q)}`));
    headers.push("사전_평균");
    matQs.forEach((q: any) => headers.push(`사후_${getCat(q)}`));
    headers.push("사후_평균");
    headers.push("학습인지변화도(%)", "역량도달률(%)", "학습목표근접도(%)");
    satQs.forEach((q: any) => headers.push(`만족도_${getCat(q)}`));
    headers.push("전체만족도");
    essayQs.forEach((q: any) => headers.push(`주관식_${getCat(q) || "의견"}`));

    // 3. Build Data Rows
    const dataRows = items.map(survey => {
        const row: any = {
            "성명": survey.studentName || survey.respondentId?.substring(0,8),
            "대상": survey.researchTarget === 'ELEMENTARY' ? '초등' : '중고'
        };

        let preSum = 0, postSum = 0, matCount = 0;
        let improvedCount = 0;

        matQs.forEach((q: any) => {
            const ans = survey.answers?.find((a: any) => a.questionId === q.id);
            const pre = ans?.preScore || 0;
            const post = q.growthType === 'CHANGE' ? (ans?.preScore || 0) + (ans?.postChange || 0) : (ans?.score || 0);
            
            row[`사전_${getCat(q)}`] = pre || "";
            row[`사후_${getCat(q)}`] = post || "";
            
            if (pre > 0) {
                preSum += pre;
                matCount++;
            }
            if (post > 0) postSum += post;
            if (post > pre) improvedCount++;
        });

        const preAvg = matCount > 0 ? preSum / matCount : 0;
        const postAvg = matCount > 0 ? postSum / matCount : 0;
        
        row["사전_평균"] = preAvg ? parseFloat(preAvg.toFixed(2)) : "";
        row["사후_평균"] = postAvg ? parseFloat(postAvg.toFixed(2)) : "";
        
        // Growth Metrics
        row["학습인지변화도(%)"] = parseFloat((((postAvg - preAvg) / 5) * 100).toFixed(1));
        row["역량도달률(%)"] = parseFloat(((postAvg / 5) * 100).toFixed(1));
        row["학습목표근접도(%)"] = (5 - preAvg) > 0 ? parseFloat(((postAvg - preAvg) / (5 - preAvg) * 100).toFixed(1)) : (postAvg >= preAvg ? 100 : 0);

        let satSum = 0, satCount = 0;
        satQs.forEach((q: any) => {
            const ans = survey.answers?.find((a: any) => a.questionId === q.id);
            const score = ans?.score || 0;
            row[`만족도_${getCat(q)}`] = score || "";
            if (score > 0) {
                satSum += score;
                satCount++;
            }
        });
        row["전체만족도"] = satCount > 0 ? parseFloat((satSum / satCount).toFixed(2)) : "";

        // Essay - Separate columns
        essayQs.forEach((q: any) => {
            const ans = survey.answers?.find((a: any) => a.questionId === q.id);
            row[`주관식_${getCat(q) || "의견"}`] = ans?.text || ans?.textValue || "";
        });

        // Return values in header order
        return headers.map(h => row[h]);
    });

    // 4. Create and download workbook
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "설문결과");
    XLSX.writeFile(wb, `${groupName.replace(/[/\\?%*:|"<>]/g, '-')}_설문결과.xlsx`);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (loading && !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  const { surveys, pagination } = data || { surveys: [], pagination: { totalPages: 1 } }

  // Grouping logic (Restore)
  const groupedSurveys = surveys.reduce((acc: any, survey: any) => {
    const pOrder = survey.session?.program?.order || 0;
    const pName = survey.session?.program?.name || "미정 사업";
    const startDate = survey.session?.date || "";
    const key = `${pOrder}. ${pName}-${survey.session?.partner?.name}-${survey.session?.sessionNumber}`
    if (!acc[key]) {
      acc[key] = {
        info: {
          program: `${pOrder}. ${pName}`,
          programId: survey.session?.programId,
          partner: survey.session?.partner?.name,
          partnerId: survey.session?.partnerId,
          session: survey.session?.sessionNumber,
          instructor: survey.session?.instructorName || "미지정",
          startDate
        },
        items: []
      }
    }
    acc[key].items.push(survey)
    return acc
  }, {})

  // Sorting logic helper
  const sortedGroupedEntries = Object.entries(groupedSurveys).sort(([keyA, groupA]: any, [keyB, groupB]: any) => {
    const dateA = groupA.info.startDate || "";
    const dateB = groupB.info.startDate || "";
    if (dateA && dateB) return dateA.localeCompare(dateB);
    
    const numA = parseInt(keyA.split('.')[0]) || 0;
    const numB = parseInt(keyB.split('.')[0]) || 0;
    return numA - numB;
  });

  // Calculation Formulas - 사용 제안 산식 반영
  const calcExperienceImprovement = (pre: number, post: number) => ((post - pre) / 5) * 100;
  const calcPureGrowth = (pre: number, post: number) => (post / 5) * 100;
  const calcPotentialGrowth = (pre: number, post: number) => {
    if (pre >= 5) return post >= 5 ? 100 : -100;
    return ((post - pre) / (5 - pre)) * 100;
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-end no-print">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-inter">설문 결과 관리</h1>
          <p className="text-slate-500 mt-1 font-bold italic">수집된 전/후 성숙도 및 만족도 데이터를 정밀하게 관리하고 리포트에 즉시 반영합니다.</p>
        </div>
      </div>

      {/* Advanced Filters - AI 리포트 스타일 */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-2">
              <Filter className="w-3 h-3 text-blue-500"/> 조회 기간 (교육일 기준)
            </label>
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100/50">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 bg-transparent border-none text-sm font-bold focus:ring-0 p-1" 
              />
              <span className="text-slate-300 font-bold">~</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 bg-transparent border-none text-sm font-bold focus:ring-0 p-1" 
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-2">
                <Filter className="w-3 h-3 text-indigo-500"/> 사업 선택
              </label>
              <button 
                onClick={() => selectedProgramIds.length === filteredPrograms.length && filteredPrograms.length > 0 ? setSelectedProgramIds([]) : setSelectedProgramIds(filteredPrograms.map(p => p.id))}
                className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-tighter"
              >
                {selectedProgramIds.length === filteredPrograms.length && filteredPrograms.length > 0 ? "DESELECT ALL" : "SELECT ALL"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 scrollbar-hide">
              {filteredPrograms.length > 0 ? filteredPrograms.map(p => (
                <label 
                  key={p.id} 
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-2xl border text-[11px] font-black cursor-pointer transition-all active:scale-95 shadow-sm",
                    selectedProgramIds.includes(p.id) 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" 
                      : "bg-white border-slate-100 text-slate-500 hover:border-indigo-400 hover:bg-slate-50"
                  )}
                >
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={selectedProgramIds.includes(p.id)}
                    onChange={() => selectedProgramIds.includes(p.id) ? setSelectedProgramIds(selectedProgramIds.filter(id => id !== p.id)) : setSelectedProgramIds([...selectedProgramIds, p.id])}
                  />
                  {p.order}. {p.name}
                </label>
              )) : (
                <div className="text-[10px] font-bold text-slate-300 italic p-2">조회 기간 내 운영된 사업이 없습니다.</div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-2">
                <Filter className="w-3 h-3 text-emerald-500"/> 협력업체 선택
              </label>
              <button 
                onClick={() => selectedPartnerIds.length === filteredPartners.length && filteredPartners.length > 0 ? setSelectedPartnerIds([]) : setSelectedPartnerIds(filteredPartners.map(p => p.id))}
                className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-tighter"
              >
                {selectedPartnerIds.length === filteredPartners.length && filteredPartners.length > 0 ? "DESELECT ALL" : "SELECT ALL"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 scrollbar-hide">
              {filteredPartners.length > 0 ? filteredPartners.map(p => (
                <label 
                  key={p.id} 
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-2xl border text-[11px] font-black cursor-pointer transition-all active:scale-95 shadow-sm",
                    selectedPartnerIds.includes(p.id) 
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100" 
                      : "bg-white border-slate-100 text-slate-500 hover:border-emerald-400 hover:bg-slate-50"
                  )}
                >
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={selectedPartnerIds.includes(p.id)}
                    onChange={() => selectedPartnerIds.includes(p.id) ? setSelectedPartnerIds(selectedPartnerIds.filter(id => id !== p.id)) : setSelectedPartnerIds([...selectedPartnerIds, p.id])}
                  />
                  {p.name}
                </label>
              )) : (
                <div className="text-[10px] font-bold text-slate-300 italic p-2">해당 조건의 협력업체가 없습니다.</div>
              )}
            </div>
          </div>
        </div>

        {/* 하단 행: 강사/조사종류/검색/초기화 */}
        <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-slate-50">
          <select value={selectedInstructor} onChange={(e) => setSelectedInstructor(e.target.value)} className="h-10 px-4 bg-slate-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500">
            <option value="">전체 강사</option>
            {instructors.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <select value={surveyTypeFilter} onChange={(e) => setSurveyTypeFilter(e.target.value)} className="h-10 px-4 bg-slate-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500">
            <option value="ALL">전체(사전/사후+만족도)</option>
            <option value="MATURITY">사전/사후</option>
            <option value="SATISFACTION">만족도</option>
          </select>
          <select value={researchTargetFilter} onChange={(e) => setResearchTargetFilter(e.target.value)} className="h-10 px-4 bg-slate-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500">
            <option value="">전체 조사대상</option>
            <option value="ELEMENTARY">초등학생</option>
            <option value="MIDDLE">중학생</option>
            <option value="HIGH">고등학생</option>
            <option value="UNIVERSITY">대학생</option>
            <option value="OTHER">기타</option>
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="응답자 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 pl-11 pr-4 bg-slate-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500" />
          </div>
          <Button 
            variant="ghost" 
            className="h-10 px-6 rounded-2xl text-slate-400 font-black hover:bg-slate-50"
            onClick={() => { setStartDate(""); setEndDate(""); setSelectedProgramIds([]); setSelectedPartnerIds([]); setSelectedInstructor(""); setSurveyTypeFilter("ALL"); setResearchTargetFilter(""); setSearch(""); }}
          >
            필터 초기화
          </Button>
        </div>
      </div>

      {/* Main Table Layer - Accordion Structure */}
      <div className="space-y-6">
        {sortedGroupedEntries.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <Search className="w-12 h-12 text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-bold italic">조회된 설문 결과가 없습니다.</p>
          </div>
        ) : sortedGroupedEntries.map(([key, group]: any) => {
            // Aggregate Summary Stats for this Master Row
            const distMaturity: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            const distSatisfaction: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            let totalExpImp = 0, totalGrowth = 0, totalPotGrowth = 0, countImp = 0;
            let totalSat = 0, countSat = 0;
            const essayCombined: string[] = [];

            group.items.forEach((survey: any) => {
                let sExpImp = 0, sGrowth = 0, sPotGrowth = 0, sMCount = 0;
                survey.answers?.forEach((ans: any) => {
                    const q = survey.template?.questions?.find((q_orig: any) => q_orig.id === ans.questionId);
                    if (!q) return;
                    
                    const isS = q.growthType === 'NONE' || q.category?.includes('만족') || q.content?.includes('만족');
                    const isM = (q.growthType === 'CHANGE' || q.growthType === 'PRE_POST') && !isS;

                    if (isM) {
                        const pre = ans.preScore || 0;
                        const post = q.growthType === 'CHANGE' ? (ans.preScore || 0) + (ans.postChange || 0) : (ans.score || 0);
                        if (post > 0) {
                            distMaturity[Math.min(5, Math.max(1, Math.round(post)))]++;
                            // 산식 개정 반영: 인지변화도((post-pre)/5), 도달률(post/5)
                            sExpImp += ((post - pre) / 5) * 100;
                            sGrowth += (post / 5) * 100;
                            sPotGrowth += calcPotentialGrowth(pre, post);
                            sMCount++;
                        }
                    } else if (isS) {
                        if (ans.score > 0) {
                            distSatisfaction[ans.score]++;
                            totalSat += ans.score;
                            countSat++;
                        }
                    }
                    if (ans.text) essayCombined.push(ans.text);
                });
                if (sMCount > 0) {
                    totalExpImp += sExpImp / sMCount;
                    totalGrowth += sGrowth / sMCount;
                    totalPotGrowth += sPotGrowth / sMCount;
                    countImp++;
                }
            });

            const avgExpImp = countImp > 0 ? (totalExpImp / countImp).toFixed(1) : "0.0";
            const avgAttainment = countImp > 0 ? (totalGrowth / countImp).toFixed(1) : "0.0";
            const avgGoalProximity = countImp > 0 ? (totalPotGrowth / countImp).toFixed(1) : "0.0";
            const avgSat = countSat > 0 ? (totalSat / countSat).toFixed(1) : "0.0";
            
            const isExpanded = expandedGroups.includes(key);

            return (
              <Card key={key} className={cn(
                "border-none shadow-xl overflow-hidden rounded-[2.5rem] transition-all duration-500",
                isExpanded ? "ring-2 ring-blue-500 bg-white" : "bg-white/70 backdrop-blur-sm hover:bg-white"
              )}>
                {/* Master Row Header */}
                <div 
                  onClick={() => toggleGroup(key)}
                  className="p-8 cursor-pointer flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[11px] font-black">{group.info.program}</span>
                        {/* Survey Type Badge in Master Row */}
                        {(() => {
                            const types = Array.from(new Set(group.items.map((s: any) => s.type)));
                            return (types as string[]).map((t: string) => (
                                <span key={t} className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                    t === 'PRE' ? 'bg-blue-100 text-blue-600' : 
                                    t === 'POST' ? 'bg-indigo-100 text-indigo-600' : 
                                    t === 'SATISFACTION' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                                )}>
                                    {t === 'PRE' ? '사전' : t === 'POST' ? '사후' : t === 'SATISFACTION' ? '만족도' : t}
                                </span>
                            ));
                        })()}
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                            <Building className="w-3.5 h-3.5" /> {group.info.partner}
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{group.info.program.split('. ')[1] || group.info.program}</h3>
                    <div className="flex gap-4 text-[11px] font-black uppercase text-slate-500 tracking-tighter">
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">{group.info.session}회차 교육과정</span>
                        <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg">강사: {group.info.instructor}</span>
                        <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg">응답수: {group.items.length}명</span>
                        <div className="flex gap-2 ml-2">
                             <Button 
                                onClick={(e) => { e.stopPropagation(); handleDownloadExcel(key, group.items); }} 
                                size="sm" variant="outline" 
                                className="h-7 gap-1 rounded-lg text-[10px] font-black border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all bg-white"
                             >
                                <FileText className="w-3 h-3" /> 엑셀(다운로드)
                             </Button>
                             <Button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  router.push(`/reports?programId=${group.info.programId}&partnerId=${group.info.partnerId}`);
                                }} 
                                size="sm" 
                                className="h-7 gap-1 rounded-lg text-[10px] font-black bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
                             >
                                <Globe className="w-3 h-3" /> AI 분석 보고서
                             </Button>
                        </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                    {[
                        { label: "학습인지변화도", val: `${avgExpImp}%`, color: "text-blue-600", bg: "bg-blue-50" },
                        { label: "역량도달률", val: `${avgAttainment}%`, color: "text-indigo-600", bg: "bg-indigo-50" },
                        { label: "학습목표근접도", val: `${avgGoalProximity}%`, color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "전체 만족도", val: `${avgSat}점`, color: "text-amber-600", bg: "bg-amber-50" }
                    ].map(stat => (
                        <div key={stat.label} className={cn("p-4 rounded-3xl text-center min-w-[100px]", stat.bg)}>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{stat.label}</p>
                            <p className={cn("text-xl font-black", stat.color)}>{stat.val}</p>
                        </div>
                    ))}
                  </div>

                  <div className={cn("transition-transform duration-500 p-2 rounded-full bg-slate-100", isExpanded && "rotate-180 bg-blue-600 text-white")}>
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>

                {/* Charts Removed as per user request for less noise */}

                {/* Detail Grid: Overhauled to X-Scrollable Excel Sheet Style */}
                {isExpanded && (() => {
                    const sortedItems = [...group.items].sort((a,b) => {
                        const nameA = a.studentName || a.respondentId || "";
                        const nameB = b.studentName || b.respondentId || "";
                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
                    });
                    
                    const firstSurvey = sortedItems[0] || {};
                    const tQuestions = firstSurvey.template?.questions || [];
                    const maturityQs = tQuestions.filter((tq: any) => 
                        tq.type === 'MCQ' && 
                        (tq.growthType === 'CHANGE' || tq.growthType === 'PRE_POST' || (!tq.category?.includes('만족') && !tq.content?.includes('만족')))
                    ).sort((a:any, b:any) => a.order - b.order);
                    
                    const satQs = tQuestions.filter((tq: any) => 
                        tq.type === 'MCQ' && 
                        (tq.growthType === 'NONE' || tq.category?.includes('만족') || tq.content?.includes('만족'))
                    ).sort((a:any, b:any) => a.order - b.order);

                    const essayQs = tQuestions.filter((tq: any) => tq.type === 'ESSAY').sort((a:any, b:any) => a.order - b.order);

                    const getShortCat = (c: string) => c?.includes('|') ? c.split('|').pop() : c;
                    const maturityTitles = maturityQs.map((q: any) => getShortCat(q.category) || q.content.substring(0,10));
                    const satTitles = satQs.map((q: any) => getShortCat(q.category) || q.content.substring(0,10));

                    return (
                    <div className="overflow-x-auto border-t border-slate-200 bg-white shadow-inner">
                        <table className="w-full text-[10px] border-collapse min-w-[3600px] table-fixed">
                            <thead>
                                {/* Row 0: Tier 1 Group Headers */}
                                <tr className="bg-slate-950 text-white font-black uppercase tracking-widest divide-x divide-slate-800 border-b border-slate-700">
                                    <th colSpan={3} className="px-4 py-3 text-center bg-slate-900 sticky left-0 z-30">응답자 정보</th>
                                    <th colSpan={maturityQs.length * 5 + 5} className="px-4 py-3 text-center bg-blue-950/80">성숙도 (사전/사후/인지변화/도달률/근접도)</th>
                                    <th colSpan={satQs.length + 1} className="px-4 py-3 text-center bg-amber-950/80">만족도</th>
                                    <th colSpan={essayQs.length} className="px-4 py-3 text-center bg-slate-900">주관식 (상세의견)</th>
                                    <th colSpan={1} className="px-4 py-3 text-center bg-slate-900 sticky right-0 z-30">관리</th>
                                </tr>
                                {/* Row 1: Question Content */}
                                <tr className="bg-slate-800 text-slate-400 font-bold divide-x divide-slate-700 border-b border-slate-700">
                                    <th colSpan={3} className="bg-slate-900 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">조항목 (질문내용)</th>
                                    {maturityQs.map((q: any) => <th key={`qcontent-pre-${q.id}`} className="px-2 py-1.5 text-[9px] leading-tight text-slate-500 font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={q.content}>{q.content}</th>)}
                                    <th className="bg-slate-900"></th>
                                    {maturityQs.map((q: any) => <th key={`qcontent-post-${q.id}`} className="px-2 py-1.5 text-[9px] leading-tight text-slate-500 font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={q.content}>{q.content}</th>)}
                                    <th className="bg-slate-900"></th>
                                    {maturityQs.map((q: any) => <th key={`qcontent-exp-${q.id}`} className="px-2 py-1.5 text-[9px] leading-tight text-slate-500 font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={q.content}>{q.content}</th>)}
                                    <th className="bg-slate-900"></th>
                                    {maturityQs.map((q: any) => <th key={`qcontent-net-${q.id}`} className="px-2 py-1.5 text-[9px] leading-tight text-slate-500 font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={q.content}>{q.content}</th>)}
                                    <th className="bg-slate-900"></th>
                                    {maturityQs.map((q: any) => <th key={`qcontent-pot-${q.id}`} className="px-2 py-1.5 text-[9px] leading-tight text-slate-500 font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={q.content}>{q.content}</th>)}
                                    <th className="bg-slate-900"></th>
                                    {satQs.map((q: any) => <th key={`qcontent-sat-${q.id}`} className="px-2 py-1.5 text-[9px] leading-tight text-slate-500 font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={q.content}>{q.content}</th>)}
                                    <th className="bg-slate-900"></th>
                                    {essayQs.map((q: any) => <th key={`qcontent-ess-${q.id}`} className="px-2 py-1.5 text-[9px] leading-tight text-slate-500 font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={q.content}>{q.content}</th>)}
                                    <th className="bg-slate-900 sticky right-0 z-20"></th>
                                </tr>
                                {/* Row 2: Group Headers */}
                                <tr className="bg-slate-900 text-white font-black uppercase tracking-tighter divide-x divide-slate-700">
                                    <th rowSpan={2} className="w-64 px-4 py-4 sticky left-0 z-20 bg-slate-900 border-b border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">응답자 성명(ID)</th>
                                    <th rowSpan={2} className="w-24 px-2 py-4 border-b border-slate-700">조사구분</th>
                                    <th rowSpan={2} className="w-24 px-2 py-4 border-b border-slate-700">대상</th>
                                    <th colSpan={maturityQs.length + 1} className="px-3 py-2 text-center bg-blue-900/50">사전조사 (Pre-Score)</th>
                                    <th colSpan={maturityQs.length + 1} className="px-3 py-2 text-center bg-indigo-900/50">사후조사 (Post = Pre + Change)</th>
                                    <th colSpan={maturityQs.length + 1} className="px-3 py-2 text-center bg-emerald-900/50">학습 인지 변화도 (%)</th>
                                    <th colSpan={maturityQs.length + 1} className="px-3 py-2 text-center bg-emerald-800/50">역량 도달률 (%)</th>
                                    <th colSpan={maturityQs.length + 1} className="px-3 py-2 text-center bg-teal-900/50 border-r border-slate-700">학습 목표 근접도 (%)</th>
                                    <th colSpan={satQs.length + 1} className="px-3 py-2 text-center bg-amber-900/50">만족도 (사후)</th>
                                    {essayQs.map((q:any) => <th key={`ess-h-${q.id}`} rowSpan={2} className="w-96 px-4 py-2 border-b border-slate-700 bg-slate-900">{getShortCat(q.category) || "상세의견"}</th>)}
                                    <th rowSpan={2} className="w-24 px-4 py-2 sticky right-0 z-20 bg-slate-900 border-b border-slate-700">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-[9px] text-slate-500">전체</span>
                                            {canDelete && (
                                                <button 
                                                    onClick={() => handleDeleteAll(group.items)}
                                                    className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded transition-colors"
                                                >
                                                    삭제
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                </tr>
                                {/* Row 3: Sub-item Labels */}
                                <tr className="bg-slate-800 text-slate-300 font-bold divide-x divide-slate-700 border-b border-slate-700">
                                    {maturityQs.map((q:any) => <th key={`pre-sub-${q.id}`} className="px-2 py-2 text-center w-24" title={q.content}>{getShortCat(q.category) || "역량"}</th>)}
                                    <th className="px-2 py-2 text-center w-24">평균</th>
                                    {maturityQs.map((q:any) => <th key={`post-sub-${q.id}`} className="px-2 py-2 text-center w-24 bg-indigo-950/30" title={q.content}>{getShortCat(q.category) || "역량"}</th>)}
                                    <th className="px-2 py-2 text-center w-24 bg-indigo-950/30">평균</th>
                                    {maturityQs.map((q:any) => <th key={`exp-sub-${q.id}`} className="px-2 py-2 text-center w-24 bg-emerald-950/30" title={q.content}>{getShortCat(q.category) || "역량"}</th>)}
                                    <th className="px-2 py-2 text-center w-24 bg-emerald-950/30">평균</th>
                                    {maturityQs.map((q:any) => <th key={`net-sub-${q.id}`} className="px-2 py-2 text-center w-24 bg-emerald-900/30" title={q.content}>{getShortCat(q.category) || "역량"}</th>)}
                                    <th className="px-2 py-2 text-center w-24 bg-emerald-900/30">평균</th>
                                    {maturityQs.map((q:any) => <th key={`pot-sub-${q.id}`} className="px-2 py-2 text-center w-24 bg-teal-950/30" title={q.content}>{getShortCat(q.category) || "역량"}</th>)}
                                    <th className="px-2 py-2 text-center w-24 bg-teal-950/30 border-r border-slate-700">평균</th>
                                    {satQs.map((q:any) => <th key={`sat-sub-${q.id}`} className="px-2 py-2 text-center w-24 bg-amber-950/30" title={q.content}>{getShortCat(q.category) || "만족도"}</th>)}
                                    <th className="px-2 py-2 text-center w-24 bg-amber-950/30">평균</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {sortedItems.map((survey: any, sIdx: number) => {
                                    const getScore = (q: any) => {
                                        const ans = survey.answers?.find((a: any) => a.questionId === q.id);
                                        if (!ans) return { id: null, pre: 0, post: 0, change: 0, score: 0 };
                                        
                                        const pre = ans.preScore || 0;
                                        const change = ans.postChange || 0;
                                        let post = 0;
                                        if (q?.growthType === 'CHANGE') {
                                            post = pre > 0 ? Math.min(5, Math.max(1, pre + change)) : 0;
                                        } else {
                                            post = ans.score || 0;
                                        }
                                        return { id: ans.id, pre, post, change, score: ans.score || 0 };
                                    };

                                    const EditableCell = ({ value, onSave, label, type="number", allowZero=false }: any) => {
                                        const [tempVal, setTempVal] = useState(value);
                                        const [isEditing, setIsEditing] = useState(false);
                                        if (!isEditing) {
                                            const isNull = value === null || value === undefined || value === "" || value === "인식불가" || (!allowZero && value === 0);
                                            return (
                                                <div onClick={() => setIsEditing(true)} className={cn("cursor-pointer w-full h-full flex items-center justify-center transition-all group font-black", isNull ? "bg-rose-100 text-rose-600 animate-pulse" : "hover:bg-white/50")}>
                                                    {isNull ? "인식불가" : value}
                                                    <Edit3 className="w-2 h-2 ml-1 opacity-0 group-hover:opacity-100 text-slate-400" />
                                                </div>
                                            );
                                        }
                                        return (
                                            <input autoFocus type={type} className="w-12 h-6 text-center text-[10px] font-bold bg-white border border-blue-500 rounded outline-none" value={tempVal} onChange={(e) => setTempVal(e.target.value)} onBlur={() => { setIsEditing(false); if (tempVal !== value) onSave(tempVal); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditing(false); if (tempVal !== value) onSave(tempVal); } }} />
                                        );
                                    };

                                    const mScores = maturityQs.map((q: any) => getScore(q));
                                    const sScores = satQs.map((q: any) => getScore(q));
                                    const mPreAvg = mScores.filter((s: any) => s.pre > 0).length > 0 ? mScores.reduce((a:any,b:any)=>a+b.pre,0)/mScores.filter((s:any)=>s.pre>0).length : 0;
                                    const mPostAvg = mScores.filter((s: any) => s.post > 0).length > 0 ? mScores.reduce((a:any,b:any)=>a+b.post,0)/mScores.filter((s:any)=>s.post>0).length : 0;
                                    const satAvg = sScores.filter((s: any) => s.score > 0).length > 0 ? sScores.reduce((a:any,b:any)=>a+b.score,0)/sScores.filter((s:any)=>s.score>0).length : 0;
                                    
                                    const expImp = mScores.map((s: any) => s.post > s.pre ? 100 : 0);
                                    const netGro = mScores.map((s: any) => s.pre > 0 ? ((s.post - s.pre) / s.pre) * 100 : 0);
                                    const potGro = mScores.map((s: any) => (5 - s.pre) > 0 ? ((s.post - s.pre) / (5 - s.pre)) * 100 : (s.post >= s.pre ? 100 : -100));
                                    const essayTexts = survey.answers?.filter((a: any) => tQuestions.find((q:any)=>q.id===a.questionId)?.type === 'ESSAY').map((a: any) => a.text || a.textValue).join(" / ");

                                    return (
                                        <tr key={survey.id} className="hover:bg-blue-50/30 transition-colors divide-x divide-slate-100/50 text-center">
                                            <td className="px-4 py-3 font-bold text-slate-900 sticky left-0 z-10 bg-white border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 font-normal">{sIdx + 1}</span>
                                                    <div className="flex-1 min-w-[100px]">
                                                        <EditableCell value={survey.studentName || (survey.respondentId?.length > 10 ? survey.respondentId.substring(0,8) : survey.respondentId)} onSave={(v: any) => handleInlineUpdate(survey.id, 'studentName', v, false)} type="text" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-3">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[9px] font-black",
                                                    survey.type === 'PRE' ? 'bg-blue-600 text-white' : 
                                                    survey.type === 'POST' ? 'bg-indigo-600 text-white' : 
                                                    survey.type === 'SATISFACTION' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-500'
                                                )}>
                                                    {(() => {
                                                        if (survey.type === 'SATISFACTION') return '만족도';
                                                        if (survey.template?.type?.includes('성숙도')) return '성숙도';
                                                        if (survey.template?.type?.includes('만족')) return '만족도';
                                                        return survey.type === 'PRE' ? '사전' : survey.type === 'POST' ? '사후' : survey.type;
                                                    })()}
                                                </span>
                                            </td>
                                            <td className="px-2 py-3">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${survey.researchTarget === 'ELEMENTARY' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                                                    {survey.researchTarget === 'ELEMENTARY' ? '초등' : '중고'}
                                                </span>
                                            </td>
                                            {mScores.map((s: any, i: number) => <td key={`pre-${i}`} className="px-1 py-1 bg-blue-50/5 h-10">{s.id ? <EditableCell value={s.pre} onSave={(v: any) => handleInlineUpdate(s.id!, 'preScore', parseInt(v), true, { postChange: s.post - parseInt(v) })} /> : '0'}</td>)}
                                            <td className="px-2 py-3 font-black bg-blue-100/40 text-blue-700">{mPreAvg.toFixed(1)}</td>
                                            {mScores.map((s: any, i: number) => <td key={`post-${i}`} className="px-1 py-1 bg-indigo-50/10 h-10">{s.id ? <div className="flex flex-col items-center justify-center gap-0.5"><div className="text-[10px] font-black text-indigo-700 leading-none h-6 w-full"><EditableCell value={s.post} onSave={(v: any) => handleInlineUpdate(s.id!, 'score', parseInt(v), true, { postChange: parseInt(v) - s.pre })} /></div><div className="text-[8px] text-slate-400 bg-white/50 px-1 rounded border border-slate-100 min-w-[24px]"><EditableCell value={s.change} onSave={(v: any) => handleInlineUpdate(s.id!, 'postChange', parseInt(v))} allowZero={true} /></div></div> : '0'}</td>)}
                                            <td className="px-2 py-3 font-black bg-indigo-100/40 text-indigo-700">{mPostAvg.toFixed(1)}</td>
                                            {expImp.map((v: number, i: number) => <td key={`exp-${i}`} className="px-2 py-3 font-bold bg-emerald-50/30 text-emerald-700">{v}%</td>)}
                                            <td className="px-2 py-3 font-black bg-emerald-200/50 text-emerald-800">{(expImp.reduce((a: any, b: any) => a + b, 0) / (expImp.length || 1)).toFixed(0)}%</td>
                                            {netGro.map((v: any, i: number) => <td key={`net-${i}`} className={`px-2 py-3 font-black ${v > 0 ? 'text-blue-600' : v < 0 ? 'text-rose-600' : 'text-slate-400'}`}>{v.toFixed(0)}%</td>)}
                                            <td className="px-2 py-3 font-black bg-blue-100/30">{(netGro.reduce((a: any, b: any) => a + b, 0) / (netGro.length || 1)).toFixed(0)}%</td>
                                            {potGro.map((v: any, i: number) => <td key={`pot-${i}`} className={`px-2 py-3 font-black bg-teal-50/40 ${v > 0 ? 'text-teal-700' : 'text-slate-400'}`}>{v.toFixed(0)}%</td>)}
                                            <td className="px-2 py-3 font-black bg-teal-200/40 border-r border-slate-700">{(potGro.reduce((a: any, b: any) => a + b, 0) / (potGro.length || 1)).toFixed(0)}%</td>
                                            {sScores.map((s: any, i: number) => <td key={`sat-v-${i}`} className="px-1 py-1 bg-amber-50/10 h-10">{s.id ? <EditableCell value={s.score} onSave={(v: any) => handleInlineUpdate(s.id!, 'score', parseInt(v))} /> : '0'}</td>)}
                                            <td className="px-2 py-3 font-black bg-amber-50/50 text-amber-700">{satAvg.toFixed(2)}</td>
                                            {essayQs.map((eq: any) => {
                                                const ans = survey.answers?.find((a: any) => a.questionId === eq.id);
                                                return <td key={`ess-v-${eq.id}`} className="px-4 py-3 text-slate-500 italic whitespace-pre-wrap leading-relaxed min-w-[320px] text-left border-r border-slate-100">{ans?.text || ans?.textValue || "-"}</td>;
                                            })}
                                            <td className="px-4 py-3 sticky right-0 z-10 bg-white border-l border-slate-100">
                                                <div className="flex items-center justify-center gap-1">
                                                    {canEdit && (
                                                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(survey)} className="h-8 w-8 text-slate-300 hover:text-blue-600">
                                                            <Edit3 className="w-4 h-4"/>
                                                        </Button>
                                                    )}
                                                    {canDelete && (
                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(survey.id)} className="h-8 w-8 text-slate-300 hover:text-rose-500">
                                                            <Trash2 className="w-4 h-4"/>
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Table Footer (Final Average Row) with Accurate Calculations */}
                                <tr className="sticky bottom-0 z-30 bg-slate-900 text-white font-black border-t-2 border-slate-700 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] divide-x divide-slate-700 h-14 text-center">
                                    <td className="px-4 py-3 sticky left-0 z-40 bg-slate-900 border-r border-slate-700 uppercase tracking-widest text-[9px] flex items-center justify-center gap-2">
                                        <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-pulse"></div> 전체 평균 (TOTAL AVG)
                                    </td>
                                    <td className="px-2 py-3">-</td>
                                    <td className="px-2 py-3">-</td>
                                    {/* Maturity Pre Averages */}
                                    {maturityQs.map((mq: any) => {
                                        const sum = sortedItems.reduce((acc: any, s: any) => acc + (s.answers?.find((a: any) => a.questionId === mq.id)?.preScore || 0), 0);
                                        const count = sortedItems.filter((s: any) => s.answers?.find((a: any) => a.questionId === mq.id)?.preScore > 0).length || 1;
                                        return <td key={`foot-pre-${mq.id}`} className="px-2 py-3 bg-blue-950/20 text-blue-300">{(sum / count).toFixed(1)}</td>;
                                    })}
                                    <td className="px-2 py-3 bg-blue-950/20 text-blue-300">{(sortedItems.reduce((acc: any, s: any) => {
                                        const preList = s.answers?.filter((a: any) => maturityQs.some((mq: any) => mq.id === a.questionId)) || [];
                                        return acc + (preList.length > 0 ? preList.reduce((i: any, a: any) => i + (a.preScore || 0), 0) / preList.length : 0);
                                    }, 0) / (sortedItems.length || 1)).toFixed(1)}</td>

                                    {/* Maturity Post Averages */}
                                    {maturityQs.map((mq: any) => {
                                        const sum = sortedItems.reduce((acc, s: any) => {
                                            const ans = s.answers?.find((a: any) => a.questionId === mq.id);
                                            if (!ans) return acc;
                                            const score = mq.growthType === 'CHANGE' ? Math.min(5, Math.max(1, (ans.preScore || 0) + (ans.postChange || 0))) : (ans.score || 0);
                                            return acc + score;
                                        }, 0);
                                        return <td key={`foot-post-${mq.id}`} className="px-2 py-3 bg-indigo-950/40 text-indigo-300">{(sum / (sortedItems.length || 1)).toFixed(1)}</td>;
                                    })}
                                    <td className="px-2 py-3 bg-indigo-950/40 text-indigo-300">{(sortedItems.reduce((acc: any, s: any) => {
                                        const postList = s.answers?.filter((a: any) => maturityQs.some((mq: any) => mq.id === a.questionId)) || [];
                                        return acc + (postList.length > 0 ? postList.reduce((i: any, a: any) => {
                                            const q = maturityQs.find((mq: any) => mq.id === a.questionId);
                                            return i + (q?.growthType === 'CHANGE' ? Math.min(5, Math.max(1, (a.preScore || 0) + (a.postChange || 0))) : (a.score || 0));
                                        }, 0) / postList.length : 0);
                                    }, 0) / (sortedItems.length || 1)).toFixed(1)}</td>

                                    {/* Placeholder for Metrics */}
                                    {Array.from({ length: maturityQs.length * 3 + 3 }).map((_, i) => <td key={`foot-pad-${i}`} className="px-2 py-3 text-slate-500 bg-slate-100/30 font-normal">-</td>)}

                                    {/* Satisfaction Category Averages */}
                                    {satQs.map((sq: any) => {
                                        const sum = sortedItems.reduce((acc, s: any) => acc + (s.answers?.find((a: any) => a.questionId === sq.id)?.score || 0), 0);
                                        const count = sortedItems.filter(s => s.answers?.find((a: any) => a.questionId === sq.id)?.score > 0).length || 1;
                                        return <td key={`foot-sat-${sq.id}`} className="px-2 py-3 bg-amber-950/20 text-amber-300">{(sum / count).toFixed(1)}</td>;
                                    })}
                                    <td className="px-2 py-3 bg-amber-950/20 text-amber-300">{(sortedItems.reduce((acc: any, s: any) => {
                                        const satList = s.answers?.filter((a: any) => satQs.some((sq: any) => sq.id === a.questionId)) || [];
                                        return acc + (satList.length > 0 ? satList.reduce((i: any, a: any) => i + (a.score || 0), 0) / satList.length : 0);
                                    }, 0) / (sortedItems.length || 1)).toFixed(2)}</td>

                                    {/* Footer Columns for Essays */}
                                    {essayQs.map((eq: any) => <td key={`foot-ess-${eq.id}`} className="px-4 py-3 bg-slate-800">-</td>)}
                                    <td className="px-4 py-3 sticky right-0 z-40 bg-slate-900 border-l border-slate-700">-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                  )
                })()}
              </Card>
            )
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" className="rounded-xl" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="font-black text-slate-400 italic px-4">{page} / {pagination?.totalPages || 1}</span>
        <Button variant="outline" className="rounded-xl" onClick={() => setPage(p => p + 1)} disabled={page >= (pagination?.totalPages || 1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      {/* Detailed Edit Modal */}
      {showEditModal && editingSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-4xl max-h-[90vh] border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden flex flex-col">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
              <div>
                <span className="bg-blue-600 text-[10px] font-black px-2 py-1 rounded mb-2 inline-block">RESPONSE DETAIL & EDIT</span>
                <h3 className="text-2xl font-black">{editingSurvey.respondentId} 응답 상세 내용</h3>
                <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">{editingSurvey.session?.program?.name} / {editingSurvey.session?.sessionNumber}회차 / {editingSurvey.session?.instructorName} 강사</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-8 h-8" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/30">
              <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">응답자 식별 ID</label>
                  <input value={editFormData.respondentId} onChange={(e) => setEditFormData({...editFormData, respondentId: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-600"/>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">대상 구분</label>
                  <select value={editFormData.researchTarget} onChange={(e) => setEditFormData({...editFormData, researchTarget: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-600">
                    <option value="ELEMENTARY">초등학생</option>
                    <option value="MIDDLE">중학생</option>
                    <option value="HIGH">고등학생</option>
                    <option value="UNIVERSITY">대학생</option>
                    <option value="OTHER">기타</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 ml-1">
                    <div className="w-1.5 h-3 bg-blue-600 rounded-full"></div>
                    <h4 className="text-sm font-black text-slate-900">개별 문항 응답 데이터 수정</h4>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {editFormData.answers.map((ans: any, idx: number) => (
                    <div key={ans.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-colors flex items-center gap-6">
                      <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">Q{idx+1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate mb-2">{ans.questionContent}</p>
                        <div className="flex items-center gap-4">
                          {ans.questionType === 'MCQ' ? (
                            ans.growthType === 'CHANGE' ? (
                              <div className="flex gap-4">
                                <div><label className="text-[9px] font-black text-slate-300 block mb-1">전 점수 (1-5)</label>
                                <input type="number" min="1" max="5" value={ans.preScore || 0} onChange={(e) => {
                                    const newAnswers = [...editFormData.answers];
                                    newAnswers[idx].preScore = parseInt(e.target.value);
                                    setEditFormData({...editFormData, answers: newAnswers});
                                }} className="w-20 h-9 px-3 bg-slate-50 border-none rounded-lg text-xs font-bold"/></div>
                                <div><label className="text-[9px] font-black text-slate-300 block mb-1">변화량 (-1~2)</label>
                                <input type="number" min="-1" max="2" value={ans.postChange || 0} onChange={(e) => {
                                    const newAnswers = [...editFormData.answers];
                                    newAnswers[idx].postChange = parseInt(e.target.value);
                                    setEditFormData({...editFormData, answers: newAnswers});
                                }} className="w-20 h-9 px-3 bg-blue-50 text-blue-600 border-none rounded-lg text-xs font-black"/></div>
                              </div>
                            ) : ans.growthType === 'PRE_POST' ? (
                              <div className="flex gap-4">
                                <div><label className="text-[9px] font-black text-slate-300 block mb-1">전 점수 (1-5)</label>
                                <input type="number" min="1" max="5" value={ans.preScore || 0} onChange={(e) => {
                                    const newAnswers = [...editFormData.answers];
                                    newAnswers[idx].preScore = parseInt(e.target.value);
                                    setEditFormData({...editFormData, answers: newAnswers});
                                }} className="w-20 h-9 px-3 bg-slate-50 border-none rounded-lg text-xs font-bold"/></div>
                                <div><label className="text-[9px] font-black text-slate-300 block mb-1">후 점수 (1-5)</label>
                                <input type="number" min="1" max="5" value={ans.score || 0} onChange={(e) => {
                                    const newAnswers = [...editFormData.answers];
                                    newAnswers[idx].score = parseInt(e.target.value);
                                    setEditFormData({...editFormData, answers: newAnswers});
                                }} className="w-20 h-9 px-3 bg-indigo-50 text-indigo-600 border-none rounded-lg text-xs font-black"/></div>
                              </div>
                            ) : (
                              <div><label className="text-[9px] font-black text-slate-300 block mb-1">만족도 점수 (1-5)</label>
                              <input type="number" min="1" max="5" value={ans.score || 0} onChange={(e) => {
                                  const newAnswers = [...editFormData.answers];
                                  newAnswers[idx].score = parseInt(e.target.value);
                                  setEditFormData({...editFormData, answers: newAnswers});
                              }} className="w-24 h-9 px-3 bg-amber-50 text-amber-600 border-none rounded-lg text-xs font-black"/></div>
                            )
                          ) : (
                            <textarea value={ans.text || ""} onChange={(e) => {
                                const newAnswers = [...editFormData.answers];
                                newAnswers[idx].text = e.target.value;
                                setEditFormData({...editFormData, answers: newAnswers});
                            }} className="w-full h-16 p-3 bg-slate-50 border-none rounded-xl text-xs font-medium focus:ring-1 focus:ring-blue-200 resize-none" placeholder="주관식 응답 내용 수정..." />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <Button onClick={() => setShowEditModal(false)} variant="ghost" className="flex-1 h-14 rounded-2xl font-black text-slate-500 hover:bg-slate-200">취소</Button>
              <Button onClick={handleUpdate} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl font-black text-lg shadow-xl shadow-blue-100">
                <Save className="w-5 h-5 mr-3" /> 수정 내용 저장 및 리포트 즉시 반영
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
