"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password";

  return (
    <div className="flex min-h-screen bg-slate-50/50 relative">
      {!isAuthPage && <Sidebar />}
      <main 
        className={cn(
          "flex-1 transition-all duration-300 min-h-screen",
          !isAuthPage ? "lg:pl-64 pt-16 lg:pt-0" : "w-full"
        )}
      >
        <div className={cn(
          "w-full mx-auto p-3 md:p-6 lg:p-8 transition-opacity duration-500",
          !isAuthPage ? "max-w-full" : "max-w-full p-0 md:p-0"
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}
