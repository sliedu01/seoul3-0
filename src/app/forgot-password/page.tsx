"use client";
import { useState } from "react";
import Link from "next/link";
import { KeyRound, Mail, Phone, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: Input Info, 2: Success
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep(2);
      } else {
        setError(data.error || "비밀번호 재설정에 실패했습니다.");
      }
    } catch (err) {
      setError("서버와의 통신 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8 text-center bg-slate-50/50 border-b border-slate-100">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
              <KeyRound className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">비밀번호 찾기</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">계정 확인을 위한 정보를 입력해 주세요.</p>
          </div>

          <div className="p-8">
            {step === 1 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-bold animate-shake">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-slate-700 ml-1">이메일 주소</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                        placeholder="example@seoul.run"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-slate-700 ml-1">휴대폰 번호</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                        placeholder="010-0000-0000"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-black text-[16px] shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "임시 비밀번호 발급"}
                </button>
              </form>
            )}

            {step === 2 && (
              <div className="text-center py-4 space-y-6">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">발송 완료</h2>
                  <p className="text-slate-500 text-sm mt-3 leading-relaxed font-medium">
                    등록된 이메일(<span className="text-blue-600 font-bold">{email}</span>)로<br />
                    6자리 임시 비밀번호가 발송되었습니다.
                  </p>
                  <p className="text-slate-400 text-[12px] mt-4 font-medium">
                    메일이 도착하지 않았다면 스팸 메일함을 확인해 주세요.<br />
                    로그인 후 즉시 비밀번호를 변경하시기 바랍니다.
                  </p>
                </div>
                <Link 
                  href="/login" 
                  className="block w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[16px] transition-all shadow-lg"
                >
                  로그인하러 가기
                </Link>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-50 text-center">
              <Link href="/login" className="text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> 로그인으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
