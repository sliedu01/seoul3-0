import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendMail } from '@/lib/mail';

export async function POST(req: Request) {
  try {
    const { email, phone } = await req.json();

    if (!email || !phone) {
      return NextResponse.json({ error: '이메일과 휴대폰 번호를 모두 입력해 주세요.' }, { status: 400 });
    }

    // 사용자 확인 (이메일과 휴대폰 번호가 모두 일치해야 함)
    const user = await prisma.user.findFirst({
      where: {
        email: email,
        phone: phone,
      },
    });

    if (!user) {
      return NextResponse.json({ error: '입력하신 정보와 일치하는 사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 6자리 랜덤 숫자 생성
    const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();

    // 비밀번호 해싱 및 업데이트
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 이메일 발송
    const mailResult = await sendMail({
      to: user.email,
      subject: '[서울런 3.0] 임시 비밀번호 발급 안내',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
          <h2 style="color: #2563eb;">임시 비밀번호 발급</h2>
          <p>안녕하세요, ${user.name || '사용자'}님.</p>
          <p>요청하신 임시 비밀번호가 발급되었습니다. 아래의 비밀번호를 사용하여 로그인해 주세요.</p>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0f172a;">${tempPassword}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">로그인 후 보안을 위해 즉시 비밀번호를 변경하시기 바랍니다.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">본 메일은 발신 전용입니다.</p>
        </div>
      `,
    });

    if (!mailResult.success) {
      return NextResponse.json({ error: '이메일 발송에 실패했습니다. 관리자에게 문의하세요.' }, { status: 500 });
    }

    return NextResponse.json({ message: '임시 비밀번호가 가입된 이메일로 발송되었습니다.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
