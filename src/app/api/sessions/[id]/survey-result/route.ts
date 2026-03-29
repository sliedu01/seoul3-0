import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { resultPdfPath, resultGoogleFormUrl } = body;

    const updated = await prisma.programSession.update({
      where: { id },
      data: {
        resultPdfPath,
        resultGoogleFormUrl,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update session survey result:", error);
    return NextResponse.json(
      { error: "세션 설문 결과 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
