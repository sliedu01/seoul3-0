"use client"
import React, { useState, useEffect } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, addDays, eachDayOfInterval, differenceInDays, startOfDay } from "date-fns"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, UploadCloud, FileText, Plus, Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date()) 
  const [events, setEvents] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/meetings").then(res => res.json()),
      fetch("/api/sessions").then(res => res.json()),
      fetch("/api/programs").then(res => res.json())
    ]).then(([meetingsData, sessionsData, programsData]) => {
      if (Array.isArray(programsData)) setPrograms(programsData)
      
      let allEvents: any[] = []
      
      if (Array.isArray(sessionsData)) {
        const parsedSessions = sessionsData.map((s: any) => {
          const startDate = s.startTime ? new Date(s.startTime) : new Date(s.date)
          const endDate = s.endTime ? new Date(s.endTime) : (s.startTime ? new Date(s.startTime) : new Date(s.date))
          return { 
            id: `session-${s.id}`,
            program: s.program.name,
            partner: s.partner?.name || "미지정",
            session: s.sessionNumber,
            startDate, 
            endDate: endDate < startDate ? startDate : endDate,
            type: 'session'
          }
        })
        allEvents = [...allEvents, ...parsedSessions]
      }

      if (Array.isArray(meetingsData)) {
        const parsedMeetings = meetingsData.map((m: any) => {
          const mDate = new Date(m.date)
          return {
            id: `meeting-${m.id}`,
            program: "회의",
            partner: m.title || "회의",
            session: m.sequenceNumber || 1,
            startDate: mDate,
            endDate: mDate,
            type: 'meeting'
          }
        })
        allEvents = [...allEvents, ...parsedMeetings]
      }

      setEvents(allEvents)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const programColors: Record<string, string> = {
    "회의": "bg-yellow-200/90 text-yellow-900 border-yellow-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]",
    "진로캠퍼스": "bg-blue-100/90 text-blue-900 border-blue-300 shadow-sm",
    "STEM프리스쿨": "bg-emerald-100/90 text-emerald-900 border-emerald-300 shadow-sm",
    "조금느린아이": "bg-orange-100/90 text-orange-900 border-orange-300 shadow-sm",
    "생성형 AI 서비스 도입·제공": "bg-purple-100/90 text-purple-900 border-purple-300 shadow-sm",
    "진로·진학 AI코칭": "bg-indigo-100/90 text-indigo-900 border-indigo-300 shadow-sm",
    "AI핵심 인재 양성": "bg-cyan-100/90 text-cyan-900 border-cyan-300 shadow-sm",
    "화상영어": "bg-rose-100/90 text-rose-900 border-rose-300 shadow-sm",
    "영어캠프": "bg-teal-100/90 text-teal-900 border-teal-300 shadow-sm",
    "금융․경제․사이버안전 특강 및 멘토단 운영": "bg-amber-50 text-amber-900 border-amber-300 shadow-sm",
    "오프라인특강": "bg-slate-200/90 text-slate-900 border-slate-300 shadow-sm",
    "커뮤니케이션 특강": "bg-violet-100/90 text-violet-900 border-violet-300 shadow-sm",
  }

  const getProgramColor = (name: string) => {
    return programColors[name] || "bg-slate-100/90 text-slate-800 border-slate-300 shadow-sm"
  }

  const renderCells = (month: Date) => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    const today = new Date()

    const rows = []
    let day = startDate

    while (day <= endDate) {
      const weekStart = day
      const weekEnd = addDays(weekStart, 6)
      const weekDays: any[] = []
      
      for (let i = 0; i < 7; i++) {
        const currentDay = addDays(weekStart, i)
        weekDays.push({ 
          date: currentDay, 
          isCurrentMonth: isSameMonth(currentDay, monthStart), 
          isToday: format(currentDay, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") 
        })
      }
      
      const wStart = startOfDay(weekStart)
      const wEnd = startOfDay(weekEnd)
      
      const weekEvents = events.filter(e => {
         const eStart = startOfDay(e.startDate)
         const eEnd = startOfDay(e.endDate)
         return format(eStart, 'yyyy-MM-dd') <= format(wEnd, 'yyyy-MM-dd') && format(eEnd, 'yyyy-MM-dd') >= format(wStart, 'yyyy-MM-dd')
      })
      
      weekEvents.sort((a, b) => startOfDay(a.startDate).getTime() - startOfDay(b.startDate).getTime() || startOfDay(b.endDate).getTime() - startOfDay(a.endDate).getTime())
      
      const tracks: any[][] = []
      weekEvents.forEach(e => {
        let placed = false
        const eStartStr = format(startOfDay(e.startDate), 'yyyy-MM-dd')
        const eEndStr = format(startOfDay(e.endDate), 'yyyy-MM-dd')
        
        for (let i = 0; i < tracks.length; i++) {
          const overlap = tracks[i].some(ts => {
             const tsStartStr = format(startOfDay(ts.startDate), 'yyyy-MM-dd')
             const tsEndStr = format(startOfDay(ts.endDate), 'yyyy-MM-dd')
             return eStartStr <= tsEndStr && eEndStr >= tsStartStr
          })
          if (!overlap) {
            tracks[i].push(e)
            e.weekTrackIndex = i
            placed = true
            break
          }
        }
        if (!placed) {
          tracks.push([e])
          e.weekTrackIndex = tracks.length - 1
        }
      })
      
      const maxTrack = tracks.length > 0 ? tracks.length - 1 : -1
      const minHeight = Math.max(140, 44 + (maxTrack + 1) * 26 + 10) 

      rows.push(
        <div key={weekStart.toString()} className="relative border-l border-t border-slate-100 group" style={{ minHeight: `${minHeight}px` }}>
          {/* Background Blocks */}
          <div className="absolute inset-0 grid grid-cols-7 pointer-events-none z-0">
             {weekDays.map((d, i) => (
                <div key={i} className={cn(
                  "border-r border-b transition-colors",
                  !d.isCurrentMonth ? "bg-slate-50/40" : "bg-white",
                  d.isToday ? "bg-blue-50/30" : "",
                  "group-hover:bg-slate-50/20"
                )} />
             ))}
          </div>

          {/* Date Numbers */}
          <div className="absolute inset-0 grid grid-cols-7 pointer-events-none z-10">
             {weekDays.map((d, i) => (
                <div key={i} className="p-2.5">
                   <div className="flex justify-between items-start">
                     <span className={cn(
                        "text-sm font-black w-7 h-7 flex items-center justify-center rounded-full",
                        d.isToday ? "bg-blue-600 text-white shadow-md" : 
                        i === 0 ? "text-red-500" : 
                        i === 6 ? "text-blue-500" : "text-slate-700",
                        !d.isCurrentMonth && !d.isToday && "opacity-40"
                     )}>
                       {format(d.date, "d")}
                     </span>
                     {d.isToday && <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter mt-1 mr-1">Today</span>}
                   </div>
                </div>
             ))}
          </div>

          {/* Events Layer */}
          <div className="absolute inset-x-0 top-11 bottom-2 z-20 pointer-events-none">
             {weekEvents.map((e) => {
                const eStart = startOfDay(e.startDate)
                const eEnd = startOfDay(e.endDate)
                const startStr = format(eStart, 'yyyy-MM-dd')
                const endStr = format(eEnd, 'yyyy-MM-dd')
                const wStartStr = format(wStart, 'yyyy-MM-dd')
                const wEndStr = format(wEnd, 'yyyy-MM-dd')
                
                const isContinuedFromPast = startStr < wStartStr
                const isContinuingToFuture = endStr > wEndStr
                
                const visibleStart = isContinuedFromPast ? wStart : eStart
                const visibleEnd = isContinuingToFuture ? wEnd : eEnd
                
                const startOffsetDays = differenceInDays(visibleStart, wStart)
                const spanDays = differenceInDays(visibleEnd, visibleStart) + 1
                
                const leftPercent = (startOffsetDays / 7) * 100
                const widthPercent = (spanDays / 7) * 100
                
                return (
                   <div 
                     key={`${e.id}-${weekStart.toString()}`} 
                     className="absolute px-0.5 py-[1px]"
                     style={{
                       left: `${leftPercent}%`,
                       width: `${widthPercent}%`,
                       top: `${e.weekTrackIndex * 26}px`,
                     }}
                   >
                     <div className={cn(
                        "h-[22px] px-2 flex items-center border font-bold text-[11px] pointer-events-auto cursor-pointer hover:brightness-95 hover:scale-[1.01] transition-all",
                        getProgramColor(e.program),
                        isContinuedFromPast ? "rounded-l-none border-l-0 -ml-[2px] pl-3" : "rounded-l-md",
                        isContinuingToFuture ? "rounded-r-none border-r-0 -mr-[2px] pr-3" : "rounded-r-md"
                     )} title={e.type === 'meeting' ? e.partner : `${e.program} - ${e.partner}`}>
                        <div className="truncate w-full flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 truncate">
                            {!isContinuedFromPast && <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60 shrink-0"></div>}
                            <span className="truncate drop-shadow-sm tracking-tight">{e.type === 'meeting' ? `[회의] ${e.partner}` : e.program}</span>
                          </div>
                          {e.type === 'session' && (
                             <span className="opacity-80 text-[10px] shrink-0 font-medium tracking-tight">
                               {`${e.partner} ${e.session}회`}
                             </span>
                          )}
                        </div>
                     </div>
                   </div>
                )
             })}
          </div>
        </div>
      )
      day = addDays(weekEnd, 1)
    }
    return rows
  }

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"]

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 max-w-full 2xl:max-w-screen-2xl mx-auto px-6 lg:px-12">
      <div className="flex justify-between items-end border-b border-slate-200 pb-8 mt-4">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
             <CalendarIcon className="w-10 h-10 text-blue-600" />
             교육 운영 캘린더
          </h1>
          <p className="text-slate-400 mt-2 font-bold text-xl italic drop-shadow-sm">서울런 3.0 전체 사업 및 교육 세션 일정 통합 관리 시스템</p>
        </div>
        <div className="flex gap-3">
          <div className="text-xs font-black text-blue-600 bg-blue-50 px-5 py-2.5 rounded-2xl border border-blue-100 flex items-center gap-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></div>
            실시간 일정 동기화 활성
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Calendar Section - Full Width Expansion */}
        <div className="lg:col-span-12 space-y-6">
          <Card className="shadow-2xl shadow-slate-200/60 border-none bg-white ring-1 ring-slate-100 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-8 px-10 border-b bg-slate-50/30">
              <div className="flex items-center gap-6">
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="h-12 w-12 p-0 rounded-2xl shadow-sm border-slate-200 hover:bg-white hover:text-blue-600 hover:border-blue-200 transition-all active:scale-90">
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <CardTitle className="text-4xl font-black text-slate-900 tracking-tighter min-w-[200px] text-center">{format(currentDate, "yyyy년 M월")}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="h-12 w-12 p-0 rounded-2xl shadow-sm border-slate-200 hover:bg-white hover:text-blue-600 hover:border-blue-200 transition-all active:scale-90">
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </div>
              
              <Button variant="ghost" onClick={() => setCurrentDate(new Date())} className="h-12 px-6 rounded-2xl bg-slate-100 text-slate-600 font-black hover:bg-slate-200 transition-all">
                오늘로 이동
              </Button>
            </CardHeader>
            <CardContent className="p-0">
               <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100">
                {weekdays.map((w, idx) => (
                  <div key={w} className={cn(
                    "py-5 text-center text-xs font-black uppercase tracking-widest",
                    idx === 0 ? "text-red-400" : idx === 6 ? "text-blue-400" : "text-slate-400"
                  )}>{w}요일</div>
                ))}
              </div>
              <div className="flex flex-col">
                {renderCells(currentDate)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
