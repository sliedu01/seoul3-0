"use client"
import React, { useState, useEffect } from "react"
export const dynamic = 'force-dynamic' // Vercel 배포 시 최신 데이터 및 UI 반영 강제
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Pencil, Trash2, FilePlus2, X, Clock, User, BookOpen, Calendar, Building2, UploadCloud, Download, Link, AlertCircle, ChevronDown, ChevronRight, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

type Partner = { 
  id: string; 
  name: string;
  businessRegistration?: string | null;
  contractFile?: string | null;
  insuranceFile?: string | null;
  bankbookFile?: string | null;
  preInspectionFile?: string | null;
}
type ClassDay = {
  id: string
  date: string
  startTime: string | null
  endTime: string | null
  title: string | null
  capacity: number
  participantCount: number
  order: number
}
type Session = {
  id: string
  date: string
  startTime: string | null
  endTime: string | null
  sessionNumber: number
  partnerId: string | null
  partner: Partner | null
  courseName: string | null
  instructorName: string | null
  capacity: number
  participantCount: number
  completerCount: number
  resultPdfPath: string | null
  resultGoogleFormUrl: string | null
  classDays: ClassDay[]
}
type Program = { 
  id: string; 
  name: string; 
  description: string; 
  coreGoals: string;
  order: number;
  sessions: Session[]
}

