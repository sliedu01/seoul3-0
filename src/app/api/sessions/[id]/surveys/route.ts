import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 특정 세션의 설문 데이터 조회
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // MATURITY or SATISFACTION

    const where: any = { programSessionId: sessionId };
    if (type) {
      where.type = type;
    }

    const responses = await prisma.surveyResponse.findMany({
      where,
      include: {
        template: {
          include: { questions: { orderBy: { order: 'asc' } } }
        },
        answers: {
          include: { question: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(responses);
  } catch (error) {
    console.error("Fetch surveys error:", error);
    return NextResponse.json({ error: "Failed to fetch surveys" }, { status: 500 });
  }
}

// 개별 응답 수정 또는 삭제
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { responseId, answers, studentName } = await req.json();

    if (!responseId) {
      return NextResponse.json({ error: "Response ID is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. 응답자 정보 업데이트 (이름 등)
      if (studentName) {
        await tx.surveyResponse.update({
          where: { id: responseId },
          data: { respondentId: studentName }
        });
      }

      // 2. 답변 내용 업데이트
      if (answers && Array.isArray(answers)) {
        for (const ans of answers) {
          await tx.surveyAnswer.update({
            where: { id: ans.id },
            data: {
              score: ans.score !== undefined ? Number(ans.score) : undefined,
              preScore: ans.preScore !== undefined ? Number(ans.preScore) : undefined,
              postChange: ans.postChange !== undefined ? Number(ans.postChange) : undefined,
              text: ans.text !== undefined ? ans.text : undefined
            }
          });
        }
      }
      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Update survey error:", error);
    return NextResponse.json({ error: "Failed to update survey" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const responseId = searchParams.get("responseId");
    const mode = searchParams.get("mode"); // 'single' or 'all'

    if (mode === 'all') {
      await prisma.surveyResponse.deleteMany({
        where: { programSessionId: params.id }
      });
      return NextResponse.json({ success: true, message: "All responses deleted" });
    }

    if (!responseId) {
      return NextResponse.json({ error: "Response ID is required" }, { status: 400 });
    }

    await prisma.surveyResponse.delete({
      where: { id: responseId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete survey error:", error);
    return NextResponse.json({ error: "Failed to delete survey" }, { status: 500 });
  }
}
