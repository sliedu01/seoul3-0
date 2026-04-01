"use client"
import React, { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Download, Filter, BarChart3 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LabelList } from 'recharts'
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { AlertCircle } from "lucide-react"
import { useSearchParams } from "next/navigation"
// @ts-ignore
import { jStat } from "jstat"

import * as XLSX from 'xlsx'

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const { isMember } = useAuth()
  const reportRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [programs, setPrograms] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([])
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reportData, setReportData] = useState<any>(null)
  
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null)
  const [lastAnalysisParams, setLastAnalysisParams] = useState<any>(null)

  useEffect(() => {
    // URL 파라미터에서 필터 값 추출 및 설정 (프로그램, 파트너 ID)
    const pId = searchParams.get('programId');
    const ptId = searchParams.get('partnerId');
    if (pId) {
      const ids = pId.split(',');
      setSelectedProgramIds(ids);
    }
    if (ptId) {
      const ids = ptId.split(',');
      setSelectedPartnerIds(ids);
    }
  }, [searchParams]);

  useEffect(() => {
    // 최초 로드 시 프로그램 및 파트너 목록 페칭
    Promise.all([
      fetch("/api/programs").then(res => res.json()),
      fetch("/api/partners").then(res => res.json())
    ]).then(([pData, ptData]) => {
      if (Array.isArray(pData)) {
        setPrograms(pData);
        
        // Find earliest date
        let minDate: Date | null = null;
        pData.forEach(p => {
          (p.sessions || []).forEach((s: any) => {
            const d = new Date(s.date);
            if (!minDate || d < minDate) minDate = d;
          });
        });

        const today = new Date();
        const endDateStr = today.toISOString().split('T')[0];
        setEndDate(endDateStr);

        if (minDate) {
          setStartDate((minDate as Date).toISOString().split('T')[0]);
        } else {
          setStartDate(endDateStr);
        }
        console.log("Report filters initialized with:", { minDate, endDate: endDateStr });
      }
      if (Array.isArray(ptData)) {
        console.log("Partners fetched:", ptData.length);
        setPartners(ptData);
      }
    }).catch(err => {
      console.error("Report filter initialization error:", err);
    })
  }, [])

  // Dynamic filtered lists
  const filteredPrograms = programs.filter(p => {
    if (!startDate || !endDate) return true;
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    eDate.setHours(23, 59, 59, 999);
    
    const sessions = p.sessions || [];
    if (sessions.length === 0) return false;
    
    return sessions.some((s: any) => {
        const d = new Date(s.date);
        return d >= sDate && d <= eDate;
    });
  });

  const filteredPartners = partners.filter(pt => {
    // 1. Program Filter
    const matchesProgram = selectedProgramIds.length === 0 || (pt.programIds || []).some((id: string) => selectedProgramIds.includes(id));
    if (!matchesProgram) return false;
    
    // 2. Date Filter
    if (!startDate || !endDate) return true;
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    eDate.setHours(23, 59, 59, 999);
    
    const sessionDates = pt.sessionDates || [];
    if (sessionDates.length === 0) return false;

    return sessionDates.some((dStr: string) => {
      const d = new Date(dStr);
      return d >= sDate && d <= eDate;
    });
  });

  const fetchReportData = React.useCallback(async () => {
    const vProgramIds = selectedProgramIds.filter(id => filteredPrograms.some(p => p.id === id));
    const vPartnerIds = selectedPartnerIds.filter(id => filteredPartners.some(p => p.id === id));

    if (vProgramIds.length === 0 && vPartnerIds.length === 0) {
        setReportData((prev: any) => prev === null ? null : null);
        return;
    }


    setLoading(true)
    try {
        const params = new URLSearchParams()
        vProgramIds.forEach(id => params.append("programId", id))
        vPartnerIds.forEach(id => params.append("partnerId", id))
        if (startDate) params.append("startDate", startDate)
        if (endDate) params.append("endDate", endDate)
        
        const res = await fetch(`/api/reports/survey?${params.toString()}`);
        if (!res.ok) throw new Error("API FAILED");
        const data = await res.json();
        setReportData(data);
    } catch (err) {
        console.error(err);
        setReportData(null);
    } finally {
        setLoading(false);
    }
  }, [selectedProgramIds, selectedPartnerIds, startDate, endDate, programs, partners]);


  // Auto-fetch ONLY when key selection actually changes
  useEffect(() => {
    fetchReportData()
  }, [selectedProgramIds, selectedPartnerIds, startDate, endDate])





  const handleAIAnalysis = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch("/api/reports/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programIds: selectedProgramIds,
          partnerIds: selectedPartnerIds,
          startDate,
          endDate
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error);
      setAiAnalysisResult(data.analysis)
      setLastAnalysisParams({ selectedProgramIds, selectedPartnerIds, startDate, endDate })
    } catch (err) {
      console.error(err)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleProgramToggle = (id: string) => {
    setSelectedProgramIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handlePartnerToggle = (id: string) => {
    setSelectedPartnerIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleAllProgramsToggle = () => {
    if (selectedProgramIds.length === filteredPrograms.length && filteredPrograms.length > 0) {
      setSelectedProgramIds([])
    } else {
      setSelectedProgramIds(filteredPrograms.map(p => p.id))
    }
  }

  const handleAllPartnersToggle = () => {
    if (selectedPartnerIds.length === filteredPartners.length && filteredPartners.length > 0) {
      setSelectedPartnerIds([])
    } else {
      setSelectedPartnerIds(filteredPartners.map(p => p.id))
    }
  }

  const handleExportPDF = async () => {
    // 실제 브라우저의 PDF 저장(인쇄) 기능을 활용합니다.
    window.print();
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                AI 컨설턴트 결과 리포트
              </h1>
              <p className="text-slate-500 mt-2 font-bold flex items-center gap-2 italic">
                메인 사업: 2026 서울시 진로·진학 콘텐츠 운영 지원 용역
              </p>
        </div>
      </div>

      {isMember && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3 text-blue-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">현재 관찰자(회원) 등급으로 접속 중입니다. 데이터 조회 및 필터 기반 리포트 생성이 가능합니다.</p>
        </div>
      )}

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
                onClick={handleAllProgramsToggle}
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
                    onChange={() => handleProgramToggle(p.id)}
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
                onClick={handleAllPartnersToggle}
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
                    onChange={() => handlePartnerToggle(p.id)}
                  />
                  {p.name}
                </label>
              )) : (
                <div className="text-[10px] font-bold text-slate-300 italic p-2">선택한 사업의 협력업체가 없습니다.</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-slate-50">
          <div className="flex gap-4">
            <Button 
                onClick={handleAIAnalysis} 
                className="h-14 px-10 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] group"
                disabled={analyzing || !reportData?.overallStats}
            >
              <BarChart3 className="mr-3 h-5 w-5 group-hover:rotate-12 transition-transform" /> {analyzing ? "분석 중..." : "AI 실시간 성과 분석"}
            </Button>
            <Button 
              variant="ghost" 
              className="h-14 px-6 rounded-2xl text-slate-400 font-black hover:bg-slate-50"
              onClick={() => {
                setStartDate("")
                setEndDate("")
                setSelectedProgramIds([])
                setSelectedPartnerIds([])
              }}
            >
              필터 초기화
            </Button>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleExportPDF} disabled={isGenerating} className="h-14 px-8 bg-slate-900 hover:bg-slate-800 border-none text-white font-black rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-[0.98]">
              <Download className="mr-3 h-5 w-5" /> {isGenerating ? "PDF 생성 중..." : "리포트 PDF 저장"}
            </Button>
          </div>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6 p-10 bg-white border border-slate-200 shadow-sm rounded-xl min-h-[400px]">
        <div className="border-b border-slate-200 pb-6 mb-8">
          <h1 className="text-3xl font-bold text-center text-slate-900">서울런3.0(진로·진학 콘텐츠 운영) 성과 종합 분석 보고서</h1>
          <p className="text-center text-slate-500 mt-3 font-medium">검출 대상: {reportData?.overallStats?.totalRespondents || 0}명 표본 ({new Date().toLocaleDateString('ko-KR')} 기준)</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            분석 데이터를 집계 중입니다...
          </div>
        ) : !reportData || !reportData.programReports || reportData.programReports.length === 0 ? (
          <div className="py-20 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl">집계된 설문 응답 데이터가 없습니다. 상단 필터를 조정해 주세요.</div>
        ) : (
          <div className="space-y-20">
            {/* Global Summary Stats */}
            <div className="grid grid-cols-2 gap-6">
                <Card className="border-none bg-blue-50/50 p-6 rounded-3xl relative group">
                    <h4 className="text-sm font-black text-blue-600 mb-2">전체 학습 인지 변화도 (%)</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900">{reportData.overallStats.perceivedGrowth}%</span>
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-500 leading-relaxed">
                        서울런3.0 전체 참여 학생들의 사전 대비 사후 <span className="text-blue-600 font-black">인지적 변화 정도</span>를 나타냅니다.
                    </p>
                    {/* Tooltip */}
                    <div className="absolute inset-0 bg-blue-600/95 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center px-6 text-white pointer-events-none z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Calculation Logic</p>
                        <p className="text-xs font-bold leading-relaxed mb-3">{"( 사후 평균 - 사전 평균 ) / 5 * 100"}</p>
                        <hr className="border-white/20 mb-3" />
                        <p className="text-[10px] font-medium leading-normal italic opacity-90">교육을 통해 학습자가 스스로 느낀 성장의 폭을 100점 만점으로 환산한 지표입니다.</p>
                    </div>
                </Card>
                <Card className="border-none bg-indigo-50/50 p-6 rounded-3xl relative group">
                    <h4 className="text-sm font-black text-indigo-600 mb-2">전체 역량 도달률 (%)</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900">{reportData.overallStats.netGrowth}%</span>
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-500 leading-relaxed">
                         핵심 역량 전체 평균에서 목표하는 역량 수준에 <span className="text-indigo-600 font-black">도달한 정도</span>를 기록했습니다.
                    </p>
                    {/* Tooltip */}
                    <div className="absolute inset-0 bg-indigo-600/95 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center px-6 text-white pointer-events-none z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Calculation Logic</p>
                        <p className="text-xs font-bold leading-relaxed mb-3">{"사후 평균 / 5 * 100"}</p>
                        <hr className="border-white/20 mb-3" />
                        <p className="text-[10px] font-medium leading-normal italic opacity-90">교육 종료 시점에서 학습자가 목표(5점) 대비 현재 도달한 수준을 나타내는 절대 성취 지표입니다.</p>
                    </div>
                </Card>
            </div>

            {/* Summary Performance Table */}
            <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 overflow-hidden shadow-inner">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 ml-1 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500"/> 핵심 성과 통계 요약 (Key Performance Indicators)
                </h3>
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative group cursor-help">
                        <div className="text-[10px] font-black text-blue-600 uppercase mb-2">학습 인지 변화도</div>
                        <div className="text-3xl font-black text-slate-900">{reportData.overallStats.perceivedGrowth}%</div>
                        {/* Hover Tooltip Overlay */}
                        <div className="absolute inset-0 bg-blue-600/95 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center px-4 text-white pointer-events-none z-10 overflow-hidden">
                            <p className="text-[9px] font-black uppercase opacity-70 mb-1">Formula</p>
                            <p className="text-xs font-bold mb-2">{"( 사후 - 사전 ) / 5 * 100"}</p>
                            <p className="text-[9px] leading-tight opacity-90 line-clamp-3">교육을 통해 학습자가 체감한 성숙도 변화의 폭을 백분율로 환산한 수치입니다.</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative group cursor-help">
                        <div className="text-[10px] font-black text-indigo-600 uppercase mb-2">역량 도달률</div>
                        <div className="text-3xl font-black text-slate-900">{reportData.overallStats.netGrowth}%</div>
                        {/* Hover Tooltip Overlay */}
                        <div className="absolute inset-0 bg-indigo-600/95 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center px-4 text-white pointer-events-none z-10 overflow-hidden">
                            <p className="text-[9px] font-black uppercase opacity-70 mb-1">Formula</p>
                            <p className="text-xs font-bold mb-2">{"사후 / 5 * 100"}</p>
                            <p className="text-[9px] leading-tight opacity-90 line-clamp-3">최종 교육 시점의 역량이 목표치(5점) 대비 평점에 도달한 수준을 나타내는 지표입니다.</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative group cursor-help">
                        <div className="text-[10px] font-black text-emerald-600 uppercase mb-2">학습 목표 근접도</div>
                        <div className="text-3xl font-black text-slate-900">{reportData.overallStats.potentialGrowth}%</div>
                        {/* Hover Tooltip Overlay */}
                        <div className="absolute inset-0 bg-emerald-600/95 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center px-4 text-white pointer-events-none z-10 overflow-hidden">
                            <p className="text-[9px] font-black uppercase opacity-70 mb-1">Formula</p>
                            <p className="text-xs font-bold mb-2">{"( 사후 - 사전 ) / ( 5 - 사전 ) * 100"}</p>
                            <p className="text-[9px] leading-tight opacity-90 line-clamp-3">학습자가 성장 가능한 범위 내에서 실제 목표 지점에 얼마나 근접했는지 보여줍니다.</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative group cursor-help">
                        <div className="text-[10px] font-black text-amber-500 uppercase mb-2">전체 만족도</div>
                        <div className="text-3xl font-black text-slate-900">
                            {(reportData.programReports.reduce((acc: any, p: any) => acc + p.stats.overallSatisfaction, 0) / (reportData.programReports.length || 1)).toFixed(2)}
                        </div>
                        {/* Hover Tooltip Overlay */}
                        <div className="absolute inset-0 bg-amber-500/95 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center px-4 text-white pointer-events-none z-10 overflow-hidden">
                            <p className="text-[9px] font-black uppercase opacity-70 mb-1">Average Satisfaction</p>
                            <p className="text-xs font-bold mb-2">5.0 만점 기준</p>
                            <p className="text-[9px] leading-tight opacity-90 line-clamp-3">운영지원, 교육환경, 내용, 강사 등 모든 설문의 전반적 만족도 평균 수치입니다.</p>
                        </div>
                    </div>
                </div>
            </div>

            <Card className="border-none shadow-2xl shadow-indigo-100 bg-white rounded-[2.5rem] overflow-hidden border border-slate-100">
                <CardHeader className="bg-slate-900 px-10 py-8">
                    <CardTitle className="flex items-center text-xl font-black text-white">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
                            <BarChart3 className="h-6 w-6 text-white"/>
                        </div>
                        AI 컨설턴트 인사이트 보고서 (전문 분석)
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-10 py-12 prose prose-slate max-w-none">
                    <div className="whitespace-pre-wrap text-[16px] leading-[1.8] font-medium text-slate-700">
                        {aiAnalysisResult ? aiAnalysisResult : (
                            <div className="py-20 text-center text-slate-400 italic">
                                상단 [AI 실시간 성과 분석] 버튼을 눌러 상세 리포트를 생성해 주세요.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Section 1: Maturity Analysis by Program */}
            <section className="space-y-10">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                    <h3 className="text-2xl font-black text-slate-900">1. 성숙도(역량) 분석</h3>
                </div>
                
                {reportData.programReports.map((p: any) => (
                    <div key={p.programId} className="space-y-6 pt-10 border-t border-slate-50 first:pt-0 first:border-none">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-black uppercase">Business</span>
                            <h4 className="text-xl font-black text-slate-800">{p.programName}</h4>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            <Card className="border-none bg-slate-50/80 p-5 rounded-2xl">
                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">학습 인지 변화도</h5>
                                <div className="text-2xl font-black text-blue-600">{Number(p.stats.perceivedGrowth).toFixed(1)}%</div>
                            </Card>
                            <Card className="border-none bg-slate-50/80 p-5 rounded-2xl">
                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">역량 도달률</h5>
                                <div className="text-2xl font-black text-indigo-600">{Number(p.stats.netGrowth).toFixed(1)}%</div>
                            </Card>
                            <Card className="border-none bg-emerald-50/80 p-5 rounded-2xl">
                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">학습 목표 근접도</h5>
                                <div className="text-2xl font-black text-emerald-600">{Number(p.stats.potentialGrowth).toFixed(1)}%</div>
                            </Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 mt-6">
                            <Card className="border-slate-100 shadow-sm rounded-3xl p-6">
                                <CardTitle className="text-[11px] font-black text-indigo-600 mb-4 uppercase tracking-widest text-center">역량 도달률 상세 (%)</CardTitle>
                                <div className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <BarChart data={p.radarData} layout="vertical" margin={{ top: 5, right: 60, left: 40, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                            <XAxis type="number" domain={[0, 5.5]} hide />
                                            <YAxis dataKey="subject" type="category" tick={{fontSize: 9, fill: '#64748b', fontWeight: 700}} width={80} />
                                            <RechartsTooltip />
                                            <Legend verticalAlign="top" height={30} iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                                            <Bar dataKey="A" name="사전 점수" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={10} />
                                            <Bar dataKey="B" name="사후 점수" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={10}>
                                                <LabelList 
                                                    dataKey="growth" 
                                                    position="right" 
                                                    formatter={(val: any) => `+${Number(val).toFixed(1)}%`}
                                                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#6366f1' }}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                            <Card className="border-slate-100 shadow-sm rounded-3xl p-6">
                                <CardTitle className="text-[11px] font-black text-slate-400 mb-4 uppercase tracking-widest text-center">역량 도달 수준 (방사형)</CardTitle>
                                <div className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <RadarChart cx="50%" cy="50%" outerRadius={60} data={p.radarData}>
                                            <PolarGrid stroke="#f1f5f9" />
                                            <PolarAngleAxis dataKey="subject" tick={{fontSize: 9, fill: '#64748b', fontWeight: 800}} />
                                            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={false} axisLine={false} />
                                            <Radar name="사전" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                                            <Radar name="사후" dataKey="B" stroke="#22c55e" fill="#22c55e" fillOpacity={0.4} />
                                            <RechartsTooltip />
                                            <Legend verticalAlign="top" height={30} iconSize={10}/>
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2 mt-6">
                            <Card className="border-slate-100 shadow-sm rounded-3xl p-6">
                                <CardTitle className="text-[11px] font-black text-emerald-600 mb-4 uppercase tracking-widest text-center">학습 목표 근접도 상세 (%)</CardTitle>
                                <div className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <BarChart data={p.radarData} layout="vertical" margin={{ top: 5, right: 60, left: 40, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                            <XAxis type="number" domain={[0, 100]} hide />
                                            <YAxis dataKey="subject" type="category" tick={{fontSize: 9, fill: '#64748b', fontWeight: 700}} width={80} />
                                            <RechartsTooltip />
                                            <Bar dataKey="potentialGrowth" name="달성률" fill="#10b981" radius={[0, 4, 4, 0]} barSize={15}>
                                                <LabelList 
                                                    dataKey="potentialGrowth" 
                                                    position="right" 
                                                    formatter={(val: any) => `${val > 0 ? '+' : ''}${Number(val).toFixed(1)}%`}
                                                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#10b981' }}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                            <Card className="border-slate-100 shadow-sm rounded-3xl p-6">
                                <CardTitle className="text-[11px] font-black text-slate-400 mb-4 uppercase tracking-widest text-center">학습 목표 근접 수준 (방사형)</CardTitle>
                                <div className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <RadarChart cx="50%" cy="50%" outerRadius={60} data={p.radarData}>
                                            <PolarGrid stroke="#f1f5f9" />
                                            <PolarAngleAxis dataKey="subject" tick={{fontSize: 9, fill: '#64748b', fontWeight: 800}} />
                                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar name="달성률" dataKey="potentialGrowth" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                                            <RechartsTooltip />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </div>
                    </div>
                ))}
            </section>

            {/* Section 2: Satisfaction Analysis by Program */}
            <section className="space-y-10">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                    <h3 className="text-2xl font-black text-slate-900">2. 교육 만족도 분석</h3>
                </div>

                <div className="space-y-12">
                    {reportData.programReports.map((p: any) => (
                        <div key={p.programId} className="space-y-6 pt-10 border-t border-slate-50 first:pt-0 first:border-none">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-black uppercase">Satisfaction</span>
                                    <h4 className="text-xl font-black text-slate-800">{p.programName}</h4>
                                </div>
                                <div className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-black shadow-sm">
                                    평균 만족도: {Number(p.stats.overallSatisfaction).toFixed(2)} / 5.0
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <Card className="border-slate-100 shadow-md rounded-[2rem] overflow-hidden">
                                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                                        <CardTitle className="text-[11px] font-black text-emerald-600 uppercase tracking-widest text-center">만족도 상세 분석 (Bar)</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        <div className="h-[250px]">
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                                <BarChart data={p.satisfactionData} layout="vertical" margin={{ top: 5, right: 40, left: 40, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f8fafc" />
                                                    <XAxis type="number" domain={[0, 5]} hide />
                                                    <YAxis dataKey="name" type="category" tick={{fontSize: 10, fill: '#64748b', fontWeight: 800}} width={90} />
                                                    <RechartsTooltip />
                                                    <Bar dataKey="score" name="만족도" fill="#10b981" radius={[0, 8, 8, 0]} barSize={18}>
                                                        {p.satisfactionData.map((entry: any, index: number) => (
                                                            <rect key={`cell-${index}`} fill="#10b981" fillOpacity={0.6 + (entry.score / 5) * 0.4} />
                                                        ))}
                                                        <LabelList dataKey="score" position="right" formatter={(v: any) => v.toFixed(2)} style={{ fontSize: '10px', fontWeight: '900', fill: '#059669' }} />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-100 shadow-md rounded-[2rem] overflow-hidden">
                                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                                        <CardTitle className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">만족도 균형 분석 (Radar)</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 flex items-center justify-center">
                                        <div className="h-[250px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart cx="50%" cy="50%" outerRadius={70} data={p.satisfactionData}>
                                                    <PolarGrid stroke="#f1f5f9" />
                                                    <PolarAngleAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b', fontWeight: 800}} />
                                                    <PolarRadiusAxis angle={90} domain={[0, 5]} tick={false} axisLine={false} />
                                                    <Radar name="만족도" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                                                    <RechartsTooltip />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Section 3: Subjective Opinion Board by Program */}
            <section className="space-y-10 pb-12">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                    <h3 className="text-2xl font-black text-slate-900">3. 주관식 의견 보드</h3>
                </div>

                {reportData.programReports.map((p: any) => (
                    <div key={p.programId} className="space-y-6 pt-10 border-t border-slate-50 first:pt-0 first:border-none">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-orange-500 text-white rounded-lg text-xs font-black uppercase">Subjective</span>
                            <h4 className="text-xl font-black text-slate-800">{p.programName}</h4>
                        </div>

                        <div className={`grid grid-cols-1 ${(p.subjectiveData?.questions?.length || 0) >= 2 ? 'md:grid-cols-2' : ''} gap-6`}>
                            {p.subjectiveData?.questions?.length > 0 ? p.subjectiveData.questions.map((q: any, qIdx: number) => {
                              const colors = [
                                { bg: 'bg-orange-50', border: 'border-orange-100', dot: 'bg-orange-500', text: 'text-orange-700', cardBg: 'bg-white/80' },
                                { bg: 'bg-blue-50', border: 'border-blue-100', dot: 'bg-blue-500', text: 'text-blue-700', cardBg: 'bg-white/80' },
                                { bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-500', text: 'text-emerald-700', cardBg: 'bg-white/80' },
                                { bg: 'bg-amber-50', border: 'border-amber-100', dot: 'bg-amber-500', text: 'text-amber-700', cardBg: 'bg-white/80' }
                              ];
                              const c = colors[qIdx % colors.length];
                              return (
                                <Card key={q.questionId || qIdx} className={`border-none ${c.bg} p-6 rounded-3xl`}>
                                  <h4 className={`font-black ${c.text} mb-4 flex items-start gap-2 text-sm leading-relaxed`}>
                                    <span className={`w-2 h-2 rounded-full ${c.dot} mt-1.5 flex-shrink-0`}></span>
                                    <span>Q{qIdx + 1}. {q.questionContent}</span>
                                  </h4>
                                  <div className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest ml-4">
                                    {q.answers?.length || 0}건 응답
                                  </div>
                                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {q.answers?.length > 0 ? q.answers.map((text: string, i: number) => (
                                      <div key={i} className={`${c.cardBg} p-3 rounded-xl text-sm font-bold text-slate-700 shadow-sm border ${c.border}`}>
                                        "{text}"
                                      </div>
                                    )) : <div className="text-slate-400 text-xs italic">의견이 없습니다.</div>}
                                  </div>
                                </Card>
                              );
                            }) : (
                              <div className="text-slate-400 text-xs italic col-span-2">주관식 의견이 없습니다.</div>
                            )}
                        </div>

                    </div>
                ))}
            </section>
          </div>
        )}
      </div>
      {/* 필수 한계 명시 문구 추가 */}
      <div className="px-10 pb-20 text-center">
         <p className="text-[11px] font-bold text-slate-400 bg-slate-50 py-4 rounded-2xl border border-slate-100 italic">
            👉 "본 조사는 학습자 자가 진단에 기반한 주관적 데이터이며, 단기 과정의 특성상 상황 의존적일 수 있음"
         </p>
      </div>
    </div>
  )
}
