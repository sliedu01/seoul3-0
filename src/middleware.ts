import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

// 보호된 경로 설정
const protectedRoutes = ['/', '/programs', '/partners', '/assessments', '/surveys', '/reports', '/meetings', '/calendar'];
const publicRoutes = ['/login', '/register'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(path) || protectedRoutes.some(route => path.startsWith(route + '/'));
  const isPublicRoute = publicRoutes.includes(path);

  const cookie = req.cookies.get('session')?.value;
  const session = cookie ? await decrypt(cookie).catch(() => null) : null;

  // 1. 세션이 없고 보호된 경로에 접근할 때 -> 로그인 페이지로 리다이렉트
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  // 2. 세션이 있고 로그인/회원가입 페이지에 접근할 때 -> 대시보드로 리다이렉트
  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }
  
  // 3. 미승인 회원 접근 제한 (심사 중 페이지로 이동)
  if (session && !session.user.isApproved && !isPublicRoute && path !== '/pending' && !path.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/pending', req.nextUrl));
  }

  // 3. 역할 기반 접근 제어 (RBAC) - API 경로 보호 예시
  if (path.startsWith('/api/') && !path.startsWith('/api/auth/')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = session.user;
    const method = req.method;

    // MEMBER(회원) 등급은 GET만 가능
    if (role === 'MEMBER' && method !== 'GET') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // OPERATOR(운영자) 등급은 DELETE 불가
    if (role === 'OPERATOR' && method === 'DELETE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.next();
}

// 미들웨어를 적용할 경로 설정
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
