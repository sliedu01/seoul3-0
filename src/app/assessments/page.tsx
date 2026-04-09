"use client"
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Plus, FileText, Settings, X, ChevronRight, GripVertical, UploadCloud, Link, Trash2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

export default function AssessmentsPage() {
  const { canEdit, canDelete, isMember } = useAuth()
  // Modals state
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false)
  const [isEditQuestionsOpen, setIsEditQuestionsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null)
  const [templateFormData, setTemplateFormData] = useState<{
    name: string;
    types: string[]; // ['MATURITY', 'SATISFACTION']
    subType: string;
    scope: string;
    programId: string | null;
    description: string;
    googleFormUrl: string;
  }>({ 
    name: "", 
    types: ["MATURITY"], 
    subType: "PRE_POST", 
    scope: "GLOBAL", 
    programId: null,
    description: "", 
    googleFormUrl: "" 
  })
  const [inputType, setInputType] = useState<"EXCEL" | "PDF" | "GOOGLE_FORM">("EXCEL")

  const [templates, setTemplates] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedProgramId, setSelectedProgramId] = useState("")
  const [selectedSessionId, setSelectedSessionId] = useState("")

  useEffect(() => {
    fetchTemplates()
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    const res = await fetch("/api/programs")
    const data = await res.json()
    if (Array.isArray(data)) setPrograms(data)
  }

  const fetchSessions = async (programId: string) => {
    const res = await fetch(`/api/sessions?programId=${programId}`)
    const data = await res.json()
    if (Array.isArray(data)) setSessions(data)
  }

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/templates")
      const data = await res.json()
      if (Array.isArray(data)) setTemplates(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 3-Level Hierarchy State: 종류(Group) > 구분(Category) > 문항(Question)
  const [surveyGroups, setSurveyGroups] = useState<any[]>([])

  const openEditQuestions = async (template: any) => {
    setSelectedTemplate(template)
    setIsEditQuestionsOpen(true)
    
    // Fetch latest questions from DB
    try {
      const res = await fetch(`/api/templates/${template.id}`)
      const data = await res.json()
      if (data.questions) {
        // Group questions by '종류|구분' parsed from category
        const groupsMap = new Map<string, Map<string, any[]>>()
        
        data.questions.forEach((q: any) => {
          let gName = selectedTemplate.type.includes("SATISFACTION") ? "만족도 조사" : "성숙도 조사"
          let cName = "기본 구분"

          if (q.category && q.category.includes("|")) {
            const parts = q.category.split("|")
            gName = parts[0]
            cName = parts[1]
          } else if (q.category) {
            cName = q.category
          }
          
          if (!groupsMap.has(gName)) groupsMap.set(gName, new Map())
          const catMap = groupsMap.get(gName)!
          if (!catMap.has(cName)) catMap.set(cName, [])
          catMap.get(cName)!.push(q)
        })
        
        const newGroups = Array.from(groupsMap.entries()).map(([gName, catMap], gIdx) => ({
          id: `g-${Date.now()}-${gIdx}`,
          name: gName,
          categories: Array.from(catMap.entries()).map(([cName, qs], cIdx) => ({
            id: `c-${Date.now()}-${gIdx}-${cIdx}`,
            name: cName,
            questions: qs.sort((a,b) => (a.order || 0) - (b.order || 0)).map(q => ({
              id: q.id,
              type: q.type,
              growthType: q.growthType || "NONE",
              content: q.content,
              order: q.order || 0
            }))
          }))
        }))
        
        if (newGroups.length > 0) {
          setSurveyGroups(newGroups)
        } else {
          // Default if no questions exist yet
          setSurveyGroups([
            {
              id: `g-${Date.now()}`,
              name: selectedTemplate.type.includes("SATISFACTION") ? "만족도 조사" : "성숙도 조사",
              categories: [
                {
                  id: `c-${Date.now()}`,
                  name: "기본 구분",
                  questions: [{ id: Date.now(), type: "MCQ", content: "질문을 입력하세요.", growthType: selectedTemplate.subType || "PRE_POST" }]
                }
              ]
            }
          ])
        }
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return
    if (confirm("정말로 이 템플릿을 삭제하시겠습니까? 관련 모든 문항과 조사 결과 데이터가 함께 삭제됩니다.")) {
      const res = await fetch(`/api/templates/${selectedTemplate.id}`, { method: "DELETE" })
      if (res.ok) {
        fetchTemplates()
        setIsSettingsOpen(false)
        setSelectedTemplate(null)
      } else {
        alert("삭제에 실패했습니다.")
      }
    }
  }

  const openSettings = (t: any) => { 
    setSelectedTemplate(t)
    setTemplateFormData({
      name: t.name,
      types: t.type.split(','),
      subType: t.subType || "NORMAL",
      scope: t.scope,
      programId: t.programId || null,
      description: t.description || "",
      googleFormUrl: t.googleFormUrl || ""
    })
    setIsSettingsOpen(true) 
  }

  const handleSaveTemplateMetadata = async (isNew: boolean) => {
    const url = isNew ? "/api/templates" : `/api/templates/${selectedTemplate.id}`
    const method = isNew ? "POST" : "PUT"

    const res = await fetch(url, {
      method,
      body: JSON.stringify({
        ...templateFormData,
        type: templateFormData.types.join(',')
      }),
      headers: { "Content-Type": "application/json" }
    })

    if (res.ok) {
      const data = await res.json()
      // If it's a new template, automatically add default structure (Self-Maturity + Satisfaction)
      if (isNew && data.id) {
        let defaultGroups = [
            {
                id: `g-${Date.now()}`,
                name: "성숙도 조사",
                categories: [
                    {
                        id: `c-${Date.now() + 1}`,
                        name: "자기이해 및 역량",
                        questions: [
                            { id: Date.now() + 2, type: "MCQ", growthType: "PRE_POST", content: "나는 교육 내용을 실제 상황에 적용할 수 있는 자신감이 생겼다." },
                            { id: Date.now() + 3, type: "MCQ", growthType: "PRE_POST", content: "나는 이 분야에서 나의 강점과 부족한 점을 명확히 인지하게 되었다." }
                        ]
                    }
                ]
            },
            {
                id: `g-${Date.now() + 4}`,
                name: "만족도 조사",
                categories: [
                    {
                        id: `c-${Date.now() + 5}`,
                        name: "프로그램 및 강사 만족",
                        questions: [
                            { id: Date.now() + 6, type: "MCQ", growthType: "NONE", content: "교육 장소와 시설은 학습하기에 쾌적하고 적절했다." },
                            { id: Date.now() + 7, type: "MCQ", growthType: "NONE", content: "강사는 학습자와 적극적으로 소통하며 열정적으로 강의했다." }
                        ]
                    }
                ]
            }
        ];

        // Flatten for API using delimited category
        const flattened: any[] = []
        defaultGroups.forEach(g => 
          g.categories.forEach(c => 
            c.questions.forEach((q, idx) => 
               flattened.push({
                 content: q.content,
                 type: q.type.includes("주관식") ? "ESSAY" : "MCQ", 
                 category: `${g.name}|${c.name}`, 
                 growthType: q.growthType,
                 order: idx
               })
            )
          )
        )

        await fetch(`/api/templates/${data.id}/questions`, {
            method: "PUT",
            body: JSON.stringify({ questions: flattened }),
            headers: { "Content-Type": "application/json" }
        });
      }

      fetchTemplates()
      setIsAddTemplateOpen(false)
      setIsSettingsOpen(false)
      setTemplateFormData({ name: "", types: ["MATURITY"], subType: "PRE_POST", scope: "GLOBAL", programId: null, description: "", googleFormUrl: "" })
    } else {
      alert("중 저장 실패")
    }
  }

  const handleSaveQuestions = async () => {
    if (!selectedTemplate) return
    
    // Flatten the surveyGroups tree into a list of questions with type/category
    const flattenedQuestions: any[] = []
    surveyGroups.forEach(group => {
      group.categories.forEach((cat: any) => {
        cat.questions.forEach((q: any, idx: number) => {
          flattenedQuestions.push({
            ...q,
            category: `${group.name}|${cat.name}`, // Delimited Level 1 and Level 2
            order: idx
          })
        })
      })
    })

    const res = await fetch(`/api/templates/${selectedTemplate.id}/questions`, {
      method: "PUT",
      body: JSON.stringify({ questions: flattenedQuestions }),
      headers: { "Content-Type": "application/json" }
    })
        
    if (res.ok) {
        // Auto-detect template types from group names and question analysis types
        let detectedSubType = 'NORMAL'
        const allQs = surveyGroups.flatMap(g => g.categories.flatMap((c:any) => c.questions))
        if (allQs.some(q => q.growthType === 'PRE_POST')) detectedSubType = 'PRE_POST'
        else if (allQs.some(q => q.growthType === 'CHANGE')) detectedSubType = 'CHANGE'

        // Save Group names as comma-separated types for display
        const groupNames = surveyGroups.map(g => g.name)
        const typeString = groupNames.join(',') || '기본 조사'

        await fetch(`/api/templates/${selectedTemplate.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ 
                type: typeString,
                subType: detectedSubType
            }),
            headers: { 'Content-Type': 'application/json' }
        })

      alert("문항 구조 및 내용이 저장되었습니다! (유형 자동 동기화 완료)")
      setIsEditQuestionsOpen(false)
      fetchTemplates()
    }
  }

  const handleCopyTemplate = async (templateId: string) => {
    if (!confirm("이 템플릿의 문항 구조를 그대로 복제하시겠습니까?")) return
    setLoading(true)
    const res = await fetch(`/api/templates/${templateId}/copy`, { method: "POST" })
    if (res.ok) {
        alert("템플릿이 성공적으로 복사되었습니다.")
        fetchTemplates()
    } else {
        alert("복사 중 오류가 발생했습니다.")
    }
    setLoading(false)
  }

  const handleAddGroup = () => {
    const newGroup = {
      id: `g-${Date.now()}`,
      name: "새 종류",
      categories: [
        {
          id: `c-${Date.now()}`,
          name: "새 구분",
          questions: [{ id: Date.now() + 1, type: "MCQ", content: "질문을 입력하세요.", growthType: selectedTemplate?.subType || "PRE_POST" }]
        }
      ]
    }
    setSurveyGroups([...surveyGroups, newGroup])
  }

  const handleAddCategory = (groupId: string) => {
    setSurveyGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          categories: [...g.categories, {
            id: `c-${Date.now()}`,
            name: "새 구분",
            questions: [{ id: Date.now() + 1, type: "MCQ", content: "질문을 입력하세요.", growthType: selectedTemplate?.subType || "PRE_POST" }]
          }]
        }
      }
      return g
    }))
  }

  const handleAddQuestion = (groupId: string, catId: string, qType: string) => {
    setSurveyGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          categories: g.categories.map((c: any) => {
            if (c.id === catId) {
              return {
                ...c,
                questions: [...c.questions, {
                  id: Date.now(),
                  type: qType,
                  growthType: g.name.includes("성숙도") ? (selectedTemplate?.subType || "PRE_POST") : "NONE",
                  content: qType === "MCQ" ? "새로운 5점 척도 문항입니다." : "새로운 주관식 문항입니다."
                }]
              }
            }
            return c
          })
        }
      }
      return g
    }))
  }

  const handleDeleteGroup = (groupId: string) => {
    if (confirm("이 종류와 포함된 모든 구분 및 질문을 삭제하시겠습니까?")) {
      setSurveyGroups(prev => prev.filter(g => g.id !== groupId))
    }
  }

  const handleDeleteCategory = (groupId: string, catId: string) => {
    if (confirm("이 구분과 포함된 모든 질문을 삭제하시겠습니까?")) {
      setSurveyGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return { ...g, categories: g.categories.filter((c: any) => c.id !== catId) }
        }
        return g
      }))
    }
  }

  const handleDeleteQuestion = (groupId: string, catId: string, qId: any) => {
    setSurveyGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          categories: g.categories.map((c: any) => {
            if (c.id === catId) {
              return { ...c, questions: c.questions.filter((q: any) => q.id !== qId) }
            }
            return c
          })
        }
      }
      return g
    }))
  }

  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'GROUP' | 'CATEGORY' | 'QUESTION', parentId?: string, sourceIdx: number } | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string, type: 'GROUP' | 'CATEGORY' | 'QUESTION', sourceIdx: number, parentId?: string) => {
    setDraggedItem({ id, type, parentId, sourceIdx });
    e.dataTransfer.setData("text/plain", id);
    // Visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.4';
      e.currentTarget.style.transform = 'scale(0.98)';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
      e.currentTarget.style.transform = 'scale(1)';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string, targetType: 'GROUP' | 'CATEGORY' | 'QUESTION' | 'ZONE', targetParentId?: string, targetIdx?: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    // 1. Moving a QUESTION
    if (draggedItem.type === 'QUESTION' && (targetType === 'QUESTION' || (targetType === 'ZONE' && targetParentId))) {
      const targetCatId = targetParentId || targetId;
      
      setSurveyGroups(prev => {
        let sourceQ: any = null;
        // Search and remove from source
        const cleanedGroups = prev.map(g => ({
          ...g,
          categories: g.categories.map((c: any) => {
            const idx = c.questions.findIndex((q: any) => q.id === draggedItem.id);
            if (idx !== -1) {
              sourceQ = c.questions[idx];
              return { ...c, questions: c.questions.filter((_: any, i: number) => i !== idx) };
            }
            return c;
          })
        }));

        if (!sourceQ) return prev;

        // Insert into target
        return cleanedGroups.map(g => ({
          ...g,
          categories: g.categories.map((c: any) => {
            if (c.id === targetCatId) {
              const newQuestions = [...c.questions];
              const insertIdx = targetIdx !== undefined ? targetIdx : newQuestions.length;
              newQuestions.splice(insertIdx, 0, sourceQ);
              return { ...c, questions: newQuestions };
            }
            return c;
          })
        }));
      });
    }

    // 2. Moving a CATEGORY
    if (draggedItem.type === 'CATEGORY' && (targetType === 'CATEGORY' || (targetType === 'ZONE' && targetParentId && !targetId.startsWith('c-')))) {
      const targetGroupId = targetParentId || targetId;

      setSurveyGroups(prev => {
        let sourceCat: any = null;
        // Search and remove
        const cleanedGroups = prev.map(g => {
          const idx = g.categories.findIndex((c: any) => c.id === draggedItem.id);
          if (idx !== -1) {
            sourceCat = g.categories[idx];
            return { ...g, categories: g.categories.filter((_: any, i: number) => i !== idx) };
          }
          return g;
        });

        if (!sourceCat) return prev;

        // Insert
        return cleanedGroups.map(g => {
          if (g.id === targetGroupId) {
            const newCategories = [...g.categories];
            const insertIdx = targetIdx !== undefined ? targetIdx : newCategories.length;
            newCategories.splice(insertIdx, 0, sourceCat);
            return { ...g, categories: newCategories };
          }
          return g;
        });
      });
    }

    // 3. Moving a GROUP
    if (draggedItem.type === 'GROUP' && targetType === 'GROUP') {
      setSurveyGroups(prev => {
        const result = [...prev];
        const [moved] = result.splice(draggedItem.sourceIdx, 1);
        const insertIdx = targetIdx !== undefined ? targetIdx : result.length;
        result.splice(insertIdx, 0, moved);
        return result;
      });
    }
  };

  const [isOcrProcessing, setIsOcrProcessing] = useState(false)

  const handleBulkSubmit = async () => {
    if (!selectedSessionId || !selectedTemplate) {
      alert("사업 회차와 템플릿을 확인해주세요.")
      return
    }

    if (inputType === "PDF") {
      setIsOcrProcessing(true)
      // Simulate OCR delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      setIsOcrProcessing(false)
      alert("PDF에서 15명의 설문 응답 데이터가 성공적으로 추출되었습니다. (시뮬레이션)")
    }

    setLoading(true)
    try {
      // 1. Get questions for this template
      const qRes = await fetch(`/api/templates/${selectedTemplate.id}`)
      const templateData = await qRes.json()
      const questions = templateData.questions || []

      if (questions.length === 0) {
        alert("템플릿에 등록된 문항이 없어 데이터를 생성할 수 없습니다. 문항 편집을 먼저 완료해 주세요.")
        setLoading(false)
        return
      }

      // 2. Generate simulation data (10 students)
      const mockCount = inputType === "PDF" ? 15 : inputType === "GOOGLE_FORM" ? 28 : 10
      const targets = ["ELEMENTARY", "MIDDLE", "HIGH", "UNIVERSITY", "OTHER"];
      const mockResponses = Array.from({ length: mockCount }).map((_, idx) => ({
        studentName: `학생_${idx + 1}`,
        researchTarget: targets[Math.floor(Math.random() * targets.length)],
        type: selectedTemplate.type,
        answers: questions.map((q: any) => ({
          questionId: q.id,
          score: q.type === "MCQ" ? Math.floor(Math.random() * 3) + 3 : undefined, // 3~5 points
          preScore: q.growthType !== "NONE" ? Math.floor(Math.random() * 2) + 2 : undefined, // 2~3 points
          postChange: q.growthType === "CHANGE" ? Math.floor(Math.random() * 2) + 1 : undefined, // +1~+2
          textValue: q.type === "ESSAY" ? "프로그램이 매우 유익했습니다. 강사님이 친절하십니다." : undefined
        }))
      }))

      // 3. Call Bulk API
      const res = await fetch("/api/responses/bulk", {
        method: "POST",
        body: JSON.stringify({
          sessionId: selectedSessionId,
          templateId: selectedTemplate.id,
          responses: mockResponses
        }),
        headers: { "Content-Type": "application/json" }
      })

      if (res.ok) {
        const sourceName = inputType === "EXCEL" ? "엑셀" : inputType === "PDF" ? "PDF(OCR)" : "구글폼"
        alert(`${sourceName}를 통해 ${mockResponses.length}건의 설문 데이터가 등록되었습니다!`)
      } else {
        const err = await res.json()
        alert(`저장 중 오류가 발생했습니다: ${err.error}`)
      }
    } catch (error) {
      console.error(error)
      alert("서버 통신 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">문항 및 평가 관리</h2>
          <p className="text-slate-500 mt-1">사전역량, 사후역량, 만족도 조사에 대한 평가 템플릿과 조사 결과를 집중 관리합니다.</p>
        </div>
        {canEdit && (
          <Button onClick={() => setIsAddTemplateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-10">
            <Plus className="w-4 h-4 mr-2"/> 새 평가 템플릿 추가
          </Button>
        )}
      </div>

      {isMember && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3 text-blue-700 mb-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">현재 관찰자(회원) 등급으로 접속 중입니다. 템플릿 정보 조회만 가능하며 추가/수정/삭제는 제한됩니다.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-400">데이터 처리 중...</div>
        ) : templates.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400">등록된 템플릿이 없습니다.</div>
        ) : templates.map(t => (
          <Card key={t.id} className="hover:border-blue-300 transition-colors group bg-white shadow-sm flex flex-col justify-between">
            <div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex gap-1.5 flex-wrap">
                    {t.type && t.type.split(',').map((typeName: string, idx: number) => {
                      const isMaturity = typeName.includes('성숙도') || typeName === 'MATURITY';
                      const displayTitle = typeName === 'MATURITY' ? '성숙도' : typeName === 'SATISFACTION' ? '만족도' : typeName;
                      return (
                        <span key={idx} className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-sm tracking-tighter text-white",
                            isMaturity ? 'bg-blue-600' : 'bg-emerald-600'
                        )}>
                            {displayTitle}
                        </span>
                      );
                    })}
                  </div>
                  <span className={cn(
                      "text-[10px] font-black border px-2 py-0.5 rounded-full",
                      t.scope === 'GLOBAL' ? "bg-slate-50 border-slate-200 text-slate-400" : "bg-blue-50 border-blue-200 text-blue-600"
                  )}>
                      {t.scope === 'GLOBAL' ? '공통' : (t.program?.name || '사업전용')}
                  </span>
                </div>
                <CardTitle className="text-lg mt-3 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug font-black">{t.name}</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm text-slate-500 flex items-center bg-slate-50 p-2 rounded border border-slate-100"><FileText className="w-4 h-4 mr-2 text-slate-400"/> 등록 문항: <strong className="ml-1 text-slate-700">{t._count?.questions || 0}개</strong></p>
              </CardContent>
            </div>
            
            <div className="px-6 pb-6 pt-2">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {canEdit && <Button variant="outline" size="sm" className="w-full border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditQuestions(t)}>문항 편집</Button>}
                  {canEdit && <Button variant="outline" size="sm" className="w-full border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50" onClick={() => openSettings(t)}><Settings className="w-4 h-4 mr-2"/>설정</Button>}
                  {canEdit && <Button variant="outline" size="sm" className="w-full border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => handleCopyTemplate(t.id)}>복사</Button>}
                  {isMember && <Button variant="outline" size="sm" className="w-full border-slate-200 text-slate-400 cursor-not-allowed">조회전용</Button>}
                </div>
                {t.googleFormUrl && (
                  <Button variant="ghost" size="sm" className="text-[11px] text-blue-500 h-6 p-0 hover:bg-transparent hover:underline" onClick={() => window.open(t.googleFormUrl, '_blank')}>
                    <Link className="w-3 h-3 mr-1"/> 구글폼 확인하기
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Template Modal */}
      {isAddTemplateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md max-h-[90vh] flex flex-col border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-0 shadow-blue-900/10">
            <div className="flex-shrink-0 bg-blue-600 px-6 md:px-8 py-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">새 평가 템플릿 추가</h3>
                <p className="text-xs font-bold opacity-80 mt-1">평가 대상과 문항 구성을 시작합니다.</p>
              </div>
              <button 
                onClick={() => setIsAddTemplateOpen(false)} 
                className="hover:rotate-90 transition-all p-2 bg-white/10 rounded-full hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveTemplateMetadata(true); }} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-600" /> 템플릿 설정 정보
                  </label>
                  <div className="space-y-3 bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">템플릿 이름 *</label>
                      <input 
                        name="name" 
                        required 
                        className="w-full h-12 bg-white border border-slate-200 rounded-2xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
                        value={templateFormData.name} 
                        onChange={e => setTemplateFormData({...templateFormData, name: e.target.value})} 
                        placeholder="예: 상반기 STEM 캠프 통합 설문" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">사용 범위 (선택)</label>
                      <select 
                        name="scope" 
                        className="w-full h-12 bg-white border border-slate-200 rounded-2xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
                        value={templateFormData.programId || "GLOBAL"} 
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "GLOBAL") {
                            setTemplateFormData({...templateFormData, scope: "GLOBAL", programId: null});
                          } else {
                            setTemplateFormData({...templateFormData, scope: "PROGRAM", programId: val});
                          }
                        }}
                      >
                        <option value="GLOBAL">공통양식 (전체사업공통)</option>
                        <optgroup label="특정 사업 전용">
                          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </optgroup>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">구글폼 URL (선택)</label>
                      <input 
                        name="googleFormUrl" 
                        className="w-full h-12 bg-white border border-slate-200 rounded-2xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
                        value={templateFormData.googleFormUrl} 
                        onChange={e => setTemplateFormData({...templateFormData, googleFormUrl: e.target.value})} 
                        placeholder="https://forms.gle/..." 
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0 p-6 md:p-8 border-t border-slate-100 flex flex-col gap-3 bg-slate-50/50">
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
                >
                  템플릿 생성 및 기초 문항 자동구성
                </Button>
                <button 
                  type="button" 
                  onClick={() => setIsAddTemplateOpen(false)} 
                  className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  취소하고 돌아가기
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Questions Modal: 3-Level Hierarchy (Group > Category > Question) */}
      {isEditQuestionsOpen && selectedTemplate && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in">
          <div className="bg-slate-50 rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95 border border-white/20">
            {/* Modal Header */}
            <div className="px-4 md:px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-white/80 backdrop-blur-sm z-10">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600"/> 문항 시트 고도화 편집
                </h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded uppercase">{selectedTemplate.name}</span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">종류 {">"} 구분 {">"} 문항 트리 구조</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleAddGroup} className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl h-10 px-5 shadow-lg shadow-slate-200">
                    <Plus className="w-4 h-4 mr-2"/> 새로운 종류 추가
                </Button>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full hover:bg-slate-100" onClick={() => setIsEditQuestionsOpen(false)}><X className="h-5 w-5 text-slate-400"/></Button>
              </div>
            </div>
            
            {/* Modal Body: Recursive Tree Rendering */}
            <div className="p-4 md:p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
              {surveyGroups.map((group, gIdx) => (
                <div 
                  key={group.id} 
                  draggable 
                  onDragStart={(e) => handleDragStart(e, group.id, 'GROUP', gIdx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, group.id, 'GROUP', undefined, gIdx)}
                  className="relative group/group bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
                >
                   {/* Level 1: Group (종류) Header */}
                   <div className="bg-slate-50 px-4 md:px-8 py-4 flex items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-4 flex-1">
                         <div className="flex flex-col gap-1 mr-2 cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-5 h-5 text-slate-300" />
                         </div>
                         <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                         <div className="flex flex-col">
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-0.5">LEVEL 1: 종류</span>
                            <input 
                                className="text-lg font-black text-slate-900 bg-transparent focus:outline-none focus:ring-0 w-full min-w-[200px]" 
                                value={group.name} 
                                onChange={(e) => setSurveyGroups(surveyGroups.map(g => g.id === group.id ? {...g, name: e.target.value} : g))}
                                placeholder="예: 성숙도 조사 / 만족도 조사"
                            />
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <Button variant="ghost" size="sm" onClick={() => handleAddCategory(group.id)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-black text-[11px] h-8">
                            <Plus className="w-3.5 h-3.5 mr-1"/> 구분 추가
                         </Button>
                         <button onClick={() => handleDeleteGroup(group.id)} className="text-rose-400 hover:text-rose-600 p-2"><Trash2 className="w-4 h-4"/></button>
                      </div>
                   </div>

                   {/* Level 2: Categories (구분) */}
                   <div className="p-6 space-y-6">
                      {group.categories.map((cat: any, cIdx: number) => (
                        <div 
                          key={cat.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, cat.id, 'CATEGORY', cIdx, group.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, cat.id, 'CATEGORY', group.id, cIdx)}
                          className={cn(
                             "ml-8 relative group/cat transition-all duration-200",
                             draggedItem?.id === cat.id && "opacity-20 scale-95"
                          )}
                        >
                           {/* Level 2: Category Header */}
                           <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                              <div className="flex items-center gap-3 flex-1">
                                 <div className="cursor-grab active:cursor-grabbing mr-2">
                                    <GripVertical className="w-4 h-4 text-slate-200 hover:text-emerald-400" />
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">LEVEL 2: 구분 (주제)</span>
                                    <input 
                                        className="text-sm font-bold text-slate-700 bg-transparent focus:outline-none focus:ring-0 w-full" 
                                        value={cat.name} 
                                        onChange={(e) => setSurveyGroups(surveyGroups.map(g => {
                                            if (g.id === group.id) {
                                                return {...g, categories: g.categories.map((c:any) => c.id === cat.id ? {...c, name: e.target.value} : c)}
                                            }
                                            return g;
                                        }))}
                                        placeholder="예: 자기이해 / 정보탐색 / 프로그램 만족"
                                    />
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <Button variant="ghost" size="sm" onClick={() => handleAddQuestion(group.id, cat.id, 'MCQ')} className="text-slate-400 hover:text-blue-500 font-bold text-[10px] h-7">객관식+</Button>
                                 <Button variant="ghost" size="sm" onClick={() => handleAddQuestion(group.id, cat.id, 'ESSAY')} className="text-slate-400 hover:text-amber-500 font-bold text-[10px] h-7">주관식+</Button>
                                 <button onClick={() => handleDeleteCategory(group.id, cat.id)} className="text-slate-300 hover:text-rose-500 p-1"><X className="w-3.5 h-3.5"/></button>
                              </div>
                           </div>

                           {/* Level 3: Questions (문항) */}
                           <div 
                             className="ml-6 space-y-3 min-h-[40px] rounded-xl transition-colors duration-200"
                             onDragOver={handleDragOver}
                             onDrop={(e) => handleDrop(e, cat.id, 'ZONE', group.id)}
                           >
                              {cat.questions.map((q: any, qIdx: number) => (
                                <div 
                                  key={q.id} 
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, q.id, 'QUESTION', qIdx, cat.id)}
                                  onDragEnd={handleDragEnd}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => { e.stopPropagation(); handleDrop(e, q.id, 'QUESTION', cat.id, qIdx); }}
                                  className={cn(
                                    "flex gap-4 p-4 bg-slate-50/50 hover:bg-white border-2 border-transparent hover:border-blue-100 rounded-2xl transition-all relative overflow-hidden group/q cursor-grab active:cursor-grabbing",
                                    draggedItem?.id === q.id && "bg-blue-50 border-blue-200 opacity-20"
                                  )}
                                >
                                   <div className="flex flex-col justify-center opacity-40">
                                      <GripVertical className="w-4 h-4" />
                                   </div>
                                   <div className="flex-1 space-y-3">
                                      <div className="flex justify-between items-center">
                                         <div className="flex items-center gap-2 pointer-events-none">
                                            <span className="text-[10px] font-black text-slate-300 uppercase leading-none">Q{qIdx + 1}</span>
                                            <span className={cn(
                                                "text-[9px] font-black px-2 py-0.5 rounded tracking-tighter uppercase",
                                                q.type === 'MCQ' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'
                                            )}>
                                                {q.type === 'MCQ' ? '5점 척도' : '주관식 서술'}
                                            </span>
                                         </div>
                                         <button onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(group.id, cat.id, q.id); }} className="text-slate-200 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5"/></button>
                                      </div>
                                      <input 
                                        className="w-full text-xs font-bold text-slate-600 bg-transparent focus:outline-none placeholder:text-slate-300"
                                        value={q.content}
                                        onChange={(e) => setSurveyGroups(surveyGroups.map(g => {
                                            if (g.id === group.id) {
                                                return {...g, categories: g.categories.map((c:any) => {
                                                    if (c.id === cat.id) {
                                                        return {...c, questions: c.questions.map((question:any) => question.id === q.id ? {...question, content: e.target.value} : question)}
                                                    }
                                                    return c;
                                                })}
                                            }
                                            return g;
                                        }))}
                                        placeholder="조사 문항 내용을 입력해 주세요."
                                      />
                                      {q.type === 'MCQ' && (
                                        <div className="flex items-center gap-3 pt-1">
                                           <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">분석타입:</span>
                                           <div className="flex gap-1.5">
                                              {[
                                                { id: 'NONE', label: '단순점수', color: 'bg-slate-200 text-slate-600' },
                                                { id: 'PRE_POST', label: '비교형(T1/T2)', color: 'bg-indigo-600 text-white' },
                                                { id: 'CHANGE', label: '변화형(+/-)', color: 'bg-blue-600 text-white' }
                                              ].map(opt => (
                                                <button 
                                                    key={opt.id}
                                                    onClick={() => setSurveyGroups(surveyGroups.map(g => {
                                                        if (g.id === group.id) {
                                                            return {...g, categories: g.categories.map((c:any) => {
                                                                if (c.id === cat.id) {
                                                                    return {...c, questions: c.questions.map((question:any) => question.id === q.id ? {...question, growthType: opt.id} : question)}
                                                                }
                                                                return c;
                                                            })}
                                                        }
                                                        return g;
                                                    }))}
                                                    className={cn(
                                                        "text-[8px] font-black px-2 py-0.5 rounded transition-all",
                                                        q.growthType === opt.id ? opt.color : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                                    )}
                                                >
                                                    {opt.label}
                                                </button>
                                              ))}
                                           </div>
                                        </div>
                                      )}
                                   </div>
                                </div>
                              ))}
                              {cat.questions.length === 0 && (
                                <div className="p-4 text-center border border-dashed border-slate-200 rounded-2xl text-[10px] text-slate-400 font-bold italic">문항이 없습니다.</div>
                              )}
                           </div>
                        </div>
                      ))}
                      {group.categories.length === 0 && (
                         <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-400 font-black italic uppercase tracking-widest">NO CATEGORIES IN THIS GROUP</div>
                      )}
                   </div>
                </div>
              ))}

              {surveyGroups.length === 0 && (
                 <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <Plus className="w-8 h-8 text-slate-300"/>
                    </div>
                    <div>
                        <p className="text-slate-500 font-black">정의된 조사 종류가 없습니다.</p>
                        <p className="text-slate-300 text-xs font-bold">상단의 '새로운 종류 추가' 버튼을 눌러 설문 구성을 시작하세요.</p>
                    </div>
                 </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
              <div className="flex gap-6">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TOTAL STRUCTURE</span>
                    <p className="text-sm font-black text-slate-900 leading-none">
                        종류 {surveyGroups.length} | 구분 {surveyGroups.reduce((acc, g) => acc + g.categories.length, 0)} | 문항 {surveyGroups.reduce((acc, g) => acc + g.categories.reduce((si:any, c:any)=>si+c.questions.length, 0), 0)}
                    </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setIsEditQuestionsOpen(false)} className="text-slate-400 font-black">취소</Button>
                <Button onClick={handleSaveQuestions} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 rounded-xl h-12 shadow-xl shadow-indigo-100 active:scale-95 transition-all">문항 시트 최종 저장 및 동기화</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && selectedTemplate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md max-h-[90vh] flex flex-col border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-0 shadow-blue-900/10">
            <div className="flex-shrink-0 bg-slate-800 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">템플릿 상세 설정</h3>
                <p className="text-xs font-bold opacity-60 mt-1">이름, URL 및 분석 힌트를 수정합니다.</p>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="hover:rotate-90 transition-all p-2 bg-white/10 rounded-full hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">템플릿 이름</label>
                  <input 
                    className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
                    value={templateFormData.name} 
                    onChange={e => setTemplateFormData({...templateFormData, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">구글폼 URL</label>
                  <input 
                    className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
                    value={templateFormData.googleFormUrl} 
                    onChange={e => setTemplateFormData({...templateFormData, googleFormUrl: e.target.value})} 
                    placeholder="https://forms.gle/..." 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">설명 (OCR 분석 힌트)</label>
                  <textarea 
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none min-h-[100px] resize-none" 
                    value={templateFormData.description} 
                    onChange={e => setTemplateFormData({...templateFormData, description: e.target.value})} 
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-tight text-red-600">위험 구역 (Danger Zone)</span>
                </div>
                <div className="p-5 bg-rose-50 rounded-3xl border border-rose-100 space-y-3">
                  <p className="text-[11px] text-rose-600 font-bold leading-relaxed">
                    이 템플릿을 삭제하면 연관된 모든 문항과 조사 결과가 영구적으로 삭제되며 복구할 수 없습니다.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-10 border-rose-200 text-rose-600 hover:bg-rose-100 bg-white font-black rounded-xl" 
                    onClick={handleDeleteTemplate}
                  >
                    템플릿 및 모든 데이터 영구 삭제
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 p-8 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button 
                type="button" 
                onClick={() => setIsSettingsOpen(false)} 
                className="flex-1 h-14 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-colors shadow-sm"
              >
                취소
              </button>
              <Button 
                className="flex-[2] h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]" 
                onClick={() => handleSaveTemplateMetadata(false)}
              >
                설정 저장 완료
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
