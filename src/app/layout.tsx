import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/layout/sidebar"
import { AuthProvider } from "@/lib/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "서울런 3.0 LMS",
  description: "2026 서울시 진로·진학 콘텐츠 운영 지원 용역 LMS",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>
          <div className="flex min-h-screen bg-slate-50/50"> 
            <Sidebar />
            <main className="flex-1 lg:pl-64 pt-16 lg:pt-0 transition-all duration-300">
              <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
