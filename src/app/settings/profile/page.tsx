"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Save, Loader2, ChevronLeft, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      setMessage({ type: "error", text: "비밀번호가 일치하지 않습니다." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "정보가 성공적으로 수정되었습니다. 다시 로그인하면 반영됩니다." });
        setPassword("");
        setConfirmPassword("");
        // Optional: refresh page or redirect
      } else {
        setMessage({ type: "error", text: data.error || "수정 중 오류가 발생했습니다." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "서버와의 통신에 실패했습니다." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">내 정보 수정</h1>
            <p className="text-slate-500 font-medium">계정 정보 및 보안 설정을 관리하세요</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm sticky top-8">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20 rotate-3">
                <User className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-1">{user?.name || "사용자"}</h2>
              <p className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-6">
                {user?.role}
              </p>
              
              <div className="w-full space-y-4 pt-6 border-t border-slate-50">
                <div className="flex items-center gap-3 text-slate-500">
                  <Mail className="h-4 w-4" />
                  <span className="text-xs font-bold truncate">{user?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs font-bold">계정 상태: 활성</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Form Area */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-8">
              {message.text && (
                <div className={cn(
                  "p-5 rounded-2xl flex items-center gap-3 font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300",
                  message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
                )}>
                  {message.text}
                </div>
              )}

              {/* Basic Info Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full" />
                  기본 정보
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 ml-1 uppercase">이름</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                        placeholder="이름 입력"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 ml-1 uppercase">이메일</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900"
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="space-y-6 pt-6 border-t border-slate-50">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                  비밀번호 변경 (필요할 때만 입력)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 ml-1 uppercase">새 비밀번호</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-900"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 ml-1 uppercase">비밀번호 확인</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-900"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-[24px] font-black text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                >
                  {loading ? <Loader2 className="h-6 w-6 animate-spin text-white/50" /> : (
                    <>
                      설정 저장하기
                      <Save className="h-5 w-5 group-hover:translate-y-[-2px] transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
