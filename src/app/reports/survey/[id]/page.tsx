"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from "@/components/ui/card"
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell
} from "recharts"
import { 
  TrendingUp, 
  Users, 
  Award, 
  Heart, 
  MessageSquare,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Plus
} from "lucide-react"
import { motion } from "framer-motion"

export default function AdminSurveyReportPage() {
  const params = useParams()
  const sessionId = params.id as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/reports/survey?id=${sessionId}`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [sessionId])

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse">데이터 분석 중...</div>
  if (!data || data.stats.totalRespondents === 0) return <div className="p-20 text-center font-black text-slate-400">분석할 데이터가 없습니다. (응답 0건)</div>

  const COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef"]

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">진로캠퍼스 결과 분석 리포트</h1>
          <p className="text-slate-500 mt-2 font-semibold text-lg italic">서울런 3.0 학생 역량 변화 및 교육 만족도 통계</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">응답 인원</p>
            <p className="text-2xl font-black text-slate-900">{data.stats.totalRespondents}명</p>
          </div>
        </div>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="bg-blue-600 text-white border-none shadow-2xl shadow-blue-200 rounded-[2.5rem] overflow-hidden group">
            <CardContent className="p-10 relative">
              <TrendingUp className="absolute top-8 right-10 w-24 h-24 text-blue-500/30 group-hover:scale-110 transition-transform" />
              <div className="relative z-10 space-y-6">
                <div>
                  <span className="bg-blue-500/50 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">지표 1: 체감 향상률</span>
                  <h3 className="text-6xl font-black mt-4">{data.stats.perceivedGrowth}%</h3>
                </div>
                <p className="text-xl font-bold leading-relaxed opacity-90">
                  진로캠퍼스 참여 학생의 <span className="underline underline-offset-8 decoration-4 decoration-blue-300">{data.stats.perceivedGrowth}%</span>가<br />
                  진로 결정 역량이 향상되었다고 응답했습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="bg-slate-900 text-white border-none shadow-2xl shadow-slate-200 rounded-[2.5rem] overflow-hidden group">
            <CardContent className="p-10 relative">
              <Award className="absolute top-8 right-10 w-24 h-24 text-slate-800 transition-transform group-hover:rotate-12" />
              <div className="relative z-10 space-y-6">
                <div>
                  <span className="bg-slate-800 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">지표 2: 순수 성장률</span>
                  <h3 className="text-6xl font-black mt-4">+{data.stats.netGrowth}%</h3>
                </div>
                <p className="text-xl font-bold leading-relaxed opacity-90">
                  학생들의 역량은 수업 사전 대비 사후에<br />
                  평균 <span className="text-blue-400">+{data.stats.netGrowth}%</span>의 뚜렷한 성장세를 보였습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Radar Chart: Competency Growth */}
        <Card className="lg:col-span-12 border-none shadow-xl shadow-slate-100 rounded-[2rem] bg-white ring-1 ring-slate-100">
          <CardHeader className="p-10 pb-0">
            <CardTitle className="text-2xl font-black text-slate-900">6대 핵심 역량 프로파일링 (사전 vs 사후)</CardTitle>
            <CardDescription className="text-lg font-semibold italic">각 카테고리별 실질적 점수 변화를 시각화합니다.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-0">
            <div className="h-[500px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontWeight: 900, fontSize: 14 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontWeight: 800, fill: "#94a3b8" }} />
                  <Radar name="수업 전 (Pre)" dataKey="A" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.4} />
                  <Radar name="수업 후 (Post)" dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 800 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 900 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart: Satisfaction */}
        <Card className="lg:col-span-7 border-none shadow-xl shadow-slate-100 rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden">
          <CardHeader className="p-10 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Heart className="w-8 h-8 text-pink-500 fill-pink-500/20" /> 교육 만족도 상세 (5점 만점)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.satisfactionData} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <XAxis type="number" domain={[0, 5]} hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontWeight: 900, fill: "#475569" }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={40}>
                    {data.satisfactionData.map((_entry:any, index:number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Subjective Feedback */}
        <Card className="lg:col-span-5 border-none shadow-xl shadow-slate-100 rounded-[2rem] bg-white ring-1 ring-slate-100 flex flex-col">
          <CardHeader className="p-10">
            <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-600" /> 학생 생생 의견
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 pt-0 space-y-6 flex-1 overflow-auto">
             <div className="space-y-4">
               <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">가장 좋았던 점 소감</h4>
               <div className="space-y-3">
                 {data.subjectiveData.liked.slice(0, 3).map((text:string, idx:number) => (
                   <div key={idx} className="p-5 bg-blue-50/30 rounded-2xl border border-blue-100/50 text-slate-700 font-semibold leading-relaxed relative">
                     <span className="absolute -top-2 -left-2 w-6 h-6 bg-blue-600 text-white flex items-center justify-center rounded-full text-[10px] font-black">❝</span>
                     {text}
                   </div>
                 ))}
               </div>
             </div>
             <div className="space-y-4 pt-6">
               <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">향후 요청 프로그램</h4>
               <div className="space-y-2">
                 {data.subjectiveData.future.slice(0, 3).map((text:string, idx:number) => (
                   <div key={idx} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 font-bold text-sm">
                     <Plus className="w-4 h-4 text-blue-400" /> {text}
                   </div>
                 ))}
               </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
