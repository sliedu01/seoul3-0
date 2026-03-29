import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.surveyResponse.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete survey:", error);
    return NextResponse.json(
      { error: "설문 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { respondentId, researchTarget, answers } = body;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Survey Metadata
      const survey = await tx.surveyResponse.update({
        where: { id },
        data: { respondentId, researchTarget },
      });

      // 2. Update Answers if provided
      if (Array.isArray(answers)) {
        for (const ans of answers) {
          if (ans.id) {
            await tx.answer.update({
              where: { id: ans.id },
              data: {
                score: ans.score,
                preScore: ans.preScore,
                postChange: ans.postChange,
                text: ans.text,
              },
            });
          }
        }
      }
      return survey;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update survey:", error);
    return NextResponse.json(
      { error: "설문 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
