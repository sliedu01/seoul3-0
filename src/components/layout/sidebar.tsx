"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Folder, FileText, Calendar, Building, BarChart3, Menu, X, LogOut, User, Users, LogIn, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
const routes = [
  { label: "대시보드", icon: LayoutDashboard, href: "/" },
  { label: "사업 관리", icon: Folder, href: "/programs" },
  { label: "협력업체 관리", icon: Building, href: "/partners" },
  { label: "문항 및 평가 관리", icon: FileText, href: "/assessments" },
  { label: "설문 결과", icon: FileText, href: "/surveys" },
  { label: "AI 컨설턴트 리포트", icon: BarChart3, href: "/reports" },
  { label: "회의록", icon: FileText, href: "/meetings" },
  { label: "예산/정산 관리", icon: Wallet, href: "/budget" },
  { label: "캘린더", icon: Calendar, href: "/calendar" },
  { label: "사용자 관리", icon: Users, href: "/admin/users" },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { user, loading } = useAuth()

  // Do not show sidebar on auth pages
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password"
  if (isAuthPage) return null

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleSidebar = () => setIsOpen(!isOpen)

  return (
    <>
      {/* Mobile Header - High Z-index */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 z-[100] no-print">
        <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">서울런 3.0</h1>
        <button 
          onClick={toggleSidebar} 
          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg active:scale-95 transition-all"
          aria-label="Menu"
        >
          {isOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] animate-in fade-in duration-300" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Highest Z-index on mobile */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-[90] flex w-64 flex-col border-r border-slate-100 bg-white transition-all duration-300 ease-in-out no-print shadow-2xl lg:shadow-none",
        "lg:translate-x-0 lg:z-40",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-20 items-center border-b border-slate-100 px-8">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">서울런 3.0</h1>
        </div>
        
        <nav className="flex-1 space-y-1.5 p-4 mt-2 overflow-y-auto custom-scrollbar">
          {routes
            .filter(route => {
              if (route.href === '/admin/users' && user?.role !== 'ADMIN') return false;
              if (route.href === '/reports' && user?.role === 'MEMBER') return false;
              if (route.href === '/assessments' && user?.role === 'MEMBER') return false;
              return true;
            })
            .map((route) => {
            const isActive = pathname === route.href;
            return (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "group flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-bold transition-all duration-200 relative overflow-hidden",
                  isActive 
                    ? "bg-blue-50 text-blue-700 shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-blue-600 rounded-r-full"></div>
                )}
                <route.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", isActive && "text-blue-600 fill-blue-100")} />
                <span className="whitespace-nowrap">{route.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Info & Logout Section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          {loading ? (
            <div className="flex items-center gap-3 px-2 mb-3 animate-pulse">
              <div className="w-9 h-9 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-20" />
                <div className="h-2 bg-slate-200 rounded w-12" />
              </div>
            </div>
          ) : user ? (
            <>
              <Link 
                href="/settings/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-2 mb-3 hover:bg-white rounded-xl py-2 transition-colors group/user"
              >
                <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm group-hover/user:border-blue-200 transition-colors">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-800 truncate group-hover/user:text-blue-700 transition-colors">{user.name || "사용자"}</p>
                  <div className="flex items-center gap-1">
                      <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
                          user.role === 'ADMIN' ? "bg-red-100 text-red-600" : 
                          user.role === 'OPERATOR' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                      )}>
                          {user.role}
                      </span>
                  </div>
                </div>
              </Link>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </>
          ) : (
            <Link 
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
            >
              <LogIn className="h-4 w-4" />
              로그인 / 회원가입
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
