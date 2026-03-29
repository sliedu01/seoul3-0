import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isApproved) {
      return NextResponse.json({ error: '계정이 승인 대기 중입니다. 관리자에게 문의하세요.' }, { status: 403 });
    }

    // 세션 토큰 생성 및 쿠키 설정
    await login({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      isApproved: user.isApproved
    });

    return NextResponse.json({
      message: 'Logged in successfully',
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
