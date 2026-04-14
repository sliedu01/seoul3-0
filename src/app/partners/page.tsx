"use client"
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Pencil, Trash2, FileDown, UploadCloud, AlertCircle, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

type Partner = { 
  id: string; 
  name: string; 
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  businessRegistration: string; 
  contractFile: string; 
  contractFile2?: string;
  contractFile3?: string;
  contractFile4?: string;
  contractFile5?: string;
  insuranceFile: string;
  bankbookFile: string;
  preInspectionFile: string;
  stats?: {
    sessionCount: number;
    avgSatisfaction: number;
    avgDelta: number;
    totalResponses: number;
  }
}

function PartnerPerformance({ partnerId }: { partnerId: string }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/partners/${partnerId}/stats`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Partner stats fetch error:", err);
        setLoading(false);
      });
  }, [partnerId]);

  if (loading) return <span className="text-[10px] text-slate-400 animate-pulse">집계 중...</span>;
  if (!stats || stats.sessionCount === 0) return <span className="text-[10px] text-slate-300">실적 없음</span>;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-slate-700">만족도</span>
        <span className="text-11px text-blue-600 font-bold">{(stats?.avgSatisfaction || 0).toFixed(1)} / 5.0</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-slate-700">향상도</span>
        <span className="text-[11px] text-emerald-600 font-bold">+{(stats?.avgDelta || 0).toFixed(1)}%</span>
      </div>
      <div className="text-[9px] text-slate-400">총 {stats?.sessionCount || 0}세션 / {stats?.totalResponses || 0}명 참여</div>
    </div>
  );
}

export default function PartnersPage() {
  const { canEdit, canDelete, isMember } = useAuth()
  const [partners, setPartners] = useState<Partner[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const initialFormState = { 
    name: "", contactName: "", contactPhone: "", contactEmail: "", address: "", 
    businessRegistration: "", contractFile: "", contractFile2: "", contractFile3: "", contractFile4: "", contractFile5: "",
    insuranceFile: "", bankbookFile: "", preInspectionFile: ""
  }
  const [formData, setFormData] = useState(initialFormState)
  const [isUploading, setIsUploading] = useState<string | null>(null);

  // PDF Action Modal State
  const [pdfModal, setPdfModal] = useState<{ isOpen: boolean; field: keyof typeof initialFormState; partnerId: string; fileName: string } | null>(null);

  useEffect(() => {
    fetch("/api/partners")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPartners(data)
        } else {
          console.error("API Error:", data)
          setPartners([])
        }
      })
      .catch(() => setPartners([]))
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof formData) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsUploading(field);
      const uploadData = new FormData();
      uploadData.append("file", file);
      
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: uploadData
        });
        if (res.ok) {
          const result = await res.json();
          setFormData({ ...formData, [field]: result.fileName });
          // SHA-256 해시 피드백
          if (result.sha256) {
            console.log(`[무결성] ${result.fileName} — SHA-256: ${result.sha256}`);
          }
        } else {
          const err = await res.json();
          alert(err.error || "파일 업로드에 실패했습니다.");
        }
      } catch (err) {
        console.error(err);
        alert("업로드 중 오류가 발생했습니다.");
      } finally {
        setIsUploading(null);
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const url = editingId ? `/api/partners/${editingId}` : "/api/partners"
    const method = editingId ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      body: JSON.stringify(formData),
      headers: { "Content-Type": "application/json" }
    })
    if (res.ok) {
      const savedPartner = await res.json()
      if (editingId) {
        setPartners(partners.map(p => p.id === editingId ? savedPartner : p))
      } else {
        setPartners([savedPartner, ...partners])
      }
      setIsModalOpen(false)
      setEditingId(null)
      setFormData(initialFormState)
    }
  }

  const handleEdit = (partner: Partner) => {
    setEditingId(partner.id)
    setFormData({
      name: partner.name,
      contactName: partner.contactName || "",
      contactPhone: partner.contactPhone || "",
      contactEmail: partner.contactEmail || "",
      address: partner.address || "",
      businessRegistration: partner.businessRegistration || "",
      contractFile: partner.contractFile || "",
      contractFile2: partner.contractFile2 || "",
      contractFile3: partner.contractFile3 || "",
      contractFile4: partner.contractFile4 || "",
      contractFile5: partner.contractFile5 || "",
      insuranceFile: partner.insuranceFile || "",
      bankbookFile: partner.bankbookFile || "",
      preInspectionFile: partner.preInspectionFile || ""
    })
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    setEditingId(null)
    setFormData(initialFormState)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("정말로 삭제하시겠습니까?")) {
      await fetch(`/api/partners/${id}`, { method: "DELETE" })
      setPartners(partners.filter(p => p.id !== id))
    }
  }

  // v1.0.2: Fix PDF download binary integrity and anchor tag sync
  const handleDownload = (fileName: string) => {
    if (!fileName) return;
    const link = document.createElement("a");
    const downloadUrl = `/api/download?file=${encodeURIComponent(fileName)}`;
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setPdfModal(null);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">협력업체 관리</h2>
          <p className="text-slate-500 mt-1">참여기관 및 계약, 보험 증빙 PDF 서류를 일원화 관리합니다.</p>
        </div>
        {canEdit && (
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" /> 업체 추가
          </Button>
        )}
      </div>

      {isMember && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3 text-blue-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">현재 관찰자(회원) 등급으로 접속 중입니다. 정보 조회만 가능하며 추가/수정/삭제는 제한됩니다.</p>
        </div>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-3 md:px-6 py-4 font-semibold text-slate-700">업체명</th>
                  <th className="px-3 md:px-6 py-4 font-semibold text-slate-700">실적 요약</th>
                  <th className="px-3 md:px-6 py-4 font-semibold text-slate-700">사업자등록증</th>
                  <th className="px-3 md:px-6 py-4 font-semibold text-slate-700">계약서</th>
                  <th className="px-3 md:px-6 py-4 font-semibold text-slate-700">보험증권</th>
                  <th className="px-3 md:px-6 py-4 font-semibold text-slate-700">사전점검</th>
                  <th className="px-3 md:px-6 py-4 font-semibold text-slate-700">통장사본</th>
                  <th className="px-3 md:px-6 py-4 font-semibold text-slate-700 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partners.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">등록된 협력업체가 없습니다. 우측 상단의 추가 버튼을 눌러주세요.</td></tr>
                ) : partners.map(p => (
                  <tr key={p.id} className="hover:bg-amber-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      {(p.contactName || p.contactPhone || p.contactEmail) && (
                        <div className="text-[11px] text-slate-500 mt-1 flex flex-col gap-0.5">
                          {p.contactName && <span>담당자: {p.contactName} {p.contactPhone && `(${p.contactPhone})`}</span>}
                          {p.contactEmail && <span>이메일: {p.contactEmail}</span>}
                          {p.address && <span className="text-slate-400 truncate max-w-[200px]" title={p.address}>주소: {p.address}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <PartnerPerformance partnerId={p.id} />
                    </td>
                    <td className="px-6 py-4">
                      {p.businessRegistration ? (
                        <button onClick={() => setPdfModal({ isOpen: true, field: 'businessRegistration', partnerId: p.id, fileName: p.businessRegistration })} className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline font-medium text-xs">
                          <FileDown className="w-3 h-3 mr-1"/>{p.businessRegistration}
                        </button>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {[
                          { file: p.contractFile, label: "1회차" },
                          { file: p.contractFile2, label: "2회차" },
                          { file: p.contractFile3, label: "3회차" },
                          { file: p.contractFile4, label: "4회차" },
                          { file: p.contractFile5, label: "5회차" }
                        ].map((item, idx) => item.file ? (
                          <button 
                            key={idx}
                            onClick={() => setPdfModal({ isOpen: true, field: idx === 0 ? 'contractFile' : `contractFile${idx + 1}` as any, partnerId: p.id, fileName: item.file! })} 
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline font-medium text-[10px]"
                          >
                            <FileDown className="w-2.5 h-2.5 mr-1"/>{item.label}: {item.file}
                          </button>
                        ) : null)}
                        {!p.contractFile && !p.contractFile2 && !p.contractFile3 && !p.contractFile4 && !p.contractFile5 && <span className="text-slate-400">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {p.insuranceFile ? (
                        <button onClick={() => setPdfModal({ isOpen: true, field: 'insuranceFile', partnerId: p.id, fileName: p.insuranceFile })} className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline font-medium text-xs">
                          <FileDown className="w-3 h-3 mr-1"/>{p.insuranceFile}
                        </button>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      {p.preInspectionFile ? (
                        <button onClick={() => setPdfModal({ isOpen: true, field: 'preInspectionFile', partnerId: p.id, fileName: p.preInspectionFile })} className="inline-flex items-center text-orange-600 hover:text-orange-800 hover:underline font-medium text-xs">
                          <FileDown className="w-3 h-3 mr-1"/>{p.preInspectionFile}
                        </button>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      {p.bankbookFile ? (
                        <button onClick={() => setPdfModal({ isOpen: true, field: 'bankbookFile', partnerId: p.id, fileName: p.bankbookFile })} className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline font-medium text-xs">
                          <FileDown className="w-3 h-3 mr-1"/>{p.bankbookFile}
                        </button>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-3 md:px-6 py-4 text-right align-top">
                      <div className="flex justify-end gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-100" onClick={() => handleEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {!canEdit && <span className="text-xs text-slate-400 italic">조회전용</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Main Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-xl max-h-[90vh] flex flex-col border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-0 relative">
            <div className="flex-shrink-0 bg-slate-900 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">{editingId ? "협력업체 정보 수정" : "새 협력업체 등록"}</h3>
                <p className="text-xs font-medium opacity-60 mt-1">업체 기본 정보 및 증빙 서류를 관리합니다.</p>
              </div>
              <button 
                onClick={() => {setIsModalOpen(false); setEditingId(null);}} 
                className="hover:rotate-90 transition-transform p-1.5 bg-white/10 rounded-full hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-bold">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-slate-400 ml-1 uppercase">업체명 <span className="text-red-500">*</span></label>
                    <input required className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="상호명 입력" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">담당자 성명</label>
                    <input className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} placeholder="홍길동" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">담당자 연락처</label>
                    <input className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} placeholder="010-0000-0000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">담당자 이메일</label>
                    <input type="email" className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} placeholder="example@company.com" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">회사 본점 주소</label>
                    <input className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="서울특별시 중구 세종대로 110" />
                  </div>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-black text-slate-900 border-l-4 border-blue-600 pl-3">증빙 서류 관리</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FileField label="사업자등록증 (PDF)" field="businessRegistration" value={formData.businessRegistration} isUploading={isUploading === 'businessRegistration'} onUpload={handleFileUpload} />
                    <FileField label="통장사본 (PDF)" field="bankbookFile" value={formData.bankbookFile} isUploading={isUploading === 'bankbookFile'} onUpload={handleFileUpload} />
                    <FileField label="보험증권 (PDF)" field="insuranceFile" value={formData.insuranceFile} isUploading={isUploading === 'insuranceFile'} onUpload={handleFileUpload} />
                    <FileField label="사전점검체크리스트 (PDF)" field="preInspectionFile" value={formData.preInspectionFile} isUploading={isUploading === 'preInspectionFile'} onUpload={handleFileUpload} />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-black text-slate-900 border-l-4 border-indigo-600 pl-3">회차별 계약서 (최대 5회차)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                    <FileField label="1회차 계약서" field="contractFile" value={formData.contractFile} isUploading={isUploading === 'contractFile'} onUpload={handleFileUpload} />
                    <FileField label="2회차 계약서" field="contractFile2" value={formData.contractFile2} isUploading={isUploading === 'contractFile2'} onUpload={handleFileUpload} />
                    <FileField label="3회차 계약서" field="contractFile3" value={formData.contractFile3} isUploading={isUploading === 'contractFile3'} onUpload={handleFileUpload} />
                    <FileField label="4회차 계약서" field="contractFile4" value={formData.contractFile4} isUploading={isUploading === 'contractFile4'} onUpload={handleFileUpload} />
                    <FileField label="5회차 계약서" field="contractFile5" value={formData.contractFile5} isUploading={isUploading === 'contractFile5'} onUpload={handleFileUpload} />
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 p-8 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-12 px-6 font-bold">취소</Button>
                <Button type="submit" disabled={isUploading !== null} className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl h-12 px-8 shadow-lg shadow-slate-200">
                  {editingId ? "수정 내용 저장" : "업체 등록 완료"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* PDF Action Modal */}
      {pdfModal?.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileDown className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">PDF 문서 관리</h3>
                <p className="text-sm text-slate-500 mt-1 truncate px-4" title={pdfModal.fileName}>{pdfModal.fileName}</p>
              </div>
              
              <div className="grid grid-cols-1 gap-2 pt-4">
                {/* v2.0: 원본 다운로드 + 무결성 검증 */}
                <a 
                  href={`/api/download?file=${encodeURIComponent(pdfModal.fileName)}`}
                  download={pdfModal.fileName}
                  data-version="v2.0-integrity"
                  className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                  onClick={() => setPdfModal(null)}
                >
                  <FileDown className="w-4 h-4" /> 원본 다운로드 (무결성 검증)
                </a>
                
                {/* 무결성 검증 버튼 */}
                <button
                  className="w-full h-12 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/files/verify?file=${encodeURIComponent(pdfModal.fileName)}`);
                      const result = await res.json();
                      if (result.isValid) {
                        alert(`✅ 무결성 검증 통과\n\nSHA-256: ${result.computedHash}\n파일 크기: ${(result.actualSize / 1024).toFixed(1)}KB`);
                      } else {
                        alert(`❌ 무결성 검증 실패!\n\n저장 해시: ${result.storedHash}\n현재 해시: ${result.computedHash}`);
                      }
                    } catch {
                      alert("검증 중 오류가 발생했습니다.");
                    }
                  }}
                >
                  🔒 파일 무결성 검증
                </button>
                
                <label className="w-full h-12 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 cursor-pointer rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                  <Pencil className="w-4 h-4" /> 수정 (교체)
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const uploadData = new FormData();
                        uploadData.append("file", file);
                        const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadData });
                        if (uploadRes.ok) {
                          const result = await uploadRes.json();
                          const partner = partners.find(p => p.id === pdfModal.partnerId);
                          if (partner) {
                            const updatedPartner = { ...partner, [pdfModal.field]: result.fileName };
                            const res = await fetch(`/api/partners/${pdfModal.partnerId}`, {
                              method: "PUT",
                              body: JSON.stringify(updatedPartner),
                              headers: { "Content-Type": "application/json" }
                            });
                            if (res.ok) {
                              setPartners(partners.map(p => p.id === pdfModal.partnerId ? updatedPartner : p));
                              alert(`문서가 성공적으로 교체되었습니다.\nSHA-256: ${result.sha256}`);
                            }
                          }
                        }
                        setPdfModal(null);
                      }
                    }} 
                  />
                </label>
                
                <Button 
                  variant="ghost" 
                  className="w-full h-12 text-slate-400 hover:text-slate-600 font-bold"
                  onClick={() => setPdfModal(null)}
                >
                  닫기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FileField({ label, field, value, isUploading, onUpload }: any) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <label className="flex items-center justify-center w-full h-14 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all">
        <span className="text-sm text-slate-600 flex items-center font-medium">
          {isUploading ? (
            <span className="flex items-center gap-2 text-blue-600 animate-pulse"><UploadCloud className="w-5 h-5"/> 업로드 중...</span>
          ) : (
            <><UploadCloud className="w-5 h-5 mr-2 text-slate-400"/> {value ? <span className="truncate max-w-[120px] text-blue-600">{value}</span> : "파일 선택 (PDF/이미지)"}</>
          )}
        </span>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" disabled={isUploading} onChange={(e) => onUpload(e, field)} />
      </label>
    </div>
  );
}
