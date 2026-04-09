'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { 
  BarChart3, 
  Building2, 
  Users, 
  TrendingUp, 
  Calendar, 
  ChevronRight, 
  History, 
  ArrowUpRight,
  Clock,
  Briefcase,
  PlusCircle,
  X,
  FilePlus2,
  Globe,
  FileUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = () => {
    setLoading(true)
    fetch("/api/dashboard", { cache: "no-store" })
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
  }, [])

  if (loading && !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="font-bold text-slate-500">대시보드 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const { stats, schedules } = data || { stats: {}, schedules: { twoWeeksAgo: [], lastWeek: [], thisWeek: [], nextWeek: [] } }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 w-full">
      <div className="flex justify-between items-end border-b border-slate-200 pb-6 mb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">서울런 3.0 현황</h1>
          <p className="text-slate-500 mt-1 font-semibold text-lg italic">서울런 3.0 실시간 운영 현황</p>
        </div>
        <div className="text-sm font-bold text-slate-400 bg-white shadow-sm px-4 py-1.5 rounded-full border border-slate-200">
          마지막 업데이트: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Row 1: Statistics */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">핵심 성과 지표</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard 
            title="등록된 사업 수" 
            value={stats.programCount} 
            icon={Briefcase} 
            color="blue" 
            label="현재 운영 중인 전체 사업"
          />
          <StatsCard 
            title="참여 협력업체" 
            value={stats.partnerCount} 
            icon={Building2} 
            color="emerald" 
            label="기관 및 교육 파트너"
          />
          <StatsCard 
            title="평균 만족도" 
            value={stats.avgSatisfaction} 
            icon={Users} 
            color="orange" 
            label="수강생 피드백 점수"
            unit="/ 5.0"
          />
          <StatsCard 
            icon={TrendingUp} 
            color="indigo" 
            isCustom
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0">
                  <p className="text-[10px] font-black text-slate-400 tracking-tighter">학습 인지 변화도</p>
                  <div className="flex items-baseline gap-0.5">
                    <h3 className="text-3xl font-black tracking-tighter text-indigo-600">
                      {stats.perceivedGrowth}
                    </h3>
                    <span className="text-sm font-bold text-indigo-400">%</span>
                  </div>
                </div>
                <div className="space-y-0">
                  <p className="text-[10px] font-black text-slate-400 tracking-tighter text-right">역량 도달률</p>
                  <div className="flex items-baseline gap-0.5 justify-end">
                    <h3 className="text-3xl font-black tracking-tighter text-indigo-600">
                      {stats.netGrowth}
                    </h3>
                    <span className="text-sm font-bold text-indigo-400">%</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-indigo-100/50 flex justify-between items-center">
                <p className="text-xs text-slate-400 font-black tracking-widest opacity-60">평균 도달 수준</p>
                <div className="flex items-baseline gap-0.5 text-indigo-600 font-black">
                  <span className="text-lg">{stats.avgGrowth}</span>
                  <span className="text-[10px]">%</span>
                </div>
              </div>
            </div>
          </StatsCard>
        </div>
      </section>

      {/* Row 1.5: 2 Weeks Ago */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-400 rounded-lg text-white">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">2주전 실적</h2>
          </div>
          <span className="text-xs font-bold text-slate-400">종료된 사업 및 수료 현황</span>
        </div>
        <ScheduleRow sessions={schedules.twoWeeksAgo || []} color="slate" />
      </section>

      {/* Row 2: Last Week */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-600 rounded-lg text-white">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">지난주 실적</h2>
          </div>
          <span className="text-xs font-bold text-slate-400">종료된 사업 및 수료 현황</span>
        </div>
        <ScheduleRow sessions={schedules.lastWeek} color="slate" />
      </section>

      {/* Row 3: This Week */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-600 rounded-lg text-white shadow-lg shadow-orange-200">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">금주 진행 일정</h2>
          </div>
          <span className="text-xs font-bold text-orange-500 animate-pulse font-black">진행 중</span>
        </div>
        <ScheduleRow sessions={schedules.thisWeek} color="orange" isHighlight />
      </section>

      {/* Row 4: Next Week */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg text-white">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">차주 예정 일정</h2>
          </div>
          <span className="text-xs font-bold text-slate-400">준비 중인 사업</span>
        </div>
        <ScheduleRow sessions={schedules.nextWeek} color="blue" hideCompleters />
      </section>
    </div>
  )
}

function StatsCard({ title, value, icon: Icon, color, label, unit, children, isCustom }: any) {
  const colorMap: any = {
    blue: "from-blue-500 to-indigo-600 text-blue-600 bg-blue-50 border-blue-100",
    emerald: "from-emerald-500 to-teal-600 text-emerald-600 bg-emerald-50 border-emerald-100",
    orange: "from-orange-500 to-amber-600 text-orange-600 bg-orange-50 border-orange-100",
    indigo: "from-indigo-500 to-purple-600 text-indigo-600 bg-indigo-50 border-indigo-100",
  }

  return (
    <Card className={`border-none shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden ${colorMap[color].split(' ').slice(2).join(' ')}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl bg-white shadow-md border ${colorMap[color].split(' ')[3]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="text-right">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">전체 통계</span>
             <div className="h-1 w-8 bg-current opacity-20 ml-auto mt-1 rounded-full"></div>
          </div>
        </div>
        
        {isCustom ? (
          children
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-500">{title}</p>
            <div className="flex items-baseline gap-1 group-hover:scale-105 transition-transform origin-left">
              <h3 className={`text-3xl sm:text-4xl font-black tracking-tighter ${colorMap[color].split(' ')[2]}`}>
                {value}
              </h3>
              {unit && <span className="text-sm sm:text-lg font-bold text-slate-400">{unit}</span>}
            </div>
            <p className="text-xs text-slate-400 font-semibold">{label}</p>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ScheduleRow({ sessions, color, isHighlight, hideCompleters }: any) {
  if (sessions.length === 0) {
    return (
      <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
        <Clock className="w-8 h-8 text-slate-200 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-400 italic">해당 기간에 등록된 일정이 없습니다.</p>
      </div>
    )
  }

  // Group by Program Name and Order
  const grouped = sessions.reduce((acc: any, s: any) => {
    const pOrder = s.program?.order ?? 999;
    const pName = s.program?.name || "미정 사업";
    const key = `${pOrder}:::${pName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const orderA = parseInt(a.split(':::')[0]);
    const orderB = parseInt(b.split(':::')[0]);
    return orderA - orderB;
  });

  return (
    <div className="space-y-8">
      {sortedKeys.map((key) => {
        const [_, pName] = key.split(':::');
        const items = grouped[key];
        const isSpecial = pName === "기타 운영 일정" || pName === "회의";
        
        return (
          <Card key={key} className={`border-none shadow-sm overflow-hidden bg-white ${isHighlight ? 'ring-1 ring-orange-200' : ''}`}>
            <div className={cn(
              "px-5 py-3 border-b border-slate-100 flex items-center justify-between",
              isHighlight ? 'bg-orange-50/50' : isSpecial ? 'bg-slate-100/50' : 'bg-slate-50/50'
            )}>
              <h4 className="font-black text-slate-800 flex items-center gap-2">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full shadow-sm",
                  isHighlight ? 'bg-orange-500' : isSpecial ? 'bg-slate-400' : 'bg-blue-500'
                )}></div>
                {pName}
              </h4>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{items.length}개 항목</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 text-[11px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100">
                    <th className="px-5 py-3 font-black whitespace-nowrap">일자</th>
                    <th className="px-5 py-3 font-black whitespace-nowrap">회차/구분</th>
                    <th className="px-5 py-3 font-black whitespace-nowrap">파트너/내용</th>
                    <th className="px-5 py-3 font-black text-center whitespace-nowrap">정원</th>
                    <th className="px-5 py-3 font-black text-center whitespace-nowrap">신청</th>
                    {!hideCompleters && <th className="px-5 py-3 font-black text-center border-l border-slate-100 whitespace-nowrap">출석</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((s: any) => (
                    <tr key={s.id} className="text-sm border-b border-slate-50 last:border-0 hover:bg-slate-50/40 transition-colors group">
                      <td className={cn(
                        "px-5 py-4 font-bold text-slate-700",
                        isHighlight && "text-orange-700"
                      )}>
                        {new Date(s.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black",
                          isSpecial ? "bg-slate-200 text-slate-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {isSpecial ? "기본" : `${s.sessionNumber}회차`}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-600 max-w-[200px] truncate">
                        {s.partner?.name || (pName === '회의' ? s.title : '-')}
                      </td>
                      <td className="px-5 py-4 text-center font-black text-slate-400">
                        {s.capacity > 0 ? s.capacity : '-'}
                      </td>
                      <td className={cn(
                        "px-5 py-4 text-center font-black",
                        s.participantCount > 0 ? "text-blue-600" : "text-slate-400"
                      )}>
                        {s.participantCount > 0 ? s.participantCount : '-'}
                      </td>
                      {!hideCompleters && (
                        <td className={cn(
                          "px-5 py-4 text-center font-black border-l border-slate-50",
                          s.completerCount > 0 ? "text-emerald-600" : "text-slate-400"
                        )}>
                          {s.completerCount > 0 ? s.completerCount : '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
