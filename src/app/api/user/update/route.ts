import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증 세션이 만료되었습니다. 다시 로그인해주세요." }, { status: 401 });
    }

    const { name, email, password } = await req.json();
    const userId = session.user.id;

    if (!userId) {
      return NextResponse.json({ error: "사용자 ID를 찾을 수 없습니다." }, { status: 400 });
    }

    const updateData: any = {
      name: name.trim(),
      email: email.trim(),
    };

    if (password && password.trim() !== "") {
      // bcryptjs v3.x or v2.x compatible hash
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }

    console.log("Updating user profile for ID:", userId);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ 
      message: "정보가 성공적으로 업데이트되었습니다.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });

  } catch (error: any) {
    console.error("Profile update CRITICAL error:", error);
    
    // Prisma common errors
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "이미 다른 사용자가 사용 중인 이메일입니다." }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: "정보 수정 중 서버 오류가 발생했습니다.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    }, { status: 500 });
  }
}
