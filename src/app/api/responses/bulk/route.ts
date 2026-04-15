import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { sessionId: programSessionId, templateId, responses } = await req.json();

    if (!programSessionId || !Array.isArray(responses)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Process in transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete existing responses for this session, type, AND template to prevent duplicates
      //    templateId 기반 삭제로 변경: 만족도/성숙도를 독립적으로 관리
      const typeStr = responses[0]?.type || "POST";
      const deleteWhere: any = {
        programSessionId,
        type: typeStr,
      };
      // templateId가 있으면 해당 템플릿 데이터만 삭제 (다른 템플릿 데이터 보존)
      if (templateId) {
        deleteWhere.templateId = templateId;
      }
      await tx.surveyResponse.deleteMany({
        where: deleteWhere
      });

      const createdResponses = [];

      for (const [idx, resData] of responses.entries()) {
        try {
          // Create SurveyResponse
          const surveyResponse = await tx.surveyResponse.create({
            data: {
              programSessionId,
              templateId,
              respondentId: resData.studentName || `Student_${Math.random().toString(36).substr(2, 5)}`,
              researchTarget: resData.researchTarget || "ELEMENTARY",
              type: resData.type || "POST",
              answers: {
                create: resData.answers.map((ans: any, qIdx: number) => {
                  if (!ans.questionId) {
                    throw new Error(`[응답자 ${idx+1}] ${qIdx+1}번째 문항 ID가 누락되었습니다.`);
                  }
                  return {
                    questionId: ans.questionId,
                    score: (ans.score !== undefined && ans.score !== null && !isNaN(Number(ans.score))) ? Number(ans.score) : null,
                    preScore: (ans.preScore !== undefined && ans.preScore !== null && !isNaN(Number(ans.preScore))) ? Number(ans.preScore) : null,
                    postChange: (ans.postChange !== undefined && ans.postChange !== null && !isNaN(Number(ans.postChange))) ? Number(ans.postChange) : null,
                    text: ans.textValue || ""
                  };
                })
              }
            }
          });
          createdResponses.push(surveyResponse);
        } catch (innerError: any) {
          console.error(`Error saving response at index ${idx}:`, innerError);
          throw new Error(`[응답자 ${idx+1}: ${resData.studentName || '알 수 없음'}] 데이터 저장 중 오류: ${innerError.message}`);
        }
      }
      return createdResponses;
    });

    return NextResponse.json({ success: true, count: result.length });
  } catch (error: any) {
    console.error("Bulk save error:", error);
    return NextResponse.json({ 
      error: error.message || "Internal Server Error",
      detail: error.stack 
    }, { status: 500 });
  }
}
