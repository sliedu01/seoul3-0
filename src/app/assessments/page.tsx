"use client"
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Plus, FileText, Settings, X, GripVertical, Trash2, AlertCircle, CheckCircle2, Link } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

type SurveyType = "SATISFACTION" | "MATURITY"

interface QuestionDraft {
  id: any
  type: string
  growthType: string
  content: string
  order: number
}

interface CategoryDraft {
  id: string
  name: string
  questions: QuestionDraft[]
}

export default function AssessmentsPage() {
  const { canEdit, canDelete, isMember } = useAuth()

  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false)
  const [isEditQuestionsOpen, setIsEditQuestionsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null)
  const [templateFormData, setTemplateFormData] = useState<{
    name: string
    surveyType: SurveyType
    scope: string
    programId: string | null
    description: string
    googleFormUrl: string
  }>({
    name: "",
    surveyType: "MATURITY",
    scope: "GLOBAL",
    programId: null,
    description: "",
    googleFormUrl: "",
  })

  const [templates, setTemplates] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 2-Level: 구분(Category) > 문항(Question)
  const [categories, setCategories] = useState<CategoryDraft[]>([])

  useEffect(() => {
    fetchTemplates()
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    const res = await fetch("/api/programs")
    const data = await res.json()
    if (Array.isArray(data)) setPrograms(data)
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

  const getTemplateType = (typeStr: string): SurveyType => {
    if (!typeStr) return "MATURITY"
    const n = typeStr.toUpperCase()
    if (n.includes("SATISFACTION") || n.includes("만족")) return "SATISFACTION"
    return "MATURITY"
  }

  const openEditQuestions = async (template: any) => {
    setSelectedTemplate(template)
    setIsEditQuestionsOpen(true)
    const tType = getTemplateType(template.type)

    try {
      const res = await fetch(`/api/templates/${template.id}`)
      const data = await res.json()
      if (data.questions && data.questions.length > 0) {
        const catMap = new Map<string, QuestionDraft[]>()
        data.questions.forEach((q: any) => {
          let cName = "기본 구분"
          if (q.category) {
            cName = q.category.includes("|") ? q.category.split("|").pop()! : q.category
          }
          if (!catMap.has(cName)) catMap.set(cName, [])
          catMap.get(cName)!.push({
            id: q.id,
            type: q.type,
            growthType: q.growthType || (tType === "MATURITY" ? "PRE_POST" : "NONE"),
            content: q.content,
            order: q.order || 0,
          })
        })
        setCategories(
          Array.from(catMap.entries()).map(([cName, qs], cIdx) => ({
            id: `c-${Date.now()}-${cIdx}`,
            name: cName,
            questions: qs.sort((a, b) => (a.order || 0) - (b.order || 0)),
          }))
        )
      } else {
        setCategories([
          {
            id: `c-${Date.now()}`,
            name: tType === "MATURITY" ? "자기이해 및 역량" : "프로그램 및 강사",
            questions: [
              {
                id: Date.now(),
                type: "MCQ",
                growthType: tType === "MATURITY" ? "PRE_POST" : "NONE",
                content:
                  tType === "MATURITY"
                    ? "나는 교육 내용을 실제 상황에 적용할 수 있는 자신감이 생겼다."
                    : "강사는 내용을 열정적으로 전달하였다.",
                order: 0,
              },
            ],
          },
        ])
      }
    } catch (error) {
      console.error(error)
      setCategories([])
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
      surveyType: getTemplateType(t.type),
      scope: t.scope,
      programId: t.programId || null,
      description: t.description || "",
      googleFormUrl: t.googleFormUrl || "",
    })
    setIsSettingsOpen(true)
  }

  const handleSaveTemplateMetadata = async (isNew: boolean) => {
    const url = isNew ? "/api/templates" : `/api/templates/${selectedTemplate.id}`
    const method = isNew ? "POST" : "PUT"
    const surveyType = templateFormData.surveyType

    const res = await fetch(url, {
      method,
      body: JSON.stringify({
        name: templateFormData.name,
        type: surveyType,
        subType: surveyType === "MATURITY" ? "PRE_POST" : "NORMAL",
        scope: templateFormData.scope,
        programId: templateFormData.programId,
        description: templateFormData.description,
        googleFormUrl: templateFormData.googleFormUrl,
      }),
      headers: { "Content-Type": "application/json" },
    })

    if (res.ok) {
      const data = await res.json()
      // Auto-create default questions for new template
      if (isNew && data.id) {
        const isMat = surveyType === "MATURITY"
        const groupName = isMat ? "성숙도 조사" : "만족도 조사"
        const catName = isMat ? "자기이해 및 역량" : "프로그램 및 강사 만족"
        const defaultGT = isMat ? "PRE_POST" : "NONE"
        const defaultQs = isMat
          ? [
              "나는 교육 내용을 실제 상황에 적용할 수 있는 자신감이 생겼다.",
              "나는 이 분야에서 나의 강점과 부족한 점을 명확히 인지하게 되었다.",
            ]
          : [
              "교육 장소와 시설은 학습하기에 쾌적하고 적절했다.",
              "강사는 학습자와 적극적으로 소통하며 열정적으로 강의했다.",
            ]

        await fetch(`/api/templates/${data.id}/questions`, {
          method: "PUT",
          body: JSON.stringify({
            questions: defaultQs.map((content, idx) => ({
              content,
              type: "MCQ",
              category: `${groupName}|${catName}`,
              growthType: defaultGT,
              order: idx,
            })),
          }),
          headers: { "Content-Type": "application/json" },
        })
      }

      fetchTemplates()
      setIsAddTemplateOpen(false)
      setIsSettingsOpen(false)
      setTemplateFormData({ name: "", surveyType: "MATURITY", scope: "GLOBAL", programId: null, description: "", googleFormUrl: "" })
    } else {
      alert("저장에 실패했습니다.")
    }
  }

  const handleSaveQuestions = async () => {
    if (!selectedTemplate) return
    const tType = getTemplateType(selectedTemplate.type)
    const groupName = tType === "MATURITY" ? "성숙도 조사" : "만족도 조사"
    const defaultGT = tType === "MATURITY" ? "PRE_POST" : "NONE"

    const flattenedQuestions: any[] = []
    categories.forEach((cat, catIdx) => {
      cat.questions.forEach((q, idx) => {
        flattenedQuestions.push({
          ...q,
          category: `${groupName}|${cat.name}`,
          growthType: q.type === "ESSAY" ? "NONE" : defaultGT,
          order: catIdx * 100 + idx,
        })
      })
    })

    const res = await fetch(`/api/templates/${selectedTemplate.id}/questions`, {
      method: "PUT",
      body: JSON.stringify({ questions: flattenedQuestions }),
      headers: { "Content-Type": "application/json" },
    })

    if (res.ok) {
      await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: "PATCH",
        body: JSON.stringify({ type: tType, subType: tType === "MATURITY" ? "PRE_POST" : "NORMAL" }),
        headers: { "Content-Type": "application/json" },
      })
      alert("문항 구조 및 내용이 저장되었습니다!")
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

  const handleAddCategory = () => {
    const tType = getTemplateType(selectedTemplate?.type || "MATURITY")
    setCategories((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        name: "새 구분",
        questions: [
          {
            id: Date.now() + 1,
            type: "MCQ",
            growthType: tType === "MATURITY" ? "PRE_POST" : "NONE",
            content: "새로운 문항을 입력하세요.",
            order: 0,
          },
        ],
      },
    ])
  }

  const handleDeleteCategory = (catId: string) => {
    if (confirm("이 구분과 포함된 모든 문항을 삭제하시겠습니까?")) {
      setCategories((prev) => prev.filter((c) => c.id !== catId))
    }
  }

  const handleAddQuestion = (catId: string, qType: string) => {
    const tType = getTemplateType(selectedTemplate?.type || "MATURITY")
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId) {
          return {
            ...c,
            questions: [
              ...c.questions,
              {
                id: Date.now(),
                type: qType,
                growthType: qType === "ESSAY" ? "NONE" : tType === "MATURITY" ? "PRE_POST" : "NONE",
                content: qType === "MCQ" ? "새로운 5점 척도 문항입니다." : "새로운 주관식 문항입니다.",
                order: c.questions.length,
              },
            ],
          }
        }
        return c
      })
    )
  }

  const handleDeleteQuestion = (catId: string, qId: any) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId) return { ...c, questions: c.questions.filter((q) => q.id !== qId) }
        return c
      })
    )
  }

  const [draggedItem, setDraggedItem] = useState<{
    id: string
    type: "CATEGORY" | "QUESTION"
    parentId?: string
    sourceIdx: number
  } | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string, type: "CATEGORY" | "QUESTION", sourceIdx: number, parentId?: string) => {
    setDraggedItem({ id, type, parentId, sourceIdx })
    e.dataTransfer.setData("text/plain", id)
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "0.4"
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null)
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "1"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetId: string, targetType: "CATEGORY" | "QUESTION" | "ZONE", targetParentId?: string, targetIdx?: number) => {
    e.preventDefault()
    if (!draggedItem) return

    if (draggedItem.type === "QUESTION" && (targetType === "QUESTION" || targetType === "ZONE")) {
      const targetCatId = targetParentId || targetId
      setCategories((prev) => {
        let sourceQ: QuestionDraft | null = null
        const cleaned = prev.map((c) => {
          const idx = c.questions.findIndex((q) => String(q.id) === draggedItem.id)
          if (idx !== -1) {
            sourceQ = c.questions[idx]
            return { ...c, questions: c.questions.filter((_, i) => i !== idx) }
          }
          return c
        })
        if (!sourceQ) return prev
        return cleaned.map((c) => {
          if (c.id === targetCatId) {
            const newQs = [...c.questions]
            newQs.splice(targetIdx !== undefined ? targetIdx : newQs.length, 0, sourceQ!)
            return { ...c, questions: newQs }
          }
          return c
        })
      })
    }

    if (draggedItem.type === "CATEGORY" && targetType === "CATEGORY") {
      setCategories((prev) => {
        const result = [...prev]
        const [moved] = result.splice(draggedItem.sourceIdx, 1)
        result.splice(targetIdx !== undefined ? targetIdx : result.length, 0, moved)
        return result
      })
    }
  }

  const getExcelHeaders = (catName: string, tType: SurveyType) => {
    if (tType === "MATURITY") return [`사전_${catName}`, `사후_${catName}`]
    return [`결과값_${catName}`]
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">문항 및 평가 관리</h2>
          <p className="text-slate-500 mt-1">만족도·성숙도 조사를 유형별로 분리 관리합니다. 각 템플릿은 사업관리 탭 엑셀 입력폼과 1:1 연동됩니다.</p>
        </div>
        {canEdit && (
          <Button onClick={() => setIsAddTemplateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-10">
            <Plus className="w-4 h-4 mr-2" /> 새 평가 템플릿 추가
          </Button>
        )}
      </div>

      {isMember && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3 text-blue-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">현재 관찰자(회원) 등급으로 접속 중입니다. 조회만 가능합니다.</p>
        </div>
      )}

      {/* Template Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-400">데이터 처리 중...</div>
        ) : templates.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400">등록된 템플릿이 없습니다.</div>
        ) : (
          templates.map((t) => {
            const tType = getTemplateType(t.type)
            const isMat = tType === "MATURITY"
            return (
              <Card key={t.id} className="hover:border-blue-300 transition-colors group bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={cn(
                          "text-[10px] font-black px-3 py-1 rounded-full text-white",
                          isMat ? "bg-indigo-600" : "bg-emerald-600"
                        )}
                      >
                        {isMat ? "📊 성숙도 조사" : "⭐ 만족도 조사"}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-black border px-2 py-0.5 rounded-full",
                          t.scope === "GLOBAL" ? "bg-slate-50 border-slate-200 text-slate-400" : "bg-blue-50 border-blue-200 text-blue-600"
                        )}
                      >
                        {t.scope === "GLOBAL" ? "공통" : t.program?.name || "사업전용"}
                      </span>
                    </div>
                    <CardTitle className="text-base mt-3 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug font-black">
                      {t.name}
                    </CardTitle>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold">
                      {isMat ? "📋 엑셀: 사전_[구분명] | 사후_[구분명]" : "📋 엑셀: 결과값_[구분명]"}
                    </p>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-slate-500 flex items-center bg-slate-50 p-2 rounded border border-slate-100">
                      <FileText className="w-4 h-4 mr-2 text-slate-400" /> 등록 문항:{" "}
                      <strong className="ml-1 text-slate-700">{t._count?.questions || 0}개</strong>
                    </p>
                  </CardContent>
                </div>
                <div className="px-6 pb-6 pt-2">
                  <div className="flex gap-2">
                    {canEdit && (
                      <>
                        <Button variant="outline" size="sm" className="flex-1 border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditQuestions(t)}>
                          문항 편집
                        </Button>
                        <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50" onClick={() => openSettings(t)}>
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => handleCopyTemplate(t.id)}>
                          복사
                        </Button>
                      </>
                    )}
                    {isMember && (
                      <Button variant="outline" size="sm" className="flex-1 border-slate-200 text-slate-400 cursor-not-allowed">
                        조회전용
                      </Button>
                    )}
                  </div>
                  {t.googleFormUrl && (
                    <Button variant="ghost" size="sm" className="mt-2 text-[11px] text-blue-500 h-6 p-0 hover:bg-transparent hover:underline" onClick={() => window.open(t.googleFormUrl, "_blank")}>
                      <Link className="w-3 h-3 mr-1" /> 구글폼 확인하기
                    </Button>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* ─── Add Template Modal ─── */}
      {isAddTemplateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md max-h-[92vh] flex flex-col border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-0">
            <div className="flex-shrink-0 bg-blue-600 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">새 평가 템플릿 추가</h3>
                <p className="text-xs font-bold opacity-80 mt-1">조사 유형을 선택하면 엑셀 입력폼 구조가 결정됩니다.</p>
              </div>
              <button onClick={() => setIsAddTemplateOpen(false)} className="hover:rotate-90 transition-all p-2 bg-white/10 rounded-full hover:bg-white/20">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveTemplateMetadata(true) }} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">템플릿 이름 *</label>
                  <input
                    required
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                    placeholder="예: 2026 상반기 진로캠퍼스 만족도"
                  />
                </div>

                {/* Survey Type - KEY UI */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">조사 유형 선택 *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: "SATISFACTION", label: "만족도 조사", emoji: "⭐", desc: "결과값 (1-5점)", accent: "emerald" },
                      { value: "MATURITY", label: "성숙도 조사", emoji: "📊", desc: "사전/사후 비교", accent: "indigo" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTemplateFormData({ ...templateFormData, surveyType: opt.value })}
                        className={cn(
                          "p-4 rounded-2xl border-2 text-left transition-all",
                          templateFormData.surveyType === opt.value
                            ? opt.value === "SATISFACTION"
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                        )}
                      >
                        <div className="text-2xl mb-1">{opt.emoji}</div>
                        <div
                          className={cn(
                            "text-sm font-black",
                            templateFormData.surveyType === opt.value
                              ? opt.value === "SATISFACTION"
                                ? "text-emerald-700"
                                : "text-indigo-700"
                              : "text-slate-600"
                          )}
                        >
                          {opt.label}
                        </div>
                        <div
                          className={cn(
                            "text-[10px] font-bold mt-0.5",
                            templateFormData.surveyType === opt.value
                              ? opt.value === "SATISFACTION"
                                ? "text-emerald-500"
                                : "text-indigo-500"
                              : "text-slate-400"
                          )}
                        >
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Excel preview */}
                  <div
                    className={cn(
                      "p-3 rounded-2xl border text-xs font-bold",
                      templateFormData.surveyType === "SATISFACTION"
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                        : "bg-indigo-50 border-indigo-100 text-indigo-700"
                    )}
                  >
                    📋 엑셀 헤더 예시:{" "}
                    <span className="font-black">성명</span> |{" "}
                    {templateFormData.surveyType === "SATISFACTION"
                      ? "결과값_[구분명] | 결과값_[구분명] | ..."
                      : "사전_[구분명] | 사후_[구분명] | 사전_[구분2] | 사후_[구분2] | ..."}
                  </div>
                </div>

                {/* Scope */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">사용 범위</label>
                  <select
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    value={templateFormData.programId || "GLOBAL"}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === "GLOBAL") setTemplateFormData({ ...templateFormData, scope: "GLOBAL", programId: null })
                      else setTemplateFormData({ ...templateFormData, scope: "PROGRAM", programId: val })
                    }}
                  >
                    <option value="GLOBAL">공통양식 (전체사업공통)</option>
                    <optgroup label="특정 사업 전용">
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Google Form */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">구글폼 URL (선택)</label>
                  <input
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    value={templateFormData.googleFormUrl}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, googleFormUrl: e.target.value })}
                    placeholder="https://forms.gle/..."
                  />
                </div>
              </div>

              <div className="flex-shrink-0 p-8 border-t border-slate-100 flex flex-col gap-3 bg-slate-50/50">
                <Button
                  type="submit"
                  className={cn(
                    "w-full h-14 text-white font-black rounded-2xl shadow-lg transition-all active:scale-[0.98]",
                    templateFormData.surveyType === "SATISFACTION"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                  )}
                >
                  {templateFormData.surveyType === "SATISFACTION" ? "⭐ 만족도 템플릿 생성" : "📊 성숙도 템플릿 생성"}
                </Button>
                <button type="button" onClick={() => setIsAddTemplateOpen(false)} className="text-sm font-bold text-slate-400 hover:text-slate-600">
                  취소하고 돌아가기
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ─── Edit Questions Modal ─── */}
      {isEditQuestionsOpen &&
        selectedTemplate &&
        (() => {
          const tType = getTemplateType(selectedTemplate.type)
          const isMat = tType === "MATURITY"
          return (
            <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in">
              <div className="bg-slate-50 rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95">
                {/* Header */}
                <div className={cn("px-8 py-6 flex justify-between items-center text-white", isMat ? "bg-indigo-600" : "bg-emerald-600")}>
                  <div>
                    <h3 className="text-xl font-black">{isMat ? "📊 성숙도 조사" : "⭐ 만족도 조사"} 문항 편집</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded">{selectedTemplate.name}</span>
                      <span className="text-[10px] opacity-70 font-bold">
                        {isMat ? "사전/사후 비교 분석 | 구분 → 문항 구조" : "단순 결과값 분석 | 구분 → 문항 구조"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button onClick={handleAddCategory} className="bg-white/20 hover:bg-white/30 text-white font-black rounded-xl h-10 px-5">
                      <Plus className="w-4 h-4 mr-2" /> 구분 추가
                    </Button>
                    <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" onClick={() => setIsEditQuestionsOpen(false)}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Info Banner */}
                <div
                  className={cn(
                    "px-8 py-3 flex items-center gap-3 text-sm font-bold border-b",
                    isMat ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                  )}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {isMat
                    ? "성숙도 조사: 모든 객관식 문항은 사전(T1) + 사후(T2) 2개 값을 동시에 입력받습니다."
                    : "만족도 조사: 모든 객관식 문항은 단일 결과값 (1-5점)을 입력받습니다."}
                  <span className="ml-auto text-xs opacity-60 font-bold">
                    엑셀 헤더: {isMat ? "사전_[구분] | 사후_[구분]" : "결과값_[구분]"}
                  </span>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                  {categories.map((cat, cIdx) => (
                    <div
                      key={cat.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, cat.id, "CATEGORY", cIdx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, cat.id, "CATEGORY", undefined, cIdx)}
                      className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden"
                    >
                      {/* Category Header */}
                      <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-100">
                        <div className="flex items-center gap-4 flex-1">
                          <GripVertical className="w-5 h-5 text-slate-300 cursor-grab shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">구분 (LEVEL 1)</span>
                            <input
                              className="text-base font-black text-slate-900 bg-transparent focus:outline-none focus:ring-0 min-w-[160px]"
                              value={cat.name}
                              onChange={(e) => setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, name: e.target.value } : c)))}
                              placeholder="예: 자기이해, 진로인식, 강사 만족도"
                            />
                          </div>

                          {/* Excel header preview badges */}
                          <div className="flex gap-2 ml-2 flex-wrap">
                            {getExcelHeaders(cat.name || "[구분명]", tType).map((h) => (
                              <span
                                key={h}
                                className={cn(
                                  "text-[10px] font-black px-2 py-1 rounded-lg border",
                                  isMat
                                    ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                                    : "bg-emerald-50 text-emerald-600 border-emerald-200"
                                )}
                              >
                                📊 {h}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => handleAddQuestion(cat.id, "MCQ")} className="text-slate-400 hover:text-blue-500 font-bold text-[10px] h-7">
                            객관식+
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleAddQuestion(cat.id, "ESSAY")} className="text-slate-400 hover:text-amber-500 font-bold text-[10px] h-7">
                            주관식+
                          </Button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-300 hover:text-rose-500 p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Questions */}
                      <div
                        className="p-6 ml-4 space-y-3 min-h-[60px]"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, cat.id, "ZONE", cat.id)}
                      >
                        {cat.questions.map((q, qIdx) => (
                          <div
                            key={q.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, String(q.id), "QUESTION", qIdx, cat.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDrop={(e) => {
                              e.stopPropagation()
                              handleDrop(e, String(q.id), "QUESTION", cat.id, qIdx)
                            }}
                            className={cn(
                              "flex gap-3 p-4 bg-slate-50 hover:bg-white border-2 border-transparent hover:border-blue-100 rounded-2xl transition-all cursor-grab",
                              draggedItem?.id === String(q.id) && "opacity-20"
                            )}
                          >
                            <GripVertical className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-slate-300">Q{qIdx + 1}</span>
                                  {q.type === "MCQ" ? (
                                    isMat ? (
                                      <span className="text-[9px] font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-600">사전 T1 / 사후 T2</span>
                                    ) : (
                                      <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-600">결과값 (1-5점)</span>
                                    )
                                  ) : (
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-600">주관식 서술</span>
                                  )}
                                </div>
                                <button onClick={() => handleDeleteQuestion(cat.id, q.id)} className="text-slate-200 hover:text-rose-500">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <input
                                className="w-full text-xs font-bold text-slate-600 bg-transparent focus:outline-none placeholder:text-slate-300"
                                value={q.content}
                                onChange={(e) =>
                                  setCategories((prev) =>
                                    prev.map((c) => {
                                      if (c.id === cat.id) {
                                        return { ...c, questions: c.questions.map((question) => (question.id === q.id ? { ...question, content: e.target.value } : question)) }
                                      }
                                      return c
                                    })
                                  )
                                }
                                placeholder="문항 내용을 입력해 주세요."
                              />

                              {/* Visual data entry format indicator */}
                              {q.type === "MCQ" && (
                                <div className="flex gap-2 pt-1">
                                  {isMat ? (
                                    <>
                                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg">
                                        <span className="text-[9px] font-black text-blue-600">사전 T1</span>
                                        <div className="flex gap-0.5">
                                          {[1, 2, 3, 4, 5].map((n) => (
                                            <span key={n} className="w-3.5 h-3.5 rounded bg-blue-200 text-[7px] font-black text-blue-700 flex items-center justify-center">
                                              {n}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded-lg">
                                        <span className="text-[9px] font-black text-indigo-600">사후 T2</span>
                                        <div className="flex gap-0.5">
                                          {[1, 2, 3, 4, 5].map((n) => (
                                            <span key={n} className="w-3.5 h-3.5 rounded bg-indigo-200 text-[7px] font-black text-indigo-700 flex items-center justify-center">
                                              {n}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg">
                                      <span className="text-[9px] font-black text-emerald-600">결과값</span>
                                      <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((n) => (
                                          <span key={n} className="w-3.5 h-3.5 rounded bg-emerald-200 text-[7px] font-black text-emerald-700 flex items-center justify-center">
                                            {n}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {cat.questions.length === 0 && (
                          <div className="p-4 text-center border border-dashed border-slate-200 rounded-2xl text-[10px] text-slate-400 font-bold italic">
                            문항이 없습니다.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {categories.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <Plus className="w-8 h-8 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-slate-500 font-black">등록된 구분이 없습니다.</p>
                        <p className="text-slate-300 text-xs font-bold">상단의 &apos;구분 추가&apos; 버튼을 눌러 문항 구성을 시작하세요.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">STRUCTURE</span>
                    <p className="text-sm font-black text-slate-900">
                      구분 {categories.length} | 문항 {categories.reduce((acc, c) => acc + c.questions.length, 0)}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <Button variant="ghost" onClick={() => setIsEditQuestionsOpen(false)} className="text-slate-400 font-black">
                      취소
                    </Button>
                    <Button
                      onClick={handleSaveQuestions}
                      className={cn(
                        "text-white font-black px-8 rounded-xl h-12 shadow-xl transition-all active:scale-95",
                        isMat ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                      )}
                    >
                      문항 시트 최종 저장
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

      {/* ─── Settings Modal ─── */}
      {isSettingsOpen && selectedTemplate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md max-h-[90vh] flex flex-col border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-0">
            <div className="flex-shrink-0 bg-slate-800 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">템플릿 상세 설정</h3>
                <p className="text-xs font-bold opacity-60 mt-1">이름, URL 등을 수정합니다.</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="hover:rotate-90 transition-all p-2 bg-white/10 rounded-full hover:bg-white/20">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-5 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">템플릿 이름</label>
                <input
                  className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={templateFormData.name}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">조사 유형 (변경 불가)</label>
                <div
                  className={cn(
                    "h-12 rounded-2xl px-4 flex items-center text-sm font-black",
                    templateFormData.surveyType === "SATISFACTION" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"
                  )}
                >
                  {templateFormData.surveyType === "SATISFACTION" ? "⭐ 만족도 조사" : "📊 성숙도 조사"}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">구글폼 URL</label>
                <input
                  className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={templateFormData.googleFormUrl}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, googleFormUrl: e.target.value })}
                  placeholder="https://forms.gle/..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">설명 (메모)</label>
                <textarea
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] resize-none"
                  value={templateFormData.description}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-black text-rose-600 uppercase">위험 구역 (Danger Zone)</span>
                </div>
                <div className="p-5 bg-rose-50 rounded-3xl border border-rose-100 space-y-3">
                  <p className="text-[11px] text-rose-600 font-bold leading-relaxed">
                    이 템플릿을 삭제하면 연관된 모든 문항과 조사 결과가 영구적으로 삭제되며 복구할 수 없습니다.
                  </p>
                  <Button variant="outline" size="sm" className="w-full h-10 border-rose-200 text-rose-600 hover:bg-rose-100 bg-white font-black rounded-xl" onClick={handleDeleteTemplate}>
                    템플릿 및 모든 데이터 영구 삭제
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 p-8 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button type="button" onClick={() => setIsSettingsOpen(false)} className="flex-1 h-14 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-colors shadow-sm">
                취소
              </button>
              <Button className="flex-[2] h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]" onClick={() => handleSaveTemplateMetadata(false)}>
                설정 저장 완료
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
