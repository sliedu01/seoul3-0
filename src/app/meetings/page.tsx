"use client"
import React, { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadCloud, FileText, CheckCircle2, Calendar as CalendarIcon, Users, Plus, Download, Printer, X, Edit, Trash2, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function MeetingsPage() {
  const { canEdit, canDelete, isMember } = useAuth()
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [formData, setFormData] = useState({
    title: "",
    date: new Date().toISOString().split('T')[0],
    sequenceNumber: 1,
    managedOrg: "",
    attendees: "",
    purpose: "",
    agenda: "",
    preparation: "",
    nextSchedule: "",
    meetingContent: "",
    others: "",
    time: "",
    location: ""
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const resetForm = () => {
    setShowModal(false)
    setIsEditing(false)
    setEditingId(null)
    setFormData({ 
      title: "", date: new Date().toISOString().split('T')[0], sequenceNumber: 1, 
      managedOrg: "", attendees: "", purpose: "", agenda: "", preparation: "", 
      nextSchedule: "", meetingContent: "", others: "", time: "", location: ""
    })
    setSelectedFile(null)
  }

  useEffect(() => {
    fetchMeetings()
  }, [])

  const fetchMeetings = () => {
    fetch("/api/meetings")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMeetings(data)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }

  // Derived state: sorted meetings
  const sortedMeetings = [...meetings].sort((a, b) => {
    const timeA = a.time || "00:00"
    const timeB = b.time || "00:00"
    const dateA = new Date(`${a.date.split('T')[0]}T${timeA.length === 5 ? timeA : "00:00"}:00`).getTime()
    const dateB = new Date(`${b.date.split('T')[0]}T${timeB.length === 5 ? timeB : "00:00"}:00`).getTime()
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
  })


  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    const fData = new FormData()
    fData.append("file", file)
    
    try {
      const ocrRes = await fetch("/api/ocr/parse", { method: "POST", body: fData })
      
      if (!ocrRes.ok) throw new Error("분석 서버 응답 지연");

      const ocrData = await ocrRes.json()
      
      if (ocrData.metadata) {
        setFormData(prev => ({ 
          ...prev, 
          ...ocrData.metadata,
          title: ocrData.metadata.title || file.name.replace('.pdf', '') 
        }))
      } else if (ocrData.text) {
        setFormData(prev => ({ ...prev, meetingContent: ocrData.text, title: file.name.replace('.pdf', '') }))
      }
      setSelectedFile(file)
    } catch (error) {
       console.error("OCR 처리 중 오류:", error)
       alert("일시적인 서버 지연으로 PDF 자동 분석을 완료할 수 없습니다.\n수동으로 정보를 입력해 주시거나 잠시 후 다시 시도해 주세요.")
       setSelectedFile(file) // 파일은 선택된 상태로 유지 (수동 입력 편의성 제공)
    } finally {
      setIsUploading(false)
    }
  }

  const handleEditClick = (m: any) => {
    setFormData({
      title: m.title || "",
      date: m.date ? new Date(m.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      sequenceNumber: m.sequenceNumber || 1,
      managedOrg: m.managedOrg || "",
      attendees: m.attendees || "",
      purpose: m.purpose || "",
      agenda: m.agenda || "",
      preparation: m.preparation || "",
      nextSchedule: m.nextSchedule || "",
      meetingContent: m.meetingContent || "",
      others: m.others || "",
      time: m.time || "",
      location: m.location || ""
    })
    setEditingId(m.id)
    setIsEditing(true)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말로 이 회의록을 삭제하시겠습니까?")) return;
    
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchMeetings()
      }
    } catch (error) {
       console.error("삭제 중 오류:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const payload = {
      ...formData,
      pdfFilePath: selectedFile?.name || (isEditing ? meetings.find(m => m.id === editingId)?.pdfFilePath : "manual_entry.pdf")
    }
    
    try {
      const url = isEditing ? `/api/meetings/${editingId}` : "/api/meetings"
      const method = isEditing ? "PUT" : "POST"
      
      const res = await fetch(url, {
        method: method,
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
      })
      
      if (res.ok) {
        resetForm()
        fetchMeetings()
      }
    } catch (error) {
       console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = (meeting: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${meeting.title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #334155; }
            .header { border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { font-size: 28px; margin: 0; color: #0f172a; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 14px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 10px; border-left: 4px solid #3b82f6; padding-left: 10px; }
            .grid { display: grid; grid-template-columns: 120px 1fr; gap: 10px; margin-bottom: 5px; }
            .label { font-weight: bold; color: #475569; }
            .value { border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
            .content-box { background: #f8fafc; padding: 20px; border-radius: 12px; white-space: pre-wrap; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 11px; font-weight: bold; color: #3b82f6; margin-bottom: 5px;">서울런 3.0 운영 및 진도 관리 회의록</div>
            <h1>${meeting.title}</h1>
          </div>
          
          <div class="section">
            <div class="section-title">1. 회의 기본 정보</div>
            <div class="grid"><div class="label">일시</div><div class="value">${new Date(meeting.date).toLocaleDateString()} ${meeting.time || ''}</div></div>
            <div class="grid"><div class="label">장소</div><div class="value">${meeting.location || '-'}</div></div>
            <div class="grid"><div class="label">참석자</div><div class="value">${meeting.attendees || '-'}</div></div>
            <div class="grid"><div class="label">회차</div><div class="value">${meeting.sequenceNumber}회차</div></div>
            <div class="grid"><div class="label">담당기관</div><div class="value">${meeting.managedOrg || '-'}</div></div>
          </div>

          <div class="section">
            <div class="section-title">2. 회의 내용</div>
            <div class="grid"><div class="label">목적</div><div class="value">${meeting.purpose || '-'}</div></div>
            <div class="grid"><div class="label">주요안건</div><div class="value">${meeting.agenda || '-'}</div></div>
            <div class="grid"><div class="label">준비사항</div><div class="value">${meeting.preparation || '-'}</div></div>
            <div class="grid"><div class="label">차기일정</div><div class="value">${meeting.nextSchedule || '-'}</div></div>
          </div>

          <div class="section">
            <div class="section-title">3. 상세 회의 내용</div>
            <div class="content-box">${meeting.meetingContent || '내용 없음'}</div>
          </div>

          <div class="section">
            <div class="section-title">4. 기타 사항</div>
            <div class="value">${meeting.others || '-'}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end border-b border-slate-200 pb-6 mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">회의록 관리</h1>
          <p className="text-slate-500 mt-1 font-semibold text-lg italic">서울런 3.0 운영 및 진도 관리 회의 기록</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="h-[52px] rounded-2xl font-bold px-6 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600"
          >
            {sortOrder === 'desc' ? '최신순 (새로운 것부터)' : '과거순 (오래된 것부터)'}
          </Button>
          {canEdit && (
            <Button 
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-6 rounded-2xl shadow-lg shadow-blue-200 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> 신규 회의 추가
            </Button>
          )}
        </div>
      </div>

      {isMember && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3 text-blue-700 mb-8">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">현재 관찰자(회원) 등급으로 접속 중입니다. 회의록 열람만 가능하며 추가/수정/삭제는 제한됩니다.</p>
        </div>
      )}

      {/* Meeting List Table-like Layout */}
      <div className="space-y-4">
        {loading && meetings.length === 0 ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-3xl" />)
        ) : meetings.length === 0 ? (
          <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">등록된 회의록이 없습니다.</p>
          </div>
        ) : (
          sortedMeetings.map(m => (
            <div key={m.id} className="grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              {/* Column 1: Info (Date, Seq, Org) */}
              <div className="md:col-span-3 bg-slate-50/50 p-6 border-r border-slate-50 flex flex-col justify-center">
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
                  {new Date(m.date).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                  {m.time && <span className="ml-1.5 text-slate-500 font-bold">{m.time}</span>}
                </div>
                <div className="text-xl font-black text-slate-900 mb-2">{m.sequenceNumber}회차 회의</div>
                <div className="flex flex-col gap-1 text-xs font-bold text-slate-500">
                  <div className="flex items-center">
                     <span className="bg-slate-200 px-2 py-0.5 rounded text-[8px] mr-2 shrink-0">장소</span>
                     <span className="truncate">{m.location || "-"}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-slate-200 px-2 py-0.5 rounded text-[8px] mr-2 shrink-0">담당</span>
                    <span className="truncate">{m.managedOrg || "미지정"}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-slate-200 px-2 py-0.5 rounded text-[8px] mr-2 shrink-0">참석</span>
                    <span className="truncate">{m.attendees || "-"}</span>
                  </div>
                </div>
              </div>
              
              {/* Column 2: Content & Actions */}
              <div className="md:col-span-9 p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{m.title}</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                    <p className="text-[11px] text-slate-400 font-bold"><span className="text-blue-500 mr-1.5">●</span>목적: <span className="text-slate-600">{m.purpose || "-"}</span></p>
                    <p className="text-[11px] text-slate-400 font-bold"><span className="text-indigo-500 mr-1.5">●</span>안건: <span className="text-slate-600">{m.agenda?.substring(0, 30)}...</span></p>
                  </div>
                  <p className="mt-3 text-sm text-slate-500 font-medium line-clamp-1 leading-relaxed">
                    {m.meetingContent || "회의 내용이 등록되지 않았습니다."}
                  </p>
                </div>
                
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold rounded-xl border-slate-200 hover:bg-slate-50" onClick={() => handlePrint(m)}>
                      <Printer className="w-3.5 h-3.5 mr-1.5" /> 인쇄
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold rounded-xl border-slate-200 hover:bg-slate-50" onClick={() => { alert("인쇄 설정에서 'PDF로 저장' 대상을 선택해 주세요."); handlePrint(m); }}>
                      <Download className="w-3.5 h-3.5 mr-1.5" /> PDF 다운로드
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-[11px] font-black text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => setSelectedMeeting(m)}>상세보기</Button>
                    {canEdit && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl" onClick={() => handleEditClick(m)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Meeting Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-0 shadow-blue-900/10">
            <div className="flex-shrink-0 bg-blue-600 px-6 md:px-8 py-7 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black">{isEditing ? "회의록 수정" : "신규 회의 등록"}</h2>
                <p className="text-xs font-bold opacity-80 mt-1 uppercase tracking-widest">
                  {isEditing ? "Update Meeting Details" : "New Meeting Registration"}
                </p>
              </div>
              <button 
                onClick={resetForm} 
                className="hover:rotate-90 transition-all p-3 bg-white/10 rounded-full hover:bg-white/20"
              >
                <X className="w-7 h-7" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12 custom-scrollbar">
                {/* AI OCR Section - Only for new */}
                {!isEditing && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 ml-1">
                      <div className="w-1.5 h-3 bg-blue-500 rounded-full"></div>
                      <h3 className="text-sm font-black text-slate-800">회의록 파일 업로드 (AI OCR 자동 분석)</h3>
                    </div>
                    <label className={`block w-full h-32 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all relative overflow-hidden ${selectedFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                      <div className="flex items-center justify-center h-full gap-5">
                        <div className={`p-4 rounded-2xl ${selectedFile ? 'bg-emerald-100 text-emerald-600' : 'bg-white shadow-sm text-slate-400'}`}>
                          {isUploading ? <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <UploadCloud className="w-8 h-8" />}
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-800">{selectedFile ? selectedFile.name : '회의록 PDF 드래그 또는 클릭'}</p>
                          <p className="text-xs text-slate-400 font-bold mt-1">{isUploading ? 'AI가 문서를 분석하여 아래 필드를 채우고 있습니다...' : '파일을 업로드하면 참석자, 안건 등이 자동 추출됩니다.'}</p>
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* 1. Basic Info Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 ml-1">
                    <div className="w-1.5 h-3 bg-indigo-500 rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight">1. 회의 진행 정보</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 bg-slate-50/50 p-6 md:p-8 rounded-[2rem] border border-slate-100">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">회의 일자 *</label>
                      <input type="date" value={formData.date} onChange={e => setFormData(prev => ({...prev, date: e.target.value}))} className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">회의 시간</label>
                      <input type="text" placeholder="예: 14:00~16:00" value={formData.time} onChange={e => setFormData(prev => ({...prev, time: e.target.value}))} className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">회의 장소</label>
                      <input type="text" placeholder="회의실 또는 화상회의 링크" value={formData.location} onChange={e => setFormData(prev => ({...prev, location: e.target.value}))} className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">회의 회차</label>
                      <input type="number" value={formData.sequenceNumber} onChange={e => setFormData(prev => ({...prev, sequenceNumber: parseInt(e.target.value)}))} className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">참석자 명단</label>
                      <input type="text" placeholder="총 ○명, 성함 나열" value={formData.attendees} onChange={e => setFormData(prev => ({...prev, attendees: e.target.value}))} className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">담당기관(수행사)</label>
                      <input type="text" placeholder="기관명 또는 팀명" value={formData.managedOrg} onChange={e => setFormData(prev => ({...prev, managedOrg: e.target.value}))} className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none shadow-sm" />
                    </div>
                  </div>
                </div>

                {/* 2. Content Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 ml-1">
                    <div className="w-1.5 h-3 bg-emerald-500 rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight">2. 논의 안건 및 상세 내용</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">회의 제목 (핵심 주제) *</label>
                      <input type="text" required placeholder="예: 2024 상반기 사업운영 점검 회의" value={formData.title} onChange={e => setFormData(prev => ({...prev, title: e.target.value}))} className="w-full h-14 bg-white border-2 border-slate-100 rounded-2xl px-5 text-base font-black focus:border-blue-500 transition-all outline-none shadow-sm" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">회의 목적</label>
                         <textarea rows={3} value={formData.purpose} onChange={e => setFormData(prev => ({...prev, purpose: e.target.value}))} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none" placeholder="회의 개요와 달성하고자 하는 목표" />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">주요 안건</label>
                         <textarea rows={3} value={formData.agenda} onChange={e => setFormData(prev => ({...prev, agenda: e.target.value}))} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none" placeholder="다루고자 하는 주요 토픽" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">회의 상세 내용 및 결과 *</label>
                      <textarea rows={8} required value={formData.meetingContent} onChange={e => setFormData(prev => ({...prev, meetingContent: e.target.value}))} className="w-full bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6 text-sm font-medium leading-relaxed focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none" placeholder="논의 상세 과정 및 합의된 결정 사항을 구체적으로 기록해 주세요." />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">후속 조치 / 준비 사항</label>
                         <textarea rows={2} value={formData.preparation} onChange={e => setFormData(prev => ({...prev, preparation: e.target.value}))} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none" placeholder="차기 회의 준비물이나 할 일" />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">기타 참고사항</label>
                         <textarea rows={2} value={formData.others} onChange={e => setFormData(prev => ({...prev, others: e.target.value}))} className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none" placeholder="특이사항이나 차기 일정 등" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                <button 
                  type="button" 
                  onClick={resetForm} 
                  className="flex-1 h-14 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black hover:bg-slate-50 transition-colors shadow-sm"
                >
                  취소하기
                </button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading} 
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
                >
                  {loading ? '기록 저장 중...' : (isEditing ? '수정사항 최종 저장' : '회의록 등록 완료')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Detail View Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-slate-900 pr-12">{selectedMeeting.title}</h2>
                <div className="flex flex-wrap gap-2 text-slate-500 font-bold mt-3">
                  <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs">{new Date(selectedMeeting.date).toLocaleDateString()} {selectedMeeting.time || ''}</span>
                  <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs tracking-widest">{selectedMeeting.sequenceNumber}회차</span>
                  <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs text-blue-600 truncate max-w-[150px]">{selectedMeeting.location || '장소 미지정'}</span>
                  <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs text-indigo-600">{selectedMeeting.managedOrg || '담당기관 없음'}</span>
                </div>
              </div>
              <button onClick={() => setSelectedMeeting(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors shrink-0">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>참석자</h3>
                    <p className="text-slate-800 font-bold leading-relaxed">{selectedMeeting.attendees || '-'}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>목적</h3>
                    <p className="text-slate-800 font-bold whitespace-pre-wrap leading-relaxed">{selectedMeeting.purpose || '-'}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>주요 안건</h3>
                    <p className="text-slate-800 font-bold whitespace-pre-wrap leading-relaxed">{selectedMeeting.agenda || '-'}</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>준비 사항</h3>
                    <p className="text-slate-800 font-bold whitespace-pre-wrap leading-relaxed">{selectedMeeting.preparation || '-'}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>회의 내용</h3>
                    <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">{selectedMeeting.meetingContent || '-'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">차기 일정</h3>
                      <p className="text-slate-800 font-bold text-sm">{selectedMeeting.nextSchedule || '-'}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">기타 사항</h3>
                      <p className="text-slate-800 font-bold text-sm">{selectedMeeting.others || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
