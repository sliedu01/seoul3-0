import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Only allow updating scores/text
    const updated = await prisma.answer.update({
      where: { id },
      data: {
        score: body.score,
        preScore: body.preScore,
        postChange: body.postChange,
        text: body.text,
      },
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update answer:", error);
    return NextResponse.json(
      { error: "문항 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
