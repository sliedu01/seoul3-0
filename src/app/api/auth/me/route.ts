import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  
  if (!session || !session.user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    // 세션의 ID를 기반으로 DB에서 최신 정보를 가져옴 (실시간 반영)
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isApproved: true,
        company: true
      }
    });

    if (!dbUser) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    return NextResponse.json({ user: dbUser });
  } catch (error) {
    console.error("Auth sync error:", error);
    // 탈출구: 세션 데이터라도 반환
    return NextResponse.json({ user: session.user });
  }
}
