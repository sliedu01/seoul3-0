"use client"
import dynamic from 'next/dynamic'

const ReportContent = dynamic(() => import('@/components/ReportContent'), {
  ssr: false,
  loading: () => <div className="p-20 flex justify-center items-center h-full text-slate-500 font-medium">AI 컨설턴트 리포트 환경 로딩 중...</div>
})

export default function ReportsPage() {
  return <ReportContent />
}
