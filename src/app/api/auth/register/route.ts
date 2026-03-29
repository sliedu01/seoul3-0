import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password, name, phone, company } = await req.json();

    if (!email || !password || !name || !phone || !company) {
      return NextResponse.json({ error: '모든 필드를 입력해 주세요.' }, { status: 400 });
    }

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        company,
        role: 'MEMBER',
        isApproved: false,
      },
    });

    return NextResponse.json({
      message: 'User created successfully',
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
