import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1. 정적 자산 및 API 경로는 미들웨어 검사 제외
  if (
    path.startsWith('/_next') || 
    path.startsWith('/api/auth') || 
    path.includes('.') ||
    path === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const isPublicRoute = ['/login', '/register', '/forgot-password'].includes(path);
  const cookie = req.cookies.get('session')?.value;
  const session = cookie ? await decrypt(cookie).catch(() => null) : null;

  // 2. 세션이 없고 보호된 경로에 접근할 때 -> 로그인 페이지로 리다이렉트
  if (!isPublicRoute && !session) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  // 3. 세션이 있고 로그인/회원가입 페이지에 접근할 때 -> 대시보드로 리다이렉트
  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }
  
  // 4. 미승인 회원 접근 제한 (심사 중 페이지로 이동)
  if (session && !session.user.isApproved && !isPublicRoute && path !== '/pending' && !path.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/pending', req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