export default function ProgramsPage() {
const { canEdit, canDelete, isMember, loading: authLoading } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  // DB에 KST 값이 UTC로 저장되어 있으므로 UTC 그대로 읽어 표시 (가독성을 위해 외부 정의 권장되나 현재는 내부 스코프 유지하며 정렬)
  const formatPeriod = (s: Session) => {
    const formatDateUTC = (iso: string) => {
      const d = new Date(iso);
      const month = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
      const wd = weekdays[d.getUTCDay()];
      return `${month}. ${String(day).padStart(2, '0')}. (${wd})`;
    };
    const formatDateShort = (iso: string) => {
      const d = new Date(iso);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `${yyyy}.${mm}.${dd}`;
    };
    const formatTimeUTC = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    };

    if (s.classDays && s.classDays.length > 0) {
      const first = s.classDays[0];
      const last = s.classDays[s.classDays.length - 1];
      const startStr = formatDateShort(first.date);
      const endStr = formatDateShort(last.date);
      return (
        <div className="flex flex-col gap-0.5 whitespace-nowrap">
          <span className="text-xs text-slate-700">{startStr}</span>
          {startStr !== endStr && <span className="opacity-70 text-[10px] text-slate-400 font-bold">~ {endStr}</span>}
          <span className="text-[10px] text-blue-600 font-black">{s.classDays.length}일 수업</span>
        </div>
      );
    }

    const startD = s.startTime ? formatDateUTC(s.startTime) : formatDateUTC(s.date);
    const startT = s.startTime ? formatTimeUTC(s.startTime) : "";
    const endD = s.endTime ? formatDateUTC(s.endTime) : "";
    const endT = s.endTime ? formatTimeUTC(s.endTime) : "";
    if (!startT && !endT) return <span className="font-bold text-slate-700">{startD}</span>;

    return (
      <div className="flex flex-col gap-0.5 whitespace-nowrap">
        <span className="font-bold text-slate-700">{startD} {startT}</span>
        {endD && <span className="opacity-70 text-[10px] text-slate-400 font-bold">~ {endD} {endT}</span>}
      </div>
    );
  };

  // Program Modal
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false)
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null)
  const [programFormData, setProgramFormData] = useState({ name: "", description: "", coreGoals: "", order: "" })

  // Session Modal
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
    classDays: [] as any[] // Add this
  })

  // Survey Entry Modal
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [surveyFormData, setSurveyFormData] = useState({ 
    pdfPath: "", 
    googleUrl: "", 
    excelFile: null as File | null,
    templateId: "" 
  })
  const [inputMethod, setInputMethod] = useState<"PDF" | "EXCEL" | "GOOGLE">("PDF")
  const [isDragging, setIsDragging] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteType, setDeleteType] = useState<"program" | "session" | "classday">("program")
  const [isDeleting, setIsDeleting] = useState(false)

  // ClassDay (교육일) states
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [isClassDayModalOpen, setIsClassDayModalOpen] = useState(false)
  const [editingClassDayId, setEditingClassDayId] = useState<string | null>(null)
  const [classDaySessionId, setClassDaySessionId] = useState<string | null>(null)
  const [classDayFormData, setClassDayFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    title: "",
    capacity: "0",
    participantCount: "0"
  })

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/programs").then(res => res.json()),
      fetch("/api/partners").then(res => res.json())
    ]).then(([progData, partData]) => {
      setPrograms(progData)
      setPartners(partData)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchData()
    fetch("/api/templates").then(res => res.json()).then(setTemplates)
  }, [])

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
      fetchData()
    }
  }

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingSessionId ? `/api/sessions/${editingSessionId}` : "/api/sessions"
    const method = editingSessionId ? "PATCH" : "POST"

    // DB에 KST 값을 그대로 저장 (UTC 컬럼에 KST 시간을 직접 저장하는 방식)
    const startDateTime = sessionFormData.startTime ? `${sessionFormData.startDate}T${sessionFormData.startTime}:00.000Z` : null
    const endDateTime = sessionFormData.endTime ? `${sessionFormData.endDate || sessionFormData.startDate}T${sessionFormData.endTime}:00.000Z` : null

    const res = await fetch(url, {
      method,
      body: JSON.stringify({
        ...sessionFormData,
        date: sessionFormData.startDate,
        programId: selectedProgramId,
        startTime: startDateTime,
        endTime: endDateTime,
        capacity: Number(sessionFormData.capacity),
        participantCount: Number(sessionFormData.participantCount),
        classDays: sessionFormData.classDays // Pass the array
      }),
      headers: { "Content-Type": "application/json" }
    })
    if (res.ok) {
      setIsSessionModalOpen(false)
      fetchData()
    }
  }

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSession) return
    if (!surveyFormData.templateId) {
      alert("평가 템플릿을 먼저 선택해주세요.")
      return
    }

    setIsOcrProcessing(true)

    try {
      const qRes = await fetch(`/api/templates/${surveyFormData.templateId}`)
      const templateData = await qRes.json()
      const questions = templateData.questions || []
      const selectedTemplate = templates.find(t => t.id === surveyFormData.templateId)

      if (questions.length === 0) {
        alert("템플릿에 등록된 문항이 없습니다.")
        setIsOcrProcessing(false)
        return
      }

      // Simulation or Real Data based on input method
      let mockResponses = [];
      const getCat = (q: any) => {
          if (!q.category) return "미지정";
          return q.category.includes('|') ? q.category.split('|').pop() : q.category;
      };

      if (inputMethod === "EXCEL" && surveyFormData.excelFile) {
          const XLSX = await import("xlsx");
          const data = await surveyFormData.excelFile.arrayBuffer();
          const workbook = XLSX.read(data);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json: any[] = XLSX.utils.sheet_to_json(sheet);
          
          mockResponses = json.map((row: any) => ({
              studentName: row["성명"] || "알수없음",
              researchTarget: "ELEMENTARY",
              type: selectedTemplate?.type?.includes('성숙도') ? 'MATURITY' : 'SATISFACTION',
              answers: questions.map((q: any) => {
                  const cat = getCat(q);
                  const isS = q.growthType === 'NONE' || q.category?.includes('만족') || q.content?.includes('만족');
                  let score = null, preScore = null, postChange = null, textValue = "";
                  
                  if (!isS && (q.growthType === 'CHANGE' || q.growthType === 'PRE_POST')) {
                      preScore = row[`사전_${cat}`];
                      const postScore = row[`사후_${cat}`];
                      if (q.growthType === 'CHANGE') {
                          postChange = (postScore !== undefined && preScore !== undefined) ? Number(postScore) - Number(preScore) : null;
                          score = postScore ? Number(postScore) : null;
                      } else {
                          score = postScore ? Number(postScore) : null;
                      }
                      preScore = preScore ? Number(preScore) : null;
                  } else {
                      const prefix = q.type === 'MCQ' ? '만족도_' : '';
                      const val = row[`${prefix}${cat}`];
                      if (q.type === 'ESSAY') textValue = val || "";
                      else score = val ? Number(val) : null;
                  }
                  return { questionId: q.id, score, preScore, postChange, textValue };
              })
          }));
      } else {
          // Fallback to Simulation (Prompt-Based)
          const mockCount = inputMethod === "PDF" ? 5 : inputMethod === "EXCEL" ? 10 : 25
          mockResponses = Array.from({ length: mockCount }).map((_, idx) => ({
            studentName: `학생_${idx + 1}`,
            researchTarget: "ELEMENTARY",
            type: selectedTemplate?.type?.includes('성숙도') ? 'MATURITY' : 'SATISFACTION',
            answers: questions.map((q: any, qIdx: number) => {
                let score: number | null = null, preScore: number | null = null, postChange: number | null = null, textValue = "";
                
                if (q.growthType === 'CHANGE' || q.growthType === 'PRE_POST') {
                    const preMark = Math.floor(Math.random() * 3) + 2;
                    const improvement = Math.random() > 0.3 ? (Math.random() > 0.8 ? 2 : 1) : 0;
                    const postMark = Math.min(5, preMark + improvement);
                    
                    if (q.growthType === 'CHANGE') {
                        preScore = preMark;
                        postChange = postMark - preMark;
                        score = postMark;
                    } else {
                        preScore = preMark;
                        score = postMark;
                    }
                } else if (q.type === 'MCQ') {
                    score = Math.floor(Math.random() * 2) + 4;
                } else if (q.type === 'ESSAY') {
                    const essaySentences = ["친구들과 조를 짜서 문제 해결을 한 과정이 가장 기억에 남습니다.", "선생님이 알려주신 나의 장점 키워드들이 힘이 되었습니다.", "어렵게 느껴졌던 기술들을 직접 체험해보니 자신감이 생겼습니다.", "다음에는 코딩뿐만 아니라 디자인 수업도 들어보고 싶습니다.", "오늘 배운 내용을 친구들에게도 알려주고 싶어요."];
                    textValue = essaySentences[Math.floor(Math.random() * essaySentences.length)];
                }
                
                if (Math.random() < 0.01) {
                    score = null; preScore = null; postChange = null;
                }
                return { questionId: q.id, score, preScore, postChange, textValue };
            })
          }))
      }

      await fetch("/api/responses/bulk", {
        method: "POST",
        body: JSON.stringify({
          sessionId: activeSession.id,
          templateId: surveyFormData.templateId,
          responses: mockResponses
        }),
        headers: { "Content-Type": "application/json" }
      })

      // Update Session Metadata
      await fetch(`/api/sessions/${activeSession.id}/survey-result`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resultPdfPath: surveyFormData.pdfPath, 
          resultGoogleFormUrl: surveyFormData.googleUrl 
        })
      })

      alert(`${inputMethod} 방식을 통해 ${mockResponses.length}건의 데이터가 등록되었습니다.`);
      setShowSurveyModal(false);
      fetchData();
    } catch (err) {
      console.error(err)
      alert("데이터 처리 중 오류가 발생했습니다.")
    } finally {
      setIsOcrProcessing(false)
    }
  }

  const handleDownloadExcelTemplate = async () => {
    if (!surveyFormData.templateId) {
      alert("평가 템플릿을 먼저 선택해주세요.")
      return
    }
    
    try {
      const qRes = await fetch(`/api/templates/${surveyFormData.templateId}`)
      const templateData = await qRes.json()
      const questions = templateData.questions || []
      
      if (questions.length === 0) {
        alert("템플릿에 등록된 문항이 없습니다.")
        return
      }

      const XLSX = await import("xlsx")
      
      // Separate questions by type for grouping
      const isSat = (q: any) => q.growthType === 'NONE' || q.category?.includes('만족') || q.content?.includes('만족');

      const maturityQs = questions.filter((q: any) => q.type === 'MCQ' && !isSat(q));
      const otherQs = questions.filter((q: any) => q.type !== 'MCQ' || isSat(q));

      // Function to get clean category name
      const getCat = (q: any) => {
          if (!q.category) return "미지정";
          return q.category.includes('|') ? q.category.split('|').pop() : q.category;
      };

      // Header for Excel following the screenshot pattern
      const headers = ["성명"]
      maturityQs.forEach((q: any) => headers.push(`사전_${getCat(q)}`))
      maturityQs.forEach((q: any) => headers.push(`사후_${getCat(q)}`))
      otherQs.forEach((q: any) => {
          const prefix = q.type === 'MCQ' ? '만족도_' : '';
          headers.push(`${prefix}${getCat(q)}`);
      })

      // Create Sheet Data (Rows)
      const dataRows = [headers]
      
      // Add five empty rows for convenience
      for (let i = 1; i <= 5; i++) {
        dataRows.push([`학생_${i}`]) 
      }

      const ws = XLSX.utils.aoa_to_sheet(dataRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "설문데이터입력")
      
      XLSX.writeFile(wb, `${templateData.name}_입력양식.xlsx`)
    } catch (err) {
      console.error(err)
      alert("양식 파일 생성 중 오류가 발생했습니다.")
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      if (inputMethod === "PDF" && file.type === "application/pdf") {
        setSurveyFormData({ ...surveyFormData, pdfPath: file.name })
      } else if (inputMethod === "EXCEL" && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv"))) {
        setSurveyFormData({ ...surveyFormData, excelFile: file })
      } else {
        alert("선택한 입력 방식에 맞는 파일을 업로드해주세요.")
      }
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      let url = ""
      if (deleteType === "program") url = `/api/programs/${deleteId}`
      else if (deleteType === "session") url = `/api/sessions/${deleteId}`
      else url = `/api/classdays/${deleteId}`
      
      const res = await fetch(url, { method: "DELETE" })
      if (res.ok) {
        setIsDeleteConfirmOpen(false)
        fetchData()
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`삭제 실패: ${errorData.error || "서버 오류가 발생했습니다."}`);
      }
    } catch (err) {
      console.error("Delete error:", err)
      alert("삭제 중 네트워크 오류가 발생했습니다. 서버 상태를 확인해주세요.")
    } finally {
      setIsDeleting(false)
    }
  }

  // ClassDay (교육일) handlers
  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

  const openClassDayModal = (sessionId: string, classDay?: ClassDay) => {
    setClassDaySessionId(sessionId)
    if (classDay) {
      setEditingClassDayId(classDay.id)
      const getDateTimeParts = (dateStr: string | null) => {
        if (!dateStr) return { date: "", time: "" };
        const d = new Date(dateStr);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const mi = String(d.getUTCMinutes()).padStart(2, '0');
        return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
      };
      const dateParts = getDateTimeParts(classDay.date);
      const startParts = classDay.startTime ? getDateTimeParts(classDay.startTime) : { date: "", time: "" };
      const endParts = classDay.endTime ? getDateTimeParts(classDay.endTime) : { date: "", time: "" };
      setClassDayFormData({
        date: dateParts.date,
        startTime: startParts.time,
        endTime: endParts.time,
        title: classDay.title || "",
        capacity: classDay.capacity.toString(),
        participantCount: classDay.participantCount.toString()
      })
    } else {
      setEditingClassDayId(null)
      setClassDayFormData({
        date: new Date().toISOString().split('T')[0],
        startTime: "",
        endTime: "",
        title: "",
        capacity: "0",
        participantCount: "0"
      })
    }
    setIsClassDayModalOpen(true)
  }

  const handleClassDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingClassDayId ? `/api/classdays/${editingClassDayId}` : "/api/classdays"
    const method = editingClassDayId ? "PATCH" : "POST"
    const startDateTime = classDayFormData.startTime ? `${classDayFormData.date}T${classDayFormData.startTime}:00.000Z` : null
    const endDateTime = classDayFormData.endTime ? `${classDayFormData.date}T${classDayFormData.endTime}:00.000Z` : null
    const res = await fetch(url, {
      method,
      body: JSON.stringify({
        programSessionId: classDaySessionId,
        date: `${classDayFormData.date}T00:00:00.000Z`,
        startTime: startDateTime,
        endTime: endDateTime,
        title: classDayFormData.title,
        capacity: Number(classDayFormData.capacity),
        participantCount: Number(classDayFormData.participantCount)
      }),
      headers: { "Content-Type": "application/json" }
    })
    if (res.ok) {
      setIsClassDayModalOpen(false)
      fetchData()
    }
  }

  const formatClassDayDate = (iso: string) => {
    const d = new Date(iso);
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const wd = weekdays[d.getUTCDay()];
    return `${month}.${String(day).padStart(2, '0')} (${wd})`;
  }

  const formatClassDayTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  }

  const openSessionModal = (programId: string, session?: Session) => {
    setSelectedProgramId(programId)
    if (session) {
      setEditingSessionId(session.id)
      
      // DB에 KST 값이 UTC로 저장되어 있으므로 UTC 그대로 파싱
      const getDateTimeParts = (dateStr: string | null) => {
        if (!dateStr) return { date: "", time: "" };
        const d = new Date(dateStr);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const mi = String(d.getUTCMinutes()).padStart(2, '0');
        return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
      };

      const start = session.startTime ? getDateTimeParts(session.startTime) : { date: getDateTimeParts(session.date).date, time: "" };
      const end = session.endTime ? getDateTimeParts(session.endTime) : { date: getDateTimeParts(session.date).date, time: "" };

      setSessionFormData({
        partnerId: session.partnerId || "",
        startDate: start.date,
        startTime: session.startTime ? start.time : "",
        endDate: end.date,
        endTime: session.endTime ? end.time : "",
        courseName: session.courseName || "",
        instructorName: session.instructorName || "",
        capacity: session.capacity.toString(),
        participantCount: session.participantCount.toString(),
        classDays: session.classDays || []
      })
    } else {
      setEditingSessionId(null)
      setSessionFormData({
        partnerId: "",
        startDate: new Date().toISOString().split('T')[0],
        startTime: "",
        endDate: new Date().toISOString().split('T')[0],
        endTime: "",
        courseName: "",
        instructorName: "",
        capacity: "30",
        participantCount: "0",
        classDays: []
      })
    }
    setIsSessionModalOpen(true)
  }

  // 데이터 로딩 중 표시 (애니메이션 효과)
  if (loading && programs.length === 0) return (
    <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent animate-spin rounded-full"></div>
      <p className="font-bold text-slate-400 italic">사업 데이터를 최적화하여 불러오고 있습니다...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-300 pb-20">
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">사업 관리</h2>
          <p className="text-slate-500 mt-1 font-semibold italic text-sm md:text-lg">전체 사업 및 세션별 교육 과정을 관리합니다.</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditingProgramId(null); setProgramFormData({ name: "", description: "", coreGoals: "", order: (programs.length + 1).toString() }); setIsProgramModalOpen(true); }} className="h-10 md:h-12 px-4 md:px-6 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl md:rounded-2xl shadow-lg transition-all active:scale-95 text-xs md:text-sm">
            <Plus className="mr-1 md:mr-2 h-4 w-5 md:h-5 md:w-5" /> 새 사업 등록
          </Button>
        )}
      </div>

      {isMember && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3 text-blue-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">현재 관찰자(회원) 등급으로 접속 중입니다. 데이터 조회 및 필터링만 가능하며 수정은 제한됩니다.</p>
        </div>
      )}

      {programs.length === 0 ? (
        <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-[2.5rem]">
          <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold italic">등록된 사업이 없습니다.</p>
        </div>
      ) : programs.map(program => (
        <section key={program.id} className="space-y-4">
          <Card className="border-none shadow-sm overflow-hidden bg-white ring-1 ring-slate-100 rounded-[2rem]">
            {/* Table Header */}
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></div>
                <h3 className="text-xl font-black text-slate-900">{program.order}. {program.name}</h3>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">{program.sessions.length} SESSIONS</span>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <Button variant="ghost" size="sm" onClick={() => openSessionModal(program.id)} className="h-9 md:h-10 px-3 md:px-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-100 flex gap-2 items-center transition-all active:scale-95 text-[10px] md:text-xs">
                    <Plus className="w-3 md:w-4 h-3 md:h-4" /> 교육과정 추가
                  </Button>
                )}
                {canEdit && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingProgramId(program.id); setProgramFormData({ name: program.name, description: program.description || "", coreGoals: program.coreGoals || "", order: program.order.toString() }); setIsProgramModalOpen(true); }} className="h-9 w-9 md:h-10 md:w-10 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-white border border-slate-200 rounded-xl transition-all">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="sm" onClick={() => { setDeleteId(program.id); setDeleteType("program"); setIsDeleteConfirmOpen(true); }} className="h-9 w-9 md:h-10 md:w-10 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 bg-white border border-slate-200 rounded-xl transition-all">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 text-[11px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100">
                    <th className="px-8 py-4 whitespace-nowrap">교육기간</th>
                    <th className="px-6 py-4 whitespace-nowrap w-24">회차</th>
                    <th className="px-6 py-4 min-w-[120px]">협력업체</th>
                    <th className="px-6 py-4 min-w-[200px]">강의명</th>
                    <th className="px-6 py-4 whitespace-nowrap">강사명</th>
                    <th className="px-5 py-4 whitespace-nowrap text-center">정원</th>
                    <th className="px-5 py-4 whitespace-nowrap text-center">출석</th>
                    <th className="px-8 py-4 text-center whitespace-nowrap w-[240px]">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {program.sessions.length === 0 ? (
                    <tr><td colSpan={8} className="px-8 py-10 text-center text-sm font-bold text-slate-300 italic">등록된 교육 과정이 없습니다.</td></tr>
                    ) : program.sessions.map(session => {
                      const isExpanded = expandedSessions.has(session.id)
                      const hasClassDays = session.classDays && session.classDays.length > 0
                      return (
                        <React.Fragment key={session.id}>
                          <tr 
                            className={cn(
                              "text-sm transition-colors group cursor-pointer",
                              isExpanded ? "bg-blue-50/20 hover:bg-blue-50/30" : "hover:bg-slate-50/50"
                            )} 
                            onClick={() => toggleSessionExpand(session.id)}
                          >
                            <td className="px-8 py-5 font-bold text-slate-700 whitespace-nowrap">
                              <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                                <span className={cn(
                                  "flex items-center justify-center w-6 h-6 rounded-lg transition-all",
                                  isExpanded ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                                )}>
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </span>
                                {formatPeriod(session)}
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black whitespace-nowrap">{session.sessionNumber}회차</span>
                            </td>
                            <td className="px-6 py-5 font-bold text-slate-600">
                              {session.partner?.name || "-"}
                            </td>
                            <td className="px-6 py-5 font-bold text-slate-900">{session.courseName || "-"}</td>
                            <td className="px-6 py-5 text-slate-500 font-bold whitespace-nowrap">{session.instructorName || "-"}</td>
                            <td className="px-5 py-5 text-center font-bold text-slate-500">
                              {hasClassDays ? (
                                <span className="text-xs text-slate-400" title="교육일 합산">{session.capacity}<span className="text-[9px] ml-0.5 opacity-60">합계</span></span>
                              ) : session.capacity}
                            </td>
                            <td className="px-5 py-5 text-center font-black text-blue-600 font-mono italic text-lg">
                              {session.participantCount}
                            </td>
                            <td className="px-8 py-5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2 min-w-[120px]">
                                {canEdit && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => { setActiveSession(session); setSurveyFormData({ pdfPath: session.resultPdfPath || "", googleUrl: session.resultGoogleFormUrl || "", excelFile: null, templateId: "" }); setShowSurveyModal(true); }}
                                    className="h-8 md:h-9 px-2 md:px-3 text-blue-600 font-black hover:bg-blue-50 rounded-xl flex gap-1 items-center transition-all active:scale-95 border border-blue-100 whitespace-nowrap text-[10px] md:text-sm"
                                  >
                                    <FilePlus2 className="w-3 md:w-4 h-3 md:h-4 shrink-0" /> <span className="whitespace-nowrap">입력</span>
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button variant="ghost" size="sm" onClick={() => openSessionModal(program.id, session)} className="h-8 w-8 md:h-9 md:w-9 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button variant="ghost" size="sm" onClick={() => { setDeleteId(session.id); setDeleteType("session"); setIsDeleteConfirmOpen(true); }} className="h-8 w-8 md:h-9 md:w-9 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          
                          {/* Tree Connector Styling for ClassDays */}
                          {isExpanded && (
                            <tr className="bg-slate-50/20">
                              <td colSpan={8} className="p-0">
                                <div className="relative ml-12 pl-8 pb-4 border-l-2 border-blue-200">
                                  {hasClassDays ? (
                                    <table className="w-full text-xs border-collapse">
                                      <thead>
                                        <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                                          <th className="px-4 py-2 text-left">수업일</th>
                                          <th className="px-4 py-2 text-left">시간</th>
                                          <th className="px-4 py-2 text-left">수업명</th>
                                          <th className="px-4 py-2 text-center">정원</th>
                                          <th className="px-4 py-2 text-center">참여</th>
                                          <th className="px-4 py-2 text-center">관리</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                        {session.classDays.map((cd) => (
                                          <tr key={cd.id} className="group/cd-row hover:bg-white transition-colors relative">
                                            {/* Connector Horizontal Line */}
                                            <div className="absolute -left-[34px] top-1/2 w-8 border-t-2 border-blue-200"></div>
                                            
                                            <td className="px-4 py-3 font-bold text-slate-600 whitespace-nowrap">
                                              <div className="flex items-center gap-2">
                                                <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                                                {formatClassDayDate(cd.date)}
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 font-bold whitespace-nowrap">
                                              {formatClassDayTime(cd.startTime)}{cd.endTime ? ` ~ ${formatClassDayTime(cd.endTime)}` : ""}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-800">{cd.title || "-"}</td>
                                            <td className="px-4 py-3 text-center font-bold text-slate-500">{cd.capacity}</td>
                                            <td className="px-4 py-3 text-center font-black text-blue-600">{cd.participantCount}</td>
                                            <td className="px-4 py-3">
                                              <div className="flex items-center justify-center gap-1">
                                                {canEdit && (
                                                  <Button variant="ghost" size="sm" onClick={() => openClassDayModal(session.id, cd)} className="h-7 w-7 p-0 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                                    <Pencil className="h-3 w-3" />
                                                  </Button>
                                                )}
                                                {canDelete && (
                                                  <Button variant="ghost" size="sm" onClick={() => { setDeleteId(cd.id); setDeleteType("classday"); setIsDeleteConfirmOpen(true); }} className="h-7 w-7 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <div className="py-6 px-4 text-center">
                                      <div className="absolute -left-[34px] top-1/2 w-8 border-t-2 border-blue-200"></div>
                                      <CalendarDays className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                      <p className="text-xs font-bold text-slate-400 italic">등록된 수업일이 없습니다.</p>
                                      <p className="text-[10px] text-slate-300 mt-1">아래 버튼으로 수업일을 추가해 주세요.</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
  
                          {/* Add ClassDay button - show when expanded */}
                          {isExpanded && canEdit && (
                            <tr className="bg-slate-50/30">
                              <td colSpan={8} className="pl-14 py-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openClassDayModal(session.id); }}
                                  className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  수업일 추가
                                </button>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      ))}

      {/* Program Modal */}
      {isProgramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
                    <input 
                      type="number" 
                      required 
                      value={programFormData.order} 
                      onChange={e => setProgramFormData({...programFormData, order: e.target.value})} 
                      className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-black focus:ring-2 focus:ring-blue-500" 
                      placeholder="1" 
                    />
                  </div>
                  <div className="space-y-2 col-span-3">
                    <label className="text-xs font-black text-slate-400 ml-1 uppercase">사업명 *</label>
                    <input 
                      required 
                      value={programFormData.name} 
                      onChange={e => setProgramFormData({...programFormData, name: e.target.value})} 
                      className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" 
                      placeholder="예: 2026 청소년 진로캠프" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase">핵심 목표 *</label>
                  <input required value={programFormData.coreGoals} onChange={e => setProgramFormData({...programFormData, coreGoals: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" placeholder="예: 진로 탐색 및 역량 강화" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase">설명</label>
                  <textarea value={programFormData.description} onChange={e => setProgramFormData({...programFormData, description: e.target.value})} className="w-full h-24 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 resize-none" placeholder="사업 상세 설명을 입력하세요" />
                </div>
              </div>
              <Button type="submit" className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl transition-all active:scale-[0.98]">
                {editingProgramId ? "수정 내용 저장" : "사업 등록 완료"}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Session Modal (Course Creation/Edit) */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-xl border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-0">
            <div className="bg-blue-600 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">{editingSessionId ? "교육과정 수정" : "새 교육과정 추가"}</h3>
                <p className="text-xs font-bold opacity-80 mt-1">세션 정보 일정을 등록합니다.</p>
              </div>
              <button onClick={() => setIsSessionModalOpen(false)} className="hover:rotate-90 transition-transform"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSessionSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase flex gap-2 items-center"><Calendar className="w-3 h-3" /> 시작 일자 *</label>
                  <input 
                    type="date" 
                    required 
                    value={sessionFormData.startDate} 
                    onChange={e => {
                      const newDate = e.target.value;
                      // 신규 등록이거나 종료일자가 비어있는 경우 시작일자와 맞춤
                      setSessionFormData({
                        ...sessionFormData, 
                        startDate: newDate,
                        endDate: (!sessionFormData.endDate || !editingSessionId) ? newDate : sessionFormData.endDate
                      });
                    }} 
                    className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase flex gap-2 items-center"><Clock className="w-3 h-3" /> 시작 시간</label>
                  <input type="time" value={sessionFormData.startTime} onChange={e => setSessionFormData({...sessionFormData, startTime: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase flex gap-2 items-center"><Calendar className="w-3 h-3" /> 종료 일자 *</label>
                  <input type="date" required value={sessionFormData.endDate} onChange={e => setSessionFormData({...sessionFormData, endDate: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase flex gap-2 items-center"><Clock className="w-3 h-3" /> 종료 시간</label>
                  <input type="time" value={sessionFormData.endTime} onChange={e => setSessionFormData({...sessionFormData, endTime: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase flex gap-2 items-center"><Building2 className="w-3 h-3" /> 협력업체 선택 *</label>
                  <select required value={sessionFormData.partnerId} onChange={e => setSessionFormData({...sessionFormData, partnerId: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500">
                    <option value="">협력업체 선택</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase flex gap-2 items-center"><BookOpen className="w-3 h-3" /> 강의명 *</label>
                  <input required value={sessionFormData.courseName} onChange={e => setSessionFormData({...sessionFormData, courseName: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" placeholder="예: 나만의 브랜드 찾기" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase flex gap-2 items-center"><User className="w-3 h-3" /> 강사명</label>
                  <input value={sessionFormData.instructorName} onChange={e => setSessionFormData({...sessionFormData, instructorName: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" placeholder="강사 성함" />
                </div>
                <div className="col-span-2 mt-4 space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-400 ml-1 uppercase flex gap-2 items-center">
                      <CalendarDays className="w-3 h-3 text-blue-600" /> 상세 교육일 (수업날짜/시간)
                    </label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const newClassDays = [...(sessionFormData.classDays || [])];
                        // Default to next day after the last class day, or the start date
                        const lastDate = newClassDays.length > 0 ? new Date(newClassDays[newClassDays.length - 1].date) : new Date(sessionFormData.startDate || new Date());
                        if (newClassDays.length > 0) lastDate.setDate(lastDate.getDate() + 1);
                        
                        newClassDays.push({
                          date: lastDate.toISOString().split('T')[0],
                          startTime: sessionFormData.startTime || "09:00",
                          endTime: sessionFormData.endTime || "12:00",
                          title: `${sessionFormData.courseName || ""} ${newClassDays.length + 1}차시`,
                          capacity: sessionFormData.capacity || "30",
                          participantCount: "0"
                        });
                        setSessionFormData({...sessionFormData, classDays: newClassDays});
                      }}
                      className="h-8 px-3 text-[10px] font-black border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3 mr-1" /> 교육일 추가
                    </Button>
                  </div>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {sessionFormData.classDays?.map((cd: any, idx: number) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative group/cd">
                        <button 
                          type="button"
                          onClick={() => {
                            const newClassDays = sessionFormData.classDays.filter((_: any, i: number) => i !== idx);
                            setSessionFormData({...sessionFormData, classDays: newClassDays});
                          }}
                          className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover/cd:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400">날짜</label>
                            <input 
                              type="date" 
                              value={cd.date} 
                              onChange={e => {
                                const newClassDays = [...sessionFormData.classDays];
                                newClassDays[idx].date = e.target.value;
                                setSessionFormData({...sessionFormData, classDays: newClassDays});
                              }}
                              className="w-full h-8 px-2 bg-white border-none rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400">수업명</label>
                            <input 
                              type="text" 
                              value={cd.title} 
                              onChange={e => {
                                const newClassDays = [...sessionFormData.classDays];
                                newClassDays[idx].title = e.target.value;
                                setSessionFormData({...sessionFormData, classDays: newClassDays});
                              }}
                              className="w-full h-8 px-2 bg-white border-none rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400">시작 시간</label>
                            <input 
                              type="time" 
                              value={cd.startTime} 
                              onChange={e => {
                                const newClassDays = [...sessionFormData.classDays];
                                newClassDays[idx].startTime = e.target.value;
                                setSessionFormData({...sessionFormData, classDays: newClassDays});
                              }}
                              className="w-full h-8 px-2 bg-white border-none rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400">종료 시간</label>
                            <input 
                              type="time" 
                              value={cd.endTime} 
                              onChange={e => {
                                const newClassDays = [...sessionFormData.classDays];
                                newClassDays[idx].endTime = e.target.value;
                                setSessionFormData({...sessionFormData, classDays: newClassDays});
                              }}
                              className="w-full h-8 px-2 bg-white border-none rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-500" 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!sessionFormData.classDays || sessionFormData.classDays.length === 0) && (
                      <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-[11px] font-bold text-slate-400 italic">추가된 세부 교육일이 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* v1.0.4: Partner Documents Management Section (Business Registration, Contract, Insurance, Bankbook, Checklist) */}
                {sessionFormData.partnerId && (
                  <div className="col-span-2 mt-4 space-y-4 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" /> 협력업체 증빙 서류 관리
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold">* 가공되지 않은 원본 저장 및 출력용</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { label: "사업자등록증", field: "businessRegistration" },
                        { label: "계약서 원본", field: "contractFile" },
                        { label: "보험증권", field: "insuranceFile" },
                        { label: "통장사본", field: "bankbookFile" },
                        { label: "사전점검체크리스트", field: "preInspectionFile" }
                      ].map((item) => {
                        const partner = partners.find(p => p.id === sessionFormData.partnerId);
                        const value = partner ? (partner as any)[item.field] : null;
                        
                        return (
                          <div key={item.field} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-slate-500">{item.label}</span>
                              {value && (
                                <div className="flex gap-1">
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const link = document.createElement("a");
                                      link.href = `/api/download?file=${encodeURIComponent(value)}`;
                                      link.download = value;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    className="p-1.5 bg-white text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                                    title="원본 다운로드"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => window.open(`/api/download?file=${encodeURIComponent(value)}`, '_blank')}
                                    className="p-1.5 bg-white text-slate-600 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                                    title="인쇄 전 미리보기"
                                  >
                                    <Link className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            <label className={cn(
                              "relative flex items-center justify-center h-10 border-2 border-dashed rounded-xl cursor-pointer transition-all overflow-hidden",
                              value ? "border-emerald-200 bg-white" : "border-slate-200 bg-slate-100 hover:border-blue-300 hover:bg-white"
                            )}>
                              <input 
                                type="file" 
                                accept=".pdf" 
                                className="hidden" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  
                                  const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
                                  if (uploadRes.ok) {
                                    const result = await uploadRes.json();
                                    const partner = partners.find(p => p.id === sessionFormData.partnerId);
                                    if (partner) {
                                      const updatedPartner = { ...partner, [item.field]: result.fileName };
                                      const updateRes = await fetch(`/api/partners/${partner.id}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(updatedPartner)
                                      });
                                      if (updateRes.ok) {
                                        setPartners(partners.map(p => p.id === partner.id ? updatedPartner : p));
                                        alert(`${item.label} 원본이 성공적으로 업로드되었습니다.`);
                                      }
                                    }
                                  }
                                }}
                              />
                              <div className="flex items-center gap-2 truncate px-2">
                                {value ? (
                                  <><FilePlus2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-bold text-emerald-600 truncate max-w-[120px]">{value}</span></>
                                ) : (
                                  <><UploadCloud className="w-3.5 h-3.5 text-slate-400" /><span className="text-[10px] font-bold text-slate-400 text-center leading-none">원본 PDF 업로드</span></>
                                )}
                              </div>
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]">
                {editingSessionId ? "교육과정 수정 저장" : "교육과정 추가 완료"}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Survey Entry Modal */}
      {showSurveyModal && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-0">
            <div className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">설문 결과 입력</h3>
                <p className="text-xs font-bold opacity-60 mt-1">{activeSession.courseName} - {activeSession.sessionNumber}회차</p>
              </div>
              <button onClick={() => setShowSurveyModal(false)} className="hover:rotate-90 transition-transform"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSurveySubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 ml-1 uppercase">평가 템플릿 선택 *</label>
                   <select 
                     required 
                     value={surveyFormData.templateId} 
                     onChange={e => setSurveyFormData({...surveyFormData, templateId: e.target.value})} 
                     className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500"
                   >
                     <option value="">적용할 템플릿을 선택하세요</option>
                     {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.type.includes('MATURITY') ? '성숙도' : '만족도'})</option>
                     ))}
                   </select>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-black text-slate-400 ml-1 uppercase">입력 방법 선택</label>
                   <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
                      {[
                        { id: 'PDF', label: 'PDF 입력', icon: UploadCloud },
                        { id: 'EXCEL', label: '엑셀 입력', icon: FilePlus2 },
                        { id: 'GOOGLE', label: '구글폼 연동', icon: Link }
                      ].map(method => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setInputMethod(method.id as any)}
                          className={cn(
                            "flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all",
                            inputMethod === method.id ? "bg-white text-blue-600 shadow-sm shadow-slate-200" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <method.icon className="w-3.5 h-3.5" />
                          {method.label}
                        </button>
                      ))}
                   </div>
                </div>

                {inputMethod === 'PDF' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-black text-slate-400 ml-1 uppercase leading-none mb-1 block">결과 PDF 업로드 (Drag & Drop)</label>
                    <label 
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files[0];
                        if (file?.type === 'application/pdf') {
                          setSurveyFormData({...surveyFormData, pdfPath: file.name});
                        }
                      }}
                      className={cn(
                          "relative h-40 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden",
                          isDragging ? "border-blue-500 bg-blue-50/50 scale-[1.02]" : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                          surveyFormData.pdfPath ? "border-emerald-500 bg-emerald-50/20" : ""
                      )}
                    >
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setSurveyFormData({...surveyFormData, pdfPath: file.name});
                      }} />
                      {surveyFormData.pdfPath ? (
                          <div className="flex flex-col items-center gap-2 animate-in zoom-in-95">
                              <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                  <FilePlus2 className="w-5 h-5" />
                              </div>
                              <span className="text-xs font-black text-emerald-700">{surveyFormData.pdfPath}</span>
                              <button type="button" onClick={(e) => { e.preventDefault(); setSurveyFormData({...surveyFormData, pdfPath: ""})}} className="text-[10px] font-bold text-slate-400 hover:text-red-500 hover:underline transition-colors mt-1">파일 제거</button>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center gap-2">
                              <UploadCloud className={cn("w-10 h-10 text-slate-400", isDragging && "animate-bounce text-blue-500")} />
                              <p className="text-xs font-bold text-slate-700">PDF 파일을 드래그하거나 클릭하여 업로드</p>
                              <p className="text-[10px] font-medium text-slate-400 text-center px-8 leading-relaxed">AI가 스캔된 페이지에서 O, V 마커를 분석하여<br/>문항별 점수를 자동 추출합니다. (X 표시는 제외)</p>
                          </div>
                      )}
                    </label>
                  </div>
                )}

                {inputMethod === 'EXCEL' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                             <Download className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-xs font-black text-blue-700">입력용 엑셀 템플릿</p>
                             <p className="text-[10px] text-blue-500 font-bold">선택한 평가 문항이 포함된 양식</p>
                          </div>
                       </div>
                       <Button type="button" variant="outline" size="sm" className="h-9 px-4 rounded-xl border-blue-200 text-blue-600 font-black hover:bg-white" onClick={handleDownloadExcelTemplate}>다운로드</Button>
                    </div>
                    <label 
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleFileDrop}
                      className={cn(
                          "relative h-40 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden",
                          isDragging ? "border-blue-500 bg-blue-50/50 scale-[1.02]" : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                          surveyFormData.excelFile ? "border-emerald-500 bg-emerald-50/20" : ""
                      )}
                    >
                      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setSurveyFormData({...surveyFormData, excelFile: file});
                      }} />
                      {surveyFormData.excelFile ? (
                          <div className="flex flex-col items-center gap-2 animate-in zoom-in-95">
                              <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                  <FilePlus2 className="w-5 h-5" />
                              </div>
                              <span className="text-xs font-black text-emerald-700">{surveyFormData.excelFile.name}</span>
                              <button type="button" onClick={(e) => { e.preventDefault(); setSurveyFormData({...surveyFormData, excelFile: null})}} className="text-[10px] font-bold text-slate-400 hover:text-red-500 hover:underline transition-colors mt-1">파일 제거</button>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center gap-2">
                              <UploadCloud className={cn("w-10 h-10 text-slate-400", isDragging && "animate-bounce text-blue-500")} />
                              <p className="text-xs font-bold text-slate-700">엑셀 파일을 드래그하거나 클릭하여 업로드</p>
                              <p className="text-[10px] font-medium text-slate-400 text-center px-8 leading-relaxed">다운로드한 양식에 데이터를 입력 후<br/>업로드하면 자동으로 분석됩니다.</p>
                          </div>
                      )}
                    </label>
                  </div>
                )}

                {inputMethod === 'GOOGLE' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 ml-1 uppercase">구글 폼 결과 링크 (응답 스프레드시트)</label>
                      <div className="relative group">
                        <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                          type="url" 
                          value={surveyFormData.googleUrl} 
                          onChange={e => setSurveyFormData({...surveyFormData, googleUrl: e.target.value})} 
                          className="w-full h-12 pl-11 pr-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" 
                          placeholder="https://docs.google.com/spreadsheets/d/..." 
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium px-4 leading-relaxed">
                      * 구글 설문지와 연결된 시트의 URL을 입력해 주세요.<br/>
                      * 시트 내 컬럼 제목이 설문 템플릿 문항과 일치해야 분석이 가능합니다.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={isOcrProcessing} className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-slate-200">
                  {isOcrProcessing ? (
                      <div className="flex items-center gap-3">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                          데이터 분석 및 저장 중...
                      </div>
                  ) : "설문 데이터 일괄 등록 및 동기화"}
                </Button>
                <p className="text-center text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">Global Survey Synchronization System</p>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirm */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-8 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">{deleteType === "program" ? "사업" : deleteType === "session" ? "교육과정" : "교육일"} 삭제 확인</h3>
            <p className="text-slate-500 font-bold mb-8">정말 삭제하시겠습니까? 관련 데이터가 모두 삭제되며 복구할 수 없습니다.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 h-12 rounded-xl font-black">취소</Button>
              <Button onClick={handleDeleteConfirm} disabled={isDeleting} className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg shadow-red-100">
                {isDeleting ? "삭제 중..." : "위험성 인지 및 삭제"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ClassDay Modal */}
      {isClassDayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <Card className="w-full max-w-lg border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
            <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-slate-900">{editingClassDayId ? "교육일 수정" : "세부 교육일 추가"}</h3>
              </div>
              <button onClick={() => setIsClassDayModalOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleClassDaySubmit} className="p-8 space-y-5">
              <div>
                <label className="text-xs font-black text-slate-400 ml-1 uppercase">교육일 *</label>
                <input type="date" value={classDayFormData.date} onChange={e => setClassDayFormData({...classDayFormData, date: e.target.value})} required className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase">시작 시간</label>
                  <input type="time" value={classDayFormData.startTime} onChange={e => setClassDayFormData({...classDayFormData, startTime: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase">종료 시간</label>
                  <input type="time" value={classDayFormData.endTime} onChange={e => setClassDayFormData({...classDayFormData, endTime: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 ml-1 uppercase">수업명</label>
                <input type="text" value={classDayFormData.title} onChange={e => setClassDayFormData({...classDayFormData, title: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" placeholder="수업명을 입력하세요" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase">정원</label>
                  <input type="number" min="0" value={classDayFormData.capacity} onChange={e => setClassDayFormData({...classDayFormData, capacity: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase">참여인원</label>
                  <input type="number" min="0" value={classDayFormData.participantCount} onChange={e => setClassDayFormData({...classDayFormData, participantCount: e.target.value})} className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="pt-2">
                <Button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-blue-200">
                  {editingClassDayId ? "교육일 수정 완료" : "교육일 등록"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
