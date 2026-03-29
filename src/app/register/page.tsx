"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Mail, Lock, User, Shield, Loader2, Building, Phone } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "MEMBER",
    phone: "",
    company: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("회원가입 요청이 완료되었습니다. 관리자 승인 후 서비 이용이 가능합니다.");
        router.push("/login");
      } else {
        const data = await res.json();
        setError(data.error || "회원가입에 실패했습니다.");
      }
    } catch (err) {
      setError("서버와의 통신에 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden font-sans p-6">
      {/* Background blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-20%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse" />

      <div className="w-full max-w-xl relative z-10">
        <div className="bg-white/10 backdrop-blur-3xl rounded-[48px] shadow-2xl border border-white/10 overflow-hidden ring-1 ring-white/20">
          <div className="p-10 pb-0 text-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/20 rotate-[-3deg] hover:rotate-0 transition-transform duration-500">
              <UserPlus className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">회원가입</h1>
            <p className="text-blue-200/60 font-medium text-sm tracking-widest uppercase italic">Seoul Run 3.0 Registration</p>
          </div>

          <form onSubmit={handleRegister} className="p-10 space-y-6">
            {error && (
              <div className="bg-red-500/10 text-red-400 px-5 py-4 rounded-2xl text-sm font-bold border border-red-500/20 animate-shake">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <label className="text-[11px] font-black text-blue-200/70 ml-1 uppercase tracking-wider">성함</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-white placeholder:text-slate-600 text-sm"
                    placeholder="홍길동"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[11px] font-black text-blue-200/70 ml-1 uppercase tracking-wider">휴대전화번호</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-white placeholder:text-slate-600 text-sm"
                    placeholder="010-0000-0000"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
                <label className="text-[11px] font-black text-blue-200/70 ml-1 uppercase tracking-wider">회사명 / 소속</label>
                <div className="relative group">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-white placeholder:text-slate-600 text-sm"
                    placeholder="소속 기관명 입력"
                    required
                  />
                </div>
              </div>

            <div className="space-y-2.5">
              <label className="text-[11px] font-black text-blue-200/70 ml-1 uppercase tracking-wider">이메일 주소</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-white placeholder:text-slate-600 text-sm"
                  placeholder="name@seoul.run"
                  required
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[11px] font-black text-blue-200/70 ml-1 uppercase tracking-wider">비밀번호</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-white placeholder:text-slate-600 text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-800 text-white rounded-2xl font-black text-lg shadow-2xl shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-4"
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-white/50" /> : "계정 생성하기"}
            </button>

            <div className="pt-8 text-center border-t border-white/5 mt-4">
              <p className="text-slate-400 text-sm font-medium">
                이미 서울런 3.0 계정이 있으신가요?{" "}
                <Link href="/login" className="text-blue-400 font-bold hover:text-blue-300 transition-colors border-b-2 border-blue-400/30">
                  로그인하기
                </Link>
              </p>
            </div>
          </form>
        </div>
        <p className="mt-12 text-center text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
          © 2026 SEOUL RUN 3.0 • ADVANCED LMS PLATFORM
        </p>
      </div>
    </div>
  );
}
