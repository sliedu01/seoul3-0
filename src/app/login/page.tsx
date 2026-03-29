"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        window.location.href = "/"; // Force full reload to refresh session in server
      } else {
        const data = await res.json();
        setError(data.error || "로그인에 실패했습니다.");
      }
    } catch (err) {
      setError("서버와의 통신에 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden font-sans">
      {/* Dynamic background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
      
      <div className="w-full max-w-md relative z-10 px-4">
        <div className="bg-white/10 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/10 overflow-hidden ring-1 ring-white/20">
          <div className="p-10 pb-4 text-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/20 rotate-3 hover:rotate-0 transition-transform duration-500">
              <LogIn className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">서울런 3.0 LMS</h1>
            <p className="text-blue-200/60 font-medium text-sm tracking-widest uppercase">Content Management System</p>
          </div>

          <form onSubmit={handleLogin} className="p-10 pt-6 space-y-6">
            {error && (
              <div className="bg-red-500/10 text-red-400 px-5 py-4 rounded-2xl text-sm font-bold border border-red-500/20 animate-shake">
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <label className="text-xs font-black text-blue-200/70 ml-1 uppercase tracking-wider">이메일 주소</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-white placeholder:text-slate-600"
                  placeholder="name@seoul.run"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-blue-200/70 ml-1 uppercase tracking-wider">비밀번호</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-white placeholder:text-slate-600"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-800 text-white rounded-2xl font-black text-lg shadow-2xl shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-white/50" /> : (
                <>
                  로그인하기
                  <LogIn className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="pt-6 text-center border-t border-white/5 mt-4">
              <p className="text-slate-400 text-sm font-medium">
                계정이 없으신가요?{" "}
                <Link href="/register" className="text-blue-400 font-black hover:text-blue-300 transition-colors border-b-2 border-blue-400/30">
                  신규 회원가입
                </Link>
              </p>
            </div>
          </form>
        </div>
        <div className="mt-10 flex flex-col items-center gap-4">
            <Link href="/forgot-password" title="비밀번호 찾기" className="text-slate-500 text-xs font-bold hover:text-blue-400 transition-colors tracking-tighter">
                계정 또는 비밀번호를 잊으셨나요?
            </Link>
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
            © 2026 SEOUL RUN 3.0 • ADVANCED LMS PLATFORM
          </p>
        </div>
      </div>
    </div>
  );
}
