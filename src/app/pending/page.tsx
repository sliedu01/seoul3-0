"use client";
import Link from "next/link";
import { Clock, ShieldCheck, Mail, LogOut, Loader2, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function PendingPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden relative">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl opacity-50" />

          <div className="relative p-12 md:p-16 text-center">
            <div className="mb-10 relative inline-block">
              <div className="w-24 h-24 bg-blue-600 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-blue-200 animate-pulse">
                <Clock className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-white rounded-2xl p-2 shadow-lg border border-slate-50">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
            </div>

            <h1 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">
              계정 승인 <span className="text-blue-600">심사 중</span>입니다
            </h1>
            
            <div className="max-w-md mx-auto space-y-6">
              <p className="text-lg text-slate-600 font-medium leading-relaxed">
                안녕하세요, <span className="font-bold text-slate-900">{user?.name || "사용자"}</span>님! <br />
                서울런 3.0 LMS를 이용해 주셔서 감사합니다. <br />
                현재 관리자가 회원님의 가입 정보를 확인하고 있습니다.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mt-10">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-bold text-slate-800 text-sm">가입 완료</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">인증 정보가 정상적으로 등록되었습니다.</p>
                </div>
                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="h-12 w-12 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    <span className="font-bold text-blue-700 text-sm">권한 심사중</span>
                  </div>
                  <p className="text-xs text-blue-600/70 font-medium">영업일 기준 1~2일 내에 완료됩니다.</p>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-10 border-t border-slate-50 flex flex-col md:flex-row items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-slate-400 font-medium text-sm">
                <Mail className="h-4 w-4" />
                문의: support@seoul.run
              </div>
              <div className="hidden md:block w-px h-4 bg-slate-200" />
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-100 transition-all border border-slate-200"
              >
                <LogOut className="h-4 w-4" />
                다른 계정으로 로그인
              </button>
            </div>
          </div>
        </div>
        
        <p className="mt-12 text-center text-slate-400 text-xs font-semibold tracking-widest uppercase">
          © 2026 SEOUL RUN 3.0 • Advanced Management System
        </p>
      </div>
    </div>
  );
}
