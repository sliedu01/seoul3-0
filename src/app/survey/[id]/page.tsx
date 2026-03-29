"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { SURVEY_MAPPING } from "@/lib/survey-data"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  School, 
  GraduationCap, 
  BookOpen, 
  Star,
  Plus,
  Minus,
  MessageSquare
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type TargetLevel = "elementary" | "middle" | "high"

export default function StudentSurveyPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [step, setStep] = useState(1) // 1: Level, 2: Competency, 3: Satisfaction, 4: Subjective, 5: Complete
  const [level, setLevel] = useState<TargetLevel | null>(null)
  const [competencyAnswers, setCompetencyAnswers] = useState<Record<number, { preScore: number, postChange: number }>>({})
  const [satisfactionAnswers, setSatisfactionAnswers] = useState<Record<number, number>>({})
  const [subjective, setSubjective] = useState({ liked: "", future: "" })
  const [loading, setLoading] = useState(false)
  const [programName, setProgramName] = useState("진로캠퍼스")

  // Fetch session info
  useEffect(() => {
    const fetchSessionInfo = async () => {
      try {
        const res = await fetch(`/api/programs?sessionId=${sessionId}`) // Assuming API supports this or similar
        // If not, we can use a dedicated session API
        const sessionRes = await fetch(`/api/dashboard/schedules`) // Fallback to list or find 
        const data = await sessionRes.json()
        const allSessions = [...(data.schedules?.lastWeek || []), ...(data.schedules?.thisWeek || []), ...(data.schedules?.nextWeek || [])]
        const currentSession = allSessions.find((s: any) => s.id === sessionId)
        
        if (currentSession?.program) {
          setProgramName(`${currentSession.program.order}. ${currentSession.program.name}`)
        }
      } catch (err) {
        console.error("Failed to fetch session info", err)
      }
    }
    if (sessionId) fetchSessionInfo()
  }, [sessionId])

  const handleLevelSelect = (lvl: TargetLevel) => {
    setLevel(lvl)
    setStep(2)
  }

  const handleCompetencyUpdate = (qId: number, field: "preScore" | "postChange", value: number) => {
    setCompetencyAnswers(prev => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || { preScore: 3, postChange: 0 }),
        [field]: value
      }
    }))
  }

  const handleSatisfactionUpdate = (qId: number, value: number) => {
    setSatisfactionAnswers(prev => ({
      ...prev,
      [qId]: value
    }))
  }

  const handleSubmit = async () => {
    if (!level) return
    setLoading(true)
    
    try {
      // Map to API format
      const competencyResults = SURVEY_MAPPING[level].competency.map(q => ({
        questionId: `comp_${q.id}`, // Mock or actual mapping
        preScore: competencyAnswers[q.id]?.preScore || 3,
        postChange: competencyAnswers[q.id]?.postChange || 0,
        textValue: q.category
      }))

      const satisfactionResults = SURVEY_MAPPING[level].satisfaction.map(q => ({
        questionId: `sat_${q.id}`,
        score: satisfactionAnswers[q.id] || 5,
        textValue: q.category
      }))

      const subjectiveResults = [
        { questionId: "subj_liked", textValue: subjective.liked },
        { questionId: "subj_future", textValue: subjective.future }
      ]

      const payload = {
        sessionId,
        targetLevel: level,
        studentName: `Student_${Math.random().toString(36).substr(2, 4)}`,
        responses: [...competencyResults, ...satisfactionResults, ...subjectiveResults]
      }

      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (res.ok) setStep(5)
      else alert("제출 중 오류가 발생했습니다.")
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (step === 5) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="max-w-md w-full text-center p-12 shadow-2xl border-none rounded-3xl">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-4">제출 완료!</h1>
            <p className="text-slate-500 font-medium mb-8">여러분의 소중한 의견이 진로 교육의 품질을 높이는 데 큰 도움이 됩니다. 감사합니다.</p>
            <Button className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-lg" onClick={() => router.push("/")}>메인으로 돌아가기</Button>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black italic">S</div>
            <span className="font-black text-slate-800 tracking-tight">SEOUL LEARN 3.0</span>
          </div>
          <div className="text-xs font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-widest">
            Step {step} of 4
          </div>
        </div>
        {/* Progress Bar */}
        <div className="h-1 bg-slate-100 w-full overflow-hidden">
          <motion.div 
            className="h-full bg-blue-600"
            initial={{ width: "0%" }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.5, ease: "circOut" }}
          />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 pt-12">
        <AnimatePresence mode="wait">
          {/* Step 1: Level Selection */}
          {step === 1 && (
            <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">반가워요! 👋</h1>
                <p className="text-lg text-slate-500 font-semibold italic">여러분의 학교급을 선택해주세요.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: "elementary", label: "초등학생", icon: School, color: "bg-amber-500", text: "text-amber-500" },
                  { id: "middle", label: "중학생", icon: BookOpen, color: "bg-blue-600", text: "text-blue-600" },
                  { id: "high", label: "고등학생", icon: GraduationCap, color: "bg-indigo-600", text: "text-indigo-600" }
                ].map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => handleLevelSelect(item.id as TargetLevel)}
                    className="group relative h-48 bg-white border-2 border-slate-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-all hover:border-slate-900 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center text-white`}>
                      <item.icon className="w-8 h-8" />
                    </div>
                    <span className="text-xl font-black text-slate-900">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Competency (Pre/Post) */}
          {step === 2 && level && (
            <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">진로 성숙도 조사</h2>
                <p className="text-slate-500 font-semibold italic">수업 전후의 생각 변화를 솔직하게 알려주세요.</p>
              </div>

              <div className="space-y-6">
                {SURVEY_MAPPING[level].competency.map((q) => (
                  <Card key={q.id} className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden ring-1 ring-slate-100">
                    <div className="bg-slate-50/50 p-6 pb-4">
                      <div className="flex items-start gap-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">{q.id}</span>
                        <p className="text-lg font-black text-slate-800 leading-snug">{q.text}</p>
                      </div>
                    </div>
                    <CardContent className="p-8 space-y-10">
                      {/* Pre Score */}
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> 수업 전 실력은?
                          </label>
                          <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{competencyAnswers[q.id]?.preScore || 3}점</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          {[1, 2, 3, 4, 5].map(val => (
                            <button
                              key={val}
                              onClick={() => handleCompetencyUpdate(q.id, "preScore", val)}
                              className={`flex-1 h-14 rounded-2xl font-black transition-all ${
                                (competencyAnswers[q.id]?.preScore || 3) === val 
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between px-2">
                           <span className="text-[10px] font-black text-slate-300 uppercase">매우 부족</span>
                           <span className="text-[10px] font-black text-slate-300 uppercase">매우 우수</span>
                        </div>
                      </div>

                      {/* Post Change */}
                      <div className="space-y-6 pt-4 border-t border-slate-50">
                        <label className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          수업 후 변화는? <ArrowRight className="w-4 h-4" />
                        </label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          {[
                            { label: "줄어듦", value: -1, color: "hover:bg-red-50 hover:text-red-600" },
                            { label: "그대로", value: 0, color: "hover:bg-slate-50 hover:text-slate-600" },
                            { label: "조금 좋아짐", value: +1, color: "hover:bg-green-50 hover:text-green-600" },
                            { label: "많이 좋아짐", value: +2, color: "hover:bg-blue-50 hover:text-blue-600" }
                          ].map(item => (
                            <button
                              key={item.value}
                              onClick={() => handleCompetencyUpdate(q.id, "postChange", item.value)}
                              className={`h-16 rounded-2xl text-xs font-black transition-all border-2 ${
                                (competencyAnswers[q.id]?.postChange || 0) === item.value
                                ? "border-slate-900 bg-slate-900 text-white"
                                : `border-slate-50 bg-slate-50 text-slate-400 ${item.color}`
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-16 rounded-2xl font-black" onClick={() => setStep(1)}>이전으로</Button>
                <Button className="flex-[2] h-16 rounded-2xl bg-blue-600 text-white font-black text-lg" onClick={() => setStep(3)}>다음 단계 (만족도 조사)</Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Satisfaction */}
          {step === 3 && level && (
            <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">교육 만족도 조사</h2>
                <p className="text-slate-500 font-semibold italic">캠프 전반에 대한 여러분의 솔직한 평가입니다.</p>
              </div>

              <div className="space-y-6">
                {SURVEY_MAPPING[level].satisfaction.map((q) => (
                  <Card key={q.id} className="border-none shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden ring-1 ring-slate-100">
                    <CardContent className="p-8 space-y-6">
                       <p className="text-xl font-black text-slate-800 leading-snug">{q.text}</p>
                       <div className="flex justify-between gap-1">
                         {[1, 2, 3, 4, 5].map(val => (
                           <button
                             key={val}
                             onClick={() => handleSatisfactionUpdate(q.id, val)}
                             className={`group relative flex-1 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                               (satisfactionAnswers[q.id] || 5) === val
                               ? "bg-blue-600 text-white"
                               : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                             }`}
                           >
                             <Star className={`w-6 h-6 ${val <= (satisfactionAnswers[q.id] || 5) ? "fill-current" : ""}`} />
                             <span className="text-[10px] font-black">{val}점</span>
                           </button>
                         ))}
                       </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-16 rounded-2xl font-black" onClick={() => setStep(2)}>이전으로</Button>
                <Button className="flex-[2] h-16 rounded-2xl bg-blue-600 text-white font-black text-lg" onClick={() => setStep(4)}>마지막 단계</Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Subjective */}
          {step === 4 && level && (
            <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">들려주고 싶은 이야기</h2>
                <p className="text-slate-500 font-semibold italic">가장 좋았던 점이나 아쉬웠던 점을 편하게 적어주세요.</p>
              </div>

              <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden ring-1 ring-slate-100">
                <div className="p-8 space-y-10">
                  <div className="space-y-4">
                    <label className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <MessageSquare className="w-6 h-6 text-blue-600" /> 오늘 가장 좋았던 점과 아쉬운 점
                    </label>
                    <Textarea 
                      placeholder="자유롭게 적어주세요..." 
                      className="min-h-[150px] bg-slate-50 border-none rounded-2xl p-6 font-medium focus:ring-2 focus:ring-blue-600 transition-all text-lg"
                      value={subjective.liked}
                      onChange={e => setSubjective({...subjective, liked: e.target.value})}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Plus className="w-6 h-6 text-blue-600" /> 앞으로 하고 싶은 프로그램
                    </label>
                    <Textarea 
                      placeholder="배우고 싶은 게 있다면 알려주세요!" 
                      className="min-h-[120px] bg-slate-50 border-none rounded-2xl p-6 font-medium focus:ring-2 focus:ring-blue-600 transition-all text-lg"
                      value={subjective.future}
                      onChange={e => setSubjective({...subjective, future: e.target.value})}
                    />
                  </div>
                </div>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-16 rounded-2xl font-black" onClick={() => setStep(3)}>이전으로</Button>
                <Button 
                  className="flex-[2] h-16 rounded-2xl bg-blue-600 text-white font-black text-xl shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all" 
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? "제출 중..." : "설문 제출하기 🚀"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
