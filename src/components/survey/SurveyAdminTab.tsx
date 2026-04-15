"use client"
import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Trash2, 
  Pencil, 
  Hash, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  ArrowUpDown,
  FileText,
  LayoutGrid,
  Loader2,
  RefreshCcw,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SurveyAdminTabProps {
  sessionId: string;
}

export default function SurveyAdminTab({ sessionId }: SurveyAdminTabProps) {
  const [activeType, setActiveType] = useState<"MATURITY" | "SATISFACTION">("SATISFACTION")
  const [responses, setResponses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  
  // 수정 모달 관련
  const [editingResponse, setEditingResponse] = useState<any | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchResponses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/surveys?type=${activeType}`)
      if (res.ok) {
        const data = await res.json()
        setResponses(data)
      }
    } catch (error) {
      console.error("Failed to fetch responses:", error)
    } finally {
      setLoading(false)
    }
  }, [sessionId, activeType])

  useEffect(() => {
    fetchResponses()
  }, [fetchResponses])

  const handleDelete = async (responseId: string) => {
    if (!confirm("정말 이 응답을 삭제하시겠습니까?")) return
    
    try {
      const res = await fetch(`/api/sessions/${sessionId}/surveys?responseId=${responseId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setResponses(prev => prev.filter(r => r.id !== responseId))
      }
    } catch (error) {
      alert("삭제 실패")
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm(`현재 세션의 모든 ${activeType === 'SATISFACTION' ? '만족도' : '성숙도'} 설문 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    
    setIsDeletingAll(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/surveys?mode=all`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setResponses([])
      }
    } catch (error) {
      alert("전체 삭제 실패")
    } finally {
      setIsDeletingAll(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingResponse) return
    
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/surveys`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: editingResponse.id,
          studentName: editingResponse.respondentId,
          answers: editingResponse.answers.map((a: any) => ({
            id: a.id,
            score: a.score,
            preScore: a.preScore,
            postChange: a.postChange,
            text: a.text
          }))
        })
      })
      
      if (res.ok) {
        setEditingResponse(null)
        fetchResponses()
      }
    } catch (error) {
      alert("수정 실패")
    } finally {
      setIsUpdating(false)
    }
  }

  // 문항 헤더 추출 (첫 번째 응답 기준)
  const getHeaders = () => {
    if (responses.length === 0) return []
    const template = responses[0].template
    return template?.questions || []
  }

  const headers = getHeaders()

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* 상단 액션 바 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20">
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveType("SATISFACTION")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black transition-all",
              activeType === "SATISFACTION" ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
            )}
          >
            만족도 결과
          </button>
          <button 
            onClick={() => setActiveType("MATURITY")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black transition-all",
              activeType === "MATURITY" ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"
            )}
          >
            성숙도 결과
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={fetchResponses}
            disabled={loading}
            className="rounded-xl h-11 px-5 border-slate-200 text-slate-500 bg-white hover:bg-slate-50"
          >
             <RefreshCcw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> 
             동기화
          </Button>
          <Button 
            variant="destructive" 
            disabled={responses.length === 0 || isDeletingAll}
            onClick={handleDeleteAll}
            className="rounded-xl h-11 px-5 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-95"
          >
            {isDeletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            전체 삭제
          </Button>
        </div>
      </div>

      {/* 요약 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-blue-500/5 bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
          <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <CardContent className="p-8 relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Respondents</span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-3xl font-black mb-1">{responses.length}명</h3>
              <p className="text-white/60 text-[11px] font-bold">수집된 유효 응답자 수</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                <LayoutGrid className="w-6 h-6 text-slate-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Questions</span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-3xl font-black text-slate-900 mb-1">{headers.length}개</h3>
              <p className="text-slate-400 text-[11px] font-bold">템플릿 문항 수</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-slate-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last Updated</span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-xl font-black text-slate-900 mb-2 truncate">
                {responses[0] ? new Date(responses[0].createdAt).toLocaleDateString() : '-'}
              </h3>
              <p className="text-slate-400 text-[11px] font-bold">최근 데이터 등록일</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 데이터 테이블 */}
      <Card className="rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/20 bg-white overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-[10px] font-black text-slate-400 border-b border-slate-100 w-20 text-center">NO.</th>
                <th className="p-6 text-[10px] font-black text-slate-900 border-b border-slate-100 min-w-[120px]">응답자명</th>
                {headers.map((h: any, i: number) => (
                  <th key={h.id} className="p-6 text-[10px] font-black text-slate-500 border-b border-slate-100 min-w-[150px] max-w-[200px]">
                    <div className="flex flex-col gap-1">
                      <span className="text-blue-500/50">Q{i+1}</span>
                      <span className="truncate">{h.content}</span>
                    </div>
                  </th>
                ))}
                <th className="p-6 text-[10px] font-black text-slate-400 border-b border-slate-100 w-28 text-center">작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={headers.length + 3} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading Records...</p>
                    </div>
                  </td>
                </tr>
              ) : responses.length === 0 ? (
                <tr>
                  <td colSpan={headers.length + 3} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-30">
                      <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center">
                        <FileText className="w-10 h-10 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 mb-1">데이터가 없습니다.</p>
                        <p className="text-[11px] font-bold text-slate-400">먼저 설문 엑셀 데이터를 입력해주세요.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                responses.map((res, rIdx) => (
                  <tr key={res.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-none">
                    <td className="p-6 text-[11px] font-black text-slate-300 text-center">{String(rIdx + 1).padStart(2, '0')}</td>
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">{res.respondentId}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">{res.researchTarget}</span>
                      </div>
                    </td>
                    {headers.map((h: any) => {
                      const ans = res.answers.find((a: any) => a.questionId === h.id)
                      return (
                        <td key={h.id} className="p-6">
                          {ans ? (
                            <div className="flex flex-col gap-1">
                              {activeType === "MATURITY" ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Pre/Post</span>
                                    <span className="text-xs font-black text-slate-700">
                                      {ans.preScore || '-'}<span className="text-slate-300 mx-1">→</span>{ans.score || '-'}
                                    </span>
                                  </div>
                                  <div className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-black",
                                    ans.postChange > 0 ? "bg-green-50 text-green-600" : 
                                    ans.postChange < 0 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-400"
                                  )}>
                                    {ans.postChange > 0 ? `+${ans.postChange}` : ans.postChange || 0}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-slate-700">{ans.score || ans.text || "-"}</span>
                                  {ans.text && <span className="text-[10px] font-bold text-slate-400 line-clamp-2 max-w-[150px]">{ans.text}</span>}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-200">N/A</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="p-6">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingResponse(res)}
                          className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-200 hover:text-blue-600 transition-all active:scale-95"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(res.id)}
                          className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl shadow-sm hover:border-red-200 hover:text-red-500 transition-all active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* 수정 모달 */}
      {editingResponse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl rounded-[3rem] border-none shadow-2xl overflow-hidden bg-white animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">응답 데이터 수정</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Editing Response Record</p>
              </div>
              <button 
                onClick={() => setEditingResponse(null)}
                className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
               {/* 기본 정보 */}
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Respondent Info</label>
                  <input 
                    type="text"
                    value={editingResponse.respondentId}
                    onChange={(e) => setEditingResponse({...editingResponse, respondentId: e.target.value})}
                    placeholder="응답자 성명"
                    className="w-full h-14 px-6 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
               </div>

               {/* 문항별 점수 */}
               <div className="space-y-6">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Answers</label>
                 <div className="grid grid-cols-1 gap-6">
                    {editingResponse.answers.map((ans: any, idx: number) => (
                      <div key={ans.id} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                        <div className="flex items-start gap-4 mb-4">
                          <span className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[10px] font-black text-blue-500 shadow-sm border border-slate-100/50">Q{idx+1}</span>
                          <p className="text-[13px] font-bold text-slate-700 leading-relaxed mt-1">{ans.question?.content}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 items-end">
                           {activeType === "MATURITY" ? (
                             <>
                               <div className="space-y-2">
                                 <span className="text-[9px] font-black text-slate-400 uppercase block ml-1">Pre-Score</span>
                                 <input 
                                   type="number" min="0" max="5"
                                   value={ans.preScore || 0}
                                   onChange={(e) => {
                                     const newVal = parseInt(e.target.value)
                                     const updatedAnswers = [...editingResponse.answers]
                                     updatedAnswers[idx] = {...ans, preScore: newVal, postChange: (ans.score || 0) - newVal}
                                     setEditingResponse({...editingResponse, answers: updatedAnswers})
                                   }}
                                   className="w-24 h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:border-blue-500 transition-all"
                                 />
                               </div>
                               <div className="space-y-2">
                                 <span className="text-[9px] font-black text-slate-400 uppercase block ml-1">Post-Score</span>
                                 <input 
                                   type="number" min="0" max="5"
                                   value={ans.score || 0}
                                   onChange={(e) => {
                                     const newVal = parseInt(e.target.value)
                                     const updatedAnswers = [...editingResponse.answers]
                                     updatedAnswers[idx] = {...ans, score: newVal, postChange: newVal - (ans.preScore || 0)}
                                     setEditingResponse({...editingResponse, answers: updatedAnswers})
                                   }}
                                   className="w-24 h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:border-indigo-500 transition-all"
                                 />
                               </div>
                             </>
                           ) : (
                             ans.question?.type === "ESSAY" ? (
                               <textarea 
                                 value={ans.text || ""}
                                 onChange={(e) => {
                                   const updatedAnswers = [...editingResponse.answers]
                                   updatedAnswers[idx] = {...ans, text: e.target.value}
                                   setEditingResponse({...editingResponse, answers: updatedAnswers})
                                 }}
                                 className="w-full h-24 p-4 bg-white border border-slate-200 rounded-2xl text-[13px] font-medium outline-none focus:border-blue-500 transition-all resize-none"
                               />
                             ) : (
                               <input 
                                 type="number" min="1" max="5"
                                 value={ans.score || 0}
                                 onChange={(e) => {
                                   const updatedAnswers = [...editingResponse.answers]
                                   updatedAnswers[idx] = {...ans, score: parseInt(e.target.value)}
                                   setEditingResponse({...editingResponse, answers: updatedAnswers})
                                 }}
                                 className="w-24 h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:border-blue-500 transition-all"
                               />
                             )
                           )}
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
            </form>

            <div className="p-8 bg-slate-50/50 flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingResponse(null)}
                className="flex-1 h-16 rounded-[1.5rem] border-slate-200 text-slate-500 font-black text-sm transition-all"
              >
                닫기
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-[2] h-16 rounded-[1.5rem] bg-slate-900 text-white font-black text-sm shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 transition-all active:scale-95"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "수정 내용 저장하기"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
