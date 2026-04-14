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
      // 1. Delete existing responses for this session and type to prevent duplicates
      const typeStr = responses[0]?.type || "POST";
      await tx.surveyResponse.deleteMany({
        where: {
          programSessionId,
          type: typeStr,
        }
      });

      const createdResponses = [];

      for (const resData of responses) {
        // Create SurveyResponse
        const surveyResponse = await tx.surveyResponse.create({
          data: {
            programSessionId,
            templateId,
            respondentId: resData.studentName || `Student_${Math.random().toString(36).substr(2, 5)}`,
            researchTarget: resData.researchTarget || "ELEMENTARY", // 기본값 초등학생
            type: resData.type || "POST",
            answers: {
              create: resData.answers.map((ans: any) => ({
                questionId: ans.questionId,
                score: ans.score !== undefined ? Number(ans.score) : undefined,
                preScore: ans.preScore !== undefined ? Number(ans.preScore) : undefined,
                postChange: ans.postChange !== undefined ? Number(ans.postChange) : undefined,
                text: ans.textValue
              }))
            }
          }
        });
        createdResponses.push(surveyResponse);
      }
      return createdResponses;
    });

    return NextResponse.json({ success: true, count: result.length });
  } catch (error) {
    console.error("Bulk save error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
