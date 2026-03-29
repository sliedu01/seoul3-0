"use client";
import { useState } from "react";
import Link from "next/link";
import { KeyRound, Mail, Phone, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: Select Method, 2: Input Info, 3: Success/Reset
  const [method, setMethod] = useState<"email" | "phone" | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleNext = (selectedMethod: "email" | "phone") => {
    setMethod(selectedMethod);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // 실제 구현에서는 서버에 초기화 요청을 보내야 함
    // 여기서는 UI 흐름만 구현
    setTimeout(() => {
      setLoading(false);
      setStep(3);
      setMessage(method === "email" ? 
        "이메일로 임시 비밀번호 발급 안내가 전송되었습니다." : 
        "휴대폰 번호로 임시 비밀번호가 전송되었습니다.");
    }, 1500);
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
              <div className="space-y-4">
                <p className="text-center text-slate-600 mb-6 font-medium">본인 확인 방법을 선택해 주세요.</p>
                <button
                  onClick={() => handleNext("email")}
                  className="w-full p-4 border-2 border-slate-100 hover:border-blue-500 rounded-2xl flex items-center gap-4 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900">이메일로 인증</p>
                    <p className="text-xs text-slate-500">가입 시 등록한 이메일 사용</p>
                  </div>
                </button>
                <button
                  onClick={() => handleNext("phone")}
                  className="w-full p-4 border-2 border-slate-100 hover:border-blue-500 rounded-2xl flex items-center gap-4 transition-all group"
                >
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900">휴대폰 번호로 인증</p>
                    <p className="text-xs text-slate-500">가입 시 등록한 연락처 사용</p>
                  </div>
                </button>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" /> 이전으로
                </button>

                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-slate-700 ml-1">
                    {method === "email" ? "등록된 이메일 주소" : "등록된 휴대폰 번호"}
                  </label>
                  <div className="relative group">
                    {method === "email" ? (
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    ) : (
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    )}
                    <input
                      type={method === "email" ? "email" : "tel"}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                      placeholder={method === "email" ? "example@seoul.run" : "010-0000-0000"}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-black text-[16px] shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "임시 비밀번호 발송"}
                </button>
              </form>
            )}

            {step === 3 && (
              <div className="text-center py-4 space-y-6">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">발송 완료</h2>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                    {message}<br />
                    로그인 후 즉시 비밀번호를 변경해 주세요.
                  </p>
                </div>
                <Link 
                  href="/login" 
                  className="block w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[16px] transition-all"
                >
                  로그인하러 가기
                </Link>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-50 text-center">
              <Link href="/login" className="text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors">
                로그인으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
