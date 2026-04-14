"use client"
import React, { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, FileText, ChevronLeft, ChevronRight, User, Calendar as CalendarIcon, Building, Trash2, Edit3, Plus, X, Globe, FileUp, Eye, Save, AlertCircle, Pencil, CalendarDays } from "lucide-react"
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
  const [groupResultTabs, setGroupResultTabs] = useState<Record<string, 'SATISFACTION' | 'MATURITY'>>({})


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

  // Management State
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false)
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null)
  const [programFormData, setProgramFormData] = useState({ name: "", description: "", coreGoals: "", order: "" })
  
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [sessionFormData, setSessionFormData] = useState({
    partnerId: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    courseName: "",
    instructorName: "",
    capacity: "30",
    participantCount: "0",
    classDays: [] as any[]
  })

  // Inline Editing State
  const [inlineEditingSessionId, setInlineEditingSessionId] = useState<string | null>(null)
  const [inlineFormData, setInlineFormData] = useState({
    courseName: "",
    instructorName: ""
  })

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

  // Management Handlers
  const handleProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingProgramId ? `/api/programs/${editingProgramId}` : "/api/programs"
    const method = editingProgramId ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      body: JSON.stringify(programFormData),
      headers: { "Content-Type": "application/json" }
    })
    if (res.ok) {
      setIsProgramModalOpen(false)
      const progRes = await fetch("/api/programs").then(r => r.json())
      setPrograms(progRes)
      fetchData()
    }
  }

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingSessionId ? `/api/sessions/${editingSessionId}` : "/api/sessions"
    const method = editingSessionId ? "PATCH" : "POST"

    // Convert local date/time to UTC
    const startDateTime = sessionFormData.startTime ? `${sessionFormData.startDate}T${sessionFormData.startTime}:00.000Z` : null;
    const endDateTime = sessionFormData.endTime ? `${sessionFormData.endDate}T${sessionFormData.endTime}:00.000Z` : null;

    const body = {
      programId: selectedProgramId,
      partnerId: sessionFormData.partnerId,
      date: `${sessionFormData.startDate}T00:00:00.000Z`,
      startTime: startDateTime,
      endTime: endDateTime,
      sessionNumber: 1, // Default or increment logic
      courseName: sessionFormData.courseName,
      instructorName: sessionFormData.instructorName,
      capacity: Number(sessionFormData.capacity),
      participantCount: Number(sessionFormData.participantCount),
      classDays: sessionFormData.classDays
    }

    const res = await fetch(url, {
      method,
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" }
    })
    if (res.ok) {
      setIsSessionModalOpen(false)
      fetchData()
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("정말 이 교육과정을 삭제하시겠습니까? 관련 설문 데이터도 모두 삭제됩니다.")) return
    const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" })
    if (res.ok) fetchData()
  }

  const openProgramModal = (program?: any) => {
    if (program) {
      setEditingProgramId(program.id)
      setProgramFormData({ name: program.name, description: program.description || "", coreGoals: program.coreGoals || "", order: program.order.toString() })
    } else {
      setEditingProgramId(null)
      setProgramFormData({ name: "", description: "", coreGoals: "", order: (programs.length + 1).toString() })
    }
    setIsProgramModalOpen(true)
  }

  const openSessionModal = (programId: string) => {
    setSelectedProgramId(programId)
    setEditingSessionId(null)
    setSessionFormData({
      partnerId: "",
      startDate: new Date().toISOString().split('T')[0],
      startTime: "09:00",
      endDate: new Date().toISOString().split('T')[0],
      endTime: "12:00",
      courseName: "",
      instructorName: "",
      capacity: "30",
      participantCount: "0",
      classDays: []
    })
    setIsSessionModalOpen(true)
  }

  const handleInlineSave = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inlineFormData)
      })
      if (res.ok) {
        setInlineEditingSessionId(null)
        fetchData()
      }
    } catch (err) {
      console.error(err)
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

  const getGroupResultTab = (key: string, items: any[]) => {
    if (groupResultTabs[key]) return groupResultTabs[key];
    const hasMaturity = items.some((s: any) => s.type === 'MATURITY' || s.answers?.some((a: any) => a.preScore != null && a.preScore > 0));
    return hasMaturity ? 'MATURITY' : 'SATISFACTION';
  };

  const setGroupResultTab = (key: string, tab: 'SATISFACTION' | 'MATURITY') => {
    setGroupResultTabs(prev => ({ ...prev, [key]: tab }));
  };

  const buildAggregatedTable = (items: any[], questions: any[]) => {
    return questions.map((q: any) => {
      const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      const distPre: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      let totalScore = 0, totalPre = 0, count = 0, countPre = 0;
      items.forEach((s: any) => {
        const ans = s.answers?.find((a: any) => a.questionId === q.id);
        if (!ans) return;
        const score = ans.score ?? null;
        if (score !== null && score > 0) {
          const r = Math.min(5, Math.max(1, Math.round(score)));
          dist[r] = (dist[r] || 0) + 1;
          totalScore += score; count++;
        }
        const pre = ans.preScore ?? null;
        if (pre !== null && pre > 0) {
          const r = Math.min(5, Math.max(1, Math.round(pre)));
          distPre[r] = (distPre[r] || 0) + 1;
          totalPre += pre; countPre++;
        }
      });
      const getCat = (q: any) => {
        if (!q.category) return '';
        return q.category.includes('|') ? q.category.split('|').pop()! : q.category;
      };
      return {
        q, cat: getCat(q), content: q.content,
        participants: count || countPre,
        dist, distPre,
        avg: count > 0 ? totalScore / count : null,
        avgPre: countPre > 0 ? totalPre / countPre : null,
      };
    });
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-end no-print">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-inter">설문 결과 관리</h1>
          <p className="text-slate-500 mt-1 font-bold italic">수집된 전/후 성숙도 및 만족도 데이터를 정밀하게 관리하고 리포트에 즉시 반영합니다.</p>
        </div>
        <div className="flex gap-2">
            {canEdit && (
                <Button onClick={() => openProgramModal()} className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 text-xs">
                    <Plus className="mr-1 h-4 w-4" /> 새 사업
                </Button>
            )}
            {canEdit && programs.length > 0 && (
                <Button onClick={() => openSessionModal(programs[0].id)} className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 text-xs">
                    <Plus className="mr-1 h-4 w-4" /> 교육과정 추가
                </Button>
            )}
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
                      </div>
                      
                      <div className="flex flex-col">
                        {(() => {
                            const firstItem = group.items[0];
                            const sessionId = firstItem?.sessionId;
                            const isEditing = inlineEditingSessionId === sessionId;
                            
                            if (isEditing) {
                                return (
                                    <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-2xl border border-blue-100 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex gap-2">
                                            <input 
                                                value={inlineFormData.courseName}
                                                onChange={e => setInlineFormData({...inlineFormData, courseName: e.target.value})}
                                                className="h-8 px-3 rounded-lg border-none bg-white text-sm font-bold w-64 focus:ring-2 focus:ring-blue-500"
                                                placeholder="교육과정명"
                                            />
                                            <input 
                                                value={inlineFormData.instructorName}
                                                onChange={e => setInlineFormData({...inlineFormData, instructorName: e.target.value})}
                                                className="h-8 px-3 rounded-lg border-none bg-white text-sm font-bold w-32 focus:ring-2 focus:ring-blue-500"
                                                placeholder="강사명"
                                            />
                                        </div>
                                        <div className="flex gap-1 justify-end mt-1">
                                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleInlineSave(sessionId); }} className="h-7 bg-blue-600 text-white font-black rounded-lg text-[10px]">
                                                저장
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setInlineEditingSessionId(null); }} className="h-7 bg-slate-200 text-slate-600 font-black rounded-lg text-[10px]">
                                                취소
                                            </Button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <>
                                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                                        <Building className="w-3.5 h-3.5" /> {group.info.partner}
                                    </div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                            {group.info.program.split('. ')[1] || group.info.program}
                                        </h3>
                                        {canEdit && (
                                            <div className="flex opacity-0 group-hover:opacity-100 gap-1 transition-opacity">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setInlineEditingSessionId(sessionId); 
                                                        setInlineFormData({ 
                                                            courseName: group.info.session || "", 
                                                            instructorName: group.info.instructor || "" 
                                                        }); 
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteSession(sessionId); }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
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
                                </>
                            );
                        })()}
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


                {/* Aggregated Result View - Satisfaction / Maturity Tabs */}
                {isExpanded && (() => {
                    const firstSurvey = group.items[0] || {};
                    const tQuestions = firstSurvey.template?.questions || [];

                    const satQs = tQuestions.filter((q: any) =>
                        q.type === 'MCQ' && (q.growthType === 'NONE' || (!q.growthType?.includes('CHANGE') && !q.growthType?.includes('PRE_POST')))
                    ).sort((a: any, b: any) => a.order - b.order);

                    const matQs = tQuestions.filter((q: any) =>
                        q.type === 'MCQ' && (q.growthType === 'PRE_POST' || q.growthType === 'CHANGE')
                    ).sort((a: any, b: any) => a.order - b.order);

                    const essayQs = tQuestions.filter((q: any) => q.type === 'ESSAY');

                    const hasSat = satQs.length > 0;
                    const hasMat = matQs.length > 0;
                    const activeTab = getGroupResultTab(key, group.items);

                    const satData = buildAggregatedTable(group.items, satQs);
                    const matData = buildAggregatedTable(group.items, matQs);

                    const SCORE_LABELS: Record<number, string> = {
                        5: '매우그렇다(5)', 4: '그렇다(4)', 3: '보통(3)', 2: '아니다(2)', 1: '전혀아님(1)'
                    };
                    const SCORE_COLORS: Record<number, string> = {
                        5: 'bg-blue-500', 4: 'bg-indigo-400', 3: 'bg-slate-400', 2: 'bg-amber-400', 1: 'bg-rose-400'
                    };

                    const ScoreBar = ({ count, total, score }: { count: number; total: number; score: number }) => {
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        return (
                            <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
                                <span className="text-xs font-black text-slate-700">{count}</span>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${SCORE_COLORS[score] || 'bg-slate-300'} rounded-full`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[9px] text-slate-400">{pct.toFixed(0)}%</span>
                            </div>
                        );
                    };

                    const buildRows = (data: any[]) => {
                        const result: { row: any; showCat: boolean; catRowSpan: number }[] = [];
                        let i = 0;
                        while (i < data.length) {
                            const cat = data[i].cat;
                            let j = i;
                            while (j < data.length && data[j].cat === cat) j++;
                            for (let k = i; k < j; k++) {
                                result.push({ row: data[k], showCat: k === i, catRowSpan: j - i });
                            }
                            i = j;
                        }
                        return result;
                    };

                    const AggregatedTable = ({ data, isMat }: { data: any[]; isMat: boolean }) => {
                        const rows = buildRows(data);
                        const participants = data.reduce((m, r) => Math.max(m, r.participants), 0) || group.items.length;
                        if (data.length === 0) return (
                            <div className="py-16 text-center text-slate-300 italic text-sm font-bold">
                                {isMat ? '성숙도 사전/사후' : '만족도'} 문항 데이터가 없습니다.
                            </div>
                        );
                        const cats = [...new Set(data.map(r => r.cat))];
                        return (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm min-w-[700px]">
                                    <thead>
                                        <tr className="bg-slate-900 text-white text-xs font-black">
                                            <th rowSpan={2} className="px-4 py-3 text-left w-28 border-r border-slate-700">구분</th>
                                            <th rowSpan={2} className="px-4 py-3 text-left min-w-[260px] border-r border-slate-700">설문문항</th>
                                            <th rowSpan={2} className="px-3 py-3 text-center w-14 border-r border-slate-700">참여자</th>
                                            {isMat ? (
                                                <>
                                                    <th colSpan={6} className="px-3 py-2 text-center bg-blue-900/60 border-r border-slate-700">사전 (Pre)</th>
                                                    <th colSpan={6} className="px-3 py-2 text-center bg-indigo-900/60">사후 (Post)</th>
                                                </>
                                            ) : (
                                                <th colSpan={6} className="px-3 py-2 text-center bg-amber-900/40">응답 분포</th>
                                            )}
                                        </tr>
                                        <tr className="bg-slate-800 text-slate-200 text-[11px] font-black">
                                            {isMat ? (
                                                <>
                                                    {[5,4,3,2,1].map(s => <th key={`prel-${s}`} className="px-2 py-2 text-center w-20 bg-blue-950/40 border-r border-slate-700">{SCORE_LABELS[s]}</th>)}
                                                    <th className="px-2 py-2 text-center w-16 bg-blue-950/70 border-r border-slate-500">평균</th>
                                                    {[5,4,3,2,1].map(s => <th key={`postl-${s}`} className="px-2 py-2 text-center w-20 bg-indigo-950/40 border-r border-slate-700">{SCORE_LABELS[s]}</th>)}
                                                    <th className="px-2 py-2 text-center w-16 bg-indigo-950/70">평균</th>
                                                </>
                                            ) : (
                                                <>
                                                    {[5,4,3,2,1].map(s => <th key={`satl-${s}`} className="px-2 py-2 text-center w-24 bg-amber-950/30 border-r border-slate-700">{SCORE_LABELS[s]}</th>)}
                                                    <th className="px-2 py-2 text-center w-16 bg-amber-950/60">평균</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rows.map(({ row, showCat, catRowSpan }, idx) => (
                                            <tr key={`agg-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                                                {showCat && (
                                                    <td rowSpan={catRowSpan} className="px-4 py-3 font-black text-slate-700 text-xs bg-slate-50 border-r border-slate-200 align-middle text-center">
                                                        {row.cat || '미분류'}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-xs font-medium text-slate-800 leading-relaxed border-r border-slate-100">{row.content}</td>
                                                <td className="px-3 py-3 text-center font-black text-slate-600 text-sm border-r border-slate-200">{row.participants}</td>
                                                {isMat ? (
                                                    <>
                                                        {[5,4,3,2,1].map(s => (
                                                            <td key={`pre-${s}`} className="px-3 py-2 text-center bg-blue-50/40 border-r border-slate-100">
                                                                <ScoreBar count={row.distPre[s] || 0} total={row.participants} score={s} />
                                                            </td>
                                                        ))}
                                                        <td className="px-3 py-2 text-center font-black text-blue-700 bg-blue-100/60 border-r border-slate-300">
                                                            {row.avgPre !== null ? (row.avgPre as number).toFixed(2) : '-'}
                                                        </td>
                                                        {[5,4,3,2,1].map(s => (
                                                            <td key={`post-${s}`} className="px-3 py-2 text-center bg-indigo-50/40 border-r border-slate-100">
                                                                <ScoreBar count={row.dist[s] || 0} total={row.participants} score={s} />
                                                            </td>
                                                        ))}
                                                        <td className="px-3 py-2 text-center font-black text-indigo-700 bg-indigo-100/60">
                                                            {row.avg !== null ? (row.avg as number).toFixed(2) : '-'}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        {[5,4,3,2,1].map(s => (
                                                            <td key={`sat-${s}`} className="px-3 py-2 text-center bg-amber-50/30 border-r border-slate-100">
                                                                <ScoreBar count={row.dist[s] || 0} total={row.participants} score={s} />
                                                            </td>
                                                        ))}
                                                        <td className="px-3 py-2 text-center font-black text-amber-700 bg-amber-100/60">
                                                            {row.avg !== null ? (row.avg as number).toFixed(2) : '-'}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                        {/* 구분별 소계 */}
                                        {cats.map(cat => {
                                            const catRows = data.filter(r => r.cat === cat);
                                            if (catRows.length < 2) return null;
                                            const avgs = catRows.filter(r => r.avg !== null).map(r => r.avg as number);
                                            const preAvgs = catRows.filter(r => r.avgPre !== null).map(r => r.avgPre as number);
                                            const catAvg = avgs.length > 0 ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
                                            const catAvgPre = preAvgs.length > 0 ? preAvgs.reduce((a, b) => a + b, 0) / preAvgs.length : null;
                                            return (
                                                <tr key={`catavg-${cat}`} className="bg-slate-100/60 border-t-2 border-slate-300">
                                                    <td className="px-4 py-2 text-right text-xs font-black text-slate-400 italic">소계</td>
                                                    <td className="px-4 py-2 text-xs font-bold text-slate-500 italic">{cat} 구분 평균</td>
                                                    <td className="px-3 py-2 text-center text-xs text-slate-400">-</td>
                                                    {isMat ? (
                                                        <>
                                                            {[5,4,3,2,1].map(s => <td key={s} className="px-3 py-2 bg-blue-50/20" />)}
                                                            <td className="px-3 py-2 text-center font-black text-blue-600 bg-blue-100/50">{catAvgPre !== null ? catAvgPre.toFixed(2) : '-'}</td>
                                                            {[5,4,3,2,1].map(s => <td key={s} className="px-3 py-2 bg-indigo-50/20" />)}
                                                            <td className="px-3 py-2 text-center font-black text-indigo-600 bg-indigo-100/50">{catAvg !== null ? catAvg.toFixed(2) : '-'}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {[5,4,3,2,1].map(s => <td key={s} className="px-3 py-2 bg-amber-50/20" />)}
                                                            <td className="px-3 py-2 text-center font-black text-amber-600 bg-amber-100/50">{catAvg !== null ? catAvg.toFixed(2) : '-'}</td>
                                                        </>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                        {/* 전체 평균 */}
                                        {(() => {
                                            const allAvgs = data.filter(r => r.avg !== null).map(r => r.avg as number);
                                            const allPreAvgs = data.filter(r => r.avgPre !== null).map(r => r.avgPre as number);
                                            const totalAvg = allAvgs.length > 0 ? allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length : null;
                                            const totalAvgPre = allPreAvgs.length > 0 ? allPreAvgs.reduce((a, b) => a + b, 0) / allPreAvgs.length : null;
                                            return (
                                                <tr className="sticky bottom-0 bg-slate-900 text-white font-black border-t-2 border-slate-700">
                                                    <td className="px-4 py-3 text-xs uppercase tracking-widest" colSpan={2}>전 문항 평균 (TOTAL AVG)</td>
                                                    <td className="px-3 py-3 text-center">{participants}</td>
                                                    {isMat ? (
                                                        <>
                                                            {[5,4,3,2,1].map(s => {
                                                                const cnt = data.reduce((a, r) => a + (r.distPre[s] || 0), 0);
                                                                return <td key={s} className="px-3 py-3 text-center text-blue-300">{cnt}</td>;
                                                            })}
                                                            <td className="px-3 py-3 text-center text-blue-300">{totalAvgPre !== null ? totalAvgPre.toFixed(2) : '-'}</td>
                                                            {[5,4,3,2,1].map(s => {
                                                                const cnt = data.reduce((a, r) => a + (r.dist[s] || 0), 0);
                                                                return <td key={s} className="px-3 py-3 text-center text-indigo-300">{cnt}</td>;
                                                            })}
                                                            <td className="px-3 py-3 text-center text-indigo-300">{totalAvg !== null ? totalAvg.toFixed(2) : '-'}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {[5,4,3,2,1].map(s => {
                                                                const cnt = data.reduce((a, r) => a + (r.dist[s] || 0), 0);
                                                                return <td key={s} className="px-3 py-3 text-center text-amber-300">{cnt}</td>;
                                                            })}
                                                            <td className="px-3 py-3 text-center text-amber-300">{totalAvg !== null ? totalAvg.toFixed(2) : '-'}</td>
                                                        </>
                                                    )}
                                                </tr>
                                            );
                                        })()}
                                    </tbody>
                                </table>
                                {/* 주관식 취합 */}
                                {essayQs.length > 0 && (
                                    <div className="mt-6 border-t border-slate-200 pt-4 px-2">
                                        <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">주관식 응답 취합</h5>
                                        <div className="space-y-3">
                                            {essayQs.map((eq: any) => {
                                                const getCat2 = (q: any) => q.category?.includes('|') ? q.category.split('|').pop() : (q.category || '');
                                                const texts = group.items.map((s: any) => {
                                                    const ans = s.answers?.find((a: any) => a.questionId === eq.id);
                                                    return ans?.text || ans?.textValue || null;
                                                }).filter(Boolean);
                                                return (
                                                    <div key={eq.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">{getCat2(eq)}</span>
                                                            <p className="text-xs font-bold text-slate-700">{eq.content}</p>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {texts.length === 0 ? (
                                                                <p className="text-[11px] text-slate-300 italic">응답 없음</p>
                                                            ) : (texts as string[]).map((t: string, i: number) => (
                                                                <div key={i} className="flex gap-2 text-xs">
                                                                    <span className="text-slate-300 font-black shrink-0">{i + 1}.</span>
                                                                    <span className="text-slate-600 leading-relaxed">{t}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    };

                    return (
                        <div className="border-t border-slate-200 bg-white">
                            {/* 탭 전환 헤더 */}
                            <div className="flex gap-2 p-4 border-b border-slate-100 bg-slate-50 items-center">
                                {hasSat && (
                                    <button
                                        type="button"
                                        onClick={() => setGroupResultTab(key, 'SATISFACTION')}
                                        className={cn(
                                            "px-5 py-2 rounded-xl text-xs font-black transition-all",
                                            activeTab === 'SATISFACTION'
                                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-100'
                                                : 'bg-white text-slate-400 border border-slate-200 hover:border-amber-300'
                                        )}
                                    >
                                        ⭐ 만족도 조사 ({satQs.length}문항)
                                    </button>
                                )}
                                {hasMat && (
                                    <button
                                        type="button"
                                        onClick={() => setGroupResultTab(key, 'MATURITY')}
                                        className={cn(
                                            "px-5 py-2 rounded-xl text-xs font-black transition-all",
                                            activeTab === 'MATURITY'
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                                : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-300'
                                        )}
                                    >
                                        📊 성숙도 조사 ({matQs.length}문항)
                                    </button>
                                )}
                                <div className="ml-auto flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                        총 응답 {group.items.length}명
                                    </span>
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDeleteAll(group.items)}
                                            className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg transition-colors font-black"
                                        >
                                            전체 삭제
                                        </button>
                                    )}
                                </div>
                            </div>
                            {/* 탭 컨텐츠 */}
                            <div className="p-4">
                                {activeTab === 'SATISFACTION' && <AggregatedTable data={satData} isMat={false} />}
                                {activeTab === 'MATURITY' && <AggregatedTable data={matData} isMat={true} />}
                            </div>
                        </div>
                    );
                })()}



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
      {/* Program Modal */}
      {isProgramModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-0">
            <div className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-black">{editingProgramId ? "사업 정보 수정" : "새 사업 등록"}</h3>
              <button onClick={() => setIsProgramModalOpen(false)} className="hover:rotate-90 transition-transform"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleProgramSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2 col-span-1">
                    <label className="text-xs font-black text-slate-400 ml-1 uppercase">번호 *</label>
                    <input type="number" required value={programFormData.order} onChange={e => setProgramFormData({...programFormData, order: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-500" placeholder="1" />
                  </div>
                  <div className="space-y-2 col-span-3">
                    <label className="text-xs font-black text-slate-400 ml-1 uppercase">사업명 *</label>
                    <input required value={programFormData.name} onChange={e => setProgramFormData({...programFormData, name: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" placeholder="예: 2026 청소년 진로캠프" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase">핵심 목표 *</label>
                  <input required value={programFormData.coreGoals} onChange={e => setProgramFormData({...programFormData, coreGoals: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" placeholder="예: 진로 탐색 및 역량 강화" />
                </div>
              </div>
              <Button type="submit" className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl transition-all active:scale-[0.98]">
                저장 완료
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Session Modal */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-xl border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-0">
            <div className="bg-blue-600 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">{editingSessionId ? "교육과정 수정" : "새 교육과정 추가"}</h3>
                <p className="text-xs font-bold opacity-80 mt-1">교육 일정 및 강사 정보를 입력하세요.</p>
              </div>
              <button onClick={() => setIsSessionModalOpen(false)} className="hover:rotate-90 transition-transform"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSessionSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 ml-1 uppercase">시작 일자 *</label>
                      <input type="date" required value={sessionFormData.startDate} onChange={e => setSessionFormData({...sessionFormData, startDate: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 ml-1 uppercase">강사명 *</label>
                      <input type="text" required value={sessionFormData.instructorName} onChange={e => setSessionFormData({...sessionFormData, instructorName: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" placeholder="홍길동" />
                  </div>
              </div>
              <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase">교육과정명 *</label>
                  <input required value={sessionFormData.courseName} onChange={e => setSessionFormData({...sessionFormData, courseName: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" placeholder="예: 찾아가는 진로캠프 1회차" />
              </div>
              <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase">협력 파트너</label>
                  <select value={sessionFormData.partnerId} onChange={e => setSessionFormData({...sessionFormData, partnerId: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500">
                      <option value="">파트너 선택 (선택 사항)</option>
                      {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
              </div>
              <Button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all active:scale-[0.98]">
                등록 완료
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
